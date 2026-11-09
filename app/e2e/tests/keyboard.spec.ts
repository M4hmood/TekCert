import { expect, test } from '@playwright/test';
import { signInNewStudent, signInOnboardedStudent } from './support';

test.describe('keyboard on desktop', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, 'desktop controls');

  test('sort menu: arrows and Enter pick, Esc cancels, focus comes back', async ({ page }) => {
    await signInOnboardedStudent(page);
    await page.goto('/catalog');
    const sort = page.getByRole('combobox', { name: 'Sort:' });

    await sort.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(sort).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('option', { name: 'Most earned' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Name A–Z' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/sort=name/);
    await expect(sort).toBeFocused();
    await expect(sort).not.toHaveCSS('outline-style', 'none');
  });

  test('sort menu: no keyboard focus ring after picking with the mouse', async ({ page }) => {
    await signInOnboardedStudent(page);
    await page.goto('/catalog');
    const sort = page.getByRole('combobox', { name: 'Sort:' });
    await sort.click();
    await page.getByRole('option', { name: 'Name A–Z' }).click();
    await expect(sort).toBeFocused();
    await expect(sort).toHaveCSS('outline-style', 'none');
  });

  test('filter checkbox toggles with Space and shows a focus ring', async ({ page }) => {
    await signInOnboardedStudent(page);
    await page.goto('/catalog');
    const aws = page.getByRole('checkbox', { name: /Amazon Web Services/ });
    await page.getByRole('searchbox', { name: 'Search the catalog' }).focus();
    await aws.focus();
    await page.keyboard.press('Space');
    await expect(aws).toBeChecked();
    await expect(aws).toHaveCSS('outline-style', 'solid');
    await expect(page).toHaveURL(/provider=AWS/);
  });

  test('certification tabs and scope switch follow the arrow keys', async ({ page }) => {
    await signInOnboardedStudent(page);
    await page.goto('/catalog/saa-c03');
    await page.getByRole('tab', { name: /Overview/ }).focus();
    await page.keyboard.press('ArrowRight');
    const syllabus = page.getByRole('tab', { name: /Syllabus/ });
    await expect(syllabus).toBeFocused();
    await expect(syllabus).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/tab=syllabus/);

    await page.goto('/catalog/saa-c03?tab=community');
    await page.getByRole('radio', { name: 'Whole institute' }).focus();
    await page.keyboard.press('ArrowLeft');
    const level = page.getByRole('radio', { name: 'My level' });
    await expect(level).toBeFocused();
    await page.keyboard.press('Space');
    await expect(level).toHaveAttribute('aria-checked', 'true');
    await expect(page).toHaveURL(/scope=year/);
  });
});

test('filter sheet on a phone: Esc closes it and focus returns', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) >= 768, 'phones only');
  await signInOnboardedStudent(page);
  await page.goto('/catalog');
  const open = page.getByRole('button', { name: /^Filters/ });
  await open.click();
  const sheet = page.getByRole('dialog', { name: 'Filters' });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(open).toBeFocused();
});

test('onboarding switch toggles with Space and keeps a 44 px touch target', async ({ page }) => {
  await signInNewStudent(page);
  await page.goto('/onboarding');
  await page.getByRole('button', { name: /ING-4/ }).click();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: /^CIM/ }).click();
  await page.getByRole('button', { name: 'Group A' }).click();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: 'Skip this step' }).click();

  const leaderboards = page.getByRole('switch', { name: 'Appear on leaderboards' });
  await leaderboards.focus();
  await page.keyboard.press('Space');
  await expect(leaderboards).toHaveAttribute('aria-checked', 'false');

  const box = await leaderboards.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  // Pressing just inside the 44 px area, above and below the 26 px track, still hits the switch.
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  for (const y of [centre.y - 21, centre.y + 21]) {
    const hit = await page.evaluate(
      ([px, py]) => document.elementFromPoint(px ?? 0, py ?? 0)?.getAttribute('role'),
      [centre.x, y],
    );
    expect(hit).toBe('switch');
  }
});
