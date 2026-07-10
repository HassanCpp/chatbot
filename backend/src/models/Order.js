import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String },
  size: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  thumbnail: { type: String }
});

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, // e.g., NW-1002
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  couponUsed: { type: String },
  shippingAddress: {
    recipient: { type: String },
    addressLine1: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String }
  },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Paid' },
  status: { type: String, enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Processing' },
  trackingNumber: { type: String },
  carrier: { type: String, default: 'FedEx' },
  estimatedDelivery: { type: Date }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
