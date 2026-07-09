import { WORLD_W, WORLD_H, AIR, DIRT, GRASS, STONE, WOODT, LEAF, COAL, IRON, GOLD,
         THORIUM, BEDROCK, BRICK, BRICKGLOW, CHEST, ALTAR, DUNGFLOOR, CLOUD, SKYBRICK,
         LADDER, VINE, TORCH, SAND, SNOW, ICE, CACTUS, JUNGLEGRASS, TREEWOOD,
         WATER, DRIPSTONE, MOSS, GLOWSHROOM, MUD, JUNGLEWOOD, JUNGLELEAF } from './constants.js';
import { TILES } from './tiles.js';
import { rand, ri, chance, clamp } from './utils.js';
import { world } from './state.js';

/* ---------- WORLD GENERATION ---------- */
export function generateWorld(W,H){
  const grid = [];
  for(let y=0;y<H;y++){ grid.push(new Uint8Array(W)); }
  // ---- BIOMES ----
  // The overworld is split into horizontal biome bands: Snow, Forest, Desert
  // and Jungle. Each shapes the surface height, ground tiles and flora.
  function biomeAt(x){
    if(x < W*0.17) return 'snow';
    if(x < W*0.42) return 'forest';
    if(x < W*0.64) return 'desert';
    return 'jungle';
  }
  const biomes = new Array(W);
  const surface = new Array(W).fill(0);
  for(let x=0;x<W;x++){
    const b = biomeAt(x); biomes[x] = b;
    // per-biome surface profile — deserts are flat & low, snow is hilly, etc.
    let s;
    if(b==='desert')      s = 40 + Math.sin(x*0.028)*3 + Math.sin(x*0.09)*1.5;
    else if(b==='snow')   s = 31 + Math.sin(x*0.05)*6 + Math.sin(x*0.12)*3;
    else if(b==='jungle') s = 37 + Math.sin(x*0.055)*5 + Math.sin(x*0.021)*6;
    else                  s = 35 + Math.sin(x*0.06)*4 + Math.sin(x*0.017)*7 + Math.sin(x*0.31)*1.5;
    surface[x] = Math.round(s);
  }
  // smoothing pass so biome seams and spikes become gentle slopes (fixes the
  // jagged, cliffy terrain)
  for(let pass=0; pass<3; pass++){
    const cp = surface.slice();
    for(let x=1;x<W-1;x++) surface[x] = Math.round((cp[x-1]+cp[x]*2+cp[x+1])/4);
  }

  for(let x=0;x<W;x++){
    const b = biomes[x], sy = surface[x];
    for(let y=sy;y<H;y++){
      if(y<sy+4){
        // topsoil layer varies by biome
        if(b==='desert')      grid[y][x] = SAND;
        else if(b==='snow')   grid[y][x] = (y<sy+2) ? SNOW : DIRT;
        else if(b==='jungle') grid[y][x] = (y===sy) ? JUNGLEGRASS : MUD;
        else                  grid[y][x] = (y===sy) ? GRASS : DIRT;
        if(b==='snow' && y===sy) grid[y][x] = SNOW;
      } else {
        grid[y][x] = STONE;
        if(b==='jungle' && y<sy+9) grid[y][x] = MUD; // thick mud layer beneath the jungle
        // scattered ice pockets under the snow biome
        if(b==='snow' && chance(0.05)) grid[y][x] = ICE;
      }
    }
    grid[H-1][x]=BEDROCK; grid[H-2][x]=BEDROCK;
  }

  // ---- FLORA (biome-aware) ----
  function placeTree(x, wood, leaf){
    const sy = surface[x];
    const style = ri(0,3);                       // 0 round, 1 tall, 2 broad, 3 bushy
    const th = ri(7,14) + (style===1?3:0);       // tall style has an extra-long trunk
    for(let i=1;i<=th;i++){ if(sy-i>0) grid[sy-i][x]=wood; } // natural trunk (collapses when chopped)
    // little angled roots at the base
    if(x-1>0 && grid[sy-1][x-1]===AIR) grid[sy-1][x-1]=wood;
    if(x+1<W && grid[sy-1][x+1]===AIR) grid[sy-1][x+1]=wood;
    // side branches with a small leaf "paw" at each tip (bushy style has more)
    const nB = style===3 ? ri(3,5) : ri(1,3);
    for(let k=0; k<nB; k++){
      const by = sy - ri(3, th-2), dir = chance(0.5)?-1:1, blen = ri(1,2);
      for(let j=1;j<=blen;j++){ const bx=x+dir*j; if(bx>0&&bx<W&&by>0 && grid[by][bx]===AIR) grid[by][bx]=wood; }
      const tipx = x+dir*(blen+1);
      for(let ly=-1;ly<=1;ly++) for(let lx=-1;lx<=1;lx++){
        const xx=tipx+lx, yy=by+ly;
        if(xx>0&&xx<W&&yy>0&&yy<H && grid[yy][xx]===AIR && Math.abs(lx)+Math.abs(ly)<=2) grid[yy][xx]=leaf;
      }
    }
    // crown shape varies by style so no two tree types look alike
    let cRx, cRy;
    if(style===1){ cRx=ri(3,4); cRy=ri(6,8); }        // tall oval crown
    else if(style===2){ cRx=ri(6,8); cRy=ri(3,5); }   // broad, spreading crown
    else { cRx=ri(4,6); cRy=cRx+ri(0,1); }            // round / bushy
    const topY = sy-th;
    for(let ly=-cRy-2; ly<=cRy; ly++) for(let lx=-cRx-1; lx<=cRx+1; lx++){
      const nx=lx/(cRx+0.6), ny=(ly+1.3)/(cRy+0.6);
      if(nx*nx + ny*ny <= 1.05){
        const yy=topY+ly, xx=x+lx;
        if(xx>=0&&xx<W&&yy>0&&yy<H && grid[yy][xx]===AIR) grid[yy][xx]=leaf;
      }
    }
    // fill the neck where trunk meets crown
    for(let lx=-1;lx<=1;lx++){ const xx=x+lx, yy=topY+1; if(xx>0&&xx<W&&yy<H&&grid[yy][xx]===AIR) grid[yy][xx]=leaf; }
  }
  function placeCactus(x){
    const sy = surface[x], h = ri(2,4);
    for(let i=1;i<=h;i++){ if(sy-i>0 && grid[sy-i][x]===AIR) grid[sy-i][x]=CACTUS; }
  }
  let lastTreeX = -99;
  for(let x=3;x<W-3;x++){
    const b = biomes[x];
    if(b==='desert'){
      if(x-lastTreeX>5 && chance(0.06)){ lastTreeX=x; placeCactus(x); }
    } else if(b==='snow'){
      if(x-lastTreeX>5 && chance(0.22)){ lastTreeX=x; placeTree(x, TREEWOOD, SNOW); }
    } else {
      const jungle = b==='jungle';
      const dens = jungle ? 0.44 : 0.36;   // denser woodland — crowns merge into a canopy
      const gap  = jungle ? 5 : 4;
      if(x-lastTreeX>gap && chance(dens)){ lastTreeX=x;
        if(jungle) placeTree(x, JUNGLEWOOD, JUNGLELEAF); else placeTree(x, TREEWOOD, LEAF); }
      // hanging jungle vines
      if(b==='jungle' && chance(0.10)){
        const sy=surface[x], vl=ri(2,5);
        for(let i=1;i<=vl;i++){ if(sy+i<H && grid[sy+i][x]===AIR) grid[sy+i][x]=VINE; }
      }
    }
  }

  function scatterOre(tileId, seeds, minY, maxY, veinMin, veinMax, minX=3, maxX=W-4){
    let placed=0, attempts=0;
    while(placed<seeds && attempts<seeds*40){
      attempts++;
      const x = ri(minX,maxX), y = ri(minY, Math.min(maxY,H-4));
      if(grid[y][x]===STONE){
        const veinSize = ri(veinMin,veinMax);
        let fx=x, fy=y;
        for(let v=0;v<veinSize;v++){
          if(grid[fy] && grid[fy][fx]===STONE) grid[fy][fx]=tileId;
          fx += ri(-1,1); fy += ri(-1,1);
          fx = clamp(fx,2,W-3); fy = clamp(fy,minY-2,H-4);
        }
        placed++;
      }
    }
  }

  // Dress a carved cavern with Terraria-style biome décor: dripstone spikes on
  // ceilings/floors, lush moss + glowing mushrooms in overgrown pockets, and
  // water pooling on the floor of wet caverns.
  function decorateCave(cx0,cx1,cy0,cy1,deep){
    const lush = chance(0.4), wet = deep && chance(0.5);
    const xa=Math.max(2,cx0), xb=Math.min(W-2,cx1), ya=Math.max(3,cy0), yb=Math.min(H-3,cy1);
    for(let x=xa;x<xb;x++) for(let y=ya;y<yb;y++){
      if(grid[y][x]!==AIR) continue;
      const up=grid[y-1][x], dn=grid[y+1][x];
      const solidUp = up!==AIR && TILES[up] && TILES[up].solid;
      const solidDn = dn!==AIR && TILES[dn] && TILES[dn].solid;
      if(solidUp && !solidDn && chance(0.06)) grid[y][x]=DRIPSTONE;                       // stalactite
      else if(solidDn && !solidUp && chance(0.05)) grid[y][x] = (lush && chance(0.45)) ? GLOWSHROOM : DRIPSTONE; // stalagmite / shroom
    }
    if(lush){ // moss creeping over exposed cave walls
      for(let x=xa;x<xb;x++) for(let y=ya;y<yb;y++){
        if(grid[y][x]!==STONE || !chance(0.14)) continue;
        if(grid[y-1][x]===AIR||grid[y+1][x]===AIR||grid[y][x-1]===AIR||grid[y][x+1]===AIR) grid[y][x]=MOSS;
      }
    }
    if(wet){ // water settling on the cavern floor
      const level = Math.floor(cy0 + (cy1-cy0)*0.5);
      for(let x=xa;x<xb;x++) for(let y=yb-1;y>level;y--){
        if(grid[y][x]!==AIR) continue;
        const b=grid[y+1][x];
        if((TILES[b] && TILES[b].solid) || b===WATER) grid[y][x]=WATER;
      }
    }
  }

  // Underground caverns: open pockets carved by a random walk ("worm"),
  // distinct from the tunnels the player digs by hand. Each cavern gets an
  // extra, boosted ore pass along its walls (more minerals) and its bounding
  // box is tracked in `caves` so mob spawning can be made more aggressive
  // there (more mobs) than in plain solid rock.
  const caves = [];
  const numCaves = Math.max(5, Math.round(W/16)); // scales with world width
  for(let i=0;i<numCaves;i++){
    const x0 = ri(6, W-7);
    // caves start anywhere from just below the surface down to the deep rock,
    // and deeper ones burrow further — so the world has caverns at every depth
    const surfY = surface[clamp(x0,0,W-1)];
    const deep = chance(0.4);
    const startY = deep ? ri(surfY+40, H-40) : surfY + ri(10,24);
    if(startY > H-12) continue;
    let cx = x0, cy = startY;
    let dir = deep ? rand(0,Math.PI*2) : (Math.PI*0.5 + rand(-0.6,0.6)); // shallow caves trend downward
    const steps = deep ? ri(70,180) : ri(45,100);
    const baseR = ri(2,4);
    let minCX=cx, maxCX=cx, minCY=cy, maxCY=cy;
    for(let s=0;s<steps;s++){
      dir += rand(-0.5,0.5);
      cx += Math.cos(dir)*1.7;
      cy += Math.sin(dir)*1.3;
      cx = clamp(cx, 3, W-4);
      cy = clamp(cy, surfY+6, H-9);
      const r = baseR + (chance(0.25)?1:0);
      for(let oy=-r;oy<=r;oy++) for(let ox=-r;ox<=r;ox++){
        if(ox*ox+oy*oy > r*r) continue;
        const gx = Math.round(cx+ox), gy = Math.round(cy+oy);
        if(gx<2||gx>=W-2||gy<3||gy>=H-4) continue;
        if(grid[gy][gx]===BEDROCK) continue;
        grid[gy][gx] = AIR;
      }
      minCX=Math.min(minCX,cx); maxCX=Math.max(maxCX,cx);
      minCY=Math.min(minCY,cy); maxCY=Math.max(maxCY,cy);
    }
    const x0b = Math.floor(minCX)-3, x1b = Math.ceil(maxCX)+3;
    const y0b = Math.floor(minCY)-3, y1b = Math.ceil(maxCY)+3;
    caves.push({ x0:x0b, x1:x1b, y0:y0b, y1:y1b });

    // Extra veins along the cave walls, richer the deeper the cavern runs.
    scatterOre(COAL, 4, y0b, y1b, 2,5, x0b, x1b);
    if(y1b>=30) scatterOre(IRON, 3, y0b, y1b, 2,4, x0b, x1b);
    if(y1b>=55) scatterOre(GOLD, 2, y0b, y1b, 2,3, x0b, x1b);
    if(y1b>=85) scatterOre(THORIUM, 1, y0b, y1b, 1,3, x0b, x1b);
    decorateCave(x0b, x1b, y0b, y1b, deep); // dripstone / lush moss+shrooms / water pools
  }

  // Ore counts scale with world size so a giant world isn't barren.
  scatterOre(COAL,   Math.round(W*0.28), 24, H-8, 3, 7);
  scatterOre(IRON,   Math.round(W*0.10), 30, H-6, 2, 5);
  scatterOre(GOLD,   Math.round(W*0.05), 55, H-6, 2, 4);
  scatterOre(THORIUM,Math.round(W*0.022), 85, H-5, 1, 3);

  // Each dungeon is a cluster of open, walkable chambers linked by wide
  // carved tunnels. Rooms are hollow boxes (glowing brick walls, a floor
  // along the bottom, open air everywhere above it) rather than
  // solid-filled, so you can walk and jump between them without needing to
  // mine through anything. buildDungeon() is parameterized so we can drop
  // several distinct dungeon complexes (one per boss) around the map.
  function buildDungeon(dgnX0, dgnY0, tag){
    const rooms = [
      { x:dgnX0,    y:dgnY0+8,  w:18, h:11 }, // entry hall
      { x:dgnX0+16, y:dgnY0-2,  w:16, h:14 }, // NE chamber
      { x:dgnX0+24, y:dgnY0+16, w:16, h:11 }, // SE vault
      { x:dgnX0-14, y:dgnY0+10, w:12, h:9  }, // west chamber
      { x:dgnX0+6,  y:dgnY0+30, w:26, h:14 }, // boss chamber
    ];
    function carveRoom(r){
      for(let y=r.y-1;y<=r.y+r.h;y++) for(let x=r.x-1;x<=r.x+r.w;x++){
        if(x<1||x>=W-1||y<1||y>=H-3) continue;
        const border = (y===r.y-1||y===r.y+r.h||x===r.x-1||x===r.x+r.w);
        const floor = (!border && y===r.y+r.h-1);
        grid[y][x] = border ? BRICKGLOW : (floor ? DUNGFLOOR : AIR);
      }
    }
    for(const r of rooms) carveRoom(r);

    // Wide L-shaped tunnels: thick enough (5 tiles) to punch clean through
    // any room wall they cross, so two chambers never end up separated by
    // a stray brick even if the connecting points aren't perfectly aligned.
    function carveTunnel(cx1,cy1,cx2,cy2,th){
      const half = Math.floor(th/2);
      const xa=Math.min(cx1,cx2), xb=Math.max(cx1,cx2);
      for(let x=xa;x<=xb;x++) for(let dy=-half; dy<th-half; dy++){
        const yy=cy1+dy;
        if(x>0&&x<W-1&&yy>0&&yy<H-3) grid[yy][x]=AIR;
      }
      const ya=Math.min(cy1,cy2), yb=Math.max(cy1,cy2);
      for(let y=ya;y<=yb;y++) for(let dx=-half; dx<th-half; dx++){
        const xx=cx2+dx;
        if(xx>0&&xx<W-1&&y>0&&y<H-3) grid[y][xx]=AIR;
      }
    }
    carveTunnel(dgnX0+9,  dgnY0+8,  dgnX0+22, dgnY0+5,  5); // entry -> NE chamber
    carveTunnel(dgnX0+16, dgnY0+16, dgnX0+30, dgnY0+20, 5); // entry -> SE vault
    carveTunnel(dgnX0+1,  dgnY0+14, dgnX0-9,  dgnY0+14, 5); // entry -> west chamber
    carveTunnel(dgnX0+9,  dgnY0+18, dgnX0+16, dgnY0+34, 5); // entry -> boss chamber (descends)

    grid[dgnY0+8][dgnX0+20]  = CHEST;
    grid[dgnY0+23][dgnX0+30] = CHEST;
    grid[dgnY0+17][dgnX0-9]  = CHEST;
    grid[dgnY0+42][dgnX0+18] = ALTAR;

    // Vertical ladder shaft: a continuous climbable column carved from the
    // top chamber down to the boss chamber, so you can ascend between the
    // dungeon's floors without mining. It passes through the open entry hall
    // and boss chamber (step off there) and tunnels through the rock between.
    const shaftX = dgnX0+9;
    for(let y=dgnY0-2; y<=dgnY0+43; y++){
      if(y<1||y>=H-3) continue;
      const cur = grid[y][shaftX];
      if(cur===BEDROCK||cur===CHEST||cur===ALTAR) continue;
      grid[y][shaftX] = LADDER;
    }

    // A ladder in EVERY room (floor -> ceiling), extended up through any tunnel
    // above, so from any chamber you can climb up to the level above it.
    for(const r of rooms){
      const lx = r.x+2;
      if(lx<1||lx>=W-1) continue;
      for(let y=r.y; y<=r.y+r.h-1; y++){
        if(y<1||y>=H-3) continue;
        const cur = grid[y][lx];
        if(cur===CHEST||cur===ALTAR||cur===BEDROCK||cur===BRICKGLOW) continue;
        grid[y][lx] = LADDER;
      }
      for(let y=r.y-1, k=0; k<12 && y>1; y--, k++){
        if(grid[y][lx]===AIR) grid[y][lx]=LADDER; else break;
      }
    }

    // SURFACE ENTRANCE: a 1-wide ladder shaft dropped straight from the surface
    // into the entry hall, aligned with the internal shaft so it's one
    // continuous climb from the sky to the boss chamber. The side columns stay
    // SOLID so you can climb out and step onto the ground, and NOTHING blocks
    // the surface approach — you just walk to the ladder (which pokes above
    // ground) and climb/drop down. A glowing arch floats above head height as a
    // landmark, with torch beacons flanking it at ground level.
    const entX = shaftX;                 // line up with the internal ladder shaft
    const topY = surface[clamp(entX,0,W-1)];
    for(let y=topY-2; y<=dgnY0+9; y++){
      if(y<1||y>=H-3) continue;
      if(grid[y][entX]!==BEDROCK) grid[y][entX] = LADDER;
    }
    // elevated glowing archway (posts start well above head height, ground rows
    // stay clear so you can walk straight up to the ladder)
    const aTop = topY-7;
    for(let y=aTop; y<=topY-4; y++){
      if(y<1) continue;
      if(entX-2>0) grid[y][entX-2] = BRICKGLOW;
      if(entX+2<W-1) grid[y][entX+2] = BRICKGLOW;
    }
    for(let x=entX-2; x<=entX+2; x++){ if(x>0&&x<W-1 && aTop>0) grid[aTop][x] = BRICKGLOW; } // lintel
    // torch beacons just above the ground on either side (non-solid, don't block)
    if(topY-1>0){
      if(entX-2>0 && grid[topY-1][entX-2]===AIR) grid[topY-1][entX-2]=TORCH;
      if(entX+2<W-1 && grid[topY-1][entX+2]===AIR) grid[topY-1][entX+2]=TORCH;
    }

    return { tag, x:dgnX0-14, y:dgnY0-2, w:54, h:46, altar:{x:dgnX0+18, y:dgnY0+42}, entrance:{x:entX, y:topY} };
  }

  // Dungeon complexes spread evenly across the whole (very wide) world so each
  // boss has its own distant lair. Count scales with world width. Themes cycle.
  const dungeons = [];
  const dgnThemes = ['magma','frost','storm'];
  const numDun = Math.max(3, Math.round(W/1150)); // ~9 across a 10k world
  for(let i=0;i<numDun;i++){
    const dx = Math.round(W*(i+0.5)/numDun);
    const dy = 55 + (i%3)*12;
    dungeons.push(buildDungeon(dx, dy, dgnThemes[i%dgnThemes.length]));
  }

  // ---- SKY ISLAND ----
  // A floating landmass near the top of the world with a villager shop and
  // a treasure vault, reached by a long cloud staircase rising from the
  // ground. Everything is walkable/jumpable — no mining required to ascend.
  const skyX = Math.floor(W*0.22), skyY = 12, skyW = 34, skyH = 7; // near the spawn area
  for(let y=skyY; y<skyY+skyH; y++) for(let x=skyX-Math.floor(skyW/2); x<skyX+Math.ceil(skyW/2); x++){
    if(x<1||x>=W-1||y<1||y>=H) continue;
    const edgeDist = Math.min(x-(skyX-skyW/2), (skyX+skyW/2)-x);
    // taper the underside so it reads as a floating island rather than a slab
    if(y > skyY+2 && edgeDist < (y-skyY-2)*2) continue;
    if(y===skyY) grid[y][x]=GRASS;
    else if(y<skyY+2) grid[y][x]=CLOUD;
    else grid[y][x]=SKYBRICK;
  }
  // treasure vault on top
  grid[skyY-1][skyX+10] = CHEST;

  // A single long vine hangs from the island down to the ground — the only
  // way up. Carve a 1-wide climbable column through the island's edge so the
  // player can climb the vine straight up and step off onto the top.
  const vineX = skyX - Math.floor(skyW/2) + 4;
  const vineGroundY = surface[clamp(vineX,0,W-1)];
  for(let y=skyY-2; y<vineGroundY; y++){
    if(y<1||y>=H) continue;
    // clear the whole column (including any tree leaves/trunk) so the vine is
    // one continuous climb — otherwise foliage leaves gaps in it
    if(grid[y][vineX]!==BEDROCK) grid[y][vineX]=VINE;
  }
  // also clear leaves directly beside the vine so nothing visually swallows it
  for(let y=skyY-2; y<vineGroundY; y++){
    for(const nx of [vineX-1, vineX+1]){
      if(nx>0 && nx<W-1 && (grid[y][nx]===LEAF || grid[y][nx]===WOODT || grid[y][nx]===TREEWOOD)) grid[y][nx]=AIR;
    }
  }

  const villager = { tx: skyX-6, ty: skyY-1 };

  // ---- RELIC SHRINES ----
  // Several legendary weapons rest on altars hidden in caves across the world.
  // Each holds a random legendary; claiming one summons a mini-boss guardian
  // (handled in combat). Count scales with world size, with a guaranteed
  // minimum so there are always a handful to find.
  const LEG = ['thunder_hammer','water_trident','fire_sword','tempest_bow',
               'nights_edge','terra_blade','sunfury','flamarang'];
  const wantRelics = Math.max(4, Math.round(W/1400));
  const relics = [];
  for(const c of caves){
    if(relics.length>=wantRelics) break;
    let placed=false;
    for(let x=Math.max(3,c.x0+1); x<Math.min(W-3,c.x1-1) && !placed; x++){
      for(let y=Math.max(3,c.y0); y<Math.min(H-4,c.y1); y++){
        const below = TILES[grid[y+1] ? grid[y+1][x] : 0];
        if(grid[y][x]===AIR && grid[y-1][x]===AIR && below && below.solid && grid[y+1][x]!==BEDROCK){
          grid[y][x] = ALTAR;
          relics.push({ x, y, item: LEG[ri(0,LEG.length-1)], taken:false });
          placed=true;
        }
      }
    }
  }
  // guarantee a minimum by carving fallback shrine pockets if needed
  let guard=0;
  while(relics.length < 4 && guard++ < 20){
    const rx = ri(Math.floor(W*0.15), Math.floor(W*0.85)), ry = ri(Math.floor(H*0.4), Math.floor(H*0.75));
    for(let y=ry-2;y<=ry+1;y++) for(let x=rx-4;x<=rx+4;x++){ if(x>0&&x<W-1&&y>0&&y<H-2 && grid[y][x]!==BEDROCK) grid[y][x]=AIR; }
    for(let x=rx-4;x<=rx+4;x++){ if(grid[ry+1] && grid[ry+1][x]===AIR) grid[ry+1][x]=STONE; }
    grid[ry][rx] = ALTAR;
    relics.push({ x:rx, y:ry, item: LEG[ri(0,LEG.length-1)], taken:false });
  }

  return { grid, surface, biomes, dungeons, caves, sky:{x:skyX-Math.floor(skyW/2), y:skyY-2, w:skyW, h:skyH+4}, villager, relics };
}

/* ---------- WORLD QUERY HELPERS ---------- */
export function tileAt(tx,ty){
  if(ty<0) return AIR;
  if(tx<0||tx>=WORLD_W||ty>=WORLD_H) return BEDROCK;
  return world.grid[ty][tx];
}
export function setTile(tx,ty,v){
  if(tx<0||tx>=WORLD_W||ty<0||ty>=WORLD_H) return;
  world.grid[ty][tx]=v;
}
export function tileDef(id){ return TILES[id] || TILES[AIR]; }
export function tileSolid(id){ return !!tileDef(id).solid; }
