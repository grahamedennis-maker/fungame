import { AIR, DIRT, GRASS, STONE, WOODT, LEAF, COAL, IRON, GOLD,
         THORIUM, BEDROCK, BRICK, BRICKGLOW, CHEST, ALTAR,
         TORCH, CRAFT_TABLE, FURNACE, SAND, DUNGFLOOR, CLOUD, SKYBRICK, LADDER, VINE,
         SNOW, ICE, CACTUS, JUNGLEGRASS, TREEWOOD } from './constants.js';

export const TILES = {
  [AIR]:      { name:'Air', solid:false },
  [DIRT]:     { name:'Dirt', color:'#6b4a2c', hardness:1, tier:0, solid:true, drop:'dirt' },
  [GRASS]:    { name:'Grass', color:'#4f9e3f', top:'#3d7d31', hardness:1, tier:0, solid:true, drop:'dirt' },
  [STONE]:    { name:'Stone', color:'#7d7d7d', hardness:2.2, tier:0, solid:true, drop:'stone' },
  [WOODT]:    { name:'Wood', color:'#8a5a2b', hardness:1.2, tier:0, solid:true, drop:'wood' },
  [LEAF]:     { name:'Leaves', color:'#2f7d32', hardness:0.4, tier:0, solid:false, drop:null },
  [COAL]:     { name:'Coal Ore', color:'#3a3a3a', hardness:2.6, tier:0, solid:true, drop:'coal', dot:'#111111' },
  [IRON]:     { name:'Iron Ore', color:'#9c7a5c', hardness:3.2, tier:1, solid:true, drop:'iron_ore', dot:'#d8b48a' },
  [GOLD]:     { name:'Gold Ore', color:'#8a7a3c', hardness:3.8, tier:2, solid:true, drop:'gold_ore', dot:'#ffd700' },
  [THORIUM]:  { name:'Thorium Ore', color:'#5c3d6b', hardness:4.6, tier:3, solid:true, drop:'thorium_ore', dot:'#c471ff' },
  [BEDROCK]:  { name:'Bedrock', color:'#1a1a1a', hardness:99999, tier:99, solid:true, drop:null },
  [BRICK]:    { name:'Dungeon Brick', color:'#4a3350', hardness:3.4, tier:1, solid:true, drop:'brick' },
  [BRICKGLOW]:{ name:'Runed Brick', color:'#5b3d73', hardness:3.4, tier:1, solid:true, drop:'brick', glow:'#a06bff' },
  [CHEST]:    { name:'Chest', color:'#a9761f', hardness:0.6, tier:0, solid:true, drop:null, isChest:true },
  [ALTAR]:    { name:'Storm Altar', color:'#2b2540', hardness:99999, tier:99, solid:true, drop:null, isAltar:true, glow:'#7a5cff' },
  [TORCH]:    { name:'Torch', color:'#caa24a', hardness:0.2, tier:0, solid:false, drop:'torch', light:true },
  [CRAFT_TABLE]:{ name:'Crafting Table', color:'#6e4626', hardness:1.5, tier:0, solid:true, drop:'crafting_table' },
  [FURNACE]:  { name:'Furnace', color:'#4a4a4a', hardness:2, tier:0, solid:true, drop:'furnace', glow:'#ff7a3c' },
  [SAND]:     { name:'Sand', color:'#d9c88a', hardness:0.8, tier:0, solid:true, drop:'dirt' },
  [DUNGFLOOR]:{ name:'Dungeon Floor', color:'#3a2a42', hardness:2.5, tier:1, solid:true, drop:'brick' },
  [CLOUD]:    { name:'Cloud', color:'#e8f0ff', hardness:0.5, tier:0, solid:true, drop:'cloud', glow:'#cfe0ff' },
  [SKYBRICK]: { name:'Skystone Brick', color:'#8fa8d8', hardness:3.0, tier:1, solid:true, drop:'brick', glow:'#bcd0ff' },
  [LADDER]:   { name:'Ladder', color:'#9c6b3a', hardness:0.4, tier:0, solid:false, climb:true, drop:'ladder' },
  [VINE]:     { name:'Vine', color:'#3f8f3a', hardness:0.4, tier:0, solid:false, climb:true, drop:null },
  [SNOW]:     { name:'Snow', color:'#dbe6ef', top:'#ffffff', hardness:1, tier:0, solid:true, drop:'dirt' },
  [ICE]:      { name:'Ice', color:'#a6d6ef', hardness:1.4, tier:0, solid:true, drop:null, glow:'#cdeaff' },
  [CACTUS]:   { name:'Cactus', color:'#4b8a3a', hardness:0.8, tier:0, solid:true, drop:'wood' },
  [JUNGLEGRASS]:{ name:'Jungle Grass', color:'#3f8a2c', top:'#2f6d1f', hardness:1, tier:0, solid:true, drop:'dirt' },
  [TREEWOOD]: { name:'Wood', color:'#8a5a2b', hardness:2.8, tier:0, solid:true, drop:'wood' }, // tree trunk (slow to chop, collapses)
};

