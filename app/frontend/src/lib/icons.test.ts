import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import shipped from '../../../packages/ui/src/fonts/icons.json';

/**
 * The icon font only holds the icons in use (packages/ui/scripts/subset-icons.py). An icon
 * missing from it would show as its name in plain text, so this fails first.
 */
const ROOTS = [
  path.resolve(__dirname, '..'),
  path.resolve(__dirname, '../../../packages/ui/src'),
  path.resolve(__dirname, '../../../packages/types/src'),
];
/** <Icon name="x">, icon="x", icon: 'x', and both sides of a choice on a line about icons. */
const DIRECT = /\b(?:name|icon)\s*[=:]\s*\{?\s*["']([a-z][a-z0-9_]+)["']/g;
const CHOICE = /\?\s*["']([a-z][a-z0-9_]+)["']\s*:\s*["']([a-z][a-z0-9_]+)["']/g;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(entry) && !entry.includes('.test.') ? [full] : [];
  });
}

function iconsUsed(): Map<string, string> {
  const used = new Map<string, string>();
  for (const file of ROOTS.flatMap(sources)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!/icon/i.test(line)) continue;
      // `name="…"` is an icon only on an <Icon> or an icon button.
      const direct = /<Icon|IconButton|icon\s*[=:]/.test(line) ? [...line.matchAll(DIRECT)] : [];
      const choice = [...line.matchAll(CHOICE)];
      for (const name of [...direct.map((m) => m[1]), ...choice.flatMap((m) => [m[1], m[2]])]) {
        if (name) used.set(name, path.basename(file));
      }
    }
  }
  return used;
}

describe('icon font', () => {
  it('holds every icon the code uses', () => {
    const missing = [...iconsUsed()].filter(([name]) => !shipped.includes(name));
    expect(
      missing,
      'Run `python packages/ui/scripts/subset-icons.py` from app/ to add them to the font',
    ).toEqual([]);
  });

  it('finds the icons it is meant to check', () => {
    const used = iconsUsed();
    expect(used.size).toBeGreaterThan(40);
    expect(used.has('menu_book')).toBe(true);
    expect(used.has('dark_mode')).toBe(true);
  });
});
