import express from 'express';
import Menu from '../models/menu.js';
import upload from '../middleware/upload.js';
import path from 'path';

const router = express.Router();

// Add new menu item
router.post('/add', upload.single('image'),async (req, res) => {
  try {
    const { name, price, category} = req.body;
    const image = req.file;

    const newItem = new Menu({ name, price, category, image:image ?{
        data: image.buffer,
            contentType: image.mimetype,
    } :undefined,
});
    await newItem.save();

    res.status(201).json({ success: true, menuItem: newItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// PUT /api/menu/toggle/:id
router.put("/toggle/:id", async (req, res) => {
  const { id } = req.params;
  const { paused } = req.body;

  try {
    const item = await Menu.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    item.paused = paused;
    await item.save();
    const io = req.app.get("io"); // Get socket.io instance
    io.emit("menuStatusChanged", {
      itemId: item._id,
      paused: item.paused,
    });

    res.json({ success: true, message: `Item ${paused ? "paused" : "resumed"}` });
  } catch (error) {
    console.error("Error toggling menu item:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put('/update/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, price, category, description } = req.body;
    const file = req.file;
  
    try {
      const updatedFields = {
        name,
        price,
        category,
        description,
      };
  
      if (file) {
        updatedFields.image = {
          data: file.buffer,
          contentType: file.mimetype,
        };
      }
  
      const updatedItem = await Menu.findByIdAndUpdate(id, updatedFields, { new: true });
      if (!updatedItem) return res.status(404).json({ success: false, message: 'Item not found' });
  
      res.json({ success: true, item: updatedItem });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Update failed' });
    }
  });
  
  router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const deletedItem = await Menu.findByIdAndDelete(id);
      if (!deletedItem) return res.status(404).json({ success: false, message: 'Item not found' });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Delete failed' });
    }
  });

  // Upload image only and return a data URI
router.post('/upload', upload.single('image'), (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: "No image uploaded" });
      }
  
      const imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      return res.json({ success: true, imageUrl });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ success: false, message: "Upload failed" });
    }
  });
  

// Get all menu items
router.get('/all', async (req, res) => {
  try {
    const items = await Menu.find();
    const formattedItems = items.map(item => ({
        ...item._doc,
        img: item.image?.data
          ? `data:${item.image.contentType};base64,${item.image.data.toString('base64')}`
          : '',
      }));
      res.status(200).json({ success: true, items: formattedItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
