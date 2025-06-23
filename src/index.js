const boardSize = 5;
const board = document.getElementById('game-board');
const moveCounterEl = document.getElementById('move-counter');
const winScreen = document.getElementById('win-screen');
const finalMovesEl = document.getElementById('final-moves');

let moveCount = 0;
let grid = [];

const tileSvgs = {
  start: `
<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="gold"/>
  <polygon points="10,70 40,10 70,70" fill="black"/>
</svg>`,
  end:   `
<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="gold"/>
  <rect x="20" y="40" width="40" height="30" fill="currentColor"/>
  <rect x="30" y="30" width="20" height="10" fill="currentColor"/>
</svg>`,
  straight: `
<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="gold"/>
  <rect x="35" y="0" width="10" height="80" fill="currentColor"/>
</svg>`,
  elbow: `
<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="gold"/>
  <rect x="35" y="35" width="10" height="45" fill="currentColor"/>
  <rect x="35" y="35" width="45" height="10" fill="currentColor"/>
</svg>`,
  t: `
<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="gold"/>
  <!-- Vertical stem of T -->
  <rect x="35" y="20" width="10" height="50" fill="currentColor"/>
  <!-- Horizontal arm of T -->
  <rect x="10" y="20" width="60" height="10" fill="currentColor"/>
</svg>`,
  cross: `
<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="gold"/>
  <rect x="35" y="0" width="10" height="80" fill="currentColor"/>
  <rect x="0" y="35" width="80" height="10" fill="currentColor"/>
</svg>`,
  empty: `
<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="80" height="80" fill="gold"/>
</svg>`,
};

const tileTypes = ['straight', 'elbow', 't', 'cross', 'empty'];
let timeoutRef = null;

function createTile(type, rotation, x, y) {
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

      const tile = createTile(tileData.type, tileData.rotation, x, y);
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
  initBoard();
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

initBoard();
updatePipeColors();
