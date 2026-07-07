import { TILE, CRAFT_TABLE, FURNACE } from './constants.js';
import { ITEMS } from './tiles.js';
import { state } from './state.js';
import { tileAt } from './worldgen.js';
import { msg, renderInvUI } from './ui.js';

/* ---------- INVENTORY ---------- */
export function addItem(id,count){
  if(!id||!count) return;
  const def = ITEMS[id];
  for(const slot of state.inv){
    if(slot && slot.id===id && slot.count<def.stack){
      const add = Math.min(count, def.stack-slot.count);
      slot.count += add; count -= add;
      if(count<=0) return;
    }
  }
  while(count>0){
    const empty = state.inv.findIndex(s=>!s);
    if(empty===-1){
      let idx = state.inv.length;
      if(idx>=40) return;
      state.inv.push(null);
      state.inv[idx] = { id, count: Math.min(count,def.stack) };
      count -= state.inv[idx].count;
    } else {
      state.inv[empty] = { id, count: Math.min(count,def.stack) };
      count -= state.inv[empty].count;
    }
  }
}
export function countItem(id){
  let c=0; for(const s of state.inv) if(s && s.id===id) c+=s.count; return c;
}
export function removeItem(id,count){
  for(let i=0;i<state.inv.length && count>0;i++){
    const s = state.inv[i];
    if(s && s.id===id){
      const take = Math.min(count,s.count);
      s.count -= take; count -= take;
      if(s.count<=0) state.inv[i]=null;
    }
  }
}
export function hotbarItem(){ return state.inv[state.hotbarSel]; }

/* ---------- CRAFTING ---------- */
export function nearStation(kind){
  const p = state.player;
  const px = Math.floor(p.x/TILE), py = Math.floor(p.y/TILE);
  for(let dy=-4;dy<=4;dy++) for(let dx=-6;dx<=6;dx++){
    const t = tileAt(px+dx,py+dy);
    if(kind==='table' && t===CRAFT_TABLE) return true;
    if(kind==='furnace' && t===FURNACE) return true;
  }
  return false;
}
export function canCraft(r){
  if(r.station==='table' && !nearStation('table')) return false;
  if(r.station==='furnace' && !nearStation('furnace')) return false;
  for(const k in r.req){ if(countItem(k) < r.req[k]) return false; }
  return true;
}
export function doCraft(r){
  if(!canCraft(r)) return;
  for(const k in r.req) removeItem(k, r.req[k]);
  addItem(r.out, r.n);
  msg('Crafted '+ITEMS[r.out].name);
  renderInvUI();
}
