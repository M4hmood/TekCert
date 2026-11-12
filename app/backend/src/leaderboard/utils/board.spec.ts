import type { Specialty } from '@tekcert/types';
import { type BoardMember, buildSpecialtyBoard, buildStudentBoard, type Total } from './board';

const member = (id: string, visible = true): BoardMember => ({
  person: {
    id,
    firstName: `First-${id}`,
    lastName: `Last-${id}`,
    avatarPath: null,
    classCode: 'ING-4-CIM-A',
    year: 4,
    specialty: 'CIM',
  },
  visible,
});
const totals = (entries: Record<string, number>): Map<string, Total> =>
  new Map(Object.entries(entries).map(([id, points]) => [id, { points, chapters: points / 10 }]));

describe('buildStudentBoard', () => {
  it('ranks everyone in the scope, students without points last', () => {
    const board = buildStudentBoard({
      members: [member('a'), member('b'), member('c')],
      viewerId: 'c',
      current: totals({ b: 30, a: 10 }),
      previous: null,
    });
    expect(board.total).toBe(3);
    expect(board.rows.map((r) => [r.person?.id, r.rank, r.points, r.chapters])).toEqual([
      ['b', 1, 30, 3],
      ['a', 2, 10, 1],
      ['c', 3, 0, 0],
    ]);
    expect(board.rows.map((r) => r.isMe)).toEqual([false, false, true]);
  });

  it('hides who is behind an anonymous row, but not from themselves', () => {
    const members = [member('a', false), member('b')];
    const current = totals({ a: 50, b: 20 });
    const seenByB = buildStudentBoard({ members, viewerId: 'b', current, previous: null });
    expect(seenByB.rows[0]).toMatchObject({ rank: 1, points: 50, person: null, isMe: false });
    // "30 points behind …" must not name them either.
    expect(seenByB.me?.gap).toEqual({ points: 30, firstName: null });

    const seenByA = buildStudentBoard({ members, viewerId: 'a', current, previous: null });
    expect(seenByA.rows[0]).toMatchObject({ isMe: true, person: { id: 'a' } });
    expect(seenByA.me).toMatchObject({ rank: 1, visible: false, gap: null });
  });

  it('measures the gap to the nearest student with more points, past my ties', () => {
    const board = buildStudentBoard({
      members: [member('a'), member('b'), member('c'), member('d')],
      viewerId: 'd',
      current: totals({ a: 90, b: 60, c: 40, d: 40 }),
      previous: null,
    });
    expect(board.me).toMatchObject({ rank: 3, gap: { points: 20, firstName: 'First-b' } });
  });

  it('counts the places gained or lost against last week', () => {
    const board = buildStudentBoard({
      members: [member('a'), member('b'), member('c')],
      viewerId: 'c',
      current: totals({ a: 10, b: 20, c: 30 }),
      previous: totals({ a: 10, b: 5 }),
    });
    const changes = Object.fromEntries(board.rows.map((r) => [r.person?.id, r.change]));
    expect(changes).toEqual({ c: 2, b: 0, a: -2 });
    expect(board.me?.change).toBe(2);
  });

  it('has no change while the period is younger than a week', () => {
    const board = buildStudentBoard({
      members: [member('a')],
      viewerId: 'a',
      current: totals({ a: 10 }),
      previous: null,
    });
    expect(board.rows[0]?.change).toBeNull();
  });

  it('keeps the top 20 and the viewer with two neighbours on each side', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `m${String(i).padStart(2, '0')}`);
    const current = totals(Object.fromEntries(ids.map((id, i) => [id, (60 - i) * 10])));
    const board = buildStudentBoard({
      members: ids.map((id) => member(id)),
      viewerId: 'm39',
      current,
      previous: null,
    });
    expect(board.total).toBe(60);
    expect(board.rows.map((r) => r.position)).toEqual([
      ...Array.from({ length: 20 }, (_, i) => i + 1),
      38,
      39,
      40,
      41,
      42,
    ]);
    expect(board.me?.rank).toBe(40);
  });

  it('has no "me" for a viewer outside the scope', () => {
    const board = buildStudentBoard({
      members: [member('a')],
      viewerId: 'z',
      current: totals({ a: 10 }),
      previous: null,
    });
    expect(board.me).toBeNull();
    expect(board.rows).toHaveLength(1);
  });
});

describe('buildSpecialtyBoard', () => {
  const cim: Specialty = { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225 };
  const ssir: Specialty = { code: 'SSIR', name: 'Systems Security', hue: 15 };

  it('averages points per student, undecided students left out', () => {
    const rows = buildSpecialtyBoard({
      students: [
        { id: 'a', specialty: cim },
        { id: 'b', specialty: cim },
        { id: 'c', specialty: ssir },
        { id: 'd', specialty: null },
      ],
      current: totals({ a: 30, c: 40, d: 500 }),
      mine: 'CIM',
    });
    expect(rows).toEqual([
      { ...ssir, rank: 1, students: 1, average: 40, isMine: false },
      { ...cim, rank: 2, students: 2, average: 15, isMine: true },
    ]);
  });

  it('is empty without students', () => {
    expect(buildSpecialtyBoard({ students: [], current: new Map(), mine: null })).toEqual([]);
  });
});
