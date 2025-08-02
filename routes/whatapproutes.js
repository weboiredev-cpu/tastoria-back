import express from 'express';
import axios from 'axios';
import Menu from '../models/menu.js';
import Order from '../models/order.js';
import redis from '../utils/redis.js';
import NodeCache from 'node-cache';
import rateLimit from 'express-rate-limit';
const router = express.Router();

// 🧠 In-memory session store (keyed by phone number)
const lastOrderSummary = {};
const processedMessageIds = new Set();
const messageCache = new NodeCache({ stdTTL: 120 });
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});


const getMenuByCategory = async () => {
  const items = await Menu.find({});
  const categories = {};

  items.forEach(item => {
    const cat = item.category || 'Uncategorized';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({
      name: item.name,
      price: item.price
    });
  });

  return categories;
};


// Send WhatsApp message using Meta API
const sendMessage = async (to, body, buttons = []) => {
  const payload = {
    messaging_product: 'whatsapp',
    to,
  };

  if (buttons.length > 0) {
    payload.type = 'interactive';
    payload.interactive = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map((btn, i) => ({
          type: 'reply',
          reply: {
            id: `btn_${i + 1}`,
            title: btn,
          },
        })),
      },
    };
  } else {
    payload.text = { body };
  }

  try {
    console.log('🔐 Sending WhatsApp message...');

    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Message sent:', res.data);
  } catch (err) {
    console.error('❌ Failed to send message:', err.response?.data || err.message);
  }
};

// Webhook Verification (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});



