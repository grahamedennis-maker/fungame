import { WORLD_W, WORLD_H } from './constants.js';
import { state, setWorld } from './state.js';
import { generateWorld, tileAt } from './worldgen.js';
import { spawnPlayer, updatePlayer, damagePlayer } from './player.js';
import { updateMobs, updateSpawning, spawnMob } from './mobs.js';
import { updateProjectiles, updateMining, updateEffects, updateBombs, doAttack } from './combat.js';
import { ITEMS } from './tiles.js';
import { updateParticles } from './particles.js';
import { updateBoss, spawnBoss } from './boss.js';
import { addItem, countItem } from './inventory.js';
import { renderHotbar, msg, updateHUD } from './ui.js';
import { render } from './render.js';
import { initInput } from './input.js';
import { hasSave, saveGame, loadGame, clearSave } from './save.js';

initInput();

// Debug/test hook: read-only introspection + a few deterministic triggers
// for Playwright smoke tests. Inert unless something calls into it.
window.__deepcrag = {
  state, tileAt, countItem, spawnMob, spawnBoss, damagePlayer, saveGame, loadGame, hasSave,
  selectHotbar(i){ state.hotbarSel = i; renderHotbar(); },
  groundTileBelowPlayer(){
    const p = state.player;
    const tx = Math.floor((p.x+p.w/2)/16);
    let ty = Math.floor(p.y/16);
    while(ty < WORLD_H && tileAt(tx,ty)===0) ty++;
    return { tx, ty };
  },
};

/* ---------- MAIN LOOP ---------- */
let lastT = performance.now();
let stepLast = performance.now();
function loop(now){
  if(!state.running) return;
  let dt = (now-lastT)/16.7; dt = Math.max(0, Math.min(dt,3));
  lastT = now;
  state.time += now - stepLast; stepLast = now;

  if(!state.invOpen && !state.settingsOpen && !state.shopOpen){
    updatePlayer(dt);
    updateMobs(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateEffects(dt);
    updateBombs(dt);
    updateBoss(dt);
    updateSpawning(dt);
    if(state.mouse.down && state.mouse.button===0){
      updateMining(dt); // mines only with a pickaxe (drag to mine)
      const held = state.inv[state.hotbarSel];
      const hd = held && ITEMS[held.id];
      if(hd && hd.tool && hd.tool!=='pick') doAttack(); // weapons auto-swing while held
    }
  }
  render();
  updateHUD();
  requestAnimationFrame(loop);
}

function beginRunning(){
  document.getElementById('titlecard').style.display='none';
  renderHotbar();
  state.running = true;
  lastT = performance.now();
  stepLast = performance.now();
  requestAnimationFrame(loop);
  setInterval(saveGame, 8000);
  window.addEventListener('beforeunload', saveGame);
}

/* ---------- START ---------- */
function startGame(){
  setWorld(generateWorld(WORLD_W, WORLD_H));
  state.player = spawnPlayer();
  state.inv = new Array(40).fill(null);
  addItem('wood_pickaxe',1);
  addItem('wood_sword',1);
  addItem('torch',5);
  addItem('wood',10);
  state.inv.sort((a,b)=>{ if(a&&!b)return -1; if(!a&&b)return 1; return 0; });
  beginRunning();
  msg('Welcome to Deepcrag. Dig, craft, survive.');
  msg('Press E to craft, Esc for controls.');
}

function continueGame(){
  if(!loadGame()){ startGame(); return; }
  beginRunning();
  msg('Welcome back to Deepcrag.');
}

document.getElementById('startbtn').addEventListener('click', ()=>{ clearSave(); startGame(); });
const continueBtn = document.getElementById('continuebtn');
if(hasSave()){
  continueBtn.style.display='inline-block';
  continueBtn.addEventListener('click', continueGame);
} else {
  continueBtn.style.display='none';
}
