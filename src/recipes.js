export const RECIPES = [
  { out:'wood_pickaxe', n:1, station:null, req:{wood:6} },
  { out:'wood_sword', n:1, station:null, req:{wood:5} },
  { out:'torch', n:4, station:null, req:{wood:1,coal:1} },
  { out:'ladder', n:4, station:null, req:{wood:2} },
  { out:'crafting_table', n:1, station:null, req:{wood:8} },
  { out:'arrow', n:8, station:null, req:{wood:1,coal:1} },
  { out:'tnt', n:2, station:null, req:{ember_core:1,coal:2} },
  { out:'health_potion', n:1, station:null, req:{wood:2,coal:1} },

  { out:'stone_pickaxe', n:1, station:'table', req:{stone:5,wood:2} },
  { out:'stone_sword', n:1, station:'table', req:{stone:4,wood:2} },
  { out:'furnace', n:1, station:'table', req:{stone:15} },
  { out:'bow', n:1, station:'table', req:{wood:6} },

  { out:'iron_bar', n:1, station:'furnace', req:{iron_ore:2,coal:1} },
  { out:'gold_bar', n:1, station:'furnace', req:{gold_ore:2,coal:1} },
  { out:'thorium_bar', n:1, station:'furnace', req:{thorium_ore:2,coal:1} },

  { out:'iron_pickaxe', n:1, station:'table', req:{iron_bar:5,wood:2} },
  { out:'iron_sword', n:1, station:'table', req:{iron_bar:4,wood:2} },
  { out:'gold_pickaxe', n:1, station:'table', req:{gold_bar:5,wood:2} },
  { out:'gold_sword', n:1, station:'table', req:{gold_bar:4,wood:2} },
  { out:'thorium_pickaxe', n:1, station:'table', req:{thorium_bar:5,wood:2} },

  // ---- LEGENDARIES: craftable at a table from boss-core materials ----
  { out:'thunder_hammer', n:1, station:'table', req:{gold_bar:6,thunder_shard:3,thorium_bar:2} },
  { out:'water_trident',  n:1, station:'table', req:{frost_core:2,thorium_bar:3,gold_bar:2} },
  { out:'fire_sword',     n:1, station:'table', req:{ember_core:2,thorium_bar:3,gold_bar:2} },
  { out:'tempest_bow',    n:1, station:'table', req:{storm_core:2,thunder_shard:3,gold_bar:2} },
];
