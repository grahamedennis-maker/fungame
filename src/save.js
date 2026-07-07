import { state, world, setWorld } from './state.js';

const SAVE_KEY = 'deepcrag-save-v1';

export function hasSave(){
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function saveGame(){
  if(!world || !state.player) return;
  const data = {
    version: 1,
    world: {
      grid: world.grid.map(row => Array.from(row)),
      surface: world.surface,
      dungeon: world.dungeon,
    },
    player: state.player,
    inv: state.inv,
    hotbarSel: state.hotbarSel,
    time: state.time,
    bossDefeated: state.bossDefeated,
    bossCooldown: state.bossCooldown,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage unavailable, skip */ }
}

export function loadGame(){
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { return null; }
  if(!raw) return null;
  const data = JSON.parse(raw);
  setWorld({
    grid: data.world.grid.map(row => Uint8Array.from(row)),
    surface: data.world.surface,
    dungeon: data.world.dungeon,
  });
  state.player = data.player;
  state.inv = data.inv;
  state.hotbarSel = data.hotbarSel;
  state.time = data.time;
  state.bossDefeated = data.bossDefeated;
  state.bossCooldown = data.bossCooldown;
  return true;
}

export function clearSave(){
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
