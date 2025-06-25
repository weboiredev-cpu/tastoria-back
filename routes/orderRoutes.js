// routes/orderRoutes.js
import express from 'express';
import Order from '../models/order.js';
import { getOrderById, getOrderByTableId } from '../controller/orderController.js';

const router = express.Router();

router.post('/place', async (req, res) => {
  try {
    const { tableId, customerName, phoneNumber, items, total, orderTime } = req.body;

    const order = new Order({
      tableId,
      customerName,
      phoneNumber,
      items,
      total,
      orderTime,
    });

    await order.save();

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
  
});
router.get('/table/:tableId', getOrderByTableId);

export default router;