export const ITEMS = {
  dirt:        { name:'Dirt', color:'#6b4a2c', stack:99, place:DIRT },
  stone:       { name:'Stone', color:'#7d7d7d', stack:99, place:STONE },
  wood:        { name:'Wood', color:'#8a5a2b', stack:99, place:WOODT },
  coal:        { name:'Coal', color:'#2b2b2b', stack:99 },
  iron_ore:    { name:'Iron Ore', color:'#c9a27e', stack:99 },
  gold_ore:    { name:'Gold Ore', color:'#e8cf5a', stack:99 },
  thorium_ore: { name:'Thorium Ore', color:'#b06bff', stack:99 },
  iron_bar:    { name:'Iron Bar', color:'#dcdcdc', stack:99 },
  gold_bar:    { name:'Gold Bar', color:'#ffd700', stack:99 },
  thorium_bar: { name:'Thorium Bar', color:'#c471ff', stack:99 },
  brick:       { name:'Dungeon Brick', color:'#4a3350', stack:99, place:BRICK },
  cloud:       { name:'Cloud Block', color:'#e8f0ff', stack:99, place:CLOUD },
  ladder:      { name:'Ladder', color:'#9c6b3a', stack:99, place:LADDER },
  thunder_shard:{ name:'Thunder Shard', color:'#7ad9ff', stack:99, glow:true },
  storm_core:  { name:'Storm Core', color:'#b06bff', stack:99, glow:true },
  ember_core:  { name:'Ember Core', color:'#ff6a2c', stack:99, glow:true },
  frost_core:  { name:'Frost Core', color:'#8fe0ff', stack:99, glow:true },
  health_potion:{ name:'Health Potion', color:'#e0405a', stack:20, heal:70, glow:true },
  torch:       { name:'Torch', color:'#caa24a', stack:99, place:TORCH },
  crafting_table:{ name:'Crafting Table', color:'#6e4626', stack:10, place:CRAFT_TABLE },
  furnace:     { name:'Furnace', color:'#4a4a4a', stack:10, place:FURNACE },
  coin:        { name:'Coin', color:'#ffd700', stack:999 },

  wood_pickaxe:{ name:'Wood Pickaxe', color:'#8a5a2b', stack:1, tool:'pick', tier:0, power:1.0, dmg:4 },
  wood_sword:  { name:'Wood Sword', color:'#c9a86a', stack:1, tool:'sword', dmg:6, range:26 },
  stone_pickaxe:{ name:'Stone Pickaxe', color:'#8d8d8d', stack:1, tool:'pick', tier:1, power:1.6, dmg:6 },
  stone_sword: { name:'Stone Sword', color:'#a8a8a8', stack:1, tool:'sword', dmg:9, range:27 },
  iron_pickaxe:{ name:'Iron Pickaxe', color:'#dcdcdc', stack:1, tool:'pick', tier:2, power:2.3, dmg:8 },
  iron_sword:  { name:'Iron Sword', color:'#eeeeee', stack:1, tool:'sword', dmg:13, range:28 },
  gold_pickaxe:{ name:'Gold Pickaxe', color:'#ffd700', stack:1, tool:'pick', tier:3, power:3.0, dmg:10 },
  gold_sword:  { name:'Gold Sword', color:'#ffe040', stack:1, tool:'sword', dmg:18, range:29 },
  thorium_pickaxe:{ name:'Thorium Pickaxe', color:'#c471ff', stack:1, tool:'pick', tier:4, power:4.0, dmg:13 },
  bow:         { name:'Storm Bow', color:'#7a5a2b', stack:1, tool:'bow', dmg:11, range:220 },
  arrow:       { name:'Arrow', color:'#caa24a', stack:99, ammo:true },

  // ---- ENHANCED GEAR (dungeon chest drops) — have specials, weaker than legendaries ----
  frost_edge:  { name:'Frostedge Blade', color:'#7fd0e8', stack:1, tool:'sword', dmg:18, range:30, glow:true, enhanced:true, special:'wave' },
  ember_axe:   { name:'Ember Cleaver', color:'#ff8a4a', stack:1, tool:'sword', dmg:20, range:28, glow:true, enhanced:true, special:'magma' },
  volt_bow:    { name:'Voltaic Bow', color:'#bfe8ff', stack:1, tool:'bow', dmg:15, range:230, glow:true, enhanced:true, special:'volley' },
  storm_maul:  { name:'Stormcaller Maul', color:'#a9d8ff', stack:1, tool:'hammer', dmg:24, range:38, glow:true, enhanced:true, special:'lightning' },

  // ---- LEGENDARIES (boss drops / shop / craft) — each has a `special` power ----
  thunder_hammer:{ name:"Thor's Hammer", color:'#8fe8ff', stack:1, tool:'hammer', dmg:34, range:42, glow:true, legendary:true, special:'slam', specialCd:8000 },
  water_trident:{ name:'Tide Trident', color:'#3fb6ff', stack:1, tool:'sword', dmg:26, range:40, glow:true, legendary:true, special:'wave' },
  fire_sword:  { name:'Emberbrand', color:'#ff6a2c', stack:1, tool:'sword', dmg:30, range:34, glow:true, legendary:true, special:'magma' },
  tempest_bow: { name:'Tempest Bow', color:'#8fe0ff', stack:1, tool:'bow', dmg:22, range:260, glow:true, legendary:true, special:'volley' },

  // ---- TERRARIA-STYLE DROP-ONLY WEAPONS (boss / dungeon loot) ----
  // Melee blades fire a slashing beam on their special; the flail and boomerang
  // swing/throw fiery projectiles.
  nights_edge: { name:"Night's Edge", color:'#c86adf', stack:1, tool:'sword', dmg:32, range:34, glow:true, legendary:true, special:'beam', beam:'#d99bff', specialCd:3500 },
  terra_blade: { name:'Terra Blade', color:'#4fd07a', stack:1, tool:'sword', dmg:40, range:36, glow:true, legendary:true, special:'beam', beam:'#7dffb0', specialCd:3000 },
  sunfury:     { name:'Sunfury', color:'#ff8a2c', stack:1, tool:'flail', dmg:30, range:54, glow:true, legendary:true, special:'magma', specialCd:6000 },
  flamarang:   { name:'Flamarang', color:'#ff6a3c', stack:1, tool:'boomerang', dmg:26, range:200, glow:true, legendary:true, special:'boomerang', specialCd:4000 },

  // ---- TNT: throw it (right-click), short fuse, blasts tiles + mobs ----
  tnt:         { name:'TNT', color:'#c23a2a', stack:99, throwable:true },
};
