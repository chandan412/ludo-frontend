import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="nav">
      <Link to="/dashboard" className="nav-logo">🎲 LUDO</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {user && (
          <>
            <div className="balance-badge">₹<span>{(user.balance - (user.lockedBalance || 0)).toFixed(0)}</span></div>
            <Link to="/lobby" className={`btn btn-sm ${isActive('/lobby') ? 'btn-primary' : 'btn-ghost'}`}>Play</Link>
            <Link to="/wallet" className={`btn btn-sm ${isActive('/wallet') ? 'btn-primary' : 'btn-ghost'}`}>Wallet</Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="btn btn-sm btn-red">Admin</Link>
            )}
            <button onClick={handleLogout} className="btn btn-sm btn-ghost">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
