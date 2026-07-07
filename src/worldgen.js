import { WORLD_W, WORLD_H, AIR, DIRT, GRASS, STONE, WOODT, LEAF, COAL, IRON, GOLD,
         THORIUM, BEDROCK, BRICK, BRICKGLOW, CHEST, ALTAR, DUNGFLOOR } from './constants.js';
import { TILES } from './tiles.js';
import { rand, ri, chance, clamp } from './utils.js';
import { world } from './state.js';

/* ---------- WORLD GENERATION ---------- */
export function generateWorld(W,H){
  const grid = [];
  for(let y=0;y<H;y++){ grid.push(new Uint8Array(W)); }
  const surface = new Array(W).fill(0);
  for(let x=0;x<W;x++){
    const s = 34 + Math.sin(x*0.06)*4 + Math.sin(x*0.017)*7 + Math.sin(x*0.31)*1.5;
    surface[x] = Math.round(s);
  }
  for(let x=0;x<W;x++){
    const sy = surface[x];
    for(let y=sy;y<H;y++){
      if(y===sy) grid[y][x]=GRASS;
      else if(y<sy+4) grid[y][x]=DIRT;
      else grid[y][x]=STONE;
    }
    grid[H-1][x]=BEDROCK; grid[H-2][x]=BEDROCK;
  }
  // trees - fuller canopy, spaced out so they don't clump
  let lastTreeX = -99;
  for(let x=3;x<W-3;x++){
    if(x-lastTreeX>3 && chance(0.16)){
      lastTreeX = x;
      const sy = surface[x];
      const th = ri(4,7);
      for(let i=1;i<=th;i++){ if(sy-i>0) grid[sy-i][x]=WOODT; }
      const topY = sy-th;
      const canopyR = ri(2,3);
      for(let ly=-canopyR; ly<=canopyR-1; ly++){
        for(let lx=-canopyR; lx<=canopyR; lx++){
          const dist = Math.abs(lx) + Math.abs(ly*1.3);
          if(dist<=canopyR+0.6){
            const yy=topY+ly, xx=x+lx;
            if(xx>=0&&xx<W&&yy>0&&yy<H && grid[yy][xx]===AIR) grid[yy][xx]=LEAF;
          }
        }
      }
      if(topY-1>0 && grid[topY-1][x]===AIR) grid[topY-1][x]=LEAF;
    }
  }

  // No pre-carved caves: the underground is solid dirt/stone/bedrock
  // all the way down except for ore veins and the dungeon complex.
  // The player digs their own tunnels and caverns by mining.

  function scatterOre(tileId, seeds, minY, maxY, veinMin, veinMax){
    let placed=0, attempts=0;
    while(placed<seeds && attempts<seeds*40){
      attempts++;
      const x = ri(3,W-4), y = ri(minY, Math.min(maxY,H-4));
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
  scatterOre(COAL, 95, 24, H-8, 3, 7);
  scatterOre(IRON, 34, 30, H-6, 2, 5);
  scatterOre(GOLD, 16, 55, H-6, 2, 4);
  scatterOre(THORIUM, 7, 85, H-5, 1, 3);

  const dgnX0 = W-46, dgnY0 = 60;
  const rooms = [
    {x:dgnX0, y:dgnY0, w:12, h:8},
    {x:dgnX0+14, y:dgnY0+3, w:10, h:10},
    {x:dgnX0+8, y:dgnY0+14, w:14, h:9},
  ];
  function carveRoom(r){
    for(let y=r.y-1;y<=r.y+r.h;y++) for(let x=r.x-1;x<=r.x+r.w;x++){
      if(x<1||x>=W-1||y<1||y>=H-3) continue;
      const border = (y===r.y-1||y===r.y+r.h||x===r.x-1||x===r.x+r.w);
      grid[y][x] = border ? BRICKGLOW : DUNGFLOOR;
    }
  }
  for(const r of rooms) carveRoom(r);
  function corridor(x1,y1,x2,y2){
    let cx=x1, cy=y1;
    while(cx!==x2){ grid[cy][cx]=DUNGFLOOR; grid[cy-1][cx]=DUNGFLOOR; cx += cx<x2?1:-1; }
    while(cy!==y2){ grid[cy][cx]=DUNGFLOOR; cy += cy<y2?1:-1; }
  }
  corridor(dgnX0+12, dgnY0+4, dgnX0+14, dgnY0+7);
  corridor(dgnX0+16, dgnY0+13, dgnX0+15, dgnY0+14);
  grid[dgnY0+3][dgnX0+3] = CHEST;
  grid[dgnY0+5][dgnX0+8] = CHEST;
  grid[dgnY0+13][dgnX0+18] = CHEST;
  grid[dgnY0+20][dgnX0+14] = ALTAR;
  grid[dgnY0+20][dgnX0+13] = DUNGFLOOR;
  grid[dgnY0+20][dgnX0+15] = DUNGFLOOR;

  return { grid, surface, dungeon:{x:dgnX0,y:dgnY0,w:46,h:26} };
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
