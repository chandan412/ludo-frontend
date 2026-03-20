import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Nav from '../components/Nav';

export default function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [players, setPlayers] = useState([]);
  const [pendingTx, setPendingTx] = useState([]);
  const [allTx, setAllTx] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [txFilter, setTxFilter] = useState('');

  useEffect(() => { fetchStats(); fetchPending(); }, []);
  useEffect(() => { if (tab === 'players') fetchPlayers(); }, [tab, search]);
  useEffect(() => { if (tab === 'transactions') fetchAllTx(); }, [tab, txFilter]);

  const fetchStats = async () => {
    try { const r = await axios.get('/api/admin/dashboard-stats'); setStats(r.data); } catch {}
  };

  const fetchPlayers = async () => {
    setLoading(true);
    try { const r = await axios.get(`/api/admin/players?search=${search}`); setPlayers(r.data.players); } catch {}
    finally { setLoading(false); }
  };

  const fetchPending = async () => {
    try { const r = await axios.get('/api/admin/pending-transactions'); setPendingTx(r.data); } catch {}
  };

  const fetchAllTx = async () => {
    setLoading(true);
    try { const r = await axios.get(`/api/admin/all-transactions?type=${txFilter}&limit=50`); setAllTx(r.data.transactions); } catch {}
    finally { setLoading(false); }
  };

  const handleAddBalance = async (e) => {
    e.preventDefault();
    if (!selectedPlayer || !addAmount) return;
    try {
      await axios.post('/api/admin/add-balance', { userId: selectedPlayer._id, amount: parseFloat(addAmount), note: addNote });
      toast.success(`₹${addAmount} added to ${selectedPlayer.username}`);
      setAddAmount(''); setAddNote(''); setSelectedPlayer(null);
      fetchPlayers(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleApproveRecharge = async (txId, userId, amount) => {
    try {
      await axios.post('/api/admin/add-balance', { userId, amount, transactionId: txId, note: 'Recharge approved' });
      toast.success('Recharge approved!');
      fetchPending(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleWithdrawal = async (txId, action) => {
    const note = action === 'reject' ? prompt('Rejection reason:') : 'Payment sent';
    if (action === 'reject' && !note) return;
    try {
      await axios.post('/api/admin/process-withdrawal', { transactionId: txId, action, adminNote: note });
      toast.success(action === 'approve' ? 'Withdrawal approved!' : 'Withdrawal rejected & refunded');
      fetchPending(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleBan = async (userId, isBanned) => {
    const endpoint = isBanned ? '/api/admin/unban-player' : '/api/admin/ban-player';
    try {
      await axios.post(endpoint, { userId });
      toast.success(isBanned ? 'Player unbanned' : 'Player banned');
      fetchPlayers();
    } catch (err) { toast.error('Failed'); }
  };

  const pendingRecharges = pendingTx.filter(t => t.type === 'recharge');
  const pendingWithdrawals = pendingTx.filter(t => t.type === 'withdraw');

  const tabs = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'pending', label: `⏳ Pending ${pendingTx.length > 0 ? `(${pendingTx.length})` : ''}` },
    { key: 'players', label: '👥 Players' },
    { key: 'transactions', label: '💳 Transactions' },
  ];

  return (
    <div>
      <Nav />
      <div className="page-wide">
        <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 26, color: 'var(--yellow)', margin: '24px 0 20px' }}>⚙️ Admin Panel</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'dashboard' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Players', value: stats.totalPlayers, color: 'var(--blue)' },
              { label: 'Active Players', value: stats.activePlayers, color: 'var(--green)' },
              { label: 'Games Played', value: stats.totalGames, color: 'var(--yellow)' },
              { label: 'Active Games', value: stats.activeGames, color: 'var(--red)' },
              { label: 'Platform Fees', value: `₹${stats.platformFeeEarned}`, color: 'var(--green)' },
              { label: 'Total Recharged', value: `₹${stats.totalRecharged}`, color: 'var(--blue)' },
              { label: 'Total Withdrawn', value: `₹${stats.totalWithdrawn}`, color: 'var(--red)' },
              { label: 'Pending', value: stats.pendingRecharges + stats.pendingWithdrawals, color: 'var(--yellow)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pending' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <h3 style={{ marginBottom: 12, fontWeight: 800 }}>💳 Recharge Requests ({pendingRecharges.length})</h3>
              {pendingRecharges.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No pending recharges</div>
              ) : pendingRecharges.map(tx => (
                <div key={tx._id} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{tx.user?.username}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx.user?.phone}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Note: {tx.rechargeNote || 'N/A'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--yellow)' }}>₹{tx.amount}</div>
                  </div>
                  <button className="btn btn-green btn-sm btn-full" onClick={() => handleApproveRecharge(tx._id, tx.user._id, tx.amount)}>
                    ✅ Approve & Add Balance
                  </button>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ marginBottom: 12, fontWeight: 800 }}>💸 Withdrawal Requests ({pendingWithdrawals.length})</h3>
              {pendingWithdrawals.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No pending withdrawals</div>
              ) : pendingWithdrawals.map(tx => (
                <div key={tx._id} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 800 }}>{tx.user?.username}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--red)' }}>₹{tx.amount}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {tx.bankDetails?.upiId ? `UPI: ${tx.bankDetails.upiId}` : `A/C: ${tx.bankDetails?.accountNumber} • IFSC: ${tx.bankDetails?.ifscCode}`}
                    </div>
                    {tx.bankDetails?.accountHolderName && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Name: {tx.bankDetails.accountHolderName}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-green btn-sm" style={{ flex: 1 }} onClick={() => handleWithdrawal(tx._id, 'approve')}>✅ Approve</button>
                    <button className="btn btn-red btn-sm" style={{ flex: 1 }} onClick={() => handleWithdrawal(tx._id, 'reject')}>❌ Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'players' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="form-input" style={{ flex: 1, minWidth: 200 }} placeholder="Search by username, email or phone..." value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={fetchPlayers}>Search</button>
            </div>

            {selectedPlayer && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(244,196,48,0.4)' }}>
                <h4 style={{ marginBottom: 12 }}>Add Balance to {selectedPlayer.username}</h4>
                <form onSubmit={handleAddBalance} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: 120, marginBottom: 0 }}>
                    <label className="form-label">Amount (₹)</label>
                    <input className="form-input" type="number" placeholder="Amount" value={addAmount} onChange={e => setAddAmount(e.target.value)} required min={1} />
                  </div>
                  <div className="form-group" style={{ flex: 2, minWidth: 160, marginBottom: 0 }}>
                    <label className="form-label">Note</label>
                    <input className="form-input" type="text" placeholder="Recharge note / UTR" value={addNote} onChange={e => setAddNote(e.target.value)} />
                  </div>
                  <button className="btn btn-green btn-sm" type="submit">Add</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelectedPlayer(null)}>Cancel</button>
                </form>
              </div>
            )}

            {loading ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading...</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Username', 'Phone', 'Balance', 'Games', 'Wins', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(p => (
                      <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700 }}>{p.username}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.email}</div>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{p.phone}</td>
                        <td style={{ padding: '12px', fontWeight: 800, color: 'var(--yellow)' }}>₹{p.balance - (p.lockedBalance || 0)}</td>
                        <td style={{ padding: '12px' }}>{p.gamesPlayed}</td>
                        <td style={{ padding: '12px', color: 'var(--green)' }}>{p.gamesWon}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: p.isBanned ? 'rgba(232,64,64,0.2)' : 'rgba(39,174,96,0.2)', color: p.isBanned ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                            {p.isBanned ? 'BANNED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSelectedPlayer(p)}>+ Balance</button>
                            <button className={`btn btn-sm ${p.isBanned ? 'btn-green' : 'btn-red'}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleBan(p._id, p.isBanned)}>
                              {p.isBanned ? 'Unban' : 'Ban'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {players.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No players found</div>}
              </div>
            )}
          </div>
        )}

        {tab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['', 'recharge', 'withdraw', 'game_win', 'game_loss', 'platform_fee'].map(f => (
                <button key={f} onClick={() => setTxFilter(f)} className={`btn btn-sm ${txFilter === f ? 'btn-primary' : 'btn-ghost'}`}>
                  {f === '' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading...</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Player', 'Type', 'Amount', 'Balance After', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTx.map(tx => (
                      <tr key={tx._id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{tx.user?.username}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.user?.phone}</div></td>
                        <td style={{ padding: '10px 12px', textTransform: 'capitalize', color: 'var(--text-muted)' }}>{tx.type.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: ['recharge', 'game_win'].includes(tx.type) ? 'var(--green)' : 'var(--red)' }}>
                          {['recharge', 'game_win'].includes(tx.type) ? '+' : '-'}₹{tx.amount}
                        </td>
                        <td style={{ padding: '10px 12px' }}>₹{tx.balanceAfter}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: tx.status === 'completed' || tx.status === 'approved' ? 'rgba(39,174,96,0.2)' : tx.status === 'pending' ? 'rgba(244,196,48,0.2)' : 'rgba(232,64,64,0.2)', color: tx.status === 'completed' || tx.status === 'approved' ? 'var(--green)' : tx.status === 'pending' ? 'var(--yellow)' : 'var(--red)' }}>
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{new Date(tx.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allTx.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No transactions found</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

Click **"Commit changes"** → **"Commit directly to main"** → **"Commit changes"** ✅

---

## 🎉 Frontend is DONE!

Your `ludo-frontend` repo should now have all 17 files:
```
public/index.html
package.json
vercel.json
src/index.js
src/App.js
src/App.css
src/context/AuthContext.js
src/socket/socket.js
src/components/Nav.js
src/components/LudoBoard.js
src/pages/Login.js
src/pages/Register.js
src/pages/Dashboard.js
src/pages/Wallet.js
src/pages/Lobby.js
src/pages/Game.js
src/pages/AdminPanel.js
