export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
// Assigning canvas.width resets context state, so re-disable image smoothing on
// every resize — atlas tile blits must stay crisp/pixelated, not blurred.
function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctx.imageSmoothingEnabled = false; }
window.addEventListener('resize', resize); resize();
