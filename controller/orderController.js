import Order from '../models/order.js';

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getRecentOrders = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const recentOrders = await Order.find({ orderTime: { $gte: since } })
      .sort({ ordertime: -1 });

    res.json({ success: true, orders: recentOrders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};
//test----------------------------------------------------------------
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find(); // No filter, get everything
    res.json({ success: true, total: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all orders', error: error.message });
  }
};
//test-----------------------------------------------------------------

// ✅ NEW FUNCTION to get order by table number
export const getOrderByTableId = async (req, res) => {
  try {
    const tableId = req.params.tableId;
    const order = await Order.findOne({ tableId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found for this table' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
