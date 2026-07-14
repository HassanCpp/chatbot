import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, Trash2, RefreshCw, Database, ShoppingBag, 
  Layers, AlertTriangle, CheckCircle, FileText, Plus,
  Edit, Eye, Save, Loader2
} from 'lucide-react';
import { API_BASE } from '../App';

/**
 * Format MIME type to a short, user-friendly extension string
 * for display badges on the Knowledge Base table.
 */
const formatFileType = (mimeType) => {
  if (!mimeType) return 'DOC';
  const lower = mimeType.toLowerCase();
  if (lower.includes('wordprocessingml') || lower.includes('msword')) return 'DOCX';
  if (lower.includes('pdf')) return 'PDF';
  if (lower.includes('markdown') || lower.includes('md')) return 'Markdown';
  if (lower.includes('plain') || lower.includes('txt')) return 'Text';
  const parts = mimeType.split('/');
  return parts[1] ? parts[1].toUpperCase() : 'DOC';
};

/**
 * AdminDashboard Page Component:
 * Admin management portal that handles:
 * - Document Upload & RAG Indexing management (PDF, Word, Markdown, Text).
 * - MongoDB database seeding & reset trigger.
 * - Product catalog creation, editing, and deletion.
 * - Live Inventory levels update forms.
 */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('rag'); // 'rag' | 'products' | 'inventory'
  
  // RAG States
  const [kbDocs, setKbDocs] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [ragStatusMessage, setRagStatusMessage] = useState('');

  // Products States
  const [products, setProducts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '', name: '', price: 0, category: 'Tops', subCategory: '',
    description: '', stock: 10, colors: '', sizes: '', material: 'Cotton'
  });

  // Inventory States
  const [inventory, setInventory] = useState([]);
  const [editingInvId, setEditingInvId] = useState(null);
  const [editInvVal, setEditInvVal] = useState({ stock: 0, reservedStock: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('novawear_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && user.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadRagDocs();
    loadProducts();
    loadInventory();
  }, []);

  // API Call: Fetch RAG Docs
  const loadRagDocs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/knowledge/list`);
      setKbDocs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // API Call: Fetch Products
  const loadProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/products`);
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // API Call: Fetch Inventory Logs
  const loadInventory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/inventory`);
      setInventory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // API Call: Seed Database
  const triggerSeed = async () => {
    if (!window.confirm('This will wipe all existing collections and load clean default products, orders, reviews, and RAG knowledge. Proceed?')) return;
    setIsSeeding(true);
    setRagStatusMessage('Wiping database and seeding items...');
    try {
      const res = await axios.post(`${API_BASE}/admin/seed`);
      setRagStatusMessage(res.data.message);
      loadRagDocs();
      loadProducts();
      loadInventory();
    } catch (err) {
      setRagStatusMessage(`Seeding failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // API Call: File Indexing
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }
    setIsUploading(true);
    setRagStatusMessage(`Vectorizing and indexing ${selectedFiles.length} files. Please wait, do not refresh or close this page...`);

    try {
      const res = await axios.post(`${API_BASE}/admin/knowledge/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedFiles([]);
      setRagStatusMessage(res.data.message);
      loadRagDocs();
    } catch (err) {
      setRagStatusMessage(`Upload error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // API Call: Delete Document
  const handleDeleteDoc = async (id) => {
    if (!window.confirm('Delete this document and clear its vectors from Qdrant?')) return;
    try {
      const res = await axios.delete(`${API_BASE}/admin/knowledge/delete/${id}`);
      setRagStatusMessage(res.data.message);
      loadRagDocs();
    } catch (err) {
      setRagStatusMessage(`Delete failed: ${err.message}`);
    }
  };

  // API Call: Reindex
  const triggerReindex = async () => {
    setIsReindexing(true);
    setRagStatusMessage('Re-indexing all uploaded documents in MongoDB...');
    try {
      const res = await axios.post(`${API_BASE}/admin/knowledge/reindex`);
      setRagStatusMessage(res.data.message);
      loadRagDocs();
    } catch (err) {
      setRagStatusMessage(`Reindexing failed: ${err.message}`);
    } finally {
      setIsReindexing(false);
    }
  };

  // API Call: Add Product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const formatted = {
        ...newProduct,
        slug: newProduct.name.toLowerCase().replace(/ /g, '-'),
        colors: newProduct.colors.split(',').map(c => c.trim()),
        sizes: newProduct.sizes.split(',').map(s => s.trim())
      };
      await axios.post(`${API_BASE}/admin/products`, formatted);
      setShowAddForm(false);
      setNewProduct({
        sku: '', name: '', price: 0, category: 'Tops', subCategory: '',
        description: '', stock: 10, colors: '', sizes: '', material: 'Cotton'
      });
      loadProducts();
      loadInventory();
    } catch (err) {
      alert(`Failed to add product: ${err.message}`);
    }
  };

  // API Call: Save Inventory stock update
  const startEditInventory = (inv) => {
    setEditingInvId(inv._id);
    setEditInvVal({ stock: inv.stock, reservedStock: inv.reservedStock });
  };

  const saveInventoryUpdate = async (id) => {
    try {
      await axios.put(`${API_BASE}/admin/inventory/${id}`, editInvVal);
      setEditingInvId(null);
      loadInventory();
      loadProducts();
    } catch (err) {
      alert(`Inventory update failed: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', width: '95%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Admin Title / Action Toolbar */}
      <header className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={24} color="var(--primary-accent)" /> NovaWear Admin Dashboard
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Control vector RAG files, seed default catalogue, and audit warehouse inventory levels.</p>
        </div>
      </header>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setActiveTab('rag')} 
          className={`glass-button ${activeTab === 'rag' ? 'active' : ''}`}
        >
          <Layers size={16} /> RAG Document Manager ({kbDocs.length})
        </button>
        <button 
          onClick={() => setActiveTab('products')} 
          className={`glass-button ${activeTab === 'products' ? 'active' : ''}`}
        >
          <ShoppingBag size={16} /> Products Catalogue ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('inventory')} 
          className={`glass-button ${activeTab === 'inventory' ? 'active' : ''}`}
        >
          <RefreshCw size={16} /> Inventory Auditor ({inventory.length})
        </button>
      </div>

      {/* Log Feed Console (RAG alerts, uploads status) */}
      {ragStatusMessage && (
        <div className="glass-panel" style={{
          padding: '14px 20px',
          background: 'rgba(0, 242, 254, 0.05)',
          borderLeft: '4px solid var(--primary-accent)',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{ragStatusMessage}</span>
          <button onClick={() => setRagStatusMessage('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>Dismiss</button>
        </div>
      )}

      {/* TAB CONTENT: RAG FILES */}
      {activeTab === 'rag' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
          
          {/* Files List Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>Indexed RAG Documents</h2>
              <button onClick={triggerReindex} className="glass-button" disabled={isReindexing}>
                <RefreshCw size={14} className={isReindexing ? 'animate-spin' : ''} /> Re-Index All
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>Filename</th>
                  <th style={{ padding: '12px 8px' }}>File Type</th>
                  <th style={{ padding: '12px 8px' }}>Size</th>
                  <th style={{ padding: '12px 8px' }}>Chunks</th>
                  <th style={{ padding: '12px 8px' }}>Qdrant Vector Sync</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {kbDocs.map((doc) => (
                  <tr key={doc._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--primary-accent)" />
                      <strong>{doc.fileName}</strong>
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--text-muted)' }}>{formatFileType(doc.fileType)}</td>
                    <td style={{ padding: '14px 8px' }}>{(doc.fileSize / 1024).toFixed(1)} KB</td>
                    <td style={{ padding: '14px 8px', fontWeight: '600' }}>{doc.chunkCount}</td>
                    <td style={{ padding: '14px 8px' }}>
                      {doc.indexed ? (
                        <span style={{ color: 'var(--success-accent)', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>Synced (Qdrant)</span>
                      ) : (
                        <span style={{ color: 'var(--error-accent)', background: 'rgba(255,74,90,0.1)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>Failed</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteDoc(doc._id)} className="glass-button" style={{ padding: '6px', color: 'var(--error-accent)', borderColor: 'rgba(255,74,90,0.2)' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {kbDocs.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No documents found in knowledge base. Upload policy files or click "Seed Database" to load defaults.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Uploader Box */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
            <h3>Upload RAG Document</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Support formats: PDF, DOCX, TXT, MD. The file will be parsed and loaded into Qdrant for semantic search matching.</p>
            
            <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.01)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => document.getElementById('file-upload-input').click()}
              >
                <Upload size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                <span style={{ fontSize: '0.85rem' }}>
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length} files selected` 
                    : 'Click to select multiple document files'}
                </span>
                {selectedFiles.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', maxHeight: '100px', overflowY: 'auto', textAlign: 'left', padding: '0 10px' }} onClick={(e) => e.stopPropagation()}>
                    {Array.from(selectedFiles).map((f, fIdx) => (
                      <div key={fIdx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        • {f.name} ({(f.size / 1024).toFixed(1)} KB)
                      </div>
                    ))}
                  </div>
                )}
                <input 
                  type="file" 
                  id="file-upload-input"
                  style={{ display: 'none' }} 
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  accept=".pdf,.docx,.txt,.md"
                  multiple
                />
              </div>

              <button 
                type="submit" 
                className="glass-button accent" 
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={selectedFiles.length === 0 || isUploading}
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : `Process & Index ${selectedFiles.length} Vectors`}
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Garment Database Products</h2>
            <button onClick={() => setShowAddForm(!showAddForm)} className="glass-button accent">
              <Plus size={14} /> Add New Product
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddProduct} className="glass-panel" style={{ padding: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ gridColumn: 'span 3' }}><h4>Create New Garment Record</h4></div>
              <input type="text" placeholder="SKU (e.g. NW-TS-BLK-05)" required value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} className="glass-input" />
              <input type="text" placeholder="Product Name" required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="glass-input" />
              <input type="number" placeholder="Price ($)" required value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})} className="glass-input" />
              <input type="text" placeholder="Sub-category (e.g. T-Shirts)" value={newProduct.subCategory} onChange={(e) => setNewProduct({...newProduct, subCategory: e.target.value})} className="glass-input" />
              <input type="text" placeholder="Colors (comma separated)" value={newProduct.colors} onChange={(e) => setNewProduct({...newProduct, colors: e.target.value})} className="glass-input" />
              <input type="text" placeholder="Sizes (comma separated)" value={newProduct.sizes} onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})} className="glass-input" />
              <input type="text" placeholder="Material (e.g. 100% Linen)" value={newProduct.material} onChange={(e) => setNewProduct({...newProduct, material: e.target.value})} className="glass-input" />
              <input type="number" placeholder="Stock Level" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})} className="glass-input" />
              <input type="text" placeholder="Description" style={{ gridColumn: 'span 3' }} value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} className="glass-input" />
              
              <div style={{ gridColumn: 'span 3', display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddForm(false)} className="glass-button">Cancel</button>
                <button type="submit" className="glass-button accent">Save Product</button>
              </div>
            </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 8px' }}>SKU Code</th>
                <th style={{ padding: '12px 8px' }}>Product</th>
                <th style={{ padding: '12px 8px' }}>Price</th>
                <th style={{ padding: '12px 8px' }}>Material</th>
                <th style={{ padding: '12px 8px' }}>Colors</th>
                <th style={{ padding: '12px 8px' }}>Sizes</th>
                <th style={{ padding: '12px 8px' }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}><strong>{p.sku}</strong></td>
                  <td style={{ padding: '12px 8px' }}>{p.name}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--primary-accent)', fontWeight: '600' }}>${p.price.toFixed(2)}</td>
                  <td style={{ padding: '12px 8px' }}>{p.material}</td>
                  <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>{p.colors?.join(', ')}</td>
                  <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>{p.sizes?.join(', ')}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ color: p.stock > 0 ? 'var(--success-accent)' : 'var(--error-accent)', fontWeight: '600' }}>{p.stock} units</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: INVENTORY AUDITOR */}
      {activeTab === 'inventory' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2>Warehouse Stock Audit Trails</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Manage reserved stock logs and locations. Reserved stocks are units committed to pending customer checkouts.</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 8px' }}>SKU Code</th>
                <th style={{ padding: '12px 8px' }}>Product Name</th>
                <th style={{ padding: '12px 8px' }}>Warehouse Location</th>
                <th style={{ padding: '12px 8px' }}>Available Stock</th>
                <th style={{ padding: '12px 8px' }}>Reserved Stock</th>
                <th style={{ padding: '12px 8px' }}>Total Stock</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>Manage Stock</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((inv) => (
                <tr key={inv._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}><strong>{inv.productId?.sku || 'SKU'}</strong></td>
                  <td style={{ padding: '12px 8px' }}>{inv.productId?.name || 'Deleted Product'}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{inv.warehouseLocation}</td>
                  <td style={{ padding: '12px 8px', fontWeight: '600', color: (inv.stock - inv.reservedStock) > 0 ? 'var(--success-accent)' : 'var(--error-accent)' }}>
                    {inv.stock - inv.reservedStock} units
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {editingInvId === inv._id ? (
                      <input 
                        type="number" 
                        value={editInvVal.reservedStock} 
                        onChange={(e) => setEditInvVal({...editInvVal, reservedStock: parseInt(e.target.value) || 0})}
                        className="glass-input" 
                        style={{ width: '80px', padding: '4px' }}
                      />
                    ) : (
                      <span>{inv.reservedStock} units</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {editingInvId === inv._id ? (
                      <input 
                        type="number" 
                        value={editInvVal.stock} 
                        onChange={(e) => setEditInvVal({...editInvVal, stock: parseInt(e.target.value) || 0})}
                        className="glass-input" 
                        style={{ width: '80px', padding: '4px' }}
                      />
                    ) : (
                      <span>{inv.stock} units</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {editingInvId === inv._id ? (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => saveInventoryUpdate(inv._id)} className="glass-button" style={{ padding: '6px', color: 'var(--success-accent)', borderColor: 'rgba(16,185,129,0.2)' }}>
                          <Save size={12} /> Save
                        </button>
                        <button onClick={() => setEditingInvId(null)} className="glass-button" style={{ padding: '6px' }}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEditInventory(inv)} className="glass-button" style={{ padding: '6px' }}>
                        <Edit size={12} /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
