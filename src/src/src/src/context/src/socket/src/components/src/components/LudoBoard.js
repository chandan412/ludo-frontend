import React from 'react';

const CELL_SIZE = 36;
const BOARD_SIZE = 15 * CELL_SIZE;

const STAR_CELLS = new Set([
  '2,6','6,2','6,12','2,8','12,2','8,2','12,6','8,12'
]);

const COLORS = {
  red:  { home: '#E84040', light: '#FDEAEA', token: '#C0392B', text: '#fff', start: '1,6' },
  blue: { home: '#2A6FDB', light: '#E8F0FD', token: '#1A4FA0', text: '#fff', start: '6,13' },
};

const RED_PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],
  [7,13],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],
  [7,1],
  [7,2],[7,3],[7,4],[7,5],[7,6],[7,7]
];

const BLUE_PATH = [
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],
  [7,13],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],
  [7,1],
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [7,12],[7,11],[7,10],[7,9],[7,8],[7,7]
];

const HOME_SLOTS = {
  red:  [[1,1],[1,4],[4,1],[4,4]],
  blue: [[1,10],[1,13],[4,10],[4,13]],
};

function cellKey(r, c) { return `${r},${c}`; }

export default function LudoBoard({ gameState, myColor, isMyTurn, onTokenClick, validMoves, lastDice }) {
  if (!gameState) return null;

  const { players } = gameState;
  const myPlayer = players?.find(p => p.color === myColor);
  const oppPlayer = players?.find(p => p.color !== myColor);

  const validTokenIndices = new Set((validMoves || []).map(m => m.tokenIndex));

  const getTokenPos = (color, progress) => {
    if (progress === -1) return null;
    const path = color === 'red' ? RED_PATH : BLUE_PATH;
    const cell = path[Math.min(progress, path.length - 1)];
    if (!cell) return null;
    return { x: cell[1] * CELL_SIZE + CELL_SIZE / 2, y: cell[0] * CELL_SIZE + CELL_SIZE / 2 };
  };

  const renderHomeBase = (color) => {
    const c = COLORS[color];
    const isRed = color === 'red';
    const baseX = isRed ? 0 : 9 * CELL_SIZE;
    const baseY = 0;
    const player = color === myColor ? myPlayer : oppPlayer;

    return (
      <g key={`home-${color}`}>
        <rect x={baseX} y={baseY} width={6 * CELL_SIZE} height={6 * CELL_SIZE} fill={c.home} rx={8} />
        <rect x={baseX + CELL_SIZE * 0.5} y={baseY + CELL_SIZE * 0.5} width={5 * CELL_SIZE} height={5 * CELL_SIZE} fill={c.light} rx={6} />
        {HOME_SLOTS[color].map(([r, c2], idx) => {
          const token = player?.tokens[idx];
          const inHome = !token || token.position === -1;
          const isFinished = token?.isFinished;
          const isValid = isMyTurn && color === myColor && validTokenIndices.has(idx) && inHome;
          const px = c
