# Deepcrag — Project Plan

A Terraria-like 2D sandbox game: procedural world, mining, crafting, mobs, a
dungeon, and a boss. Originally a single self-contained HTML file with an
inline `<canvas>` renderer and vanilla JS — no build step, no dependencies.
(Kept at `terraria_clone.html` for reference.)

This doc is the starting brief handed to Claude Code. It covers what
existed originally, how it was built, known rough edges, and a
prioritized backlog to work through.

---

## 1. How it works today

- **Rendering:** raw 2D canvas, tile-based world, camera follows the player,
  everything drawn manually every frame (no framework).
- **World:** a `WORLD_W x WORLD_H` (220x120) tile grid generated once on
  "Descend": rolling-hill surface via layered sine noise, dirt/stone layers,
  scattered ore veins (coal common → iron → gold → thorium rare/deep), trees,
  and a hand-carved dungeon (3 rooms + corridors + chests + a boss altar)
  near the right edge. **The underground is solid** — no pre-carved caves;
  players dig their own tunnels.
- **Player:** simple AABB tile-collision physics, gravity, jump, left/right
  movement, mining (hold click on adjacent tile), placing blocks (right
  click), melee/ranged combat.
- **Inventory/crafting:** flat array of 40 slots; first 8 slots double as the
  hotbar. Recipes are data-driven (`RECIPES` array) with three tiers:
  hand-craft, crafting table, furnace. Clicking a backpack slot swaps it into
  the currently-selected hotbar slot (this was a real bug, now fixed — see
  §3).
- **Mobs:** cave slimes, surface zombies (night-only), dungeon skeletons
  (ranged). Simple chase-and-contact-damage AI.
- **Boss:** "The Storm King," summoned at the dungeon altar, 3 HP-based
  phases, melee charge + projectile attacks.
- **Day/night cycle:** drives mob spawns and sky color.
- **Lighting:** darkness overlay underground, lit by player + torches +
  glowing dungeon bricks/altar.

All game constants (`TILE`, `WORLD_W`, tool tiers, recipe list, mob stats,
etc.) live near the top of the `<script>` block and are meant to be tuned
directly.

---

## 2. Module split

The single-file approach was fine for fast iteration in chat, but it's
already large enough that it's easier to work in once split up. No bundler
needed — plain `<script type="module">` files work fine. Actual structure
used (a few small pragmatic additions beyond the original suggestion —
`utils.js`, `canvas.js`, `state.js`, `particles.js`, `input.js` — to avoid
circular-dependency tangles and give the runtime world/state a single home):

```
/
  index.html          <- shell: canvas, UI DOM, script imports
  /css/style.css
  /src
    constants.js       <- TILE, WORLD_W/H, physics constants, tile ids
    utils.js           <- rand/ri/chance/clamp
    tiles.js           <- TILES def, ITEMS def
    recipes.js         <- RECIPES array
    mobs.js            <- MOB_TYPES, mob spawn/update/AI
    worldgen.js        <- generateWorld(), tileAt/setTile/tileDef/tileSolid
    state.js           <- shared mutable game state + world binding
    canvas.js          <- canvas/ctx setup + resize
    player.js          <- spawnPlayer, physics, damage/respawn
    particles.js        <- spawnParticles/updateParticles
    combat.js          <- attack, mining, projectiles, chest/altar interact
    boss.js            <- boss spawn/update
    inventory.js       <- inv state, crafting logic, save/load
    ui.js              <- hotbar/inventory DOM rendering, HUD, messages
    input.js           <- keyboard/mouse handlers
    render.js          <- render(), lighting overlay
    main.js            <- game loop, startGame(), wiring
  /tests
    smoke.spec.js      <- Playwright smoke test
  /scripts
    serve.js           <- tiny static file server for local dev + tests
```

This was a mechanical refactor — move code, add imports/exports, no behavior
change — plus the P0 backlog items below.

---

## 3. Bugs already found & fixed (context, don't redo these)

1. **Cave generation punched through the surface.** Original cave-carving
   used an absolute row cutoff instead of a depth-relative-to-local-surface
   check, so in low-lying terrain caves opened craters at ground level and
   ate trees. Fixed by gating carving to `localSurface + buffer`, then later
   **removed pre-carved caves entirely** per latest request — underground is
   now fully solid and player-dug only.
2. **Trees were sparse/thin and vulnerable to the bug above.** Improved to
   taller trunks, fuller multi-tile canopy, anti-clumping spacing.
3. **Crafting appeared totally broken.** Root cause: only inventory slots
   0–7 (the hotbar) were selectable; anything crafted or picked up once you
   had >8 distinct item stacks landed in an unreachable backpack slot with no
   way to equip/place it (e.g. a freshly-crafted Crafting Table). Fixed by
   making every backpack slot clickable to swap into the current hotbar
   selection.

---

## 4. Known rough edges / things to watch for

- `moveEntity()` collision is AABB-vs-tile-solid only; fast movement can
  tunnel through thin geometry at low frame rates. Fine for now, but worth
  hardening (swept collision) if boss speed or player dash abilities are
  added later.
- Mob spawning logic (`updateSpawning`) assumes cave-like air pockets exist
  underground for slime spawns; now that caves are removed, slimes will
  mostly spawn only in player-dug tunnels or the dungeon area — verify this
  still feels balanced once there's more play-testing.
- The darkness/lighting overlay recreates a full-screen radial gradient per
  torch per frame — fine at current world size/torch counts, but will need
  optimizing (e.g. a persistent lightmap canvas updated incrementally) if
  torch density goes up a lot.
- No mobile/touch input handling — mouse events only (`mousedown`,
  `contextmenu` for right-click). If mobile support matters, this needs
  touch-equivalent gestures (tap = mine/attack, long-press or a UI button for
  place).

---

## 5. Backlog (prioritized)

### P0 — foundation
- [x] Split into modules per §2.
- [x] Add save/load (localStorage — this runs as a standalone static site,
  not a claude.ai artifact, so browser storage is available).
- [x] Add a few Playwright smoke tests covering start → mine → craft → place
  → combat → death/respawn.

### P1 — core loop depth
- [ ] More recipes / a mid-game progression step between iron and gold
  (currently a big jump in material requirements).
- [ ] Second boss (different arena/mechanic) so there's a reason to keep
  playing after The Storm King.
- [ ] Biome variety (e.g. desert/snow patches) using the existing `SAND`
  tile that's defined but unused, plus new biome-specific ore or mobs.
- [ ] Hunger/stamina or another light survival mechanic — optional, keep
  scope-checked against "fun vs. busywork."

### P2 — polish
- [ ] Sound effects (mining, hits, footsteps, ambient cave drip/wind).
- [ ] Better mob sprites/animation instead of flat color rectangles.
- [ ] Minimap.
- [ ] Controller/keybinding remap UI.

### P3 — nice-to-have
- [ ] Multiplayer (would need a backend — big scope jump, flag explicitly
  before starting).
- [ ] World seed input so players can share/replay a specific world.
