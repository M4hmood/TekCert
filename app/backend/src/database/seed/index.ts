import 'dotenv/config';
import 'reflect-metadata';
import { DataSource, type EntityManager, In, MoreThan, Not } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import {
  Certification,
  CertificationDomain,
  Chapter,
  Path,
  PathNode,
  Provider,
  SchoolClass,
  Specialty,
} from '../entities';
import { certifications } from './data/certifications';
import { paths } from './data/paths';
import { groups, providers, specialties } from './data/reference';
import { chapterOrders, type SeedData, validateSeedData } from './schema';

/**
 * Idempotent seed: every row is upserted by its natural key, so it is safe to re-run on a
 * database that already has data. Chapters and domains keep their ids when only titles change,
 * so future progress rows that reference them survive a re-seed.
 */

export const seedData: SeedData = { specialties, providers, certifications, paths, groups };

export async function seed(dataSource: DataSource): Promise<void> {
  const data = validateSeedData(seedData);

  await dataSource.transaction(async (manager) => {
    const specialtyIds = await seedSpecialties(manager, data);
    await seedClasses(manager, data, specialtyIds);
    const providerIds = await seedProviders(manager, data);
    const certIds = await seedCertifications(manager, data, providerIds, specialtyIds);
    await seedPaths(manager, data, specialtyIds, certIds);
  });
}

/** Inserts or updates by `code` and returns the row id. */
async function upsertByCode<T extends { id: string; code: string }>(
  manager: EntityManager,
  entity: new () => T,
  values: Partial<T> & { code: string },
): Promise<string> {
  // The generic upsert typing can't follow Partial<T> through TypeORM's deep partial types.
  await manager.upsert(entity, values as never, ['code']);
  const row = await manager.findOneOrFail(entity, { where: { code: values.code } as never });
  return row.id;
}

async function seedSpecialties(
  manager: EntityManager,
  data: SeedData,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const s of data.specialties) {
    ids.set(s.code, await upsertByCode(manager, Specialty, s));
  }
  return ids;
}

/** ING-1…3 classes are `ING-<year>-<group>`; ING-4/5 classes are `ING-<year>-<specialty>-<group>`. */
async function seedClasses(
  manager: EntityManager,
  data: SeedData,
  specialtyIds: Map<string, string>,
): Promise<void> {
  const rows: Partial<SchoolClass>[] = [];
  for (const year of [1, 2, 3]) {
    for (const group of data.groups) {
      rows.push({ code: `ING-${year}-${group}`, year, group, specialtyId: null });
    }
  }
  for (const year of [4, 5]) {
    for (const s of data.specialties) {
      for (const group of data.groups) {
        rows.push({
          code: `ING-${year}-${s.code}-${group}`,
          year,
          group,
          specialtyId: required(specialtyIds, s.code),
        });
      }
    }
  }
  await manager.upsert(SchoolClass, rows, ['code']);
}

async function seedProviders(manager: EntityManager, data: SeedData): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const p of data.providers) {
    ids.set(p.code, await upsertByCode(manager, Provider, p));
  }
  return ids;
}

async function seedCertifications(
  manager: EntityManager,
  data: SeedData,
  providerIds: Map<string, string>,
  specialtyIds: Map<string, string>,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const c of data.certifications) {
    const certId = await upsertByCode(manager, Certification, {
      code: c.code,
      slug: c.slug,
      name: c.name,
      examCode: c.examCode,
      level: c.level,
      difficulty: c.difficulty,
      forAllSpecialties: c.specialties === 'ALL',
      badgeAsset: c.badgeAsset,
      isActive: true,
      providerId: required(providerIds, c.provider),
    });
    ids.set(c.code, certId);

    // Sync the specialty links: add what's new, remove what's gone.
    const relation = manager.createQueryBuilder().relation(Certification, 'specialties').of(certId);
    const current = (await relation.loadMany<Specialty>()).map((s) => s.id);
    const wanted =
      c.specialties === 'ALL' ? [] : c.specialties.map((code) => required(specialtyIds, code));
    await relation.addAndRemove(
      wanted.filter((id) => !current.includes(id)),
      current.filter((id) => !wanted.includes(id)),
    );

    const orders = chapterOrders(c.domains);
    let chapterIndex = 0;
    for (const [i, domain] of c.domains.entries()) {
      const order = i + 1;
      await manager.upsert(
        CertificationDomain,
        {
          certificationId: certId,
          order,
          title: domain.title,
          shortTitle: domain.short,
          weightPct: domain.weight,
        },
        ['certificationId', 'order'],
      );
      const domainRow = await manager.findOneByOrFail(CertificationDomain, {
        certificationId: certId,
        order,
      });
      await manager.upsert(
        Chapter,
        domain.chapters.map((chapter) => ({
          certificationId: certId,
          domainId: domainRow.id,
          order: orders[chapterIndex++] ?? chapterIndex,
          title: chapter.title,
          estimatedMinutes: chapter.minutes,
        })),
        ['certificationId', 'order'],
      );
    }
    // Drop chapters and domains that no longer exist in the data file.
    await manager.delete(Chapter, { certificationId: certId, order: Not(In(orders)) });
    await manager.delete(CertificationDomain, {
      certificationId: certId,
      order: MoreThan(c.domains.length),
    });
  }
  // Certifications removed from the data file are deactivated, never deleted.
  await manager.update(
    Certification,
    { code: Not(In(data.certifications.map((c) => c.code))) },
    { isActive: false },
  );
  return ids;
}

async function seedPaths(
  manager: EntityManager,
  data: SeedData,
  specialtyIds: Map<string, string>,
  certIds: Map<string, string>,
): Promise<void> {
  for (const p of data.paths) {
    const pathId = await upsertByCode(manager, Path, {
      code: p.code,
      name: p.name,
      kind: p.code === 'FOND' ? 'shared' : 'specialty',
      specialtyId: p.code === 'FOND' ? null : required(specialtyIds, p.code),
    });
    // Nodes have no dependants, so the simplest correct sync is replace-all.
    await manager.delete(PathNode, { pathId });
    await manager.insert(
      PathNode,
      p.nodes.map((n) => ({
        pathId,
        certificationId: required(certIds, n.cert),
        col: n.col,
        row: n.row,
        prerequisiteId: n.prerequisite ? required(certIds, n.prerequisite) : null,
      })),
    );
  }
}

function required(map: Map<string, string>, key: string): string {
  const value = map.get(key);
  if (!value) throw new Error(`Seed reference not found: ${key}`);
  return value;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const dataSource = await new DataSource(dataSourceOptions(url)).initialize();
  try {
    await seed(dataSource);
    const [certs, chapters, classes] = await Promise.all([
      dataSource.getRepository(Certification).countBy({ isActive: true }),
      dataSource.getRepository(Chapter).count(),
      dataSource.getRepository(SchoolClass).count(),
    ]);
    console.log(`Seeded ${certs} certifications, ${chapters} chapters, ${classes} classes.`);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
