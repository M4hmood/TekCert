import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CertificationDetailSchema,
  CertificationListSchema,
  ProblemDetailsSchema,
} from '@tekcert/types';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (url: string) => request(app.getHttpServer()).get(url);

  describe('GET /health', () => {
    it('reports the database as up', async () => {
      const res = await get('/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
    });

    it('echoes the caller request id', async () => {
      const res = await get('/health').set('x-request-id', 'trace-123').expect(200);
      expect(res.headers['x-request-id']).toBe('trace-123');
    });
  });

  describe('GET /certifications', () => {
    it('returns the full seeded catalog', async () => {
      const body = CertificationListSchema.parse((await get('/certifications').expect(200)).body);
      expect(body.total).toBe(56);
      expect(new Set(body.items.map((c) => c.provider.code)).size).toBe(10);
    });

    it('filters by provider and level', async () => {
      const aws = CertificationListSchema.parse(
        (await get('/certifications?provider=aws').expect(200)).body,
      );
      expect(aws.total).toBe(7);

      const experts = CertificationListSchema.parse(
        (await get('/certifications?level=expert').expect(200)).body,
      );
      expect(experts.items.map((c) => c.code).sort()).toEqual([
        'AZ-400',
        'CCIE-RS',
        'CEPP',
        'HCIE',
        'RHCA',
      ]);
    });

    it('includes all-specialty certifications in a specialty filter', async () => {
      const dmwm = CertificationListSchema.parse(
        (await get('/certifications?specialty=DMWM').expect(200)).body,
      );
      expect(dmwm.items.map((c) => c.code)).toEqual(expect.arrayContaining(['AZ-900', 'OCA-JAVA']));
      expect(dmwm.items.every((c) => c.forAllSpecialties || c.specialties.includes('DMWM'))).toBe(
        true,
      );
    });

    it('rejects an invalid filter with Problem Details', async () => {
      const res = await get('/certifications?level=master')
        .expect(400)
        .expect('content-type', /application\/problem\+json/);
      expect(ProblemDetailsSchema.parse(res.body).errors?.[0]?.path).toBe('level');
    });
  });

  describe('GET /certifications/:slug', () => {
    it('returns domains and chapters in syllabus order', async () => {
      const cert = CertificationDetailSchema.parse(
        (await get('/certifications/saa-c03').expect(200)).body,
      );
      expect(cert.chapterCount).toBe(11);
      expect(cert.domains.map((d) => d.shortTitle)).toEqual([
        'Security',
        'Resilience',
        'Performance',
        'Cost',
      ]);
      expect(cert.domains[1]?.chapters.map((c) => c.order)).toEqual([6, 7, 8]);
    });

    it('returns 404 for an unknown certification', async () => {
      const res = await get('/certifications/unknown').expect(404);
      expect(ProblemDetailsSchema.parse(res.body).status).toBe(404);
    });
  });

  it('serves the OpenAPI document', async () => {
    const res = await get('/docs-json').expect(200);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/health', '/certifications', '/certifications/{slug}']),
    );
  });
});
