import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number, // Store as a number, not string like '₹50'
    required: true,
  },
  category: {
    type: String, // e.g., "Drinks", "Main Course"
  },
  imageUrl: {
   type :String,
  },
  paused: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Menu = mongoose.model('Menu', menuItemSchema);
export default Menu;
