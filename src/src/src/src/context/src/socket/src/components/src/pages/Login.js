import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.emailOrPhone, form.password);
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 48, color: 'var(--yellow)', marginBottom: 4 }}>🎲 LUDO</h1>
          <p style={{ color: 'var(--text-muted)' }}>Play. Win. Earn Real Money.</p>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 24, fontSize: 22, fontWeight: 800 }}>Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email or Phone</label>
              <input className="form-input" type="text" placeholder="Enter email or phone number"
                value={form.emailOrPhone} onChange={e => setForm({ ...form, emailOrPhone: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Enter password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: 14 }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--yellow)', fontWeight: 700 }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
