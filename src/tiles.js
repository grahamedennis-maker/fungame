import { AIR, DIRT, GRASS, STONE, WOODT, LEAF, COAL, IRON, GOLD,
         COPPER, TIN, LEAD, SILVER, TUNGSTEN, PLATINUM, OBSIDIAN, COBALT, TITANIUM, METEORITE, METEORDEBRIS,
         BEDROCK, BRICK, BRICKGLOW, CHEST, ALTAR,
         TORCH, CRAFT_TABLE, FURNACE, SAND, DUNGFLOOR, CLOUD, SKYBRICK, LADDER, VINE,
         SNOW, ICE, CACTUS, JUNGLEGRASS, TREEWOOD, WATER, DRIPSTONE, MOSS, GLOWSHROOM,
         MUD, JUNGLEWOOD, JUNGLELEAF } from './constants.js';

export const TILES = {
  [AIR]:      { name:'Air', solid:false },
  [DIRT]:     { name:'Dirt', color:'#6b4a2c', hardness:1, tier:0, solid:true, drop:'dirt' },
  [GRASS]:    { name:'Grass', color:'#4fa032', top:'#7bca4a', hardness:1, tier:0, solid:true, drop:'dirt' }, // bright Forest green
  [STONE]:    { name:'Stone', color:'#7d7d7d', hardness:2.2, tier:0, solid:true, drop:'stone' },
  [WOODT]:    { name:'Wood', color:'#8a5a2b', hardness:1.2, tier:0, solid:true, drop:'wood' },
  [LEAF]:     { name:'Leaves', color:'#2f7d32', hardness:0.4, tier:0, solid:false, drop:null },
  [COAL]:     { name:'Coal Ore', color:'#3a3a3a', hardness:2.6, tier:0, solid:true, drop:'coal', dot:'#111111', ore:true },
  // Metal ores — rarer and deeper down the list. `ore:true` flags the "Found!" toast.
  [COPPER]:   { name:'Copper Ore',   color:'#7a5236', hardness:2.6, tier:0, solid:true, drop:'copper_ore',   dot:'#e08b4a', ore:true },
  [TIN]:      { name:'Tin Ore',      color:'#6f6a58', hardness:2.8, tier:0, solid:true, drop:'tin_ore',      dot:'#cfc39a', ore:true },
  [LEAD]:     { name:'Lead Ore',     color:'#565b67', hardness:3.0, tier:1, solid:true, drop:'lead_ore',     dot:'#8f96a8', ore:true },
  [IRON]:     { name:'Iron Ore',     color:'#9c7a5c', hardness:3.2, tier:1, solid:true, drop:'iron_ore',     dot:'#d8b48a', ore:true },
  [SILVER]:   { name:'Silver Ore',   color:'#8f9298', hardness:3.5, tier:1, solid:true, drop:'silver_ore',   dot:'#e8ecf2', ore:true },
  [TUNGSTEN]: { name:'Tungsten Ore', color:'#6b7168', hardness:3.8, tier:2, solid:true, drop:'tungsten_ore', dot:'#aeb8ad', ore:true },
  [GOLD]:     { name:'Gold Ore',     color:'#8a7a3c', hardness:4.0, tier:2, solid:true, drop:'gold_ore',     dot:'#ffd700', ore:true },
  [PLATINUM]: { name:'Platinum Ore', color:'#8a95a0', hardness:4.4, tier:2, solid:true, drop:'platinum_ore', dot:'#dfeaf5', ore:true },
  [OBSIDIAN]: { name:'Obsidian',     color:'#241f2e', hardness:5.0, tier:3, solid:true, drop:'obsidian',     dot:'#4a3f60', ore:true, glow:'#3a2f52' },
  [COBALT]:   { name:'Cobalt Ore',   color:'#2f5a8a', hardness:5.2, tier:3, solid:true, drop:'cobalt_ore',   dot:'#4a9be0', ore:true },
  [TITANIUM]: { name:'Titanium Ore', color:'#6a5f70', hardness:5.6, tier:3, solid:true, drop:'titanium_ore', dot:'#c0a8d8', ore:true },
  [METEORITE]:{ name:'Meteorite',    color:'#5a4a52', hardness:6.0, tier:3, solid:true, drop:'meteorite_ore', dot:'#e08a6a', ore:true, glow:'#a85a4a' },
  [METEORDEBRIS]:{ name:'Meteor Debris', color:'#332b30', hardness:2.4, tier:0, solid:true, drop:'stone', dot:'#4a3f44' },
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
  [JUNGLEGRASS]:{ name:'Jungle Grass', color:'#46a02b', top:'#74cf3e', hardness:1, tier:0, solid:true, drop:'mud' }, // vivid Surface-Jungle green
  [TREEWOOD]: { name:'Wood', color:'#8a5a2b', hardness:2.8, tier:0, solid:true, drop:'wood' }, // tree trunk (slow to chop, collapses)
  [WATER]:    { name:'Water', color:'#2e6ebe', solid:false, drop:null, liquid:true },
  [DRIPSTONE]:{ name:'Dripstone', color:'#6f6a63', solid:false, drop:null },       // cave spike décor
  [MOSS]:     { name:'Mossy Stone', color:'#5c7d4a', hardness:2.2, tier:0, solid:true, drop:'stone' },
  [GLOWSHROOM]:{ name:'Glowing Mushroom', color:'#6fe0c8', solid:false, drop:null, glow:'#7fffe0', light:true },
  [MUD]:      { name:'Mud', color:'#5c3a26', hardness:1, tier:0, solid:true, drop:'mud' },              // jungle ground
  [JUNGLEWOOD]:{ name:'Mahogany', color:'#7a3f28', hardness:2.8, tier:0, solid:true, drop:'wood' },     // jungle trunk (collapses)
  [JUNGLELEAF]:{ name:'Jungle Foliage', color:'#256b1f', hardness:0.4, tier:0, solid:false, drop:null },
};

