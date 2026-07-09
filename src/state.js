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
  equip:{ head:null, chest:null, feet:null }, // worn armor item ids
  hotbarSel:0,
  invOpen:false,
  settingsOpen:false,
  mining:null, // legacy (unused)
  mineHits:new Map(), // "tx,ty" -> accumulated swing damage on partially-mined blocks
  torches:[], // {x,y} world tile coords for light
  keys:{},
  mouse:{x:0,y:0,down:false,button:0},
  lastAttack:0,
  swingStart:0,
  specialCd:-99999,
  zaps:[],   // lightning bolt visuals {x,y0,y1,life}
  waves:[],  // ring visuals {x,y,r,max,life,color}
  flashes:[],// full-screen flash visuals {color,life}
  bombs:[],  // live TNT {x,y,vx,vy,fuse}
  falling:[],// live falling blocks {x,y,vy,tile} — dislodged tree wood/leaves
  meteors:[],// live meteor-shower streaks {x,y,vx,vy,strike,life}
  spikes:[], // ground spikes from the knight boss {x,topY,len,life,max}
  arenas:[], // boss arenas {x0,y0,w,h,gateX,gateY,gateH,triggered} (set from world at load)
  shopOpen:false,
  msgTimer:0,
};
