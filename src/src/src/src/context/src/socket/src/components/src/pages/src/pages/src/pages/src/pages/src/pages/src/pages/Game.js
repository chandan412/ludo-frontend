import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { initSocket, getSocket, disconnectSocket } from '../socket/socket';
import LudoBoard from '../components/LudoBoard';

export default function Game() {
  const { roomCode } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diceRoll, setDiceRoll] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [validMoves, setValidMoves] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [oppConnected, setOppConnected] = useState(true);
  const [log, setLog] = useState([]);
  const logRef = useRef(null);

  const myId = user?._id;
  const myPlayer = game?.players?.find(p => p.user?._id === myId || p.user === myId);
  const oppPlayer = game?.players?.find(p => p.user?._id !== myId && p.user !== myId);
  const isMyTurn = game?.currentTurn === myId || game?.currentTurn?._id === myId || game?.isMyTurn;
  const myColor = myPlayer?.color;
  const oppColor = oppPlayer?.color;

  const addLog = (msg) => setLog(prev => [...prev.slice(-20), { msg, time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    axios.get(`/api/game/${roomCode}`)
      .then(res => { setGame(res.data); setLoading(false); })
      .catch(() => { toast.error('Game not found'); navigate('/lobby'); });

    const socket = initSocket(token);

    socket.on('connect', () => { socket.emit('join-room', { roomCode }); });
    socket.on('game-state', (data) => { setGame(data); setLoading(false); });
    socket.on('player-connected', ({ username }) => { setOppConnected(true); addLog(`${username} connected`); toast.success(`${username} joined the game!`); });
    socket.on('player-disconnected', ({ username, message }) => { setOppConnected(false); addLog(`⚠️ ${message}`); toast.error(message, { duration: 5000 }); });
    socket.on('player-reconnected', ({ username }) => { setOppConnected(true); addLog(`${username} reconnected`); toast.success(`${username} reconnected!`); });

    socket.on('dice-rolled', (data) => {
      setRolling(false);
      setDiceRoll(data.diceRoll);
      if (data.consecutiveSixes) {
        toast.error(data.message);
        addLog(`🎲 ${data.playerUsername} rolled 3 sixes! Turn forfeited.`);
        setValidMoves([]);
      } else {
        addLog(`🎲 ${data.playerUsername} rolled ${data.diceRoll}`);
        if (data.playerId === myId) {
          setValidMoves(data.validMoves || []);
          if (!data.hasValidMoves) toast('No valid moves. Turn passing...', { icon: '⏭️' });
        }
      }
    });

    socket.on('turn-passed', ({ reason, nextTurnUsername }) => {
      setValidMoves([]);
      setDiceRoll(null);
      addLog(`⏭️ Turn passed to ${nextTurnUsername} (${reason})`);
    });

    socket.on('token-moved', (data) => {
      setGame(prev => prev ? { ...prev, ...data.gameState, currentTurn: data.gameState.currentTurn } : prev);
      setValidMoves([]);
      setDiceRoll(null);
      if (data.captured) { addLog(`💥 ${data.playerUsername} captured a token!`); }
      if (data.extraTurn) addLog(`🔄 ${data.playerUsername} gets an extra turn!`);
      addLog(`♟️ ${data.playerUsername} moved token ${data.tokenIndex + 1}`);
    });

    socket.on('game-over', (data) => {
      setGameOver(data);
      setValidMoves([]);
      setDiceRoll(null);
      addLog(`🏆 Game over! ${data.winner?.username || 'Someone'} wins!`);
      refreshUser();
    });

    socket.on('error', ({ message }) => { toast.error(message); setRolling(false); });

    return () => disconnectSocket();
  }, [roomCode]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const handleRollDice = () => {
    if (!isMyTurn || diceRoll !== null || rolling) return;
    setRolling(true);
    getSocket()?.emit('roll-dice', { roomCode });
  };

  const handleTokenClick = useCallback((tokenIndex) => {
    if (!isMyTurn || diceRoll === null) return;
    getSocket()?.emit('move-token', { roomCode, tokenIndex });
  }, [isMyTurn, diceRoll, roomCode]);

  const diceFaces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading game...</p>
      </div>
    </div>
  );

  if (game?.status === 'waiting') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontFamily: 'Fredoka One, cursive', color: 'var(--yellow)', marginBottom: 8 }}>Waiting for Opponent</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Share this room code with your opponent</p>
        <div style={{ background: 'rgba(244,196,48,0.15)', border: '2px dashed var(--yellow)', borderRadius: 12, padding: '20px 32px', marginBottom: 20 }}>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 8, color: 'var(--yellow)' }}>{roomCode}</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Bet Amount: <strong style={{ color: 'var(--text)' }}>₹{game?.betAmount}</strong></p>
        <button className="btn btn-ghost btn-sm" onClick={async () => {
          try { await axios.post(`/api/game/cancel/${roomCode}`); navigate('/lobby'); }
          catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
        }}>Cancel Game</button>
      </div>
    </div>
  );

  if (gameOver) {
    const isWinner = gameOver.winner?.id === myId;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
        <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{isWinner ? '🏆' : '😔'}</div>
          <h2 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 32, color: isWinner ? 'var(--yellow)' : 'var(--red)', marginBottom: 8 }}>
            {isWinner ? 'You Won!' : 'You Lost!'}
          </h2>
          {gameOver.reason === 'opponent_disconnected' && (
            <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Opponent disconnected</p>
          )}
          <div style={{ background: isWinner ? 'rgba(39,174,96,0.15)' : 'rgba(232,64,64,0.15)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              {isWinner ? 'Amount Won' : 'Amount Lost'}
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: isWinner ? 'var(--green)' : 'var(--red)' }}>
              {isWinner ? `+₹${gameOver.winAmount}` : `-₹${gameOver.betAmount || game?.betAmount}`}
            </div>
            {isWinner && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Platform fee: ₹{gameOver.platformFee}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/lobby')}>Play Again</button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 20, color: 'var(--yellow)' }}>🎲 {roomCode}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bet: <strong style={{ color: 'var(--text)' }}>₹{game?.betAmount}</strong> • Win: <strong style={{ color: 'var(--green)' }}>₹{Math.floor((game?.betAmount || 0) * 2 * 0.95)}</strong></div>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[{ p: myPlayer, label: 'You', color: myColor }, { p: oppPlayer, label: oppPlayer?.user?.username || 'Opponent', color: oppColor }].map(({ p, label, color }) => {
            const isTurn = isMyTurn ? label === 'You' : label !== 'You';
            return (
              <div key={label} className="card" style={{ padding: '12px 14px', borderColor: isTurn ? (color === 'red' ? 'var(--red)' : 'var(--blue)') : 'var(--border)', transition: 'border-color 0.3s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color === 'red' ? 'var(--red)' : 'var(--blue)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  {isTurn && <span style={{ fontSize: 10, background: color === 'red' ? 'var(--red)' : 'var(--blue)', color: '#fff', borderRadius: 4, padding: '1px 6px', marginLeft: 'auto', flexShrink: 0 }}>TURN</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(p?.tokens || Array(4).fill({})).map((t, i) => (
                    <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: t?.isFinished ? '#FFD700' : color === 'red' ? 'var(--red)' : 'var(--blue)', opacity: t?.position === -1 ? 0.3 : 1, border: '1.5px solid rgba(255,255,255,0.3)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      {t?.isFinished ? '★' : ''}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {!oppConnected && (
          <div style={{ background: 'rgba(232,64,64,0.15)', border: '1px solid var(--red)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>
            ⚠️ Opponent disconnected. Waiting 60s for reconnect...
          </div>
        )}

        <LudoBoard
          gameState={game}
          myColor={myColor}
          isMyTurn={isMyTurn && diceRoll !== null}
          onTokenClick={handleTokenClick}
          validMoves={validMoves}
          lastDice={diceRoll}
        />

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
          <div style={{ fontSize: 64, lineHeight: 1, filter: rolling ? 'blur(2px)' : 'none', transition: 'filter 0.1s' }}>
            {diceRoll ? diceFaces[diceRoll] : '🎲'}
          </div>
          <div>
            {isMyTurn && diceRoll === null && (
              <button className="btn btn-primary" onClick={handleRollDice} disabled={rolling} style={{ fontSize: 16, padding: '14px 28px' }}>
                {rolling ? 'Rolling...' : 'Roll Dice'}
              </button>
            )}
            {isMyTurn && diceRoll !== null && validMoves.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--yellow)', marginBottom: 4 }}>Rolled {diceRoll}!</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click a token to move</div>
              </div>
            )}
            {!isMyTurn && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                <div>Waiting for</div>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{oppPlayer?.user?.username || 'opponent'}...</div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: 16, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Game Log</div>
          <div ref={logRef} style={{ maxHeight: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {log.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Game started. Good luck!</div>
              : log.map((entry, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ opacity: 0.5 }}>{entry.time}</span> {entry.msg}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
