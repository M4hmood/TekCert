import type { ProviderSeed, SpecialtySeed } from '../schema';

/** The six ING-4/5 specialties. Hues come from the Design-System screen. */
export const specialties: SpecialtySeed[] = [
  { code: 'SDIA', name: 'AI & Data Science', hue: 285 },
  { code: 'CIM', name: 'Cloud Infrastructure Management', hue: 225 },
  { code: 'GLOps', name: 'Software Engineering & DevOps', hue: 165 },
  { code: 'SSIR', name: 'Systems Security & Network Infrastructure', hue: 15 },
  { code: 'AIOT', name: 'AI & IoT', hue: 130 },
  { code: 'DMWM', name: 'Mobile, Web & Multimedia Development', hue: 340 },
];

/**
 * The 10 providers funded by the institute (Landing screen).
 * AWS, Azure, Red Hat and Google hues come from the designs; the others are new and spaced apart.
 */
export const providers: ProviderSeed[] = [
  { code: 'CISCO', name: 'Cisco', hue: 200 },
  { code: 'AWS', name: 'Amazon Web Services', hue: 55 },
  { code: 'AZURE', name: 'Microsoft Azure', hue: 245 },
  { code: 'ORACLE', name: 'Oracle', hue: 340 },
  { code: 'REDHAT', name: 'Red Hat', hue: 25 },
  { code: 'LF', name: 'The Linux Foundation', hue: 280 },
  { code: 'ECCOUNCIL', name: 'EC-Council', hue: 100 },
  { code: 'INE', name: 'INE Security', hue: 175 },
  { code: 'PYTHON', name: 'Python Institute', hue: 310 },
  { code: 'GOOGLE', name: 'Google Developers', hue: 150 },
];

/**
 * Demo groups per class (ING-4-CIM-A … D, ING-2-A … D).
 * The real number depends on enrolment, so classes are rows and can be added later.
 */
export const groups = ['A', 'B', 'C', 'D'];
