import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  preferences: {
    size: { type: String, default: 'M' },
    color: { type: String, default: 'Midnight Black' },
    category: { type: String, default: 'T-Shirts' },
    budget: { type: Number, default: 80 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
