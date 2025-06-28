let boardSize = 5;
const board = document.getElementById('game-board');
const moveCounterEl = document.getElementById('move-counter');
const winScreen = document.getElementById('win-screen');
const finalMovesEl = document.getElementById('final-moves');

// Add win counter
const winCounterEl = document.createElement('span');
winCounterEl.id = 'win-counter';
let winCount = 0;

function loadWinCount() {
  winCount = parseInt(localStorage.getItem('winCount') || '0', 10);
  winCounterEl.textContent = ` | Wins: ${winCount}`;
  // Insert after moveCounterEl if not already present
  if (!moveCounterEl.nextSibling || moveCounterEl.nextSibling.id !== 'win-counter') {
    moveCounterEl.parentNode.insertBefore(winCounterEl, moveCounterEl.nextSibling);
  }
}

function incrementWinCount() {
  winCount++;
  localStorage.setItem('winCount', winCount);
  winCounterEl.textContent = ` | Wins: ${winCount}`;
}

let moveCount = 0;
let grid = [];

function getTileSvgs(tileSize) {
  const svgHeader = (tileSize) =>
    `width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;"`;

  return {
    start: `
<svg ${svgHeader(tileSize)}>
  <rect width="${tileSize}" height="${tileSize}" fill="gold"/>
  <polygon points="${tileSize*0.125},${tileSize*0.875} ${tileSize/2},${tileSize*0.125} ${tileSize*0.875},${tileSize*0.875}" fill="black"/>
</svg>`,

    end: `
<svg ${svgHeader(tileSize)}>
  <rect width="${tileSize}" height="${tileSize}" fill="gold"/>
  <rect x="${tileSize*0.25}" y="${tileSize*0.5}" width="${tileSize*0.5}" height="${tileSize*0.375}" fill="currentColor"/>
  <rect x="${tileSize*0.375}" y="${tileSize*0.375}" width="${tileSize*0.25}" height="${tileSize*0.125}" fill="currentColor"/>
</svg>`,

    straight: `
<svg ${svgHeader(tileSize)}>
  <rect width="${tileSize}" height="${tileSize}" fill="gold"/>
  <rect x="${tileSize*0.4375}" y="0" width="${tileSize*0.125}" height="${tileSize}" fill="currentColor"/>
</svg>`,

    elbow: `
<svg ${svgHeader(tileSize)}>
  <rect width="${tileSize}" height="${tileSize}" fill="gold"/>
  <rect x="${tileSize*0.4375}" y="${tileSize*0.4375}" width="${tileSize*0.125}" height="${tileSize*0.5625}" fill="currentColor"/>
  <rect x="${tileSize*0.4375}" y="${tileSize*0.4375}" width="${tileSize*0.5625}" height="${tileSize*0.125}" fill="currentColor"/>
</svg>`,

t: `
<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">Add commentMore actions
  <rect width="${tileSize}" height="${tileSize}" fill="gold"/>
  <!-- Vertical stem of T -->
  <rect x="${tileSize*0.4375}" y="${tileSize*0.5}" width="${tileSize*0.125}" height="${tileSize*0.5}" fill="currentColor"/>
  <!-- Horizontal arm of T -->
  <rect x="0" y="${tileSize * 0.4375}" width="${tileSize}" height="${tileSize * 0.125}" fill="currentColor"/>
</svg>`,

    cross: `
<svg ${svgHeader(tileSize)}>
  <rect width="${tileSize}" height="${tileSize}" fill="gold"/>
  <rect x="${tileSize*0.4375}" y="0" width="${tileSize*0.125}" height="${tileSize}" fill="currentColor"/>
  <rect x="0" y="${tileSize*0.4375}" width="${tileSize}" height="${tileSize*0.125}" fill="currentColor"/>
</svg>`,

    empty: `
<svg ${svgHeader(tileSize)}>
  <rect width="${tileSize}" height="${tileSize}" fill="gold"/>
</svg>`,
  };
}

function getTileSize() {
  if (boardSize === 5) return 80;
  else if (boardSize === 6) return 65;
  else if (boardSize === 7) return 55;
}

const tileTypes = ['straight', 'elbow', 't', 'cross', 'empty'];
let timeoutRef = null;

function createTile(type, rotation, x, y, tileSvgs) {
  const tile = document.createElement('div');
  tile.classList.add('tile');

  //const img = document.createElement('img');
  //img.src = tileImages[type];
  //img.alt = type;
  //tile.appendChild(img);

  tile.innerHTML = tileSvgs[type];

  tile.style.transform = `rotate(${rotation}deg)`;

  tile.addEventListener('click', () => {
    clearTimeout(timeoutRef);
    if (winScreen.style.display === 'block') return;

    let newRotation = (rotation + 90) % 360;
    rotation = newRotation;
    tile.style.transform = `rotate(${rotation}deg)`;

    grid[y][x].rotation = rotation;

    moveCount++;
    moveCounterEl.textContent = moveCount;

    updatePipeColors();

    // Delay win check so animation plays first
    timeoutRef = setTimeout(() => {
      checkWin();
    }, 2000);
  });

  return tile;
}

