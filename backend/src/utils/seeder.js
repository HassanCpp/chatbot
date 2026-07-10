import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Inventory from '../models/Inventory.js';
import Coupon from '../models/Coupon.js';
import UploadedKnowledge from '../models/UploadedKnowledge.js';
import Conversation from '../models/Conversation.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import OpenAiService from '../services/openAiService.js';
import RagService from '../services/ragService.js';
import { connectDB } from '../config/db.js';
import { 
  initQdrant, 
  qdrantClient, 
  COLLECTION_NAME, 
  PRODUCTS_COLLECTION 
} from '../config/qdrant.js';
import { generateMockProducts } from './generators/productGenerator.js';
import { generateMockUsers } from './generators/userGenerator.js';
import { generateMockOrders } from './generators/orderGenerator.js';
import { generateMockReviews } from './generators/reviewGenerator.js';

dotenv.config();

// Helper to convert MongoDB ObjectId to Qdrant-compliant UUID
const mongoToUuid = (mongoId) => {
  const hex = '00000000' + mongoId.toString(); // Padded to 32 hex chars
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
};

const defaultCategories = [
  { name: 'T-Shirts', slug: 't-shirts', subCategories: ['Crew neck', 'V-neck', 'Oversized', 'Athletic'] },
  { name: 'Shirts', slug: 'shirts', subCategories: ['Formal', 'Business Casual', 'Flannel', 'Linen'] },
  { name: 'Jeans', slug: 'jeans', subCategories: ['Slim', 'Regular', 'Relaxed', 'Straight'] },
  { name: 'Hoodies', slug: 'hoodies', subCategories: ['Pullover', 'Zip-up'] },
  { name: 'Jackets', slug: 'jackets', subCategories: ['Bomber', 'Puffer', 'Denim', 'Softshell'] },
  { name: 'Activewear', slug: 'activewear', subCategories: ['Performance Tops', 'Leggings', 'Running Shorts'] },
  { name: 'Shoes', slug: 'shoes', subCategories: ['Sneakers', 'Trainers', 'Casual Shoes'] },
  { name: 'Accessories', slug: 'accessories', subCategories: ['Caps', 'Belts', 'Socks', 'Backpacks'] }
];

const defaultCoupons = [
  { code: 'WELCOME10', discountType: 'Percentage', discountValue: 10, minOrderValue: 0, isActive: true },
  { code: 'SUMMER25', discountType: 'Percentage', discountValue: 25, minOrderValue: 80, isActive: true },
  { code: 'FLAT20', discountType: 'Flat', discountValue: 20, minOrderValue: 100, isActive: true }
];

