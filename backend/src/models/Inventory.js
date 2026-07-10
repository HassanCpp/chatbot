import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  stock: { type: Number, required: true, default: 0 },
  reservedStock: { type: Number, default: 0 },
  warehouseLocation: { type: String, default: 'Warehouse A' },
  restockThreshold: { type: Number, default: 10 }
}, {
  timestamps: true
});

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
