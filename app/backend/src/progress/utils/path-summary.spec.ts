import { groupLabel, tunisDay } from './labels';
import { pickCurrent, type PathNodeInput, summarizePath } from './path-summary';

const node = (code: string, col: number, row: number, prerequisite?: string): PathNodeInput => ({
  certificationId: code,
  code,
  slug: code.toLowerCase(),
  col,
  row,
  isActive: true,
  prerequisiteId: prerequisite ?? null,
  prerequisiteCode: prerequisite ?? null,
});

// The CIM grid from the seed.
const cim = [
  node('SAA-C03', 1, 0, 'CLF-C02'),
  node('CLF-C02', 0, 0),
  node('AZ-900', 0, 1),
  node('AZ-104', 1, 1, 'AZ-900'),
];

describe('summarizePath', () => {
  it('orders by column, then row', () => {
    const { nodes } = summarizePath(cim, new Set(), new Set());
    expect(nodes.map((n) => n.code)).toEqual(['CLF-C02', 'AZ-900', 'SAA-C03', 'AZ-104']);
  });

  it('marks held, in progress, locked and available nodes', () => {
    const { nodes, heldCount } = summarizePath(cim, new Set(['CLF-C02']), new Set(['AZ-900']));
    expect(Object.fromEntries(nodes.map((n) => [n.code, n.state]))).toEqual({
      'CLF-C02': 'held',
      'AZ-900': 'in_progress',
      'SAA-C03': 'available',
      // In progress isn't held: the prerequisite still locks it.
      'AZ-104': 'locked',
    });
    expect(heldCount).toBe(1);
  });

  it('recommends the first node I can start', () => {
    expect(summarizePath(cim, new Set(), new Set()).next?.code).toBe('CLF-C02');
    expect(summarizePath(cim, new Set(['CLF-C02']), new Set(['AZ-900'])).next).toMatchObject({
      code: 'SAA-C03',
      prerequisiteCode: 'CLF-C02',
    });
  });

  it('has no next step once the path is covered', () => {
    const all = new Set(cim.map((n) => n.certificationId));
    expect(summarizePath(cim, all, new Set()).next).toBeNull();
  });

  it('leaves out retired certifications', () => {
    const retired = { ...node('MCSA', 2, 1), isActive: false };
    expect(summarizePath([...cim, retired], new Set(), new Set()).nodes).toHaveLength(4);
  });
});

describe('pickCurrent', () => {
  const at = (iso: string) => new Date(iso);

  it('takes the certification touched last', () => {
    const picked = pickCurrent([
      { id: 'a', startedAt: at('2026-11-01'), lastActivityAt: at('2026-11-09') },
      { id: 'b', startedAt: at('2026-11-05'), lastActivityAt: at('2026-11-05') },
    ]);
    expect(picked?.id).toBe('a');
  });

  it('breaks a tie with the latest start, and is null without any', () => {
    const same = at('2026-11-05');
    expect(
      pickCurrent([
        { id: 'a', startedAt: at('2026-11-01'), lastActivityAt: same },
        { id: 'b', startedAt: at('2026-11-02'), lastActivityAt: same },
      ])?.id,
    ).toBe('b');
    expect(pickCurrent([])).toBeNull();
  });
});

describe('labels', () => {
  it('counts days in Tunis time', () => {
    // 23:30 UTC is already the next day in Tunis (UTC+1).
    expect(tunisDay(new Date('2026-11-10T23:30:00Z'))).toBe('2026-11-11');
    expect(tunisDay(new Date('2026-11-10T12:00:00Z'))).toBe('2026-11-10');
  });

  it('names a group by year and specialty', () => {
    expect(groupLabel(4, 'CIM')).toBe('ING-4 CIM');
    expect(groupLabel(2, null)).toBe('ING-2');
  });
});
