import type { PublicStats, SpecialtyCode } from '@tekcert/types';

export interface PublicStatsInput {
  /** Students who may be counted, with the specialty of their path (null = undecided). */
  students: { id: string; specialty: string | null }[];
  /** Everyone who started a certification, counted or not. */
  preparingIds: string[];
  certifications: { provider: string }[];
  /** In display order. */
  specialties: { id: string; code: SpecialtyCode; name: string; hue: number }[];
  paths: {
    code: string;
    name: string;
    specialtyId: string | null;
    fundamentals: boolean;
    nodes: { code: string; row: number; col: number }[];
  }[];
  trackLength: number;
}

/**
 * Turns rows into the totals of the landing page. Only counts leave this function: no id and
 * no name, whatever the input holds.
 */
export function buildPublicStats(input: PublicStatsInput): PublicStats {
  const preparing = new Set(input.preparingIds);
  const counted = input.students;
  const preparingStudents = counted.filter((student) => preparing.has(student.id));
  const perSpecialty = (list: typeof counted, code: string | null) =>
    list.filter((student) => student.specialty === code).length;

  const specialtyOf = new Map(input.specialties.map((specialty) => [specialty.id, specialty]));
  const order = (code: string) => input.specialties.findIndex((s) => s.code === code);
  const paths = input.paths
    .map((path) => {
      const specialty = path.specialtyId ? specialtyOf.get(path.specialtyId) : undefined;
      return {
        code: path.code,
        name: path.name,
        hue: specialty?.hue ?? null,
        certifications: path.nodes.length,
        // The first row of the grid is the path's main track.
        track: path.nodes
          .filter((node) => node.row === 0)
          .sort((a, b) => a.col - b.col)
          .slice(0, input.trackLength)
          .map((node) => node.code),
        students: perSpecialty(counted, path.fundamentals ? null : (specialty?.code ?? '')),
        fundamentals: path.fundamentals,
      };
    })
    // Fundamentals first, then the specialties in their usual order.
    .sort(
      (a, b) =>
        Number(b.fundamentals) - Number(a.fundamentals) ||
        order(a.code) - order(b.code) ||
        a.code.localeCompare(b.code),
    )
    .map(({ fundamentals: _fundamentals, ...path }) => path);

  return {
    certifications: input.certifications.length,
    providers: new Set(input.certifications.map((cert) => cert.provider)).size,
    students: counted.length,
    preparing: preparingStudents.length,
    bySpecialty: input.specialties.map(({ code, name, hue }) => ({
      code,
      name,
      hue,
      preparing: perSpecialty(preparingStudents, code),
    })),
    paths,
  };
}
