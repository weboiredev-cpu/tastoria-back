import express from 'express';
  import User from '../models/User.js';

  const router = express.Router();

  // Save or update Google user data
  router.post('/auth', async (req, res) => {
    const { email, name, image } = req.body;

    try {
      let user = await User.findOne({ email });

      if (!user) {
        user = new User({ email, name, image });
      } else {
        user.name = name;
        user.image = image;
      }

      await user.save();
      res.status(200).json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update phone before order confirmation
  router.put('/phone', async (req, res) => {
    const { email, phone } = req.body;

    try {
      const user = await User.findOneAndUpdate(
        { email },
        { phone },
        { new: true }
      );

      if (!user) return res.status(404).json({ error: 'User not found' });

      res.status(200).json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get user by email (used in NextAuth callbacks)
  router.get('/check', async (req, res) => {
    const { email } = req.query;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });



  export default router;
