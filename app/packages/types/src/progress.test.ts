import { describe, expect, it } from 'vitest';
import {
  BADGE_KEYS,
  BADGES,
  badgesForChapters,
  chapterWindowStart,
  levelFor,
  levelName,
  percentDone,
} from './progress.js';

describe('levelFor', () => {
  it.each([
    [0, 'Novice', 250],
    [249, 'Novice', 1],
    [250, 'Bachelor', 750],
    [999, 'Bachelor', 1],
    [1000, 'Licentiate', 1500],
    [2499, 'Licentiate', 1],
    [2500, 'Master', 2500],
    [4999, 'Master', 1],
  ])('%i points → %s, %i to the next level', (points, name, toNext) => {
    const level = levelFor(points);
    expect(level.name).toBe(name);
    expect(level.toNext).toBe(toNext);
  });

  it('stops at Emeritus', () => {
    expect(levelFor(5000)).toMatchObject({
      rank: 5,
      roman: 'V',
      name: 'Emeritus',
      next: null,
      toNext: null,
      progress: 1,
    });
    expect(levelFor(12_000).name).toBe('Emeritus');
  });

  it('matches the designs: 1,480 is Licentiate, 32 %, 1,020 to Master', () => {
    const level = levelFor(1480);
    expect(level).toMatchObject({ rank: 3, roman: 'III', next: { name: 'Master', min: 2500 } });
    expect(level.toNext).toBe(1020);
    expect(Math.round(level.progress * 100)).toBe(32);
    // Profil: Ons at 2,740 (10 %, 2,260 to Emeritus), Mariem at 420 (23 %, 580 to Licentiate).
    expect(Math.round(levelFor(2740).progress * 100)).toBe(10);
    expect(levelFor(2740).toNext).toBe(2260);
    expect(Math.round(levelFor(420).progress * 100)).toBe(23);
    expect(levelFor(420).toNext).toBe(580);
  });

  it('treats a negative total as zero', () => {
    expect(levelFor(-10)).toMatchObject({ name: 'Novice', toNext: 250, progress: 0 });
  });

  it('names a rank', () => {
    expect(levelName(4)).toBe('Master');
  });
});

describe('badges', () => {
  it('defines five, two of them unlockable in Release 1', () => {
    expect(BADGE_KEYS).toHaveLength(5);
    expect(BADGE_KEYS.filter((key) => BADGES[key].available)).toEqual(['first_step', 'dedicated']);
  });

  it.each([
    [0, []],
    [1, ['first_step']],
    [29, ['first_step']],
    [30, ['first_step', 'dedicated']],
  ])('%i chapters → %j', (chapters, keys) => {
    expect(badgesForChapters(chapters)).toEqual(keys);
  });
});

describe('percentDone', () => {
  it('rounds and handles an empty syllabus', () => {
    expect(percentDone(5, 11)).toBe(45);
    expect(percentDone(11, 11)).toBe(100);
    expect(percentDone(0, 0)).toBe(0);
  });
});

describe('chapterWindowStart', () => {
  const flags = (done: number, total = 11) => Array.from({ length: total }, (_, i) => i < done);

  it('starts at the first chapter when nothing is done', () => {
    expect(chapterWindowStart(flags(0), 4)).toBe(0);
    expect(chapterWindowStart(flags(1), 4)).toBe(0);
  });

  it('keeps the last chapter done in sight', () => {
    // The design: 5 of 11 done → chapters 05 to 08.
    expect(chapterWindowStart(flags(5), 4)).toBe(4);
    expect(chapterWindowStart(flags(5), 3)).toBe(4);
  });

  it('never runs past the end', () => {
    expect(chapterWindowStart(flags(10), 4)).toBe(7);
    expect(chapterWindowStart(flags(11), 4)).toBe(7);
    expect(chapterWindowStart(flags(2, 3), 4)).toBe(0);
  });

  it('follows the first gap, not the count', () => {
    expect(chapterWindowStart([true, false, true, true], 3)).toBe(0);
  });
});
