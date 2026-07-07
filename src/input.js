import { AIR } from './constants.js';
import { state } from './state.js';
import { ITEMS } from './tiles.js';
import { tileAt, setTile, tileDef } from './worldgen.js';
import { canvas } from './canvas.js';
import { toggleInv, renderHotbar } from './ui.js';
import { hotbarItem, removeItem } from './inventory.js';
import { screenToWorld, worldToTile, reachOk, tryMob, doAttack, tryAltarInteract, openChest } from './combat.js';

export function initInput(){
  window.addEventListener('keydown', e=>{
    state.keys[e.key.toLowerCase()] = true;
    if(e.key.toLowerCase()==='e'){ toggleInv(); }
    const n = parseInt(e.key);
    if(n>=1 && n<=8){ state.hotbarSel = n-1; renderHotbar(); }
    if(e.key===' ') e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ state.keys[e.key.toLowerCase()] = false; });

  canvas.addEventListener('contextmenu', e=>e.preventDefault());
  canvas.addEventListener('mousemove', e=>{ state.mouse.x=e.clientX; state.mouse.y=e.clientY; });
  canvas.addEventListener('mousedown', e=>{
    state.mouse.down=true; state.mouse.button=e.button;
    handleClick(e.clientX,e.clientY,e.button);
  });
  canvas.addEventListener('mouseup', ()=>{ state.mouse.down=false; state.mining=null; });
}

function handleClick(sx,sy,button){
  if(state.invOpen) return;
  const w = screenToWorld(sx,sy);
  const { tx,ty } = worldToTile(w.x,w.y);
  if(!reachOk(tx,ty)) return;

  if(button===0){
    const m = tryMob();
    if(m || state.boss){ doAttack(); return; }
    const t = tileAt(tx,ty);
    if(t!==AIR && t!==undefined){
      if(tileDef(t).isAltar){ return; }
      state.mining = { tx,ty, progress:0 };
    } else {
      doAttack(); // swing at air, still allow bow/attack timing
    }
  } else if(button===2){
    const t = tileAt(tx,ty);
    if(tileDef(t).isChest){ openChest(tx,ty); return; }
    if(tileDef(t).isAltar){ tryAltarInteract(tx,ty); return; }
    if(t===AIR){
      const it = hotbarItem();
      if(it && ITEMS[it.id] && ITEMS[it.id].place){
        setTile(tx,ty, ITEMS[it.id].place);
        removeItem(it.id,1);
        renderHotbar();
      }
    }
  }
}
