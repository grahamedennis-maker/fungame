import { WORLD_W, WORLD_H, TILE, AIR, LEAF, GRASS, TORCH, BRICKGLOW, ALTAR } from './constants.js';
import { clamp } from './utils.js';
import { state, world } from './state.js';
import { TILES } from './tiles.js';
import { MOB_TYPES, dayFrac } from './mobs.js';
import { canvas, ctx } from './canvas.js';

/* ---------- RENDERING ---------- */
function skyColor(){
  const f = dayFrac(); // 0 = dawn->day, 0.5 = dusk->night
  // build a soft cycle: day 0-0.5, night 0.5-1
  const t = Math.sin(f*Math.PI*2 - Math.PI/2)*0.5+0.5; // 0 at deepest night, 1 at noon
  const topDay=[100,181,246], topNight=[10,10,30];
  const botDay=[190,230,255], botNight=[30,20,55];
  const lerp=(a,b,x)=>Math.round(a+(b-a)*x);
  const top = `rgb(${lerp(topNight[0],topDay[0],t)},${lerp(topNight[1],topDay[1],t)},${lerp(topNight[2],topDay[2],t)})`;
  const bot = `rgb(${lerp(botNight[0],botDay[0],t)},${lerp(botNight[1],botDay[1],t)},${lerp(botNight[2],botDay[2],t)})`;
  return {top,bot,t};
}

let offCanvas = null;

export function render(){
  const p = state.player;
  state.camX = clamp(p.x - canvas.width/2, 0, WORLD_W*TILE - canvas.width);
  state.camY = clamp(p.y - canvas.height/2, -200, WORLD_H*TILE - canvas.height);

  const sky = skyColor();
  const grad = ctx.createLinearGradient(0,0,0,canvas.height);
  grad.addColorStop(0, sky.top); grad.addColorStop(1, sky.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const x0 = Math.max(0, Math.floor(state.camX/TILE)-1);
  const x1 = Math.min(WORLD_W-1, Math.ceil((state.camX+canvas.width)/TILE)+1);
  const y0 = Math.max(0, Math.floor(state.camY/TILE)-1);
  const y1 = Math.min(WORLD_H-1, Math.ceil((state.camY+canvas.height)/TILE)+1);

  const underground = p.y/TILE > (world.surface[clamp(Math.floor(p.x/TILE),0,WORLD_W-1)]+3);

  for(let ty=y0; ty<=y1; ty++){
    for(let tx=x0; tx<=x1; tx++){
      const t = world.grid[ty][tx];
      if(t===AIR) continue;
      const def = TILES[t];
      const sx = tx*TILE - state.camX, sy = ty*TILE - state.camY;
      ctx.fillStyle = def.color;
      ctx.fillRect(sx,sy,TILE+1,TILE+1);
      if(t===LEAF && (tx+ty*3)%3===0){ ctx.fillStyle='#3d9142'; ctx.fillRect(sx,sy,TILE+1,TILE+1); }
      if(t===GRASS){ ctx.fillStyle = def.top; ctx.fillRect(sx,sy,TILE+1,4); }
      if(def.dot){
        ctx.fillStyle = def.dot;
        ctx.fillRect(sx+3,sy+3,3,3); ctx.fillRect(sx+9,sy+9,3,3); ctx.fillRect(sx+9,sy+3,2,2);
      }
      if(def.glow){
        ctx.fillStyle = def.glow; ctx.globalAlpha=0.5;
        ctx.fillRect(sx+6,sy+6,4,4);
        ctx.globalAlpha=1;
      }
      // simple shading on underground stone for depth feel
    }
  }

  // torches light glow
  for(let ty=y0; ty<=y1; ty++) for(let tx=x0; tx<=x1; tx++){
    if(world.grid[ty][tx]===TORCH){
      const sx = tx*TILE - state.camX + TILE/2, sy = ty*TILE - state.camY + TILE/2;
      const g = ctx.createRadialGradient(sx,sy,2,sx,sy,70);
      g.addColorStop(0,'rgba(255,180,80,0.35)'); g.addColorStop(1,'rgba(255,180,80,0)');
      ctx.fillStyle=g; ctx.fillRect(sx-70,sy-70,140,140);
    }
  }

  // particles
  for(const pt of state.particles){
    ctx.globalAlpha = clamp(pt.life/500,0,1);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x-state.camX-2, pt.y-state.camY-2, 4,4);
    ctx.globalAlpha=1;
  }

  // mobs
  for(const m of state.mobs){
    const sx = m.x-state.camX, sy = m.y-state.camY;
    ctx.fillStyle = MOB_TYPES[m.type].color;
    ctx.fillRect(sx,sy,m.w,m.h);
    ctx.fillStyle='#000a'; ctx.fillRect(sx,sy-6,m.w,3);
    ctx.fillStyle='#e05353'; ctx.fillRect(sx,sy-6,m.w*clamp(m.hp/MOB_TYPES[m.type].hp,0,1),3);
  }

  // projectiles
  ctx.fillStyle='#ffdf80';
  for(const pr of state.projectiles){ ctx.fillRect(pr.x-state.camX-2,pr.y-state.camY-2,4,4); }

  // boss
  if(state.boss){
    const b = state.boss;
    const sx=b.x-state.camX, sy=b.y-state.camY;
    ctx.fillStyle = b.mode==='charge' ? '#9b6fff' : '#6b4fa8';
    ctx.fillRect(sx,sy,b.w,b.h);
    ctx.fillStyle='#c98cff';
    ctx.fillRect(sx+10,sy+14,8,8); ctx.fillRect(sx+b.w-18,sy+14,8,8);
  }

  // player
  const psx = p.x-state.camX, psy = p.y-state.camY;
  if(p.invuln>0 && Math.floor(state.time/100)%2===0){ ctx.globalAlpha=0.4; }
  ctx.fillStyle = '#e8c07a';
  ctx.fillRect(psx,psy,p.w,p.h);
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(psx,psy+p.h-8,p.w,8);
  ctx.globalAlpha=1;

  // darkness overlay when underground (lit by player + torches)
  if(underground){
    if(!offCanvas || offCanvas.width!==canvas.width || offCanvas.height!==canvas.height){
      offCanvas = document.createElement('canvas');
      offCanvas.width = canvas.width; offCanvas.height = canvas.height;
    }
    const octx = offCanvas.getContext('2d');
    octx.clearRect(0,0,offCanvas.width,offCanvas.height);
    octx.fillStyle='rgba(4,2,10,0.86)';
    octx.fillRect(0,0,offCanvas.width,offCanvas.height);
    octx.globalCompositeOperation='destination-out';
    function lightAt(sx,sy,r){
      const g = octx.createRadialGradient(sx,sy,0,sx,sy,r);
      g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
      octx.fillStyle=g; octx.fillRect(sx-r,sy-r,r*2,r*2);
    }
    lightAt(psx+p.w/2, psy+p.h/2, 150);
    for(let ty=y0; ty<=y1; ty++) for(let tx=x0; tx<=x1; tx++){
      if(world.grid[ty][tx]===TORCH){
        lightAt(tx*TILE-state.camX+TILE/2, ty*TILE-state.camY+TILE/2, 130);
      }
      if(world.grid[ty][tx]===BRICKGLOW || world.grid[ty][tx]===ALTAR){
        lightAt(tx*TILE-state.camX+TILE/2, ty*TILE-state.camY+TILE/2, 60);
      }
    }
    octx.globalCompositeOperation='source-over';
    ctx.drawImage(offCanvas,0,0);
  }
}
