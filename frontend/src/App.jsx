import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Store, ShoppingBag, Key, Lock, Zap, Server, AlertCircle } from 'lucide-react';
import './index.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

function App() {
  const [formData, setFormData] = useState({
    wooUrl: '',
    wooKey: '',
    wooSecret: '',
    shopifyStore: '',
    shopifyToken: ''
  });

  const [loading, setLoading] = useState(false);
  const [migrationId, setMigrationId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const startMigration = async (e) => {
    e.preventDefault();
    if (!formData.wooUrl || !formData.wooKey || !formData.wooSecret || !formData.shopifyStore || !formData.shopifyToken) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    setProgress(null);
    setMigrationId(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/start-migration`, formData);
      setMigrationId(response.data.migrationId);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to start migration.');
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (migrationId && migrationId !== 'demo-local') {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/migration-status/${migrationId}`);
          setProgress(res.data);
          
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            clearInterval(interval);
            setLoading(false);
          }
        } catch (err) {
          console.error("Error fetching progress:", err);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [migrationId]);

  const progressPercentage = progress && progress.total > 0 
    ? Math.min(Math.round(((progress.migrated + progress.errors) / progress.total) * 100), 100)
    : 0;

  return (
    <div className="app-container">
      <div className="bg-gradient"></div>
      <div className="bg-gradient-2"></div>
      
      <div className="header">
        <h1>Store Migration Pro</h1>
        <p>Seamlessly transfer your products from WooCommerce to Shopify</p>
      </div>

      <div className="card">
        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            {errorMsg}
          </div>
        )}
        
        <form onSubmit={startMigration}>
          <div className="section-title">
            <Store size={24} color="var(--primary)" />
            WooCommerce Source
          </div>
          <div className="form-grid">
            <div className="form-group full-width">
              <label><Server size={16}/> Store URL</label>
              <input 
                type="url" 
                name="wooUrl" 
                placeholder="https://your-woo-store.com"
                value={formData.wooUrl}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label><Key size={16}/> Consumer Key</label>
              <input 
                type="text" 
                name="wooKey" 
                placeholder="ck_..."
                value={formData.wooKey}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label><Lock size={16}/> Consumer Secret</label>
              <input 
                type="password" 
                name="wooSecret" 
                placeholder="cs_..."
                value={formData.wooSecret}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: '40px' }}>
            <ShoppingBag size={24} color="var(--success)" />
            Shopify Destination
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label><Store size={16}/> Store Name</label>
              <input 
                type="text" 
                name="shopifyStore" 
                placeholder="your-store.myshopify.com"
                value={formData.shopifyStore}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label><Key size={16}/> Admin Access Token</label>
              <input 
                type="password" 
                name="shopifyToken" 
                placeholder="shpat_..."
                value={formData.shopifyToken}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading && !migrationId?.startsWith('demo') ? <Zap size={20} className="spinner" /> : <Zap size={20} />}
              {loading && !migrationId?.startsWith('demo') ? 'Migrating Data...' : 'Start Migration'}
            </button>

            <button 
              type="button" 
              className="btn" 
              style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', boxShadow: 'none' }}
              onClick={() => {
                setLoading(true);
                setMigrationId('demo-local');
                setProgress({ total: 10, migrated: 0, errors: 0, status: 'migrating', errorDetails: [] });
                setErrorMsg('');
                
                let currentMigrated = 0;
                let currentErrors = 0;
                const total = 10;
                
                const interval = setInterval(() => {
                  if (currentMigrated + currentErrors >= total) {
                    setProgress(prev => ({ ...prev, status: 'completed' }));
                    setLoading(false);
                    clearInterval(interval);
                    return;
                  }
                  
                  if (Math.random() > 0.8) {
                    currentErrors++;
                    setProgress(prev => ({
                      ...prev,
                      errors: currentErrors,
                      errorDetails: [...prev.errorDetails, `Failed to migrate "Demo Product ${currentMigrated + currentErrors}": Network Error`]
                    }));
                  } else {
                    currentMigrated++;
                    setProgress(prev => ({
                      ...prev,
                      migrated: currentMigrated
                    }));
                  }
                }, 800);
              }}
              disabled={loading}
            >
              <Zap size={20} />
              Run UI Demo
            </button>
          </div>
        </form>

        {progress && (
          <div className="progress-container">
            <div className="progress-header">
              <div className="progress-title">Migration Progress</div>
              <div className="progress-status" style={{
                color: progress.status === 'completed' ? 'var(--success)' : progress.status === 'failed' ? 'var(--error)' : 'var(--primary)',
                backgroundColor: progress.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : progress.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'
              }}>
                {progress.status.toUpperCase()} ({progressPercentage}%)
              </div>
            </div>
            
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progressPercentage}%`, background: progress.status === 'failed' ? 'var(--error)' : progress.status === 'completed' ? 'var(--success)' : '' }}
              ></div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-value value-total">{progress.total}</div>
                <div className="stat-label">Total Products</div>
              </div>
              <div className="stat-box">
                <div className="stat-value value-migrated">{progress.migrated}</div>
                <div className="stat-label">Successfully Migrated</div>
              </div>
              <div className="stat-box">
                <div className="stat-value value-errors">{progress.errors}</div>
                <div className="stat-label">Failed</div>
              </div>
            </div>

            {progress.errorDetails && progress.errorDetails.length > 0 && (
              <div className="error-list">
                <h4>Error Log ({progress.errorDetails.length})</h4>
                <ul>
                  {progress.errorDetails.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
