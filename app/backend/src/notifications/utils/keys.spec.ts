import { dedupeKey, encodeCursor, parseCursor } from './keys';

describe('dedupeKey', () => {
  it('names the event, so the same event gives the same key', () => {
    expect(dedupeKey.level(3)).toBe('level:3');
    expect(dedupeKey.badge('first_step')).toBe('badge:first_step');
    expect(dedupeKey.syllabus('c1')).toBe('syllabus:c1');
    expect(dedupeKey.rankChanged('2026-11-16')).toBe('rank:2026-11-16');
  });

  it('rolls classmates up per certification and per day', () => {
    expect(dedupeKey.classmatesStarted('c1', '2026-11-13')).toBe('started:c1:2026-11-13');
    expect(dedupeKey.classmatesStarted('c1', '2026-11-13')).not.toBe(
      dedupeKey.classmatesStarted('c1', '2026-11-14'),
    );
    expect(dedupeKey.classmatesStarted('c1', '2026-11-13')).not.toBe(
      dedupeKey.classmatesStarted('c2', '2026-11-13'),
    );
  });
});

describe('cursor', () => {
  const id = '6f1c1f0e-3c1f-4c59-9a55-0a4d0e7d2b11';

  it('round-trips a time and an id', () => {
    const at = new Date('2026-11-13T09:00:00.123Z');
    expect(parseCursor(encodeCursor(at, id))).toEqual({ at, id });
  });

  it('refuses anything else', () => {
    expect(parseCursor('')).toBeNull();
    expect(parseCursor('abc')).toBeNull();
    expect(parseCursor(`now_${id}`)).toBeNull();
    expect(parseCursor('1794000000000_not-a-uuid')).toBeNull();
    expect(parseCursor(`1794000000000_${id}_extra`)).toBeNull();
    expect(parseCursor(`1794000000000_${id}'; DROP TABLE users; --`)).toBeNull();
  });
});