const brandKnowledgeDocs = [
  {
    fileName: 'novawear_shipping_policy.md',
    content: `# NovaWear Shipping Policy\n\n## Dispatch Times\n- Standard orders: Dispatched within 24 to 48 hours (business days only).\n- Weekend orders are dispatched on Monday mornings.\n\n## Shipping Rates & Transit Times\n1. **Standard Domestic (US)**:\n   - Rate: $5.99 USD\n   - Transit: 3 to 5 business days\n   - Free shipping: Applies automatically on all orders over $75.00 USD.\n2. **Express Domestic (US)**:\n   - Rate: $14.99 USD\n   - Transit: 1 to 2 business days.\n3. **International Shipping**:\n   - Rate: $19.99 USD (Flat rate, excluding customs duties)\n   - Transit: 7 to 14 business days depending on customs processing times.\n\n## Shipment Tracking\n- Once shipped, customers receive a FedEx tracking ID.\n- Tracking numbers updates can take up to 24 hours to reflect on the carrier site.`
  },
  {
    fileName: 'novawear_return_policy.md',
    content: `# NovaWear Returns & Exchange Policy\n\n## General Conditions\n- We offer a **30-day return window** from the day your package was delivered.\n- Items must be returned in original conditions: unworn, unwashed, unaltered, and with all product tags still attached.\n\n## How to Return\n1. Log in to the returns center with your Order ID and Email.\n2. Generate a prepaid USPS shipping label (Free return labels apply for US continental returns only).\n3. Securely package your item and drop it off at any local post office.\n\n## Refund Timelines\n- Returns are inspected within 2-4 business days of arrival at our central warehouse in Portland.\n- Once approved, refunds are credited back to the original payment method. The credit is processed by banks within 5 to 7 business days.`
  },
  {
    fileName: 'novawear_size_guides.md',
    content: `# NovaWear Sizing & Measurement Guide\n\nAll NovaWear items are unisex unless stated otherwise. Streetwear fits are typically slightly oversized.\n\n## Unisex Oversized Tees & Hoodies (Inches)\n- **Size S**: Chest 34"-36" | Waist 28"-30" | Sleeve 31.5"\n- **Size M**: Chest 38"-40" | Waist 32"-34" | Sleeve 32.5"\n- **Size L**: Chest 42"-44" | Waist 36"-38" | Sleeve 33.5"\n- **Size XL**: Chest 46"-48" | Waist 40"-42" | Sleeve 34.5"\n\n## Bottoms & Denim Jeans (Waist Inches)\n- **Size 30**: Waist 30" | Inseam 32" | Hip 38"\n- **Size 32**: Waist 32" | Inseam 32" | Hip 40"\n- **Size 34**: Waist 34" | Inseam 34" | Hip 42"\n- **Size 36**: Waist 36" | Inseam 34" | Hip 44"\n\n## Recommendation Rules\n- If you prefer a tailored fit for oversized items, we recommend ordering **one size down**.`
  },
  {
    fileName: 'novawear_brand_information.md',
    content: `# NovaWear Brand Story & Materials Guide\n\n## Our Philosophy\nNovaWear was founded in 2024 to engineer high-grade, sustainable urban clothing. We blend minimalist premium utility garments with responsible raw fabrics.\n\n## Materials Matrix\n- **Organic Cotton**: Certified organic fibers grown without chemicals. Used in our core 280 GSM tees. Soft, strong, and highly breathable.\n- **European Flax Linen**: Grown naturally in Europe. Extremely cool and breathable, perfect for summer camp-collar shirts.\n- **Wool-Alpaca Knits**: Harvested responsibly. Cardigans are blended with alpaca to increase softness and long-term yarn elasticity.\n- **Recycled Nylon**: Technical water repellent shell fabrics. Sourced from ocean-bound fish nets.\n\n## Manufacturing locations\nOur mills are located in Portugal (knits, jersey tees) and northern Italy (woolen sweater cards).`
  }
];

