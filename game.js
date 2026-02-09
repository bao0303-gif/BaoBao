import { GAME_CONFIG } from "./config.js";
const board=document.getElementById("board");
const lvl=document.getElementById("levelNo");
const scoreEl=document.getElementById("score");
const movesEl=document.getElementById("moves");
const targetEl=document.getElementById("target");
const restartBtn=document.getElementById("restartBtn");
const soundToggle=document.getElementById("soundToggle");
const sfxSwap=document.getElementById("sfxSwap");
const sfxWin=document.getElementById("sfxWin");

let soundEnabled=true;
soundToggle.onclick=()=>{
  soundEnabled=!soundEnabled;
  soundToggle.textContent=soundEnabled?"🔊 音效 ON":"🔇 音效 OFF";
};
function play(a){ if(soundEnabled&&a){ try{a.currentTime=0;a.play();}catch(e){} } }

let rows=0,cols=0,score=0,moves=0,target=0,levelIndex=0;
restartBtn.onclick=()=>start(levelIndex);
start(levelIndex);

function start(i){
  const L=GAME_CONFIG.levels[i];
  rows=L.rows; cols=L.cols; score=0; moves=L.moves; target=L.targetScore;
  lvl.textContent=L.id; scoreEl.textContent=0; movesEl.textContent=moves; targetEl.textContent=target;
  build();
}

function build(){
  board.style.gridTemplateColumns=`repeat(${cols},44px)`;
  board.innerHTML="";
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const v=Math.floor(Math.random()*5);
      const d=document.createElement("div");
      d.className="cell";
      const img=document.createElement("img");
      img.src=GAME_CONFIG.images.tiles[v];
      d.appendChild(img);
      d.onpointerdown=()=>play(sfxSwap);
      board.appendChild(d);
    }
  }
}
