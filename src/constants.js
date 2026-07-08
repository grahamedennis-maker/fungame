/* ---------- CONSTANTS ---------- */
export const TILE = 16;
export const WORLD_W = 10000;
export const WORLD_H = 320;
export const GRAVITY = 0.55;
export const MOVE_SPEED = 2.4;
export const JUMP_VEL = -9.2;
export const REACH = 5.6;

export const AIR=0, DIRT=1, GRASS=2, STONE=3, WOODT=4, LEAF=5, COAL=6, IRON=7, GOLD=8,
      THORIUM=9, BEDROCK=10, BRICK=11, BRICKGLOW=12, CHEST=13, ALTAR=14,
      TORCH=15, CRAFT_TABLE=16, FURNACE=17, SAND=18, DUNGFLOOR=19,
      CLOUD=20, SKYBRICK=21, LADDER=22, VINE=23,
      SNOW=24, ICE=25, CACTUS=26, JUNGLEGRASS=27,
      TREEWOOD=28, // natural tree trunk — collapses when chopped (placed wood = WOODT, does not)
      WATER=29, DRIPSTONE=30, MOSS=31, GLOWSHROOM=32; // cave biomes: swimmable water, dripstone, lush moss/glow
