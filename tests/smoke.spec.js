import { test, expect } from '@playwright/test';

async function getState(page){
  return page.evaluate(() => window.__deepcrag.state);
}

test('start, mine, craft, place, combat, death/respawn, save/load', async ({ page }) => {
  test.setTimeout(60000);

  await test.step('start game', async () => {
    await page.goto('/');
    await page.click('#startbtn');
    await expect(page.locator('#titlecard')).toBeHidden();
    await page.waitForFunction(() => window.__deepcrag && window.__deepcrag.state.running === true);
  });

  await test.step('player settles on the ground', async () => {
    await page.waitForFunction(() => window.__deepcrag.state.player.onGround === true, null, { timeout: 10000 });
  });

  let mineTile;
  await test.step('mine a block beneath the player', async () => {
    const s = await getState(page);
    mineTile = await page.evaluate(() => window.__deepcrag.groundTileBelowPlayer());
    const sx = mineTile.tx*16 - s.camX + 8, sy = mineTile.ty*16 - s.camY + 8;

    await page.mouse.move(sx, sy);
    await page.mouse.down({ button: 'left' });
    await page.waitForFunction(
      ({tx,ty}) => window.__deepcrag.tileAt(tx,ty) === 0,
      mineTile,
      { timeout: 5000, polling: 50 }
    );
    await page.mouse.up({ button: 'left' });

    const dirtCount = await page.evaluate(() => window.__deepcrag.countItem('dirt'));
    expect(dirtCount).toBeGreaterThan(0);
  });

  await test.step('craft a wood pickaxe at the hand-craft tier', async () => {
    const before = await page.evaluate(() => window.__deepcrag.countItem('wood_pickaxe'));
    await page.keyboard.press('e');
    await expect(page.locator('#inv')).toBeVisible();
    await page.locator('.recipe', { hasText: 'Wood Pickaxe' }).click();
    await page.keyboard.press('e');
    await expect(page.locator('#inv')).toBeHidden();
    const after = await page.evaluate(() => window.__deepcrag.countItem('wood_pickaxe'));
    expect(after).toBe(before + 1);
  });

  await test.step('place the mined dirt back down', async () => {
    const dirtSlot = await page.evaluate(() =>
      window.__deepcrag.state.inv.findIndex(s => s && s.id === 'dirt'));
    expect(dirtSlot).toBeGreaterThanOrEqual(0);
    await page.evaluate((i) => window.__deepcrag.selectHotbar(i), dirtSlot);

    const s = await getState(page);
    const sx = mineTile.tx*16 - s.camX + 8, sy = mineTile.ty*16 - s.camY + 8;
    await page.mouse.move(sx, sy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });

    await page.waitForFunction(
      ({tx,ty}) => window.__deepcrag.tileAt(tx,ty) === 1, // DIRT
      mineTile,
      { timeout: 3000 }
    );
  });

  await test.step('fight and defeat a mob', async () => {
    const s = await getState(page);
    await page.evaluate(({x,y}) => window.__deepcrag.spawnMob('slime', x+20, y), { x: s.player.x, y: s.player.y });
    const cx = s.player.x - s.camX + s.player.w/2, cy = s.player.y - s.camY + s.player.h/2;

    for(let i=0;i<6;i++){
      const mobsLeft = await page.evaluate(() => window.__deepcrag.state.mobs.length);
      if(mobsLeft===0) break;
      await page.mouse.click(cx, cy, { button: 'left' });
      await page.waitForTimeout(300);
    }
    const mobsLeft = await page.evaluate(() => window.__deepcrag.state.mobs.length);
    expect(mobsLeft).toBe(0);
  });

  await test.step('take fatal damage and respawn', async () => {
    await page.evaluate(() => window.__deepcrag.damagePlayer(9999));
    const s = await getState(page);
    expect(s.player.hp).toBe(s.player.maxhp);
    await expect(page.locator('#deathmsg')).toBeVisible();
  });

  await test.step('save and reload restores progress', async () => {
    const pickaxeCount = await page.evaluate(() => window.__deepcrag.countItem('wood_pickaxe'));
    await page.evaluate(() => window.__deepcrag.saveGame());
    await page.reload();
    await expect(page.locator('#continuebtn')).toBeVisible();
    await page.click('#continuebtn');
    await expect(page.locator('#titlecard')).toBeHidden();
    await page.waitForFunction(() => window.__deepcrag && window.__deepcrag.state.running === true);
    const restored = await page.evaluate(() => window.__deepcrag.countItem('wood_pickaxe'));
    expect(restored).toBe(pickaxeCount);
  });
});
