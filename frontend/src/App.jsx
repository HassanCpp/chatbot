import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Cpu, Terminal, ShieldAlert, CheckCircle2, MessageSquareCode, LogOut } from 'lucide-react';
import axios from 'axios';
import CustomerChat from './pages/CustomerChat';
import AdminDashboard from './pages/AdminDashboard';

// Environment backend base URL configurations
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

/**
 * NavigationBar Component:
 * Displays global header links, branding logo, user credentials,
 * and real-time backend api health state indicators.
 */
function NavigationBar({ currentUser, handleLogout, health }) {
  const location = useLocation();

  if (!currentUser) return null;

  return (
    <nav className="glass-panel animate-slideup" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 28px',
      margin: '20px auto',
      maxWidth: '1400px',
      width: '95%',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <MessageSquareCode size={26} color="var(--primary-accent)" style={{ filter: 'drop-shadow(0 0 8px var(--primary-accent))' }} />
        <div>
          <span style={{
            fontFamily: 'var(--font-title)',
            fontWeight: '800',
            fontSize: '1.4rem',
            letterSpacing: '0.05em',
            background: 'linear-gradient(135deg, #fff, var(--primary-accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase'
          }}>NovaWear</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Assistant</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className={`glass-button ${location.pathname === '/' ? 'active' : ''}`}>
            <Cpu size={16} /> Customer Portal
          </button>
        </Link>
        {currentUser.role === 'admin' && (
          <Link to="/admin" style={{ textDecoration: 'none' }}>
            <button className={`glass-button ${location.pathname === '/admin' ? 'active' : ''}`}>
              <Terminal size={16} /> Admin Console
            </button>
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#fff' }}>{currentUser.name}</div>
          <div style={{ fontSize: '0.7rem', color: currentUser.role === 'admin' ? 'var(--secondary-accent)' : 'var(--text-muted)' }}>
            {currentUser.role === 'admin' ? '👑 Administrator' : 'Customer Account'}
          </div>
        </div>

        <button onClick={handleLogout} className="glass-button" style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}>
          <LogOut size={13} /> Log Out
        </button>

        {health?.status === 'online' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success-accent)', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle2 size={12} /> System Online
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--error-accent)', background: 'rgba(255, 74, 90, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255, 74, 90, 0.2)' }}>
            <ShieldAlert size={12} /> Server Offline
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * ProtectedAdminRoute Component:
 * Client-side route wrapper preventing non-admin accounts from loading admin views.
 */
function ProtectedAdminRoute({ currentUser, children }) {
  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

/**
 * AuthScreen Component:
 * Render form sheets for user Login and signup registration. Includes size
 * and styling preference configuration drop-downs for new user profiling.
 */
function AuthScreen({ onAuthSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [regSize, setRegSize] = useState('M');
  const [regColor, setRegColor] = useState('Midnight Black');
  const [regCategory, setRegCategory] = useState('T-Shirts');
  const [regBudget, setRegBudget] = useState(80);
  const [authError, setAuthError] = useState('');
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/customers`);
        setCustomers(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCustomers();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: authEmail.trim(),
        password: authPassword
      });
      const user = res.data;
      localStorage.setItem('novawear_user', JSON.stringify(user));
      onAuthSuccess(user);
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Failed to login. Please try again.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        name: authName.trim(),
        email: authEmail.trim(),
        password: authPassword,
        preferences: {
          size: regSize,
          color: regColor,
          category: regCategory,
          budget: parseFloat(regBudget) || 80
        }
      });
      const user = res.data;
      localStorage.setItem('novawear_user', JSON.stringify(user));
      onAuthSuccess(user);
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Registration failed. Check details.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      width: '100%',
      padding: '20px'
    }}>
      <div className="glass-panel animate-slideup" style={{
        padding: '40px',
        width: '100%',
        maxWidth: '450px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: 'var(--glow-box)',
        borderRadius: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, var(--secondary-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
            NovaWear Portal
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isRegistering ? 'Create your style profile to begin' : 'Sign in to access personalized client chat & admin panel'}
          </p>
        </div>

        {authError && (
          <div style={{ fontSize: '0.8rem', color: 'var(--error-accent)', background: 'rgba(239, 68, 68, 0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)', textAlign: 'center' }}>
            {authError}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegistering && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Full Name</label>
              <input type="text" placeholder="Stephanie Martinez" required value={authName} onChange={(e) => setAuthName(e.target.value)} className="glass-input" />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Email Address</label>
            <input type="email" placeholder="stephanie@example.com" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="glass-input" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Password</label>
            <input type="password" placeholder="••••••••" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="glass-input" />
          </div>

          {isRegistering && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Clothing Size</label>
                  <select value={regSize} onChange={(e) => setRegSize(e.target.value)} className="glass-input">
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Favorite Color</label>
                  <select value={regColor} onChange={(e) => setRegColor(e.target.value)} className="glass-input">
                    <option value="Midnight Black">Midnight Black</option>
                    <option value="Crisp White">Crisp White</option>
                    <option value="Heather Grey">Heather Grey</option>
                    <option value="Sage Green">Sage Green</option>
                    <option value="Navy Blue">Navy Blue</option>
                    <option value="Sand Beige">Sand Beige</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Preferred Category</label>
                  <select value={regCategory} onChange={(e) => setRegCategory(e.target.value)} className="glass-input">
                    <option value="T-Shirts">T-Shirts</option>
                    <option value="Shirts">Shirts</option>
                    <option value="Jeans">Jeans</option>
                    <option value="Hoodies">Hoodies</option>
                    <option value="Jackets">Jackets</option>
                    <option value="Activewear">Activewear</option>
                    <option value="Shoes">Shoes</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Budget Limit ($)</label>
                  <input type="number" placeholder="80" required value={regBudget} onChange={(e) => setRegBudget(e.target.value)} className="glass-input" />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="glass-button accent" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '12px' }}>
            {isRegistering ? 'Create Style Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isRegistering ? 'Already have an account? ' : "Don't have an account yet? "}
          </span>
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setAuthError('');
            }} 
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-accent)',
              cursor: 'pointer',
              fontWeight: '600',
              padding: 0,
              fontSize: '0.85rem'
            }}
          >
            {isRegistering ? 'Sign In' : 'Register Here'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main App Component:
 * Handles global authenticated user states, default headers setup on login,
 * and renders routes to the customer portal and protected admin dashboard.
 */
function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('novawear_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [health, setHealth] = useState(null);

  // Sync token value to Axios common headers
  useEffect(() => {
    if (currentUser && currentUser.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${currentUser.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [currentUser]);

  // Performs recurring health checks every 15s to verify server connectivity
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get(`${API_BASE}/health`);
        setHealth(res.data);
      } catch (err) {
        setHealth({ status: 'offline' });
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      window.history.pushState({}, '', '/admin');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('novawear_user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NavigationBar currentUser={currentUser} handleLogout={handleLogout} health={health} />
        
        <main style={{ flex: 1, display: 'flex', justifyContent: 'center', width: '100%', paddingBottom: '40px' }}>
          {!currentUser ? (
            <AuthScreen onAuthSuccess={handleAuthSuccess} />
          ) : (
            <Routes>
              <Route path="/" element={<CustomerChat currentUser={currentUser} handleLogout={handleLogout} />} />
              <Route path="/admin" element={
                <ProtectedAdminRoute currentUser={currentUser}>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              } />
            </Routes>
          )}
        </main>
      </div>
    </Router>
  );
}

export default App;
