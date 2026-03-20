import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Nav from '../components/Nav';

const QR_CODE_URL = process.env.REACT_APP_QR_CODE_URL || 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=yourname@upi';

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState({ balance: 0, lockedBalance: 0, availableBalance: 0 });
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeNote, setRechargeNote] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '' });
  const [withdrawMethod, setWithdrawMethod] = useState('upi');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balRes, txRes, pendRes] = await Promise.all([
        axios.get('/api/wallet/balance'),
        axios.get('/api/wallet/transactions'),
        axios.get('/api/wallet/pending-requests')
      ]);
      setBalance(balRes.data);
      setTransactions(txRes.data.transactions);
      setPending(pendRes.data);
      refreshUser();
    } catch (err) {
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleRechargeRequest = async (e) => {
    e.preventDefault();
    if (!rechargeAmount || rechargeAmount < 10) return toast.error('Minimum recharge is ₹10');
    try {
      await axios.post('/api/wallet/recharge-request', { amount: parseFloat(rechargeAmount), paymentNote: rechargeNote });
      toast.success('Recharge request submitted! Admin will add balance after verifying.');
      setRechargeAmount(''); setRechargeNote('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleWithdrawRequest = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || withdrawAmount < 50) return toast.error('Minimum withdrawal is ₹50');
    if (withdrawAmount > balance.availableBalance) return toast.error('Insufficient balance');
    const details = withdrawMethod === 'upi' ? { upiId: bankDetails.upiId } : bankDetails;
    if (withdrawMethod === 'upi' && !bankDetails.upiId) return toast.error('Enter your UPI ID');
    if (withdrawMethod === 'bank' && (!bankDetails.accountNumber || !bankDetails.ifscCode)) return toast.error('Enter complete bank details');
    try {
      await axios.post('/api/wallet/withdraw-request', { amount: parseFloat(withdrawAmount), bankDetails: details });
      toast.success('Withdrawal request submitted! Admin will process within 24 hours.');
      setWithdrawAmount(''); setBankDetails({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit withdrawal');
    }
  };

  const txColor = (type) => {
    if (['recharge', 'game_win', 'game_unlock'].includes(type)) return 'var(--green)';
    if (['game_loss', 'withdraw', 'platform_fee'].includes(type)) return 'var(--red)';
    return 'var(--text-muted)';
  };

  const txSign = (type) => ['recharge', 'game_win'].includes(type) ? '+' : '-';
  const txLabel = { recharge: 'Recharge', withdraw: 'Withdrawal', game_win: 'Game Win', game_loss: 'Game Loss', platform_fee: 'Platform Fee', game_lock: 'Game Entry', game_unlock: 'Refund' };

  return (
    <div>
      <Nav />
      <div className="page">
        <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 26, color: 'var(--yellow)', margin: '24px 0 20px' }}>💰 Wallet</h2>

        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(244,196,48,0.15) 0%, rgba(244,196,48,0.05) 100%)', borderColor: 'rgba(244,196,48,0.3)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Available Balance</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--yellow)', lineHeight: 1.2, margin: '8px 0' }}>₹{balance.availableBalance.toFixed(0)}</div>
            {balance.lockedBalance > 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>₹{balance.lockedBalance} locked in active game</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--card)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
          {['overview', 'recharge', 'withdraw'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px 8px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13, textTransform: 'capitalize', transition: 'all 0.2s', background: tab === t ? 'var(--yellow)' : 'transparent', color: tab === t ? '#1A1A2E' : 'var(--text-muted)' }}>
              {t === 'overview' ? '📋 History' : t === 'recharge' ? '➕ Add Money' : '💸 Withdraw'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            {pending.length > 0 && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(244,196,48,0.4)' }}>
                <h4 style={{ marginBottom: 12, color: 'var(--yellow)' }}>⏳ Pending Requests</h4>
                {pending.map(tx => (
                  <div key={tx._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{tx.type}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--yellow)' }}>₹{tx.amount} <span style={{ fontSize: 11, background: 'rgba(244,196,48,0.2)', borderRadius: 4, padding: '2px 6px' }}>PENDING</span></div>
                  </div>
                ))}
              </div>
            )}
            <div className="card">
              <h4 style={{ marginBottom: 16, fontWeight: 800 }}>Transaction History</h4>
              {loading ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading...</div>
                : transactions.length === 0 ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No transactions yet</div>
                : transactions.map(tx => (
                  <div key={tx._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{txLabel[tx.type] || tx.type}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(tx.createdAt).toLocaleString()} • <span style={{ textTransform: 'capitalize', color: tx.status === 'completed' || tx.status === 'approved' ? 'var(--green)' : tx.status === 'pending' ? 'var(--yellow)' : 'var(--red)' }}>{tx.status}</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: txColor(tx.type), textAlign: 'right' }}>
                      {txSign(tx.type)}₹{tx.amount}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Bal: ₹{tx.balanceAfter}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === 'recharge' && (
          <div>
            <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
              <h4 style={{ marginBottom: 12, fontWeight: 800 }}>Scan QR to Pay</h4>
              <img src={QR_CODE_URL} alt="Payment QR" style={{ width: 180, height: 180, borderRadius: 12, border: '3px solid var(--yellow)' }} />
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                1. Scan this QR and pay the amount<br />
                2. Take a screenshot of the payment<br />
                3. Submit request below with payment note<br />
                4. Admin will verify and add balance within 30 mins
              </p>
            </div>
            <div className="card">
              <h4 style={{ marginBottom: 16, fontWeight: 800 }}>Submit Recharge Request</h4>
              <form onSubmit={handleRechargeRequest}>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input className="form-input" type="number" placeholder="Enter amount you paid" min={10} value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} required />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {[100, 200, 500, 1000].map(a => (
                      <button key={a} type="button" onClick={() => setRechargeAmount(a)} className="btn btn-ghost btn-sm">₹{a}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Reference / UTR Number</label>
                  <input className="form-input" type="text" placeholder="Enter UTR / transaction reference" value={rechargeNote} onChange={e => setRechargeNote(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-full" type="submit">Submit Recharge Request</button>
              </form>
            </div>
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="card">
            <h4 style={{ marginBottom: 4, fontWeight: 800 }}>Withdraw Money</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Available: ₹{balance.availableBalance} • Min: ₹50 • Processed within 24hrs</p>
            <form onSubmit={handleWithdrawRequest}>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input className="form-input" type="number" placeholder="Enter withdrawal amount" min={50} max={balance.availableBalance} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} required />
                {balance.availableBalance > 0 && (
                  <button type="button" onClick={() => setWithdrawAmount(balance.availableBalance)} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>Withdraw All (₹{balance.availableBalance})</button>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setWithdrawMethod('upi')} className={`btn btn-sm ${withdrawMethod === 'upi' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>UPI</button>
                  <button type="button" onClick={() => setWithdrawMethod('bank')} className={`btn btn-sm ${withdrawMethod === 'bank' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>Bank Transfer</button>
                </div>
              </div>
              {withdrawMethod === 'upi' ? (
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input className="form-input" type="text" placeholder="yourname@upi" value={bankDetails.upiId} onChange={e => setBankDetails({ ...bankDetails, upiId: e.target.value })} required />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Account Holder Name</label>
                    <input className="form-input" type="text" placeholder="Full name" value={bankDetails.accountHolderName} onChange={e => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input className="form-input" type="text" placeholder="Bank account number" value={bankDetails.accountNumber} onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IFSC Code</label>
                    <input className="form-input" type="text" placeholder="IFSC code" value={bankDetails.ifscCode} onChange={e => setBankDetails({ ...bankDetails, ifscCode: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input className="form-input" type="text" placeholder="Bank name" value={bankDetails.bankName} onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })} />
                  </div>
                </>
              )}
              <button className="btn btn-primary btn-full" type="submit">Submit Withdrawal Request</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