function carvePath() {
  let path = [];
  let x = 0, y = 0;
  path.push({ x, y });
  
  while (x !== boardSize - 1 || y !== boardSize - 1) {
    const moves = [];
    if (x < boardSize - 1) moves.push({ x: x + 1, y });
    if (y < boardSize - 1) moves.push({ x, y: y + 1 });
    const next = moves[Math.floor(Math.random() * moves.length)];
    x = next.x;
    y = next.y;
    path.push({ x, y });
  }
  
  return path;
}

function getTileForConnection(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 1) return { type: 'straight', rotation: 90 };  // right
  if (dx === -1) return { type: 'straight', rotation: 90 }; // left
  if (dy === 1) return { type: 'straight', rotation: 0 };   // down
  if (dy === -1) return { type: 'straight', rotation: 0 };  // up

  return { type: 'empty', rotation: 0 };
}

function determineTileType(prev, curr, next) {
  const dx1 = curr.x - prev.x;
  const dy1 = curr.y - prev.y;
  const dx2 = next.x - curr.x;
  const dy2 = next.y - curr.y;

  const key = `${dx1},${dy1}|${dx2},${dy2}`;
  const elbowKeys = [
    "1,0|0,1", "0,1|1,0", "-1,0|0,1", "0,1|-1,0",
    "1,0|0,-1", "0,-1|1,0", "-1,0|0,-1", "0,-1|-1,0"
  ];

  if ((dx1 === dx2 && dx1 !== 0) || (dy1 === dy2 && dy1 !== 0)) {
    return { type: 'straight', rotation: (dx1 === 0 ? 0 : 90) };
  } else if (elbowKeys.includes(key)) {
    if (dx1 === 1 && dy2 === 1) return { type: 'elbow', rotation: 90 };
    if (dx1 === -1 && dy2 === 1) return { type: 'elbow', rotation: 180 };
    if (dx1 === -1 && dy2 === -1) return { type: 'elbow', rotation: 270 };
    if (dx1 === 1 && dy2 === -1) return { type: 'elbow', rotation: 0 };
    if (dy1 === 1 && dx2 === 1) return { type: 'elbow', rotation: 90 };
    if (dy1 === 1 && dx2 === -1) return { type: 'elbow', rotation: 180 };
    if (dy1 === -1 && dx2 === -1) return { type: 'elbow', rotation: 270 };
    if (dy1 === -1 && dx2 === 1) return { type: 'elbow', rotation: 0 };
  }

  return { type: 'straight', rotation: 0 };
}

function initBoard() {
  board.innerHTML = '';
  const tileSize = getTileSize();
  const tileSvgs = getTileSvgs(tileSize);
  board.style.gridTemplateColumns = `repeat(${boardSize}, ${tileSize}px)`;
  board.style.gridTemplateRows = `repeat(${boardSize}, ${tileSize}px)`;
  board.style.setProperty('--tile-size', `${tileSize}px`);
  grid = [];
  moveCount = 0;
  moveCounterEl.textContent = '0';
  winScreen.style.display = 'none';

  const path = carvePath();

  // Init empty grid
  for (let y = 0; y < boardSize; y++) {
    grid[y] = [];
    for (let x = 0; x < boardSize; x++) {
      grid[y][x] = { type: 'empty', rotation: 0 };
    }
  }

  // Place path tiles
  for (let i = 0; i < path.length; i++) {
    const { x, y } = path[i];
    let type, rotation;

    if (i === 0) {
      type = 'start';
      const next = path[i + 1];
      if (next.x > x) rotation = 90;
      else if (next.x < x) rotation = 270;
      else if (next.y > y) rotation = 0;
      else rotation = 180;
    } else if (i === path.length - 1) {
      type = 'end';
      const prev = path[i - 1];
      if (x > prev.x) rotation = 270;
      else if (x < prev.x) rotation = 90;
      else if (y > prev.y) rotation = 180;
      else rotation = 0;
    } else {
      const prev = path[i - 1];
      const next = path[i + 1];
      ({ type, rotation } = determineTileType(prev, path[i], next));
    }

    grid[y][x] = { type, rotation };
  }

  // Fill remaining tiles randomly
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const tileData = grid[y][x];
      if (tileData.type === 'empty') {
        tileData.type = tileTypes[Math.floor(Math.random() * tileTypes.length)];
        tileData.rotation = Math.floor(Math.random() * 4) * 90;
      }
      // Randomize rotation
      tileData.rotation = (tileData.rotation + (Math.floor(Math.random() * 4) * 90)) % 360;

      const tile = createTile(tileData.type, tileData.rotation, x, y, tileSvgs);
      board.appendChild(tile);
    }
  }
}

