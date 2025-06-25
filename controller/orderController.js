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
