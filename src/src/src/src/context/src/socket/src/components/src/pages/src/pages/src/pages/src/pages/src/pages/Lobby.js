import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Nav from '../components/Nav';

const BET_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000];

export default function Lobby() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [openGames, setOpenGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(null);
  const [betAmount, setBetAmount] = useState(100);
  const [customBet, setCustomBet] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab] = useState('browse');
  const available = (user?.balance || 0) - (user?.lockedBalance || 0);

  useEffect(() => {
    fetchGames();
    refreshUser();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    try {
      const res = await axios.get('/api/game/lobby');
      setOpenGames(res.data);
    } catch (err) {} finally { setLoading(false); }
  };

  const handleCreate = async () => {
    const amount = customBet ? parseFloat(customBet) : betAmount;
    if (!amount || amount < 10) return toast.error('Minimum bet is ₹10');
    if (amount > available) return toast.error(`Insufficient balance. Available: ₹${available}`);
    setCreating(true);
    try {
      const res = await axios.post('/api/game/create', { betAmount: amount });
      toast.success(`Game created! Room: ${res.data.game.roomCode}`);
      navigate(`/game/${res.data.game.roomCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create game');
    } finally { setCreating(false); }
  };

  const handleJoin = async (code) => {
    setJoining(code);
    try {
      const res = await axios.post(`/api/game/join/${code}`);
      toast.success('Joined! Game starting...');
      navigate(`/game/${res.data.game.roomCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join game');
    } finally { setJoining(null); }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return toast.error('Enter room code');
    handleJoin(roomCode.trim().toUpperCase());
  };

  return (
    <div>
      <Nav />
      <div className="page">
        <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 26, color: 'var(--yellow)', margin: '24px 0 4px' }}>🎮 Game Lobby</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Available Balance: <strong style={{ color: 'var(--yellow)' }}>₹{available}</strong></p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--card)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
          {[['browse', '🏆 Open Games'], ['create', '➕ Create Game'], ['join', '🔑 Join by Code']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ flex: 1, padding: '10px 6px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 12, transition: 'all 0.2s', background: tab === key ? 'var(--yellow)' : 'transparent', color: tab === key ? '#1A1A2E' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'browse' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading games...</div>
            ) : openGames.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎲</div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>No open games right now</div>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>Create a game and wait for an opponent!</p>
                <button className="btn btn-primary" onClick={() => setTab('create')}>Create Game</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {openGames.map(game => (
                  <div key={game._id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>₹{game.betAmount}</span>
                        <span style={{ fontSize: 11, background: 'rgba(39,174,96,0.2)', color: 'var(--green)', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>WIN ₹{Math.floor(game.betAmount * 2 * 0.95)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        by <strong style={{ color: 'var(--text)' }}>{game.createdBy?.username}</strong> •
                        W:{game.createdBy?.gamesWon}/{game.createdBy?.gamesPlayed}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleJoin(game.roomCode)}
                      disabled={joining === game.roomCode || game.betAmount > available}
                    >
                      {joining === game.roomCode ? '...' : game.betAmount > available ? 'Low Balance' : 'Join ₹' + game.betAmount}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'create' && (
          <div className="card">
            <h4 style={{ marginBottom: 16, fontWeight: 800 }}>Choose Bet Amount</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {BET_AMOUNTS.map(a => (
                <button key={a} onClick={() => { setBetAmount(a); setCustomBet(''); }}
                  className="btn"
                  style={{ padding: '14px 8px', flexDirection: 'column', gap: 2, background: betAmount === a && !customBet ? 'var(--yellow)' : 'var(--card)', color: betAmount === a && !customBet ? '#1A1A2E' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>₹{a}</span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>Win ₹{Math.floor(a * 2 * 0.95)}</span>
                </button>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Or Enter Custom Amount</label>
              <input className="form-input" type="number" placeholder="Custom amount (min ₹10)" value={customBet} onChange={e => setCustomBet(e.target.value)} min={10} />
            </div>
            <div style={{ background: 'rgba(244,196,48,0.1)', border: '1px solid rgba(244,196,48,0.3)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Entry Fee</span>
                <span style={{ fontWeight: 700 }}>₹{customBet || betAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Prize Pool</span>
                <span style={{ fontWeight: 700 }}>₹{(customBet || betAmount) * 2}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)', fontWeight: 800 }}>
                <span>You Win</span>
                <span>₹{Math.floor((customBet || betAmount) * 2 * 0.95)}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={handleCreate} disabled={creating || (customBet || betAmount) > available}>
              {creating ? 'Creating...' : available < (customBet || betAmount) ? 'Insufficient Balance' : `Create Game for ₹${customBet || betAmount}`}
            </button>
            {available < 100 && (
              <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                Low balance? <a href="/wallet" style={{ color: 'var(--yellow)' }}>Add money</a>
              </p>
            )}
          </div>
        )}

        {tab === 'join' && (
          <div className="card">
            <h4 style={{ marginBottom: 8, fontWeight: 800 }}>Join with Room Code</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Ask your friend for their room code</p>
            <form onSubmit={handleJoinByCode}>
              <div className="form-group">
                <label className="form-label">Room Code</label>
                <input className="form-input" type="text" placeholder="e.g. ABC123" value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={6} style={{ letterSpacing: 4, fontWeight: 800, fontSize: 20, textAlign: 'center' }} required />
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={!!joining}>
                {joining ? 'Joining...' : 'Join Game'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