function checkWin() {
  const visited = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));
  function dfs(x, y, fromDir) {
    if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return false;
    if (visited[y][x]) return false;

    const { type, rotation } = grid[y][x];
    visited[y][x] = true;

    const dirs = getOpenDirs(type, rotation);
    if (fromDir && !dirs.includes(fromDir)) return false;

    if (x === boardSize - 1 && y === boardSize - 1) return true;

    for (const dir of dirs) {
      const [dx, dy, oppDir] = moveDelta(dir);
      if (dfs(x + dx, y + dy, oppDir)) return true;
    }
    return false;
  }

  if (dfs(0, 0, null)) {
    finalMovesEl.textContent = moveCount;
    board.style.display = 'none';
    winScreen.style.display = 'block';
    showWaterConfetti();
    showWinPopup();
    incrementWinCount();
  }
}

function getOpenDirs(type, rotation) {
  let dirs = [];
  switch (type) {
    case 'start':
    case 'end':
    case 'straight': dirs = ['up', 'down']; break;
    case 'elbow': dirs = ['right', 'down']; break;
    case 't': dirs = ['down', 'left', 'right']; break;
    case 'cross': dirs = ['up', 'down', 'left', 'right']; break;
    case 'empty': dirs = []; break;
  }
  const dirOrder = ['up', 'right', 'down', 'left'];
  const rotateBy = (rotation / 90) % 4;
  return dirs.map(dir => dirOrder[(dirOrder.indexOf(dir) + rotateBy) % 4]);
}

function moveDelta(dir) {
  switch (dir) {
    case 'up': return [0, -1, 'down'];
    case 'down': return [0, 1, 'up'];
    case 'left': return [-1, 0, 'right'];
    case 'right': return [1, 0, 'left'];
  }
}

function restartGame() {
  board.style.display = 'grid';
  winScreen.style.display = 'none';
  hideWaterConfetti();
  hideWinPopup();
  initBoard();
  updatePipeColors();
}

function showWinPopup() {
  const popup = document.getElementById('win-popup');
  if (popup) popup.style.display = 'flex';
}

function hideWinPopup() {
  const popup = document.getElementById('win-popup');
  if (popup) popup.style.display = 'none';
}

let confettiLoopActive = false;

function showWaterConfetti() {
  const confetti = document.getElementById('water-confetti');
  confetti.innerHTML = '';
  confettiLoopActive = true;

  function spawnDroplet() {
    if (!confettiLoopActive) return;
    const colors = ['','alt1','alt2','alt3'];
    const sizes = ['','tiny','big'];
    const droplet = document.createElement('div');
    droplet.className = 'water-droplet ' +
      (Math.random() < 0.2 ? sizes[Math.floor(Math.random()*sizes.length)] : '') +
      ' ' +
      (Math.random() < 0.7 ? colors[Math.floor(Math.random()*colors.length)] : '');
    droplet.style.left = (10 + Math.random() * 80) + '%';
    droplet.style.animationDelay = (Math.random() * 0.5) + 's';
    droplet.addEventListener('animationend', () => {
      droplet.remove();
      if (confettiLoopActive) setTimeout(spawnDroplet, Math.random() * 300);
    });
    confetti.appendChild(droplet);
  }

  // Spawn initial batch
  for (let i = 0; i < 22; i++) {
    setTimeout(spawnDroplet, Math.random() * 500);
  }
}

function hideWaterConfetti() {
  confettiLoopActive = false;
  const confetti = document.getElementById('water-confetti');
  if (confetti) confetti.innerHTML = '';
}

function updatePipeColors() {
  const visited = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));

  function dfs(x, y, fromDir) {
    if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return;
    if (visited[y][x]) return;

    const { type, rotation } = grid[y][x];
    visited[y][x] = true;

    const dirs = getOpenDirs(type, rotation);
    if (fromDir && !dirs.includes(fromDir)) return;

    const index = y * boardSize + x;
    const tileEl = board.children[index];
    tileEl.classList.add('connected');

    for (const dir of dirs) {
      const [dx, dy, oppDir] = moveDelta(dir);
      dfs(x + dx, y + dy, oppDir);
    }
  }

  // Clear all tiles first
  for (let i = 0; i < board.children.length; i++) {
    board.children[i].classList.remove('connected');
  }

  // Start DFS from source
  dfs(0, 0, null);
}

document.getElementById('mode-select').addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    boardSize = parseInt(e.target.getAttribute('data-size'), 10);
    restartGame();
  }
});

loadWinCount();
initBoard();
updatePipeColors();
