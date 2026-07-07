/* ---------- GAME STATE ---------- */
export let world = null;
export function setWorld(w){ world = w; }

export const state = {
  running:false,
  time: 0,
  dayLength: 180000, // ms full cycle
  camX:0, camY:0,
  player:null,
  mobs:[],
  projectiles:[],
  particles:[],
  boss:null,
  bossDefeated:false,
  bossCooldown:0,
  inv:[], // {id,count}
  hotbarSel:0,
  invOpen:false,
  mining:null, // {tx,ty,progress}
  torches:[], // {x,y} world tile coords for light
  keys:{},
  mouse:{x:0,y:0,down:false,button:0},
  lastAttack:0,
  msgTimer:0,
};
