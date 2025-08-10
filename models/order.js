import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  tableId: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: false,
  },
  phoneNumber: {                            // ✅ Ensure phone number is required
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
},{timestamps:true});

// Avoid model overwrite error in development
export default mongoose.models.Order || mongoose.model('Order', orderSchema);
