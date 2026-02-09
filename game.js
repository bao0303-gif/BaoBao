(() => {
  const CFG = window.GAME_CONFIG;

  const elBoard   = document.getElementById("board");
  const elLevelNo = document.getElementById("levelNo");
  const elScore   = document.getElementById("score");
  const elMoves   = document.getElementById("moves");
  const elTarget  = document.getElementById("target");
  const restartBtn= document.getElementById("restartBtn");
  const soundToggle = document.getElementById("soundToggle");

  const modal     = document.getElementById("modal");
  const modalTitle= document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const winImg    = document.getElementById("winImg");
  const nextBtn   = document.getElementById("nextBtn");
  const closeBtn  = document.getElementById("closeBtn");

  const sfxSwap = document.getElementById("sfxSwap");
  const sfxPop  = document.getElementById("sfxPop");
  const sfxWin  = document.getElementById("sfxWin");

  const TILE_URLS = CFG.images.tiles;
  const WIN_URL   = CFG.images.win;

  let levelIndex = 0;
  let rows = 0, cols = 0;
  let grid = [];
  let score = 0;
  let movesLeft = 0;
  let targetScore = 0;
  let isBusy = false;

  let pointerDown = false;
  let startCell = null;
  let startX = 0, startY = 0;

  let soundEnabled = true;
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? "🔊 音效 ON" : "🔇 音效 OFF";
  });
  function playSfx(audio){
    if(!soundEnabled || !audio) return;
    try{ audio.currentTime = 0; audio.play(); }catch(_e){}
  }

  restartBtn.addEventListener("click", () => startLevel(levelIndex));
  closeBtn.addEventListener("click", hideModal);
  nextBtn.addEventListener("click", () => {
    hideModal();
    levelIndex = Math.min(levelIndex + 1, CFG.levels.length - 1);
    startLevel(levelIndex);
  });

  window.addEventListener("resize", () => {
    if(rows && cols) applyResponsiveCellSize();
  });

  startLevel(levelIndex);

  function startLevel(idx){
    const lvl = CFG.levels[idx];
    levelIndex = idx;

    rows = lvl.rows;
    cols = lvl.cols;
    movesLeft = lvl.moves;
    targetScore = lvl.targetScore;
    score = 0;

    elLevelNo.textContent = String(lvl.id);
    elScore.textContent = String(score);
    elMoves.textContent = String(movesLeft);
    elTarget.textContent = String(targetScore);

    buildBoardUI();
    grid = makeInitialGridWithoutMatches(rows, cols, TILE_URLS.length);
    renderAll();
    bindBoardInput();
  }

  function applyResponsiveCellSize(){
    const gap = 6;
    const boardPadding = 20;
    const safeMargin = 28;
    const maxW = Math.min(window.innerWidth - safeMargin, 980);
    const rawCell = Math.floor((maxW - boardPadding - gap * (cols - 1)) / cols);
    const cell = Math.max(CFG.cellSize.min, Math.min(CFG.cellSize.max, rawCell));
    elBoard.style.setProperty("--cell", `${cell}px`);
  }

  function buildBoardUI(){
    applyResponsiveCellSize();
    elBoard.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
    elBoard.innerHTML = "";
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        const img = document.createElement("img");
        img.alt = "tile";
        cell.appendChild(img);
        elBoard.appendChild(cell);
      }
    }
  }

  function bindBoardInput(){
    elBoard.onpointerdown = (e) => {
      if(isBusy || movesLeft <= 0) return;
      const cell = e.target.closest(".cell");
      if(!cell) return;
      pointerDown = true;
      startCell = { r: +cell.dataset.r, c: +cell.dataset.c };
      startX = e.clientX; startY = e.clientY;
      try{ elBoard.setPointerCapture(e.pointerId); }catch(_e){}
    };

    elBoard.onpointermove = (e) => {
      if(!pointerDown || !startCell || isBusy || movesLeft <= 0) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      const threshold = 14;
      if(absX < threshold && absY < threshold) return;
      let dr = 0, dc = 0;
      if(absX > absY) dc = dx > 0 ? 1 : -1;
      else dr = dy > 0 ? 1 : -1;
      const to = { r: startCell.r + dr, c: startCell.c + dc };
      if(!inBounds(to.r, to.c)) return;
      pointerDown = false;
      void trySwapAndResolve(startCell, to);
    };

    elBoard.onpointerup = () => { pointerDown = false; startCell = null; };
    elBoard.onpointercancel = () => { pointerDown = false; startCell = null; };
  }

  async function trySwapAndResolve(a, b){
    if(isBusy) return;
    if(!isAdjacent(a, b)) return;

    isBusy = true;

    swap(a, b);
    renderTwo(a, b);

    const matches = findMatches();
    if(matches.size === 0){
      await sleep(90);
      swap(a, b);
      renderTwo(a, b);
      isBusy = false;
      return;
    }

    movesLeft -= 1;
    elMoves.textContent = String(movesLeft);
    playSfx(sfxSwap);

    while(true){
      const m = findMatches();
      if(m.size === 0) break;

      for(const key of m){
        const {r,c} = parseKey(key);
        const cell = getCellEl(r,c);
        cell?.classList.add("pop");
        setTimeout(()=>cell?.classList.remove("pop"), 180);
      }

      addScoreFor(m.size);
      playSfx(sfxPop);

      for(const key of m){
        const {r,c} = parseKey(key);
        grid[r][c] = -1;
      }
      renderAll();
      await sleep(120);

      collapseAndRefill();
      renderAll();
      await sleep(CFG.animation.fallDelayMs * rows);
    }

    if(score >= targetScore){
      playSfx(sfxWin);
      showResultModal(true);
      isBusy = false;
      return;
    }

    if(movesLeft <= 0 && score < targetScore){
      showResultModal(false);
      isBusy = false;
      return;
    }

    isBusy = false;
  }

  function makeInitialGridWithoutMatches(rN, cN, kinds){
    const g = Array.from({length:rN}, ()=>Array(cN).fill(0));
    for(let r=0;r<rN;r++){
      for(let c=0;c<cN;c++){
        let v;
        do{
          v = randInt(0, kinds-1);
          g[r][c] = v;
        }while(wouldCreateMatchAt(g, r, c));
      }
    }
    return g;
  }
  function wouldCreateMatchAt(g, r, c){
    const v = g[r][c];
    if(c>=2 && g[r][c-1]===v && g[r][c-2]===v) return true;
    if(r>=2 && g[r-1][c]===v && g[r-2][c]===v) return true;
    return false;
  }

  function findMatches(){
    const matched = new Set();

    for(let r=0;r<rows;r++){
      let runVal = grid[r][0];
      let runStart = 0;
      let runLen = 1;
      for(let c=1;c<cols;c++){
        const v = grid[r][c];
        if(v !== -1 && v === runVal) runLen++;
        else{
          if(runVal !== -1 && runLen >= 3){
            for(let k=0;k<runLen;k++) matched.add(keyOf(r, runStart + k));
          }
          runVal = v; runStart = c; runLen = 1;
        }
      }
      if(runVal !== -1 && runLen >= 3){
        for(let k=0;k<runLen;k++) matched.add(keyOf(r, runStart + k));
      }
    }

    for(let c=0;c<cols;c++){
      let runVal = grid[0][c];
      let runStart = 0;
      let runLen = 1;
      for(let r=1;r<rows;r++){
        const v = grid[r][c];
        if(v !== -1 && v === runVal) runLen++;
        else{
          if(runVal !== -1 && runLen >= 3){
            for(let k=0;k<runLen;k++) matched.add(keyOf(runStart + k, c));
          }
          runVal = v; runStart = r; runLen = 1;
        }
      }
      if(runVal !== -1 && runLen >= 3){
        for(let k=0;k<runLen;k++) matched.add(keyOf(runStart + k, c));
      }
    }

    return matched;
  }

  function collapseAndRefill(){
    for(let c=0;c<cols;c++){
      let writeR = rows - 1;
      for(let r=rows-1;r>=0;r--){
        if(grid[r][c] !== -1){
          grid[writeR][c] = grid[r][c];
          writeR--;
        }
      }
      for(let r=writeR;r>=0;r--){
        grid[r][c] = randInt(0, TILE_URLS.length - 1);
      }
    }
  }

  function addScoreFor(count){
    const per = CFG.scoring.perTile;
    const bonus = CFG.scoring.bonusPerExtraTile;
    let gained = count * per;
    const extra = Math.max(0, count - 3);
    gained += extra * bonus * count;
    score += gained;
    elScore.textContent = String(score);
  }

  function swap(a,b){
    const t = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = t;
  }

  function renderAll(){
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const img = getCellEl(r,c)?.querySelector("img");
        const v = grid[r][c];
        if(img) img.src = v >= 0 ? TILE_URLS[v] : "";
      }
    }
  }
  function renderTwo(a,b){ renderOne(a.r,a.c); renderOne(b.r,b.c); }
  function renderOne(r,c){
    const img = getCellEl(r,c)?.querySelector("img");
    const v = grid[r][c];
    if(img) img.src = v >= 0 ? TILE_URLS[v] : "";
  }
  function getCellEl(r,c){ return elBoard.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }

  function showResultModal(isWin){
    winImg.src = WIN_URL;
    if(isWin){
      modalTitle.textContent = "通關成功！";
      modalText.textContent = `分數 ${score} / 目標 ${targetScore}。點「下一關」繼續～`;
      nextBtn.style.display = (levelIndex < CFG.levels.length - 1) ? "inline-block" : "none";
    }else{
      modalTitle.textContent = "步數用完了";
      modalText.textContent = `分數 ${score} / 目標 ${targetScore}。分數不夠，再試一次～`;
      nextBtn.style.display = "none";
    }
    modal.classList.remove("hidden");
  }
  function hideModal(){ modal.classList.add("hidden"); }

  function isAdjacent(a,b){ return (Math.abs(a.r-b.r) + Math.abs(a.c-b.c)) === 1; }
  function inBounds(r,c){ return r>=0 && r<rows && c>=0 && c<cols; }
  function keyOf(r,c){ return `${r},${c}`; }
  function parseKey(k){ const [r,c] = k.split(",").map(Number); return {r,c}; }
  function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function sleep(ms){ return new Promise(res=>setTimeout(res, ms)); }
})();