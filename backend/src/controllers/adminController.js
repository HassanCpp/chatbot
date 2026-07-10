import fs from 'fs';
import { seedDatabase } from '../utils/seeder.js';
import RagService from '../services/ragService.js';
import UploadedKnowledge from '../models/UploadedKnowledge.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';

/**
 * Admin Controller for database seeding, file uploading,
 * re-indexing knowledge, and editing product inventory.
 */

// Seed database with mock e-commerce contents
export const seedDB = async (req, res) => {
  try {
    const result = await seedDatabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: `Failed to seed database: ${error.message}` });
  }
};

// Upload knowledge documents and index in Qdrant + MongoDB
export const uploadKnowledge = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded. Please attach one or more PDF, DOCX, TXT, or MD documents.' });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const buffer = fs.readFileSync(file.path);
        const docMeta = await RagService.indexDocument(file, buffer);
        results.push(docMeta);
      } catch (err) {
        console.error(`Error indexing document ${file.originalname}:`, err);
        errors.push({ fileName: file.originalname, error: err.message });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return res.status(500).json({
        error: `All ${errors.length} file uploads failed to parse/index. See logs.`,
        details: errors
      });
    }

    res.json({
      success: true,
      message: `Successfully processed and indexed ${results.length} files. ${errors.length > 0 ? `Failed ${errors.length} files.` : ''}`,
      documents: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Upload knowledge error:', error);
    res.status(500).json({ error: error.message });
  }
};

// List all indexed files in database
export const listKnowledge = async (req, res) => {
  try {
    const docs = await UploadedKnowledge.find({}).sort({ createdAt: -1 }).lean();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete indexed knowledge
export const deleteKnowledge = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await RagService.deleteDocument(id);
    res.json({
      success: true,
      message: `Successfully deleted document ${doc.fileName} and cleared its RAG vectors.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Trigger full re-indexing of documents
export const reindexKnowledge = async (req, res) => {
  try {
    const count = await RagService.reindexAll();
    res.json({
      success: true,
      message: `Successfully re-indexed ${count} documents.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// List products
export const getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ sku: 1 }).lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add product
export const addAdminProduct = async (req, res) => {
  try {
    const prodData = req.body;
    const newProduct = await Product.create(prodData);
    
    // Add default inventory log
    await Inventory.create({
      productId: newProduct._id,
      stock: newProduct.stock || 0,
      reservedStock: 0,
      warehouseLocation: 'Warehouse A',
      restockThreshold: 10
    });

    res.json({ success: true, product: newProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product
export const updateAdminProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
    
    // Sync stock in inventory as well
    if (req.body.stock !== undefined) {
      await Inventory.findOneAndUpdate(
        { productId: id },
        { stock: req.body.stock },
        { upsert: true }
      );
    }

    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete product
export const deleteAdminProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await Product.findByIdAndDelete(id);
    await Inventory.deleteOne({ productId: id });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// List Inventory audit
export const getAdminInventory = async (req, res) => {
  try {
    const items = await Inventory.find({}).populate('productId', 'sku name price').lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update inventory stock levels
export const updateAdminInventory = async (req, res) => {
  const { id } = req.params;
  const { stock, reservedStock, restockThreshold } = req.body;
  try {
    const inv = await Inventory.findById(id);
    if (!inv) return res.status(404).json({ error: 'Inventory log not found' });

    if (stock !== undefined) inv.stock = stock;
    if (reservedStock !== undefined) inv.reservedStock = reservedStock;
    if (restockThreshold !== undefined) inv.restockThreshold = restockThreshold;
    await inv.save();

    // Sync product main stock
    await Product.findByIdAndUpdate(inv.productId, { stock: inv.stock });

    res.json({ success: true, inventory: inv });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
