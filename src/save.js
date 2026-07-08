import { state, world, setWorld } from './state.js';
import { ITEMS } from './tiles.js';

const SAVE_KEY = 'deepcrag-save-v4';
const SAVE_VERSION = 4;

export function hasSave(){
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

// The grid is huge (up to ~10000 x 320 tiles), so store it run-length encoded.
// The world is mostly long uniform stretches (air/stone), so RLE shrinks it to
// a small fraction of the raw size — the difference between fitting in
// localStorage and not.
function encodeGrid(grid){
  const h = grid.length, w = grid[0].length;
  const rle = [];
  let prev = grid[0][0], count = 0;
  for(let y=0;y<h;y++){
    const row = grid[y];
    for(let x=0;x<w;x++){
      const v = row[x];
      if(v===prev) count++;
      else { rle.push(prev, count); prev=v; count=1; }
    }
  }
  rle.push(prev, count);
  return { w, h, rle };
}
function decodeGrid(enc){
  const { w, h, rle } = enc;
  const grid = [];
  for(let y=0;y<h;y++) grid.push(new Uint8Array(w));
  let idx = 0;
  for(let i=0;i<rle.length;i+=2){
    const v = rle[i]; let c = rle[i+1];
    while(c-- > 0){ grid[(idx/w)|0][idx%w] = v; idx++; }
  }
  return grid;
}

export function saveGame(){
  if(!world || !state.player) return;
  const data = {
    version: SAVE_VERSION,
    world: {
      grid: encodeGrid(world.grid),
      surface: world.surface,
      dungeons: world.dungeons,
      caves: world.caves,
      sky: world.sky,
      villager: world.villager,
      relics: world.relics,
      // biomes intentionally omitted — not used at runtime
    },
    player: state.player,
    inv: state.inv,
    hotbarSel: state.hotbarSel,
    time: state.time,
    bossDefeated: state.bossDefeated,
    bossCooldown: state.bossCooldown,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage unavailable / quota, skip */ }
}

export function loadGame(){
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { return null; }
  if(!raw) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  if(!data.world || !data.world.grid || !data.world.grid.rle) return null;
  // Reject saves written by a newer build than we know how to read; older/missing
  // versions stay loadable (the structural checks above catch real corruption).
  if(typeof data.version === 'number' && data.version > SAVE_VERSION) return null;
  setWorld({
    grid: decodeGrid(data.world.grid),
    surface: data.world.surface,
    dungeons: data.world.dungeons || [],
    caves: data.world.caves || [],
    sky: data.world.sky || null,
    villager: data.world.villager || null,
    relics: data.world.relics || [],
  });
  state.player = data.player;
  // Drop any items that no longer exist in this build (e.g. removed weapons) so
  // stale saves can't crash the inventory/hotbar UI on render.
  state.inv = Array.isArray(data.inv) ? data.inv.map(s => (s && ITEMS[s.id]) ? s : null) : [];
  state.hotbarSel = data.hotbarSel;
  state.time = data.time;
  state.bossDefeated = data.bossDefeated;
  state.bossCooldown = data.bossCooldown;
  // transient runtime arrays never persist; start empty each load
  state.mobs = []; state.projectiles = []; state.particles = [];
  state.zaps = []; state.waves = []; state.flashes = []; state.bombs = []; state.falling = []; state.boss = null;
  state.mineHits = new Map();
  return true;
}

export function clearSave(){
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
