import { Inject, Injectable } from '@nestjs/common';
import {
  LANDING_TRACK_LENGTH,
  PUBLIC_STATS_MAX_AGE,
  type PublicStats,
  SPECIALTY_CODES,
  SpecialtyCodeSchema,
} from '@tekcert/types';
import { CertificationsService } from '../certifications/certifications.service';
import { CLOCK, type Clock } from '../common/utils/clock';
import { PathsService } from '../paths/paths.service';
import { SchoolService } from '../school/school.service';
import { UsersService } from '../users/users.service';
import { buildPublicStats } from './utils/public-stats';

/** The shared path of students who haven't chosen a specialty. */
const FUNDAMENTALS = 'FOND';

/**
 * The public numbers (ADR-024). The route needs no sign-in, so the answer is kept for a few
 * minutes: a burst of visitors costs one set of queries, not one per visit.
 */
@Injectable()
export class LandingService {
  private cached: { stats: PublicStats; until: number } | null = null;

  constructor(
    private readonly users: UsersService,
    private readonly school: SchoolService,
    private readonly certifications: CertificationsService,
    private readonly paths: PathsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async publicStats(): Promise<PublicStats> {
    const now = this.clock.now().getTime();
    if (this.cached && this.cached.until > now) return this.cached.stats;
    const stats = await this.compute();
    this.cached = { stats, until: now + PUBLIC_STATS_MAX_AGE * 1000 };
    return stats;
  }

  /** Tests change the data and read again at once. */
  forget(): void {
    this.cached = null;
  }

  private async compute(): Promise<PublicStats> {
    const [students, preparingIds, catalog, specialties, paths] = await Promise.all([
      this.users.findRankable({}),
      this.certifications.preparingUserIds(),
      this.certifications.list({}),
      this.school.listSpecialties(),
      this.paths.listWithNodes(),
    ]);
    return buildPublicStats({
      students: students.map((student) => ({
        id: student.id,
        specialty: student.specialty?.code ?? student.targetSpecialty?.code ?? null,
      })),
      preparingIds,
      certifications: catalog.items.map((cert) => ({ provider: cert.provider.code })),
      specialties: specialties
        .map((specialty) => ({
          id: specialty.id,
          code: SpecialtyCodeSchema.parse(specialty.code),
          name: specialty.name,
          hue: specialty.hue,
        }))
        .sort((a, b) => SPECIALTY_CODES.indexOf(a.code) - SPECIALTY_CODES.indexOf(b.code)),
      paths: paths.map((path) => ({
        code: path.code,
        name: path.name,
        specialtyId: path.specialtyId,
        fundamentals: path.code === FUNDAMENTALS,
        nodes: path.nodes
          .filter((node) => node.certification.isActive)
          .map((node) => ({ code: node.certification.code, row: node.row, col: node.col })),
      })),
      trackLength: LANDING_TRACK_LENGTH + 2,
    });
  }
}
