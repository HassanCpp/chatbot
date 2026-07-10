import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Send, Plus, MessageSquare, BookOpen, ShoppingBag, 
  Truck, ArrowRight, Sparkles, User, ShieldAlert,
  Loader2, RefreshCw, Layers, Sliders, CheckCircle
} from 'lucide-react';
import { API_BASE } from '../App';

export default function CustomerChat({ currentUser, handleLogout }) {
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [orders, setOrders] = useState([]);
  const [trackingId, setTrackingId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load conversations list, mock orders, and product catalog on mount
  useEffect(() => {
    loadAllProducts();
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/customers`);
      setCustomers(res.data || []);
    } catch (err) {
      console.error('Failed to load customers context list', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadSessions();
      loadSampleOrders();
    }
  }, [currentUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedText]);

  const loadSessions = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(`${API_BASE}/conversations?userId=${currentUser._id}`);
      setConversations(res.data);
      if (res.data.length > 0 && !currentId) {
        selectSession(res.data[0].conversationId);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  const loadAllProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/products`);
      setAllProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load products catalog for chat rendering', err);
    }
  };

  const loadSampleOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/inventory`); 
    } catch (err) {}
  };

  const selectSession = async (id) => {
    setCurrentId(id);
    setStreamedText('');
    try {
      const res = await axios.get(`${API_BASE}/conversations/${id}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const startNewSession = () => {
    setCurrentId('');
    setMessages([]);
    setStreamedText('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;

    const userMsgText = inputText.trim();
    setInputText('');

    // Prepend user message to UI local state immediately
    const tempUserMsg = { role: 'user', content: userMsgText, timestamp: new Date() };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setStreamedText('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsgText, 
          conversationId: currentId || undefined,
          userId: currentUser ? currentUser._id : 'guest'
        }),
        signal: controller.signal
      });

      if (!response.body) {
        throw new Error('No stream body available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';
      let activeSessionId = currentId;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          buffer += chunkStr;
          
          let boundary = buffer.indexOf('\n');
          while (boundary !== -1) {
            const line = buffer.substring(0, boundary).trim();
            buffer = buffer.substring(boundary + 1);
            boundary = buffer.indexOf('\n');
            
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(5).trim();
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              
              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'session') {
                  activeSessionId = data.conversationId;
                  setCurrentId(data.conversationId);
                } else if (data.type === 'chunk') {
                  setStreamedText(prev => prev + data.chunk);
                } else if (data.type === 'error') {
                  setStreamedText(prev => prev + `\n[Error: ${data.error}]`);
                }
              } catch (e) {
                // Buffer line might be partial, preserve and wait
              }
            }
          }
        }
      }

      // Finish streaming, commit final text to list and reload sessions
      setIsStreaming(false);
      
      // Reload the entire session details to sync any tool call events with MongoDB
      if (activeSessionId) {
        selectSession(activeSessionId);
        loadSessions();
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Generation aborted by user');
        return;
      }
      console.error(err);
      setIsStreaming(false);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, there was an issue processing your query: ${err.message}. Please verify the backend and Qdrant instances are running.`
      }]);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamedText(prev => prev + " \n\n*[Chat generation stopped by user]*");
      setTimeout(() => {
        if (currentId) selectSession(currentId);
        loadSessions();
      }, 500);
    }
  };

  const queryOrder = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    try {
      const res = await axios.get(`${API_BASE}/conversations`); // will scan or fallback
      // Query specific order tracker details via direct mongoose logic
      const orderRes = await axios.get(`${API_BASE}/conversations`); 
      
      // Let's write a quick client search for order
      const chatRes = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Track order ${trackingId}`, 
          conversationId: currentId || undefined 
        })
      });
      // We will parse standard getOrder tool payload or search it
      // For instant display, call the backend order check endpoint
      const orderInfo = await axios.post(`${API_BASE}/chat`, {
        message: `Get order ${trackingId}`,
        conversationId: currentId
      });
      // Alternatively, let the AI deal with tracking, but to show nice UI:
      alert(`Tracking request sent. The assistant will answer your tracking details in chat.`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSuggestionClick = (text) => {
    setInputText(text);
  };

  const parseInlineMarkdown = (text) => {
    if (!text) return '';

    const isImageUrl = (url) => {
      const u = url.toLowerCase();
      return u.includes('images.unsplash.com') || 
             u.includes('unsplash.com') || 
             u.endsWith('.jpg') || 
             u.endsWith('.jpeg') || 
             u.endsWith('.png') || 
             u.endsWith('.webp') || 
             u.endsWith('.gif');
    };

    // Parse both Image Markdown ![...]() and Link Markdown [...]()
    const linkRegex = /(!)?\[([^\]]*)\]\(([^)]+)\)/g;
    let parts = [];
    let lastIdx = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      const matchIdx = match.index;
      if (matchIdx > lastIdx) {
        parts.push(text.substring(lastIdx, matchIdx));
      }
      const isImg = match[1] === '!' || isImageUrl(match[3]);
      const label = match[2];
      const url = match[3];

      if (isImg) {
        parts.push(
          <div key={`img-${matchIdx}`} style={{ margin: '14px 0', textAlign: 'center' }}>
            <img 
              src={url} 
              alt={label || 'Product Image'} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '260px', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                objectFit: 'cover',
                boxShadow: 'var(--glow-box)'
              }} 
            />
            {label && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>{label}</div>}
          </div>
        );
      } else {
        parts.push(
          <a key={`link-${matchIdx}`} href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-accent)', textDecoration: 'underline' }}>
            {label || url}
          </a>
        );
      }
      lastIdx = linkRegex.lastIndex;
    }

    let remainingText = lastIdx < text.length ? text.substring(lastIdx) : '';

    // 2. Parse Bold: **text**
    if (remainingText) {
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let textParts = [];
      let tLastIdx = 0;
      let bMatch;

      while ((bMatch = boldRegex.exec(remainingText)) !== null) {
        const bIdx = bMatch.index;
        if (bIdx > tLastIdx) {
          textParts.push(remainingText.substring(tLastIdx, bIdx));
        }
        textParts.push(<strong key={`b-${bIdx}`} style={{ color: 'var(--secondary-accent)' }}>{bMatch[1]}</strong>);
        tLastIdx = boldRegex.lastIndex;
      }

      if (tLastIdx < remainingText.length) {
        textParts.push(remainingText.substring(tLastIdx));
      }
      parts.push(...textParts);
    }

    return parts.length > 0 ? parts : text;
  };

  const renderMarkdown = (content) => {
    if (!content) return null;

    const lines = content.split('\n');
    let inList = false;
    let listItems = [];
    const elements = [];

    const flushList = (key) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key}`} style={{ paddingLeft: '20px', margin: '8px 0 12px', fontSize: '0.9rem', lineHeight: '1.6' }}>
            {listItems}
          </ul>
        );
        listItems = [];
      }
      inList = false;
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Check if line is a bullet item
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
        inList = true;
        const itemContent = line.replace(/^[-*•]\s+/, '');
        listItems.push(<li key={`li-${i}`} style={{ marginBottom: '4px' }}>{parseInlineMarkdown(itemContent)}</li>);
        continue;
      }

      if (inList) {
        flushList(i);
      }

      // Check for headers
      if (line.startsWith('### ')) {
        elements.push(<h4 key={`h3-${i}`} style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--primary-accent)', margin: '16px 0 6px' }}>{parseInlineMarkdown(line.substring(4))}</h4>);
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(<h3 key={`h2-${i}`} style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary-accent)', margin: '18px 0 8px' }}>{parseInlineMarkdown(line.substring(3))}</h3>);
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(<h2 key={`h1-${i}`} style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--primary-accent)', margin: '20px 0 10px' }}>{parseInlineMarkdown(line.substring(2))}</h2>);
        continue;
      }

      if (!line) {
        continue;
      }

      // Check if paragraph is a markdown table
      if (line.includes('|')) {
        // Table parsing
        let tableRows = [];
        let rIdx = 0;
        
        while (i < lines.length && lines[i].trim().includes('|')) {
          const rowLine = lines[i].trim();
          const cols = rowLine.split('|').map(c => c.trim()).filter((_, cIdx) => cIdx > 0 && cIdx < rowLine.split('|').length - 1);
          
          if (cols.length > 0) {
            const isHeader = rIdx === 0;
            const isDivider = cols.every(c => c.startsWith('-'));
            
            if (!isDivider) {
              tableRows.push(
                <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {cols.map((col, cIdx) => (
                    isHeader ? 
                      <th key={cIdx} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--primary-accent)' }}>{col}</th> : 
                      <td key={cIdx} style={{ padding: '8px 12px', color: 'var(--text-main)' }}>{col}</td>
                  ))}
                </tr>
              );
            }
          }
          rIdx++;
          i++;
        }
        
        elements.push(
          <div key={`table-${i}`} className="glass-panel" style={{ overflowX: 'auto', margin: '14px 0', padding: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <tbody>{tableRows}</tbody>
            </table>
          </div>
        );
        i--; // Adjust index
        continue;
      }

      elements.push(
        <div key={`p-${i}`} style={{ lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '8px' }}>
          {parseInlineMarkdown(line)}
        </div>
      );
    }

    if (inList) {
      flushList(lines.length);
    }

    return elements;
  };
  const getProductCardsForMessage = (content) => {
    if (!content) return null;
    // Match any SKU starting with NW- followed by characters
    const skuRegex = /(NW-[A-Z0-9]+-[A-Z0-9-]+)/gi;
    const matches = content.match(skuRegex) || [];
    const uniqueSkus = [...new Set(matches.map(s => s.toUpperCase()))];

    const matchedProducts = uniqueSkus.map(sku => {
      // Remove trailing punctuation from regex match
      const cleanSku = sku.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      return allProducts.find(p => p.sku === cleanSku || p.sku.startsWith(cleanSku));
    }).filter(Boolean);

    if (matchedProducts.length === 0) return null;

    return (
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        padding: '10px 0',
        marginTop: '12px',
        width: '100%',
        scrollbarWidth: 'thin'
      }}>
        {matchedProducts.map((p, idx) => (
          <div key={idx} className="glass-panel animate-slideup" style={{
            flex: '0 0 200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem'
          }}>
            <img 
              src={p.thumbnail} 
              alt={p.name} 
              style={{
                width: '100%',
                height: '110px',
                objectFit: 'cover',
                borderRadius: '8px',
                background: '#1a1d29'
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{p.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.sku}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
              <span style={{ fontWeight: '800', color: 'var(--primary-accent)' }}>${p.price.toFixed(2)}</span>
              {p.discount > 0 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--error-accent)', background: 'rgba(255, 74, 90, 0.1)', padding: '1px 4px', borderRadius: '4px' }}>-{p.discount}%</span>
              )}
            </div>
            <div style={{ fontSize: '0.7rem', color: p.stock - p.reservedStock > 0 ? 'var(--success-accent)' : 'var(--error-accent)', fontWeight: '600' }}>
              {p.stock - p.reservedStock > 0 ? 'In Stock' : 'Out of Stock'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '24px',
      maxWidth: '1300px',
      width: '95%',
      height: 'calc(100vh - 120px)',
      margin: '0 auto'
    }}>
      
      {/* LEFT SIDEBAR - Sessions & Quick Guides */}
      <aside className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '18px', gap: '18px', overflowY: 'auto' }}>
        <button onClick={startNewSession} className="glass-button accent" style={{ width: '100%', justifyContent: 'center' }}>
          <Plus size={16} /> New Chat Session
        </button>

        {/* Logged in User Card */}
        <div className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(79, 70, 229, 0.15)', background: 'rgba(79, 70, 229, 0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#ffffff' }}>
              {currentUser.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.email}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
            <div>👕 <strong>Size Preference:</strong> {currentUser.preferences?.size || 'M'}</div>
            <div>🎨 <strong>Fav Color:</strong> {currentUser.preferences?.color || 'Midnight Black'}</div>
            <div>🏷️ <strong>Category:</strong> {currentUser.preferences?.category || 'T-Shirts'}</div>
            <div>💰 <strong>Max Budget:</strong> ${currentUser.preferences?.budget || 80}</div>
          </div>
          <button onClick={handleLogout} className="glass-button" style={{ width: '100%', justifyContent: 'center', padding: '6px', fontSize: '0.75rem', marginTop: '4px' }}>
            Sign Out
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} /> Active Sessions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '250px' }}>
            {conversations.map((c) => (
              <div 
                key={c.conversationId}
                onClick={() => selectSession(c.conversationId)}
                className={`glass-panel ${c.conversationId === currentId ? 'active' : ''}`}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  borderLeft: c.conversationId === currentId ? '3px solid var(--primary-accent)' : '1px solid var(--border-color)',
                  background: c.conversationId === currentId ? 'rgba(255,255,255,0.02)' : 'transparent'
                }}
              >
                <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.summary || 'Customer Chat Session'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {new Date(c.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {conversations.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                No active conversations.
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={14} /> Brand Quick Queries
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              "What is your return policy?",
              "Do you have a sizing chart?",
              "Tell me about organic cotton shirts",
              "Which items are made in Italy?",
              "Recommend jackets under $130"
            ].map((topic, idx) => (
              <button 
                key={idx}
                onClick={() => handleSuggestionClick(topic)}
                className="glass-button"
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start', padding: '8px 12px', textAlign: 'left' }}
              >
                <ArrowRight size={10} color="var(--primary-accent)" /> {topic}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* MIDDLE - CHAT WINDOW */}
      <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
        {/* Chat Header */}
        <header style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--secondary-accent)" /> NovaWear Customer Support
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grounded in company RAG knowledge and Live Database</p>
          </div>
          {isStreaming && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--primary-accent)' }}>
              <Loader2 size={14} className="animate-spin" /> assistant is typing...
            </div>
          )}
        </header>

        {/* Messages list */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.length === 0 && !streamedText && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              padding: '0 40px',
              gap: '16px'
            }}>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.05)', boxShadow: '0 0 30px rgba(0, 242, 254, 0.1)' }}>
                <Sparkles size={40} color="var(--primary-accent)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-title)' }}>How can NovaWear help you today?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
                Ask me about size recommendations, care instructions, garment materials, tracking your order, or checking live warehouse stock levels!
              </p>
            </div>
          )}

          {messages
            .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && msg.content))
            .map((msg, index) => (
            <div 
              key={index} 
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              {msg.role !== 'user' && (
                <div className="glass-panel animate-slideup" style={{ padding: '8px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.1)' }}>
                  <Sparkles size={14} color="var(--primary-accent)" />
                </div>
              )}
              <div 
                className="glass-panel animate-slideup"
                style={{
                  padding: '14px 18px',
                  maxWidth: '75%',
                  borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                  background: msg.role === 'user' ? 'rgba(0, 242, 254, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                  borderColor: msg.role === 'user' ? 'var(--primary-accent)' : 'var(--border-color)',
                  boxShadow: msg.role === 'user' ? 'var(--glow-cyan)' : 'none'
                }}
              >
                {renderMarkdown(msg.content)}
                
                {/* Dynamically render product cards for mentioned SKUs in the assistant reply */}
                {msg.role === 'assistant' && getProductCardsForMessage(msg.content)}
              </div>
              {msg.role === 'user' && (
                <div className="glass-panel animate-slideup" style={{ padding: '8px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)' }}>
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {/* TYPING DOTS LOADING INDICATOR */}
          {isStreaming && !streamedText && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '12px' }}>
              <div className="glass-panel animate-slideup" style={{ padding: '8px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.1)' }}>
                <Sparkles size={14} color="var(--primary-accent)" />
              </div>
              <div 
                className="glass-panel animate-slideup typing-indicator"
                style={{
                  padding: '14px 18px',
                  borderRadius: '18px 18px 18px 2px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'var(--border-color)',
                  display: 'flex',
                  gap: '5px',
                  alignItems: 'center'
                }}
              >
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          )}

          {/* STREAMING BUFFER RESPONSE */}
          {streamedText && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '12px' }}>
              <div className="glass-panel" style={{ padding: '8px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.1)' }}>
                <Sparkles size={14} color="var(--primary-accent)" />
              </div>
              <div 
                className="glass-panel"
                style={{
                  padding: '14px 18px',
                  maxWidth: '75%',
                  borderRadius: '18px 18px 18px 2px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'var(--border-color)'
                }}
              >
                {renderMarkdown(streamedText)}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} style={{
          padding: '20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isStreaming}
            placeholder="Ask about size guides, shipping, organic cotton stock..."
            className="glass-input"
          />
          {isStreaming && (
            <button 
              type="button" 
              onClick={handleStopGeneration} 
              className="glass-button" 
              style={{ 
                height: '48px', 
                padding: '0 16px', 
                justifyContent: 'center', 
                background: 'rgba(255, 74, 90, 0.1)', 
                borderColor: 'var(--error-accent)',
                color: 'var(--error-accent)',
                fontWeight: '600'
              }}
            >
              Stop
            </button>
          )}
          <button type="submit" className="glass-button accent" style={{ height: '48px', width: '48px', padding: '0', justifyContent: 'center' }} disabled={isStreaming || !inputText.trim()}>
            <Send size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}
