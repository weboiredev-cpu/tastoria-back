import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: String,
  image: String,
  phone: String // Store before order
});

const User = mongoose.model('User', userSchema);
export default User;
