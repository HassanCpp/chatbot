import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  brand: { type: String, default: 'NovaWear' },
  category: { type: String, required: true }, // e.g., 'Tops', 'Bottoms'
  subCategory: { type: String }, // e.g., 'T-Shirts', 'Hoodies', 'Jeans'
  gender: { type: String, enum: ['Men', 'Women', 'Unisex', 'Kids'], default: 'Unisex' },
  collectionName: { type: String }, // e.g., 'Winter Essentials', 'Summer Breeze' (renamed from 'collection' to avoid schema keyword conflicts)
  fit: { type: String }, // e.g., 'Slim Fit', 'Oversized', 'Regular'
  material: { type: String }, // e.g., '100% Organic Cotton', 'Linen Blend'
  fabricType: { type: String }, // e.g., 'Knit', 'Woven', 'Denim'
  gsm: { type: Number }, // Grams per square meter, important for garments
  season: { type: String }, // e.g., 'Fall/Winter', 'Spring/Summer'
  occasion: [{ type: String }], // e.g., ['Casual', 'Streetwear', 'Athletic']
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // percentage discount
  currency: { type: String, default: 'USD' },
  colors: [{ type: String }], // e.g., ['Black', 'Off-White', 'Olive']
  sizes: [{ type: String }], // e.g., ['S', 'M', 'L', 'XL']
  stock: { type: Number, required: true, default: 0 },
  reservedStock: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  reviewCount: { type: Number, default: 0 },
  features: [{ type: String }], // key characteristics
  careInstructions: { type: String },
  tags: [{ type: String }],
  thumbnail: { type: String },
  images: [{ type: String }]
}, {
  timestamps: true
});

// Indexing for search purposes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