// Webhook Handler (POST)
router.post('/', limiter, async (req, res) => {
  console.log('📨 Incoming POST from Meta');
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    // Skip if no actual message (like delivery notifications, status updates, etc.)
    if (!message) {
      console.log('📭 No message in payload. Ignored.');
      return res.sendStatus(200);
    }
    const messageId = message.id;
    if (messageCache.has(messageId)) return res.sendStatus(200);
    messageCache.set(messageId, true);

    const from = message.from;




    // Debounce duplicate messages
    if (processedMessageIds.has(messageId)) {
      console.log(`🛑 Duplicate message skipped: ${messageId}`);
      return res.sendStatus(200);
    }
    processedMessageIds.add(messageId);
    setTimeout(() => processedMessageIds.delete(messageId), 2 * 60 * 1000);


    let text = '';

    if (message?.text?.body) {
      text = message.text.body.toLowerCase();
    } else if (message?.interactive?.button_reply?.title) {
      text = message.interactive.button_reply.title.toLowerCase();
    } else if (message?.interactive?.list_reply?.title) {
      text = message.interactive.list_reply.title.toLowerCase();
    }

    if (!text || !from) return res.sendStatus(200);

    console.log(`📥 ${from}: ${text}`);

    //const menu = await getMenuFromDB();

    // Initialize session if not exists
    const sessionKey = `session:${from}`;
    let session = await redis.get(sessionKey);
    session = session ? JSON.parse(session) : {
      step: 'idle',
      tableId: 'whatsapp',
      items: [],
      total: 0,
    };


    // Detect table
    const tableMatch = text.match(/table\s*(\d+)/);
    if (tableMatch) {
      session.tableId = `${tableMatch[1]}`;
      session.step = 'idle';
      session.items = [];
      session.total = 0;
      await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });

      await sendMessage(from, `✅ Welcome to *Tastoria Table ${tableMatch[1]}*!`, [
        'Start Order'
      ]);
      return res.sendStatus(200);
    }
    if (text.includes('reset')) {
      await redis.del(sessionKey);
      await sendMessage(from, `🔄 Session has been reset. Type *start* to begin ordering again.`);
      return res.sendStatus(200);
    }
    
    // Handle step-based flow
    switch (session.step) {

      case 'chooseCategory': {
        const categorizedMenu = await getMenuByCategory();
        const selectedCategoryInput = text.trim();

        if (categorizedMenu[selectedCategoryInput]) {
          session.selectedCategory = selectedCategoryInput;
        } else {
          const matched = Object.keys(categorizedMenu).find(
            key => key.toLowerCase() === selectedCategoryInput.toLowerCase()
          );

          if (!matched) {
            await sendMessage(from, `❌ Invalid category. Please try again or type *start*.`);
            return res.sendStatus(200);
          }

          session.selectedCategory = matched;
        }

        session.step = 'chooseItemFromCategory';
        session.page = 0;
        await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });
        const items = categorizedMenu[session.selectedCategory];
        const pageItems = items.slice(0, 3);
        const buttons = pageItems.map(item => `${item.name} - ₹${item.price}`);
        if (items.length > 3) buttons.push('Next');

        await sendMessage(from, `📋 *${session.selectedCategory} Menu*`, buttons);
        return res.sendStatus(200);
      }


      case 'chooseItemFromCategory': {
        const categorizedMenu = await getMenuByCategory();
        const categoryItems = categorizedMenu[session.selectedCategory] || [];
        const page = session.page || 0;

        if (text.toLowerCase() === 'next') {
          session.page += 1;
          const nextItems = categoryItems.slice(session.page * 3, (session.page + 1) * 3);
          const buttons = nextItems.map(item => `${item.name} - ₹${item.price}`);
          if ((session.page + 1) * 3 < categoryItems.length) buttons.push('Next');

          await sendMessage(from, `📋 *${session.selectedCategory} Menu*`, buttons);
          await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });
          return res.sendStatus(200);
        }

        // Try matching the selected item
        const selectedItem = categoryItems.find(item =>
          text.toLowerCase().includes(item.name.toLowerCase())
        );

        if (selectedItem) {
          session.currentItem = selectedItem.name;

          session.step = 'chooseQty';
          await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });
          await sendMessage(from, `💵 *${selectedItem.name}* costs ₹${selectedItem.price}. How many would you like?`, ['1', '2', '3']);
          return res.sendStatus(200);
        }

        await sendMessage(from, `❌ Invalid selection. Choose from the menu buttons or tap *Next*.`);
        await sendMessage(from, `⚠️ I didn’t understand that. If things seem stuck, tap *Reset* to start fresh.`, ['Reset']);

        return res.sendStatus(200);
      }



      case 'chooseQty': {
        const qty = parseInt(text);
        const validQty = Number.isInteger(qty) && qty > 0 && qty <= 10;
        if (!validQty) {
          await sendMessage(from, `⚠️ Please enter a valid quantity (1-10).`);
        } else {
          const categorizedMenu = await getMenuByCategory();
          const allItems = Object.values(categorizedMenu).flat();
          const item = allItems.find(i => i.name === session.currentItem);

          if (!item) {
            await sendMessage(from, `⚠️ Couldn't find item details. Try again.`);
            session.step = 'chooseItemFromCategory';
            return res.sendStatus(200);
          }
          const price = item.price;

          const itemObj = {
            name: session.currentItem,
            quantity: qty,
            price,
          };
          session.items.push(itemObj);
          session.total += qty * price;
          session.step = 'review';
          session.summaryShown = false;
          await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });
          await sendMessage(from, `✅ Added ${qty} x ${session.currentItem}`);
          await sendMessage(from, `Add more or confirm?`, [
            'Add More',
            'Confirm Order',
          ]);
        }
        return res.sendStatus(200);
      }

      case 'review': {
        if (text.includes('add')) {
          if (session.step === 'chooseCategory') return res.sendStatus(200);

          const categorizedMenu = await getMenuByCategory();
          const categoryNames = Object.keys(categorizedMenu);

          const categoryListRows = categoryNames.map((name, i) => ({
            id: `cat_${i}`,
            title: name,
            description: `View items in ${name}`,
          }));

          await axios.post(
            `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: 'whatsapp',
              to: from,
              type: 'interactive',
              interactive: {
                type: 'list',
                header: {
                  type: 'text',
                  text: '🍽️ Menu Categories',
                },
                body: {
                  text: 'Select a category to add more dishes:',
                },
                action: {
                  button: 'View Categories',
                  sections: [{ title: 'Categories', rows: categoryListRows }],
                },
              },
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          );
          session.step = 'chooseCategory';
          session.page = 0;
          session.summaryShown = false;
          await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });


          return res.sendStatus(200);
        }


        if (text.includes('confirm')) {
          if (session.step === 'confirmPrompt') return res.sendStatus(200);
          if (!session.items.length) {
            await sendMessage(from, `⚠️ No items yet. Start with *menu* or type item name.`);
            return res.sendStatus(200);
          }

          let orderSummary = `🧾 *Final Order Summary:*\n`;
          session.items.forEach(item => {
            orderSummary += `- ${item.quantity} x ${item.name.toUpperCase()} = ₹${item.quantity * item.price}\n`;
          });
          orderSummary += `\n💰 *Total: ₹${session.total}*`;

          await sendMessage(from, orderSummary);
          await sendMessage(from, `🛒 Would you like to *place this order*?`, [
            'Yes, Place Order',
            'Cancel',
          ]);

          session.step = 'confirmPrompt';
          await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });
          return res.sendStatus(200);
        }

        if (!session.summaryShown) {
          let orderSummary = `🧾 *Order Summary:*\n`;
          session.items.forEach(item => {
            orderSummary += `- ${item.quantity} x ${item.name.toUpperCase()} = ₹${item.quantity * item.price}\n`;
          });
          orderSummary += `\n💰 *Total: ₹${session.total}*`;

          await sendMessage(from, orderSummary);
          await sendMessage(from, `Would you like to add more or confirm the order?`, [
            'Add More',
            'Confirm Order',
          ]);
          session.summaryShown = true;
          await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });
        }

        return res.sendStatus(200);
      }

      case 'confirmPrompt': {
        if (text.includes('yes')) {
          const order = await Order.create({
            tableId: session.tableId,
            customerName: '',
            phoneNumber: from,
            items: session.items,
            status: 'pending', // keep as pending
            total: session.total,
            orderTime: new Date(),
            source: 'whatsapp', // ✅ important for routing logic later
          });
          const io = req.app.get('io');
          io.emit('new-order', order);

          await sendMessage(from, `📦 *Order Received!*\nYour order is pending confirmation.\nWe'll notify you once it's confirmed by our staff.\n\n🍽️ *Tastoria Team*`);

          session.step = 'idle';
          session.items = [];
          session.total = 0;
          session.summaryShown = false;
          await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });
        } else if (text.includes('cancel')) {
          await sendMessage(from, `❌ Order cancelled. You can start again anytime by typing *start*.`);
          session.step = 'idle';
          session.items = [];
          session.total = 0;
          session.summaryShown = false;
          await redis.set(sessionKey, JSON.stringify(session), { EX: 30 * 60 });
        } else {
          await sendMessage(from, `❓ Please reply with *Yes* or *Cancel*.`);
        }

        return res.sendStatus(200);
      }




    }

    // Trigger start
    if (text.includes('start')) {
      session.step = 'chooseCategory';
      session.page = 0;
      await redis.set(sessionKey, JSON.stringify(session));
      const categorizedMenu = await getMenuByCategory();
      const categoryNames = Object.keys(categorizedMenu);

      const categoryListRows = categoryNames.map((name, i) => ({
        id: `cat_${i}`,
        title: name,
        description: `View items in ${name}`
      }));

      await axios.post(
        `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: from,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: {
              type: 'text',
              text: '🍽️ Menu Categories'
            },
            body: {
              text: 'Select a category to explore dishes:'
            },
            action: {
              button: 'View Categories',
              sections: [{ title: 'Categories', rows: categoryListRows }]
            }
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          }
        }
      );

      session.categories = categoryNames;
      session.step = 'chooseCategory';
      await redis.set(sessionKey, JSON.stringify(session));
      return res.sendStatus(200);
    }

    // Fallback
    await sendMessage(from, `👋 Hi! Type *start* to begin ordering.`);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Webhook error:', err.stack || err.message);
    return res.status(500).send('Internal server error');
  }
});

export default router;
