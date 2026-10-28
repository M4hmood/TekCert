import { describe, expect, it } from 'vitest';
import { CertificationListQuerySchema, SlugSchema } from './catalog.js';

describe('SlugSchema', () => {
  it.each(['saa-c03', 'pcpp-32-1-2', 'az-900'])('accepts %s', (slug) => {
    expect(SlugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(['SAA-C03', 'pcpp/32', '-az', 'az--900', ''])('rejects %s', (slug) => {
    expect(SlugSchema.safeParse(slug).success).toBe(false);
  });
});

describe('CertificationListQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(CertificationListQuerySchema.parse({})).toEqual({});
  });

  it('rejects an unknown level', () => {
    expect(CertificationListQuerySchema.safeParse({ level: 'master' }).success).toBe(false);
  });
});
