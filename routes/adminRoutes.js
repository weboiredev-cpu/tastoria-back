  import express from 'express';
  import Order from '../models/order.js';
  import User from '../models/User.js';
  import Visitor from '../models/visitor.js';
  import { send } from '../utils/send.js';

  const router = express.Router();

  router.get('/stats', async (req, res) => {
    try {
      const orders = await Order.find();
      const users = await User.find();
      const visitorData = await Visitor.findOne(); // ✅ Fetch visitor doc

      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const revenue = orders
    .filter(o => o.status !== 'cancelled') // Exclude cancelled orders
    .reduce((sum, o) => sum + (o.total || 0), 0);

    {/* const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0); // ✅ Prevent NaN*/}
      const activeUsers = users.length;
      const visitorCount = visitorData?.count || 0;

      res.json({
        totalOrders,
        pendingOrders,
        revenue,
        activeUsers,
        visitorCount
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
    }
  }
);

router.patch('/orders/:id/confirm', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    await sendMessage(order.phoneNumber, `✅ *Your order has been confirmed!* 🍽️\nWe’ll notify you when it’s ready.`);

    res.json({ message: 'Order confirmed', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm order', error: error.message });
  }
});

  export default router;
