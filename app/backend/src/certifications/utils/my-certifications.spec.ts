import { mergeMyCertifications } from './my-certifications';

const day = (d: number) => new Date(Date.UTC(2026, 9, d));
const slugs: Record<string, string> = { a: 'saa-c03', b: 'clf-c02', c: 'az-900' };
const slugOf = (id: string) => slugs[id];

describe('mergeMyCertifications', () => {
  it('marks held certifications unverified and started ones in progress', () => {
    expect(
      mergeMyCertifications(
        [{ certificationId: 'b', since: day(1) }],
        [{ certificationId: 'a', since: day(2) }],
        slugOf,
      ),
    ).toEqual([
      { slug: 'clf-c02', status: 'unverified', since: day(1).toISOString() },
      { slug: 'saa-c03', status: 'in_progress', since: day(2).toISOString() },
    ]);
  });

  it('lets holding win over preparing', () => {
    expect(
      mergeMyCertifications(
        [{ certificationId: 'a', since: day(5) }],
        [{ certificationId: 'a', since: day(2) }],
        slugOf,
      ),
    ).toEqual([{ slug: 'saa-c03', status: 'unverified', since: day(5).toISOString() }]);
  });

  it('leaves out certifications no longer in the catalog', () => {
    expect(mergeMyCertifications([{ certificationId: 'gone', since: day(1) }], [], slugOf)).toEqual(
      [],
    );
  });
});
