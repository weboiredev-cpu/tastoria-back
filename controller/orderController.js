import Order from '../models/order.js';
import Menu from '../models/menu.js'; 

export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Validate status values as per your allowed enum
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
};


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
    const order = await Order.findOne({ tableId }).sort({ orderTime: -1 }); // latest order first


    if (!order) {
      return res.status(404).json({ message: 'Order not found for this table' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getPopularItems = async (req, res) => {
  try {
    const popularItems = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name", // group by item name
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: [
                "$items.quantity",
                { $toDouble: "$items.price" }
              ]
            }
          }
        }
      },
      {
        // Join with Menu to get Cloudinary image
        $lookup: {
          from: "menus",           // <-- collection name in MongoDB (lowercase plural of model)
          localField: "_id",       // item name from orders
          foreignField: "name",    // field in Menu model
          as: "menuInfo"
        }
      },
      { $unwind: { path: "$menuInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: "$_id",
          orders: "$totalSold",
          revenue: "$totalRevenue",
          image: "$menuInfo.imageUrl" // <-- Cloudinary URL from menu
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 10 }
    ]);

    res.json(popularItems);
  } catch (error) {
    console.error("Popular items error details:", error);
    res.status(500).json({
      error: "Server error fetching popular items",
      details: error.message
    });
  }
};