export const ITEMS = {
  dirt:        { name:'Dirt', color:'#6b4a2c', stack:99, place:DIRT },
  mud:         { name:'Mud', color:'#5c3a26', stack:99, place:MUD },
  stone:       { name:'Stone', color:'#7d7d7d', stack:99, place:STONE },
  wood:        { name:'Wood', color:'#8a5a2b', stack:99, place:WOODT },
  coal:        { name:'Coal', color:'#2b2b2b', stack:99 },
  // raw ores
  copper_ore:  { name:'Copper Ore', color:'#e08b4a', stack:99 },
  tin_ore:     { name:'Tin Ore', color:'#cfc39a', stack:99 },
  lead_ore:    { name:'Lead Ore', color:'#8f96a8', stack:99 },
  iron_ore:    { name:'Iron Ore', color:'#c9a27e', stack:99 },
  silver_ore:  { name:'Silver Ore', color:'#e8ecf2', stack:99 },
  tungsten_ore:{ name:'Tungsten Ore', color:'#aeb8ad', stack:99 },
  gold_ore:    { name:'Gold Ore', color:'#e8cf5a', stack:99 },
  platinum_ore:{ name:'Platinum Ore', color:'#dfeaf5', stack:99 },
  obsidian:    { name:'Obsidian', color:'#2e2740', stack:99, place:OBSIDIAN, glow:true },
  cobalt_ore:  { name:'Cobalt Ore', color:'#4a9be0', stack:99 },
  titanium_ore:{ name:'Titanium Ore', color:'#c0a8d8', stack:99 },
  meteorite_ore:{ name:'Meteorite', color:'#e08a6a', stack:99, glow:true },
  // smelted bars
  copper_bar:  { name:'Copper Bar', color:'#e08b4a', stack:99 },
  tin_bar:     { name:'Tin Bar', color:'#d8cca0', stack:99 },
  lead_bar:    { name:'Lead Bar', color:'#9aa1b0', stack:99 },
  iron_bar:    { name:'Iron Bar', color:'#dcdcdc', stack:99 },
  silver_bar:  { name:'Silver Bar', color:'#eef2f7', stack:99 },
  tungsten_bar:{ name:'Tungsten Bar', color:'#b8c2b6', stack:99 },
  gold_bar:    { name:'Gold Bar', color:'#ffd700', stack:99 },
  platinum_bar:{ name:'Platinum Bar', color:'#e6f0fb', stack:99 },
  cobalt_bar:  { name:'Cobalt Bar', color:'#4a9be0', stack:99, glow:true },
  titanium_bar:{ name:'Titanium Bar', color:'#c0a8d8', stack:99, glow:true },
  meteorite_bar:{ name:'Meteorite Bar', color:'#ff8a6a', stack:99, glow:true },
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

  wood_pickaxe:{ name:'Wood Pickaxe', color:'#8a5a2b', stack:1, tool:'pick', tier:0, power:0.4, dmg:4 }, // deliberately slow — upgrade to stone ASAP
  wood_sword:  { name:'Wood Broadsword', color:'#c9a86a', stack:1, tool:'sword', dmg:6, range:26 },
  stone_pickaxe:{ name:'Stone Pickaxe', color:'#8d8d8d', stack:1, tool:'pick', tier:1, power:1.6, dmg:6 },
  stone_sword: { name:'Stone Broadsword', color:'#a8a8a8', stack:1, tool:'sword', dmg:9, range:27 },
  iron_pickaxe:{ name:'Iron Pickaxe', color:'#dcdcdc', stack:1, tool:'pick', tier:2, power:2.3, dmg:8 },
  iron_sword:  { name:'Iron Broadsword', color:'#eeeeee', stack:1, tool:'sword', dmg:13, range:28 },
  gold_pickaxe:{ name:'Gold Pickaxe', color:'#ffd700', stack:1, tool:'pick', tier:3, power:3.0, dmg:10 },
  gold_sword:  { name:'Gold Broadsword', color:'#ffe040', stack:1, tool:'sword', dmg:18, range:29 },
  titanium_pickaxe:{ name:'Titanium Pickaxe', color:'#c0a8d8', stack:1, tool:'pick', tier:4, power:4.2, dmg:13, glow:true },
  meteorite_pickaxe:{ name:'Meteorite Pickaxe', color:'#ff8a6a', stack:1, tool:'pick', tier:4, power:5.0, dmg:16, glow:true },
  meteorite_sword:{ name:'Meteorite Broadsword', color:'#ff7a4a', stack:1, tool:'sword', dmg:26, range:34, glow:true, special:'magma', specialCd:5000 },
  // swords for the remaining metals so every ore (except coal) crafts into gear
  tin_sword:     { name:'Tin Broadsword',      color:'#cfc39a', stack:1, tool:'sword', dmg:8,  range:26 },
  lead_sword:    { name:'Lead Broadsword',     color:'#8f96a8', stack:1, tool:'sword', dmg:10, range:27 },
  silver_sword:  { name:'Silver Broadsword',   color:'#e8ecf2', stack:1, tool:'sword', dmg:14, range:28 },
  tungsten_sword:{ name:'Tungsten Broadsword', color:'#aeb8ad', stack:1, tool:'sword', dmg:16, range:28 },
  platinum_sword:{ name:'Platinum Broadsword', color:'#dfeaf5', stack:1, tool:'sword', dmg:20, range:29 },
  cobalt_sword:  { name:'Cobalt Broadsword',   color:'#4a9be0', stack:1, tool:'sword', dmg:22, range:30, glow:true },
  copper_sword:  { name:'Copper Broadsword',   color:'#e08b4a', stack:1, tool:'sword', dmg:7,  range:26, grip:'#6b6a37' },
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

  // ---- ARMOR: right-click to equip. Each set has a distinct 8-bit silhouette
  // (style) and rising defense. head/chest/feet slots stack their defense. ----
  copper_helmet:    { name:'Copper Helmet',     color:'#c47a3f', stack:1, armor:true, slot:'head',  defense:1, style:'plain' },
  copper_chestplate:{ name:'Copper Chestplate', color:'#c47a3f', stack:1, armor:true, slot:'chest', defense:2, style:'plain' },
  copper_boots:     { name:'Copper Boots',      color:'#c47a3f', stack:1, armor:true, slot:'feet',  defense:1, style:'plain' },
  iron_helmet:      { name:'Iron Helmet',       color:'#c8ccd2', stack:1, armor:true, slot:'head',  defense:2, style:'visor' },
  iron_chestplate:  { name:'Iron Chestplate',   color:'#c8ccd2', stack:1, armor:true, slot:'chest', defense:3, style:'visor' },
  iron_boots:       { name:'Iron Boots',        color:'#c8ccd2', stack:1, armor:true, slot:'feet',  defense:2, style:'visor' },
  gold_helmet:      { name:'Gold Helmet',       color:'#ffd84a', stack:1, armor:true, slot:'head',  defense:3, style:'crest', glow:true },
  gold_chestplate:  { name:'Gold Chestplate',   color:'#ffd84a', stack:1, armor:true, slot:'chest', defense:4, style:'crest', glow:true },
  gold_boots:       { name:'Gold Boots',        color:'#ffd84a', stack:1, armor:true, slot:'feet',  defense:2, style:'crest', glow:true },
  titanium_helmet:  { name:'Titanium Helmet',   color:'#c7b6e0', stack:1, armor:true, slot:'head',  defense:4, style:'spike', glow:true },
  titanium_chestplate:{ name:'Titanium Chestplate', color:'#c7b6e0', stack:1, armor:true, slot:'chest', defense:5, style:'spike', glow:true },
  titanium_boots:   { name:'Titanium Boots',    color:'#c7b6e0', stack:1, armor:true, slot:'feet',  defense:3, style:'spike', glow:true },
  meteorite_helmet: { name:'Meteorite Helmet',  color:'#ff8a6a', stack:1, armor:true, slot:'head',  defense:5, style:'glowspike', glow:true, accent:'#ffd27a' },
  meteorite_chestplate:{ name:'Meteorite Chestplate', color:'#ff8a6a', stack:1, armor:true, slot:'chest', defense:6, style:'glowspike', glow:true, accent:'#ffd27a' },
  meteorite_boots:  { name:'Meteorite Boots',   color:'#ff8a6a', stack:1, armor:true, slot:'feet',  defense:3, style:'glowspike', glow:true, accent:'#ffd27a' },
};
