import { WORLD_W, WORLD_H, TILE, GRAVITY, MOVE_SPEED, JUMP_VEL } from './constants.js';
import { clamp } from './utils.js';
import { state, world } from './state.js';
import { tileAt, tileSolid, tileDef } from './worldgen.js';

const CLIMB_SPEED = 2.2;
// If the entity's body overlaps a climbable tile (ladder/vine), return that
// tile's column; else -1. Checks the player's full width (not just center) so
// you can grab a ladder you're merely touching, not perfectly centered on.
function climbColumn(e){
  const x0 = Math.floor(e.x/TILE), x1 = Math.floor((e.x+e.w-1)/TILE);
  const y0 = Math.floor(e.y/TILE), y1 = Math.floor((e.y+e.h-1)/TILE);
  for(let tx=x0; tx<=x1; tx++) for(let ty=y0; ty<=y1; ty++){
    if(tileDef(tileAt(tx,ty)).climb) return tx;
  }
  return -1;
}

/* ---------- PLAYER ---------- */
export function spawnPlayer(){
  const sx = Math.floor(WORLD_W*0.25);
  const sy = world.surface[sx]-3;
  return {
    x: sx*TILE, y: sy*TILE, w:11, h:23,
    vx:0, vy:0, onGround:false, facing:1,
    hp:180, maxhp:180, invuln:0, hurtCd:0,
  };
}

export function aabbSolid(px,py,pw,ph){
  const x0 = Math.floor(px/TILE), x1 = Math.floor((px+pw)/TILE);
  const y0 = Math.floor(py/TILE), y1 = Math.floor((py+ph)/TILE);
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    if(tileSolid(tileAt(tx,ty))) return true;
  }
  return false;
}

export function moveEntity(e, dt){
  // horizontal
  let nx = e.x + e.vx*dt;
  if(!aabbSolid(nx, e.y, e.w, e.h)) e.x = nx; else e.vx = 0;
  // vertical — gravity is suspended while climbing a ladder/vine
  if(!e.climbing){
    e.vy += GRAVITY*dt;
    e.vy = clamp(e.vy, -20, 14);
  }
  let ny = e.y + e.vy*dt;
  if(!aabbSolid(e.x, ny, e.w, e.h)){ e.y = ny; e.onGround=false; }
  else {
    if(e.vy>0) e.onGround = true;
    e.vy = 0;
  }
}

export function updatePlayer(dt){
  const p = state.player;

  let ax = 0;
  if(state.keys['a']||state.keys['arrowleft']){ ax=-1; p.facing=-1; }
  if(state.keys['d']||state.keys['arrowright']){ ax=1; p.facing=1; }
  // Sprint with Shift for faster movement.
  const sprint = state.keys['shift'];
  p.vx = ax*MOVE_SPEED*(sprint?1.7:1);

  const up = state.keys[' ']||state.keys['w']||state.keys['arrowup'];
  const down = state.keys['s']||state.keys['arrowdown'];
  // Climbing: engage when you're touching a ladder/vine AND press up/down (or
  // are already climbing). While climbing, gravity is off and up/down move you
  // vertically. Press a direction to walk off it.
  const cc = climbColumn(p);
  const wantClimb = cc>=0 && (up || down || p.climbing);
  if(wantClimb){
    p.climbing = true;
    p.vy = up ? -CLIMB_SPEED : (down ? CLIMB_SPEED : 0);
    // when not steering sideways, ease onto the ladder's column so a 1-wide
    // climb shaft through rock still fits; steering sideways lets you slide off
    if(ax===0){
      const target = cc*TILE + (TILE-p.w)/2;
      p.x += (target - p.x)*0.4;
    }
  } else {
    p.climbing = false;
    if(up && p.onGround){ p.vy = JUMP_VEL; p.onGround=false; } // single jump only
  }
  moveEntity(p, dt);
  p.x = clamp(p.x, 0, WORLD_W*TILE-p.w);
  if(p.y>WORLD_H*TILE+200){ killPlayer(); }
  if(p.hurtCd>0) p.hurtCd -= dt*16.7;
  if(p.invuln>0) p.invuln -= dt*16.7;
  if(p.hp<p.maxhp && p.hurtCd<=0) p.hp = Math.min(p.maxhp, p.hp + 0.01*dt);
}

export function killPlayer(){
  const p = state.player;
  document.getElementById('deathmsg').style.display='block';
  setTimeout(()=>{ document.getElementById('deathmsg').style.display='none'; },1800);
  const sx = Math.floor(WORLD_W*0.25);
  p.x = sx*TILE; p.y = (world.surface[sx]-3)*TILE;
  p.vx=0; p.vy=0; p.hp = p.maxhp; p.invuln=1500;
}

export function damagePlayer(amount){
  const p = state.player;
  if(p.invuln>0) return;
  p.hp -= amount; p.hurtCd = 1200; p.invuln = 500;
  if(p.hp<=0) killPlayer();
}