export const seedDatabase = async () => {
  try {
    console.log('Clearing MongoDB database collections...');
    await Category.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});
    await Inventory.deleteMany({});
    await UploadedKnowledge.deleteMany({});
    await Conversation.deleteMany({});
    await Cart.deleteMany({});
    await Wishlist.deleteMany({});
    await Coupon.deleteMany({});

    console.log('Seeding Category tags...');
    await Category.insertMany(defaultCategories);

    console.log('Generating 1,000 realistic clothing garments...');
    const rawProducts = generateMockProducts(1000);
    const createdProducts = await Product.insertMany(rawProducts);
    console.log('✅ 1,000 products seeded in MongoDB.');

    console.log('Syncing warehouse Inventory stock levels...');
    const inventoryLogs = createdProducts.map(p => ({
      productId: p._id,
      stock: p.stock,
      reservedStock: p.reservedStock,
      warehouseLocation: `Warehouse ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`, // Warehouse A, B or C
      restockThreshold: 15
    }));
    await Inventory.insertMany(inventoryLogs);
    console.log('✅ Inventory levels synched.');

    console.log('Generating 500 customer users with style preferences...');
    const rawUsers = generateMockUsers(500);
    const createdUsers = await User.insertMany(rawUsers);
    console.log('✅ 500 users seeded in MongoDB.');

    console.log('Generating 2,000 realistic purchase orders...');
    const rawOrders = generateMockOrders(createdUsers, createdProducts, 2000);
    await Order.insertMany(rawOrders);
    console.log('✅ 2,000 orders seeded in MongoDB.');

    console.log('Generating 10,000+ customer reviews...');
    const rawReviews = generateMockReviews(createdUsers, createdProducts, 10100);
    await Review.insertMany(rawReviews);
    console.log('✅ 10,100 reviews seeded in MongoDB.');

    console.log('Seeding promotional Coupons...');
    await Coupon.insertMany(defaultCoupons);
    console.log('✅ Coupons seeded.');

    // --- Vector Seeding (RAG + Semantic Product Catalog Search) ---
    try {
      console.log('Initializing Qdrant Vector collections...');
      await initQdrant();

      // Clear both collections to prevent old overlaps
      try { await qdrantClient.deleteCollection(COLLECTION_NAME); } catch (e) {}
      try { await qdrantClient.deleteCollection(PRODUCTS_COLLECTION); } catch (e) {}
      
      await initQdrant();

      // 1. Indexing company policy files in COLLECTION_NAME
      console.log('Vectorizing brand knowledge rules (RAG)...');
      for (const kbDoc of brandKnowledgeDocs) {
        const buffer = Buffer.from(kbDoc.content, 'utf-8');
        const fileInfo = {
          originalname: kbDoc.fileName,
          path: 'seeded',
          mimetype: 'text/markdown',
          size: buffer.length
        };
        await RagService.indexDocument(fileInfo, buffer);
      }

      // 1.5. Indexing pre-uploaded knowledge files in COLLECTION_NAME
      console.log('Scanning uploads directory for previously uploaded files...');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log(`Found ${files.length} files in uploads directory. Indexing them...`);
        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            let mimetype = '';
            if (file.endsWith('.docx')) {
              mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            } else if (file.endsWith('.pdf')) {
              mimetype = 'application/pdf';
            } else if (file.endsWith('.txt')) {
              mimetype = 'text/plain';
            } else if (file.endsWith('.md')) {
              mimetype = 'text/markdown';
            } else {
              continue;
            }

            const match = file.match(/^\d+-\d+-(.+)$/);
            const originalname = match ? match[1] : file;

            const fileInfo = {
              originalname,
              path: filePath,
              mimetype,
              size: stat.size
            };

            const buffer = fs.readFileSync(filePath);
            try {
              await RagService.indexDocument(fileInfo, buffer);
              console.log(`Indexed uploaded file: ${originalname}`);
            } catch (err) {
              console.error(`Failed to index file ${file}:`, err.message);
            }
          }
        }
      }
      console.log('✅ RAG documentation vectorized and synced.');

      // 2. Indexing Products for Semantic Search in PRODUCTS_COLLECTION (Batch requests of 100)
      console.log('Vectorizing product catalog in batches of 100...');
      const batchSize = 100;
      let totalIndexed = 0;

      for (let i = 0; i < createdProducts.length; i += batchSize) {
        const productSlice = createdProducts.slice(i, i + batchSize);
        
        // Build descriptive metadata text block for the embedding model
        const textBlocks = productSlice.map(p => {
          return `${p.name} (SKU: ${p.sku}) - ${p.category} > ${p.subCategory}. ` +
                 `Material: ${p.material}. Fit: ${p.fit}. Fabric type: ${p.fabricType} with ${p.gsm} GSM. ` +
                 `Description: ${p.description} Colors available: ${p.colors.join(', ')}. ` +
                 `Sizes: ${p.sizes.join(', ')}. Season: ${p.season}. Occasion: ${p.occasion.join(', ')}. ` +
                 `Tags: ${p.tags.join(', ')}.`;
        });

        // Request embeddings batch from OpenAI
        const embeddings = await OpenAiService.getEmbeddingsBatch(textBlocks);

        // Build Qdrant points
        const points = productSlice.map((p, idx) => {
          const pointId = mongoToUuid(p._id);
          return {
            id: pointId,
            vector: embeddings[idx],
            payload: {
              productId: p._id.toString(),
              sku: p.sku,
              name: p.name,
              price: p.price,
              category: p.category,
              subCategory: p.subCategory,
              colors: p.colors,
              sizes: p.sizes,
              material: p.material,
              fit: p.fit,
              description: p.description,
              text: textBlocks[idx]
            }
          };
        });

        // Upload to Qdrant
        await qdrantClient.upsert(PRODUCTS_COLLECTION, {
          wait: true,
          points: points
        });

        totalIndexed += points.length;
        console.log(`  Indexed products ${totalIndexed}/${createdProducts.length}...`);
      }
      console.log('✅ Semantic Product Vector catalog index created in Qdrant.');

    } catch (vectorErr) {
      console.warn('⚠️ WARNING: Qdrant service is offline. Semantic product search vectors skipped:', vectorErr.message);
    }

    console.log('🎉 Seeding process completed successfully!');
    return {
      success: true,
      message: 'Seeded 1,000 products, 500 users, 2,000 orders, 10,100 reviews, default coupons, and synced semantic product/knowledge vectors.'
    };
  } catch (error) {
    console.error('❌ Database seeding error:', error);
    throw error;
  }
};

if (process.argv[1] && process.argv[1].endsWith('seeder.js')) {
  (async () => {
    await connectDB();
    await seedDatabase();
    mongoose.connection.close();
  })();
}
