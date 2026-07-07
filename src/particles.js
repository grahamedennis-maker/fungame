import { rand } from './utils.js';
import { state } from './state.js';

export function spawnParticles(x,y,color,n){
  for(let i=0;i<n;i++){
    state.particles.push({ x,y, vx:rand(-2,2), vy:rand(-3,0), life:500, color });
  }
}
export function updateParticles(dt){
  for(let i=state.particles.length-1;i>=0;i--){
    const pt = state.particles[i];
    pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vy+=0.15*dt; pt.life-=dt*16.7;
    if(pt.life<=0) state.particles.splice(i,1);
  }
}
