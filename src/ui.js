import { ITEMS } from './tiles.js';
import { RECIPES } from './recipes.js';
import { WORLD_W, TILE } from './constants.js';
import { clamp } from './utils.js';
import { state, world } from './state.js';
import { canCraft, doCraft } from './inventory.js';
import { isNight } from './mobs.js';

/* ---------- MESSAGES ---------- */
export function msg(text){
  const log = document.getElementById('msglog');
  const d = document.createElement('div');
  d.textContent = text;
  log.appendChild(d);
  setTimeout(()=>d.remove(), 4000);
  while(log.children.length>5) log.removeChild(log.firstChild);
}

/* ---------- INVENTORY UI ---------- */
export function toggleInv(){
  state.invOpen = !state.invOpen;
  document.getElementById('inv').style.display = state.invOpen?'block':'none';
  if(state.invOpen) renderInvUI();
}
function iconEl(id){
  const d = document.createElement('div');
  d.className='icon';
  const def = ITEMS[id];
  d.style.background = def ? def.color : '#333';
  if(def && def.glow) d.style.boxShadow = '0 0 8px '+def.color;
  return d;
}
export function renderHotbar(){
  const hb = document.getElementById('hotbar');
  hb.innerHTML='';
  for(let i=0;i<8;i++){
    const slot = document.createElement('div');
    slot.className='slot'+(i===state.hotbarSel?' sel':'');
    const key = document.createElement('div'); key.className='key'; key.textContent=(i+1);
    slot.appendChild(key);
    const item = state.inv[i];
    if(item){
      const icon = iconEl(item.id);
      slot.appendChild(icon);
      if(item.count>1){ const c=document.createElement('div'); c.className='count'; c.textContent=item.count; slot.appendChild(c); }
    }
    slot.addEventListener('click', ()=>{ state.hotbarSel=i; renderHotbar(); });
    hb.appendChild(slot);
  }
}
export function renderInvUI(){
  const grid = document.getElementById('invgrid');
  grid.innerHTML='';
  for(let i=0;i<40;i++){
    const slot = document.createElement('div');
    slot.className='slot'+(i===state.hotbarSel?' sel':'');
    const item = state.inv[i];
    if(item){
      slot.appendChild(iconEl(item.id));
      if(item.count>1){ const c=document.createElement('div'); c.className='count'; c.textContent=item.count; slot.appendChild(c); }
      slot.title = ITEMS[item.id].name + (i>=8 ? ' (click to swap into hotbar slot '+(state.hotbarSel+1)+')' : ' (click to select)');
    }
    if(i<8){
      const key = document.createElement('div'); key.className='key'; key.textContent=(i+1);
      slot.appendChild(key);
    }
    // Any slot can be clicked: slots 0-7 select that hotbar slot directly;
    // slots 8+ swap their contents into whichever hotbar slot is currently
    // selected, so anything you craft or pick up can always reach your hands.
    slot.addEventListener('click', ()=>{
      if(i<8){
        state.hotbarSel = i;
      } else if(state.inv[i]){
        const tmp = state.inv[state.hotbarSel];
        state.inv[state.hotbarSel] = state.inv[i];
        state.inv[i] = tmp;
      }
      renderHotbar();
      renderInvUI();
    });
    grid.appendChild(slot);
  }
  const root = document.getElementById('reciperoot');
  root.innerHTML='';
  const groups = [ [null,'Hand-craft'], ['table','Crafting Table nearby'], ['furnace','Furnace nearby'] ];
  for(const [station,label] of groups){
    const tag = document.createElement('div'); tag.className='stationtag'; tag.textContent=label;
    root.appendChild(tag);
    for(const r of RECIPES.filter(r=>r.station===station)){
      const ok = canCraft(r);
      const row = document.createElement('div');
      row.className='recipe'+(ok?'':' locked');
      row.appendChild(iconEl(r.out));
      const info = document.createElement('div'); info.className='info';
      const reqStr = Object.entries(r.req).map(([k,v])=>`${v} ${ITEMS[k].name}`).join(', ');
      info.innerHTML = `${ITEMS[r.out].name} x${r.n}<div class="req">${reqStr}</div>`;
      row.appendChild(info);
      row.addEventListener('click', ()=>{ doCraft(r); });
      root.appendChild(row);
    }
  }
}

/* ---------- HUD TEXT UPDATE ---------- */
export function updateHUD(){
  const p = state.player;
  document.getElementById('hpfill').style.width = clamp(100*p.hp/p.maxhp,0,100)+'%';
  document.getElementById('hptext').textContent = Math.ceil(p.hp)+' / '+p.maxhp;
  const depthTiles = Math.max(0, Math.floor(p.y/TILE) - world.surface[clamp(Math.floor(p.x/TILE),0,WORLD_W-1)]);
  document.getElementById('depth').textContent = depthTiles<=0 ? 'Surface' : ('Depth: '+depthTiles+' ft');
  document.getElementById('daynight').textContent = isNight() ? '🌙 Night — mobs roam' : '☀ Day';
}
