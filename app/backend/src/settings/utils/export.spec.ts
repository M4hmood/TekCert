import { buildExport, type ExportData } from './export';

const at = (iso: string) => new Date(iso);

const data: ExportData = {
  profile: {
    email: 'yassine.benamor@tek-up.de',
    name: 'Yassine Ben Amor',
    classCode: 'ING-4-CIM-A',
    alumni: false,
    points: 10,
    createdAt: at('2026-10-28T08:00:00Z'),
  },
  held: [{ code: 'AZ-900', name: 'Azure Fundamentals', since: at('2026-10-29T08:00:00Z') }],
  inProgress: [
    {
      code: 'SAA-C03',
      name: 'Solutions Architect, Associate',
      done: 1,
      total: 24,
      since: at('2026-11-01T08:00:00Z'),
    },
  ],
  chapters: [{ code: 'SAA-C03', title: 'IAM, users and roles', at: at('2026-11-02T08:00:00Z') }],
  ledger: [
    {
      code: 'SAA-C03',
      title: 'IAM, users and roles',
      reason: 'chapter_done',
      delta: 10,
      at: at('2026-11-02T08:00:00Z'),
    },
    {
      code: 'SAA-C03',
      title: '=cmd()',
      reason: 'chapter_done',
      delta: 10,
      at: at('2026-11-03T08:00:00Z'),
    },
    {
      code: 'SAA-C03',
      title: null,
      reason: 'chapter_undone',
      delta: -10,
      at: at('2026-11-04T08:00:00Z'),
    },
  ],
};

/** The file without its BOM, one string per line. */
const lines = (csv: string) =>
  csv
    .replace(/^\uFEFF/, '')
    .trimEnd()
    .split('\r\n');

describe('buildExport', () => {
  it('writes one row per record under a header', () => {
    expect(lines(buildExport(data))).toEqual([
      'record,code,name,status,points,date',
      'profile,yassine.benamor@tek-up.de,Yassine Ben Amor,ING-4-CIM-A,10,2026-10-28T08:00:00.000Z',
      'certification,AZ-900,Azure Fundamentals,unverified,,2026-10-29T08:00:00.000Z',
      'certification,SAA-C03,"Solutions Architect, Associate",in progress · 1 of 24 chapters,,2026-11-01T08:00:00.000Z',
      'chapter,SAA-C03,"IAM, users and roles",finished,,2026-11-02T08:00:00.000Z',
      'points,SAA-C03,"IAM, users and roles",chapter finished,10,2026-11-02T08:00:00.000Z',
      "points,SAA-C03,'=cmd(),chapter finished,10,2026-11-03T08:00:00.000Z",
      'points,SAA-C03,,chapter unticked,-10,2026-11-04T08:00:00.000Z',
    ]);
  });

  it('adds up to the total on the profile row', () => {
    const rows = lines(buildExport(data)).map((line) => line.split(','));
    const points = rows
      .filter((row) => row[0] === 'points')
      .reduce((sum, row) => sum + Number(row.at(-2)), 0);
    expect(points).toBe(10);
  });

  it('marks alumni with their last class', () => {
    const alumni = buildExport({ ...data, profile: { ...data.profile, alumni: true } });
    expect(lines(alumni)[1]).toContain('Alumni · ING-4-CIM-A');
  });

  it('exports an account with nothing yet', () => {
    const empty = buildExport({
      profile: { ...data.profile, classCode: null, points: 0 },
      held: [],
      inProgress: [],
      chapters: [],
      ledger: [],
    });
    expect(lines(empty)).toHaveLength(2);
  });
});
