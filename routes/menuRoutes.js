import express from 'express';
import Menu from '../models/menu.js';
import upload from '../middleware/upload.js';
import path from 'path';
import streamifier from "streamifier";
import cloudinary from '../utils/cloudinary.js';

const router = express.Router();

// Add new menu item
router.post('/add', upload.single('image'),async (req, res) => {
  try {
    const { name, price, category} = req.body;
    let imageUrl='';

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "tastoria/menu" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
     imageUrl = uploadResult.secure_url;
    }


    const newItem = new Menu({
      name,
      price: parseFloat(price),
      category,
      imageUrl // store just the URL in DB
    });

    await newItem.save();
    res.status(201).json({ success: true, menuItem: newItem });
  }catch (err) {
  console.error("Add menu item error:", err);
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
  
    try {
       let updatedFields = { name, price: parseFloat(price), category, description };
  
      if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "tastoria/menu" },
          (error, result) => (result ? resolve(result) : reject(error))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      updatedFields.imageUrl = result.secure_url;
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
   
      res.status(200).json({ success: true,items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
