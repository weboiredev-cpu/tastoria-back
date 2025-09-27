// ---------------------------------------------------------------- //
// FILE: server.js
// ---------------------------------------------------------------- //
// This is the main file that starts your server.
// It sets up Express, connects to MongoDB, and initializes Socket.IO.
// ---------------------------------------------------------------- //

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // To manage environment variables

const Order = require('./models/Order'); // Import the Order model

const app = express();
const server = http.createServer(app);
const frontendURL = 'https://www.tastoria.in' || 'https://tastoria-front.vercel.app' || 'https://tastoria.in' || 'https://tastoria-back.onrender.com' || 'http://localhost:3000' ;
// --- Middleware Setup ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // To parse JSON request bodies

// --- Socket.IO Setup ---
// This allows for real-time communication between the server and clients.

const io = new Server(server, {
  cors: {
    origin:  frontendURL, // Allow connections from any origin
    methods: ["GET", "POST", "PUT"]
  }
});

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI, { // Corrected variable name
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));


// --- API ROUTES ---

// GET /api/orders - Fetches all orders from the database
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderTime: -1 }); // Get newest orders first
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// POST /api/orders - Creates a new order
// This is where new orders are received and saved.
app.post('/api/orders', async (req, res) => {
  try {
    const { tableId, customerName, phoneNumber, userEmail, source, items, total } = req.body;

    // Basic validation (updated to match new schema)
    if (!tableId || !items || !total) {
        return res.status(400).json({ message: 'Missing required order fields: tableId, items, and total are required.' });
    }

    const newOrder = new Order({
      tableId,
      customerName,
      phoneNumber,
      userEmail,
      source,
      items,
      total,
      status: 'pending', // All new orders start as pending
      orderTime: new Date(),
    });

    const savedOrder = await newOrder.save();

    // Broadcast the new order to all connected clients (your admin panel)
    io.emit('new-order', savedOrder);

    res.status(201).json({ message: 'Order created successfully', order: savedOrder });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});


// PUT /api/orders/:orderId/status - Updates an order's status
app.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true } // Return the updated document
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        // Broadcast the updated order to all clients
        io.emit('order-updated', updatedOrder);

        res.status(200).json({ message: 'Order status updated', order: updatedOrder });

    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
});


// --- Socket.IO Connection Handler ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// ---------------------------------------------------------------- //
// FILE: models/Order.js
// ---------------------------------------------------------------- //
// This file defines the structure (schema) for the orders
// that will be stored in your MongoDB database.
// ---------------------------------------------------------------- //

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  tableId: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: false,
  },
  userEmail: {
    type: String,
    required: false
  },
  items: [
    {
      name: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: String,
        required: true,
      },
    },
  ],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
  source: {
    type: String,
    enum: ['website', 'whatsapp'],
    default: 'website'
  },
  total: {
    type: Number,
    required: true,
  },
  orderTime: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);


// ---------------------------------------------------------------- //
// FILE: package.json
// ---------------------------------------------------------------- //
// This file lists the project dependencies.
// Run `npm install` in your terminal to install them.
// ---------------------------------------------------------------- //

/*
{
  "name": "order-backend",
  "version": "1.0.0",
  "description": "Backend server for the order management system.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "mongoose": "^7.0.3",
    "socket.io": "^4.6.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
*/


// ---------------------------------------------------------------- //
// FILE: .env
// ---------------------------------------------------------------- //
// Create this file in the root of your project to store secrets.
// ---------------------------------------------------------------- //


PORT=5000
MONGODB_URI="mongodb+srv://webdevelopment2213:Sanu2005@cluster0.ticsp.mongodb.net/yourDatabaseName?retryWrites=true&w=majority&appName=Cluster0"

