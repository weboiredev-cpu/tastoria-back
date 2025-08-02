import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  count: {
    type: Number,
    required:true,
    default: 0,
  },
});

export default mongoose.models.Visitor || mongoose.model('Visitor', visitorSchema);
