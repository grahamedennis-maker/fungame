import { ITEMS } from './tiles.js';
import { RECIPES } from './recipes.js';
import { WORLD_W, TILE } from './constants.js';
import { clamp } from './utils.js';
import { state, world } from './state.js';
import { canCraft, doCraft, countItem, addItem, removeItem } from './inventory.js';
import { isNight } from './mobs.js';
import { iconEl } from './icons.js';

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

/* ---------- SETTINGS / CONTROLS UI ---------- */
export function toggleSettings(){
  state.settingsOpen = !state.settingsOpen;
  document.getElementById('settings').style.display = state.settingsOpen?'block':'none';
}

/* ---------- VILLAGER SHOP ---------- */
const SHOP_STOCK = [
  { id:'health_potion',n:1,  cost:14 },
  { id:'torch',        n:10, cost:5 },
  { id:'wood',         n:20, cost:8 },
  { id:'arrow',        n:20, cost:12 },
  { id:'cloud',        n:15, cost:10 },
  { id:'stone_pickaxe',n:1,  cost:25 },
  { id:'iron_bar',     n:3,  cost:34 },
  { id:'gold_bar',     n:2,  cost:48 },
  { id:'bow',          n:1,  cost:60 },
  { id:'iron_sword',   n:1,  cost:90 },
  { id:'tempest_bow',  n:1,  cost:600 },
];
export function toggleShop(){
  state.shopOpen = !state.shopOpen;
  document.getElementById('shop').style.display = state.shopOpen?'block':'none';
  if(state.shopOpen) renderShop();
}
function renderShop(){
  document.getElementById('shopcoins').textContent = '🪙 Coins: ' + countItem('coin');
  const grid = document.getElementById('shopgrid');
  grid.innerHTML='';
  for(const s of SHOP_STOCK){
    const coins = countItem('coin');
    const ok = coins >= s.cost;
    const row = document.createElement('div');
    row.className = 'shopitem'+(ok?'':' cant');
    row.appendChild(iconEl(s.id, 28));
    const info = document.createElement('div'); info.className='info';
    const def = ITEMS[s.id];
    info.innerHTML = `${def.name}${s.n>1?' x'+s.n:''}${def.legendary?' <span style="color:#8fe0ff">✦ legendary</span>':''}`;
    row.appendChild(info);
    const cost = document.createElement('div'); cost.className='cost'; cost.textContent = s.cost+' 🪙';
    row.appendChild(cost);
    row.addEventListener('click', ()=>{
      if(countItem('coin') < s.cost){ msg('Not enough coins.'); return; }
      removeItem('coin', s.cost);
      addItem(s.id, s.n);
      msg('Bought '+ITEMS[s.id].name);
      renderShop();
      renderHotbar();
    });
    grid.appendChild(row);
  }
}

/* ---------- ITEM TOOLTIP ---------- */
function hideTooltip(){
  document.getElementById('itemtooltip').style.display = 'none';
}
function attachTooltip(el, text){
  el.addEventListener('mouseenter', ()=>{
    const tip = document.getElementById('itemtooltip');
    tip.textContent = text;
    tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    tip.style.left = (r.left + r.width/2) + 'px';
    tip.style.top = (r.top - 8) + 'px';
    tip.style.transform = 'translate(-50%, -100%)';
  });
  el.addEventListener('mouseleave', hideTooltip);
}

export function renderHotbar(){
  hideTooltip();
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
      attachTooltip(slot, ITEMS[item.id].name + (item.count>1 ? ' x'+item.count : ''));
    }
    slot.addEventListener('click', ()=>{ state.hotbarSel=i; renderHotbar(); });
    hb.appendChild(slot);
  }
}
export function renderInvUI(){
  hideTooltip();
  const grid = document.getElementById('invgrid');
  grid.innerHTML='';
  for(let i=0;i<40;i++){
    const slot = document.createElement('div');
    slot.className='slot'+(i===state.hotbarSel?' sel':'');
    const item = state.inv[i];
    if(item){
      slot.appendChild(iconEl(item.id));
      if(item.count>1){ const c=document.createElement('div'); c.className='count'; c.textContent=item.count; slot.appendChild(c); }
      const hint = i>=8 ? ' (click to swap into hotbar slot '+(state.hotbarSel+1)+')' : ' (click to select)';
      attachTooltip(slot, ITEMS[item.id].name + hint);
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
const SPECIAL_CD = 4500;
export function updateHUD(){
  const p = state.player;
  document.getElementById('hpfill').style.width = clamp(100*p.hp/p.maxhp,0,100)+'%';
  document.getElementById('hptext').textContent = Math.ceil(p.hp)+' / '+p.maxhp;
  const depthTiles = Math.max(0, Math.floor(p.y/TILE) - world.surface[clamp(Math.floor(p.x/TILE),0,WORLD_W-1)]);
  document.getElementById('depth').textContent = depthTiles<=0 ? 'Surface' : ('Depth: '+depthTiles+' ft');
  document.getElementById('daynight').textContent = isNight() ? '🌙 Night — mobs roam' : '☀ Day';

  // contextual interaction hint (how to summon a boss, shop, claim a relic)
  const hint = document.getElementById('inthint');
  const px = Math.floor((p.x+p.w/2)/TILE), py = Math.floor((p.y+p.h/2)/TILE);
  let htext = '';
  if(world.villager && Math.hypot(px-world.villager.tx, py-world.villager.ty) < 3){
    htext = 'Right-click the merchant to shop';
  } else if((world.relics||[]).some(r=>!r.taken && Math.hypot(px-r.x, py-r.y) < 3)){
    htext = '✦ Click the shrine to claim the legendary (a guardian will wake!) ✦';
  } else {
    for(const d of (world.dungeons||[])){
      if(d.altar && Math.hypot(px-d.altar.x, py-d.altar.y) < 4){
        htext = state.boss ? '' : (state.bossCooldown>0 ? 'The altar lies dormant…' : '⚔ Click the altar to summon the guardian ⚔');
        break;
      }
    }
  }
  hint.textContent = htext;
  hint.style.display = htext ? 'block' : 'none';

  // special-attack button state reflects the held legendary + its cooldown
  const btn = document.getElementById('specialbtn');
  const held = state.inv[state.hotbarSel];
  const def = held && ITEMS[held.id];
  const label = document.getElementById('speciallabel');
  if(def && def.special){
    const rem = (def.specialCd || SPECIAL_CD) - (performance.now() - state.specialCd);
    btn.style.display = 'flex';
    if(rem>0){ btn.className='cooling'; label.textContent = (rem/1000).toFixed(1)+'s'; }
    else { btn.className='ready'; label.textContent = 'Special'; }
  } else {
    btn.className='cooling'; label.textContent='Special';
    btn.style.display = 'flex';
  }
}
