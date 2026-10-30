import { initialsOf, type PathNodeInput, selectTrack } from './recommended-path';

/** The CIM path from the seed: AWS track, Azure track, Linux track. */
const CIM: PathNodeInput[] = [
  node('CLF-C02', 0, 0),
  node('SAA-C03', 1, 0, 'CLF-C02'),
  node('SOA-C03', 2, 0, 'SAA-C03'),
  node('AZ-900', 0, 1),
  node('AZ-104', 1, 1, 'AZ-900'),
  node('MCSA', 2, 1, 'AZ-104'),
  node('RHCSA', 0, 2),
  node('LFCS', 1, 2),
  node('CKA', 2, 2, 'LFCS'),
];

function node(code: string, col: number, row: number, prerequisiteCode?: string): PathNodeInput {
  return {
    code,
    slug: code.toLowerCase(),
    name: code,
    level: 'associate',
    col,
    row,
    prerequisiteCode: prerequisiteCode ?? null,
  };
}

const states = (held: string[]) =>
  selectTrack(CIM, new Set(held)).map((n) => `${n.code}:${n.state}`);

describe('selectTrack', () => {
  it('shows the first track when nothing is held', () => {
    expect(states([])).toEqual(['CLF-C02:next', 'SAA-C03:locked', 'SOA-C03:locked']);
  });

  it('marks held certifications and the next step after them', () => {
    expect(states(['CLF-C02'])).toEqual(['CLF-C02:held', 'SAA-C03:next', 'SOA-C03:locked']);
  });

  it('picks the track holding most of the student’s certifications', () => {
    expect(states(['AZ-900', 'AZ-104', 'CLF-C02'])).toEqual([
      'AZ-900:held',
      'AZ-104:held',
      'MCSA:next',
    ]);
  });

  it('keeps the first track on a tie', () => {
    expect(states(['SAA-C03', 'RHCSA'])[1]).toBe('SAA-C03:held');
  });

  it('unlocks a node whose prerequisite is held even when an earlier one is not', () => {
    // CLF-C02 is still the next step, but SOA-C03 only needs SAA-C03.
    expect(states(['SAA-C03'])).toEqual(['CLF-C02:next', 'SAA-C03:held', 'SOA-C03:available']);
  });

  it('shows nodes without prerequisites as available', () => {
    expect(states(['RHCSA', 'CKA'])).toEqual(['RHCSA:held', 'LFCS:next', 'CKA:held']);
    const linux = selectTrack(CIM, new Set(['RHCSA', 'MCSA', 'AZ-104']));
    expect(linux.map((n) => n.code)).toEqual(['AZ-900', 'AZ-104', 'MCSA']);
  });

  it('returns an empty track for an empty path', () => {
    expect(selectTrack([], new Set())).toEqual([]);
  });
});

describe('initialsOf', () => {
  it('uses the first letter of each name', () => {
    expect(initialsOf('omar', 'Ben Salah')).toBe('OB');
  });
});
