import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
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

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export async function seed(prisma: PrismaClient): Promise<void> {
  const data = validateSeedData(seedData);

  await prisma.$transaction(
    async (tx) => {
      const specialtyIds = await seedSpecialties(tx, data);
      await seedClasses(tx, data, specialtyIds);
      const providerIds = await seedProviders(tx, data);
      const certIds = await seedCertifications(tx, data, providerIds, specialtyIds);
      await seedPaths(tx, data, specialtyIds, certIds);
    },
    { timeout: 60_000 },
  );
}

async function seedSpecialties(tx: Tx, data: SeedData): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const s of data.specialties) {
    const row = await tx.specialty.upsert({
      where: { code: s.code },
      create: { code: s.code, name: s.name, hue: s.hue },
      update: { name: s.name, hue: s.hue },
    });
    ids.set(s.code, row.id);
  }
  return ids;
}

/** ING-1…3 classes are `ING-<year>-<group>`; ING-4/5 classes are `ING-<year>-<specialty>-<group>`. */
async function seedClasses(
  tx: Tx,
  data: SeedData,
  specialtyIds: Map<string, string>,
): Promise<void> {
  const rows: { code: string; year: number; group: string; specialtyId: string | null }[] = [];
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
          specialtyId: specialtyIds.get(s.code) ?? null,
        });
      }
    }
  }
  for (const { code, ...fields } of rows) {
    await tx.class.upsert({ where: { code }, create: { code, ...fields }, update: fields });
  }
}

async function seedProviders(tx: Tx, data: SeedData): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const p of data.providers) {
    const row = await tx.provider.upsert({
      where: { code: p.code },
      create: p,
      update: { name: p.name, hue: p.hue },
    });
    ids.set(p.code, row.id);
  }
  return ids;
}

async function seedCertifications(
  tx: Tx,
  data: SeedData,
  providerIds: Map<string, string>,
  specialtyIds: Map<string, string>,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const c of data.certifications) {
    const fields = {
      slug: c.slug,
      name: c.name,
      examCode: c.examCode,
      level: c.level,
      difficulty: c.difficulty,
      forAllSpecialties: c.specialties === 'ALL',
      badgeAsset: c.badgeAsset,
      isActive: true,
      providerId: required(providerIds, c.provider),
    };
    const cert = await tx.certification.upsert({
      where: { code: c.code },
      create: { code: c.code, ...fields },
      update: fields,
    });
    ids.set(c.code, cert.id);

    await tx.certificationSpecialty.deleteMany({ where: { certificationId: cert.id } });
    if (c.specialties !== 'ALL') {
      await tx.certificationSpecialty.createMany({
        data: c.specialties.map((code) => ({
          certificationId: cert.id,
          specialtyId: required(specialtyIds, code),
        })),
      });
    }

    const orders = chapterOrders(c.domains);
    let chapterIndex = 0;
    for (const [i, domain] of c.domains.entries()) {
      const domainFields = {
        title: domain.title,
        shortTitle: domain.short,
        weightPct: domain.weight,
      };
      const domainRow = await tx.certificationDomain.upsert({
        where: { certificationId_order: { certificationId: cert.id, order: i + 1 } },
        create: { certificationId: cert.id, order: i + 1, ...domainFields },
        update: domainFields,
      });
      for (const chapter of domain.chapters) {
        const order = orders[chapterIndex++] ?? chapterIndex;
        const chapterFields = {
          title: chapter.title,
          estimatedMinutes: chapter.minutes,
          domainId: domainRow.id,
        };
        await tx.chapter.upsert({
          where: { certificationId_order: { certificationId: cert.id, order } },
          create: { certificationId: cert.id, order, ...chapterFields },
          update: chapterFields,
        });
      }
    }
    // Drop chapters and domains that no longer exist in the data file.
    await tx.chapter.deleteMany({
      where: { certificationId: cert.id, order: { notIn: orders } },
    });
    await tx.certificationDomain.deleteMany({
      where: { certificationId: cert.id, order: { gt: c.domains.length } },
    });
  }
  // Certifications removed from the data file are deactivated, never deleted.
  await tx.certification.updateMany({
    where: { code: { notIn: data.certifications.map((c) => c.code) } },
    data: { isActive: false },
  });
  return ids;
}

async function seedPaths(
  tx: Tx,
  data: SeedData,
  specialtyIds: Map<string, string>,
  certIds: Map<string, string>,
): Promise<void> {
  for (const p of data.paths) {
    const fields = {
      name: p.name,
      kind: p.code === 'FOND' ? ('shared' as const) : ('specialty' as const),
      specialtyId: p.code === 'FOND' ? null : required(specialtyIds, p.code),
    };
    const path = await tx.path.upsert({
      where: { code: p.code },
      create: { code: p.code, ...fields },
      update: fields,
    });
    // Nodes have no dependants, so the simplest correct sync is replace-all.
    await tx.pathNode.deleteMany({ where: { pathId: path.id } });
    await tx.pathNode.createMany({
      data: p.nodes.map((n) => ({
        pathId: path.id,
        certificationId: required(certIds, n.cert),
        col: n.col,
        row: n.row,
        prerequisiteId: n.prerequisite ? required(certIds, n.prerequisite) : null,
      })),
    });
  }
}

function required(map: Map<string, string>, key: string): string {
  const value = map.get(key);
  if (!value) throw new Error(`Seed reference not found: ${key}`);
  return value;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await seed(prisma);
    const [certs, chapters, classes] = await Promise.all([
      prisma.certification.count({ where: { isActive: true } }),
      prisma.chapter.count(),
      prisma.class.count(),
    ]);
    console.log(`Seeded ${certs} certifications, ${chapters} chapters, ${classes} classes.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
