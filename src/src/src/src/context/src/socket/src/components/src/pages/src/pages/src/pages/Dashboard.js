import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Nav from '../components/Nav';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser();
    axios.get('/api/game/my-games/history').then(r => setGames(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const winRate = user?.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0;
  const available = (user?.balance || 0) - (user?.lockedBalance || 0);

  return (
    <div>
      <Nav />
      <div className="page">
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 28, color: 'var(--yellow)' }}>
            Hey, {user?.username}! 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Ready to play?</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Available</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--yellow)' }}>₹{available.toFixed(0)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>In Game</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--red)' }}>₹{(user?.lockedBalance || 0).toFixed(0)}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 800, marginBottom: 16 }}>Your Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
            {[
              { label: 'Games', value: user?.gamesPlayed || 0 },
              { label: 'Wins', value: user?.gamesWon || 0 },
              { label: 'Win Rate', value: `${winRate}%` },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--yellow)' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <Link to="/lobby" className="btn btn-primary" style={{ flexDirection: 'column', padding: '20px 12px', fontSize: 14 }}>
            <span style={{ fontSize: 28 }}>🎲</span> Play Now
          </Link>
          <Link to="/wallet" className="btn btn-ghost" style={{ flexDirection: 'column', padding: '20px 12px', fontSize: 14 }}>
            <span style={{ fontSize: 28 }}>💰</span> Wallet
          </Link>
        </div>

        <div className="card">
          <h3 style={{ fontWeight: 800, marginBottom: 16 }}>Recent Games</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading...</div>
          ) : games.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
              No games yet. <Link to="/lobby" style={{ color: 'var(--yellow)' }}>Play your first game!</Link>
            </div>
          ) : (
            games.map(game => {
              const isWinner = game.winner?._id === user?._id || game.winner === user?._id;
              return (
                <div key={game._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Room #{game.roomCode}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Bet: ₹{game.betAmount} • {new Date(game.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: isWinner ? 'var(--green)' : 'var(--red)', fontSize: 15 }}>
                      {isWinner ? `+₹${game.winAmount}` : `-₹${game.betAmount}`}
                    </div>
                    <div style={{ fontSize: 11, color: isWinner ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                      {isWinner ? 'WIN' : 'LOSS'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
