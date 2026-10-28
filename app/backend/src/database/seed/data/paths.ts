import type { PathSeed } from '../schema';

/**
 * DRAFT: needs staff review.
 * The Parcours design used certifications outside the funded catalog (SAP-C02, AI-102, CompTIA…),
 * so each path is redrawn here from the 44 funded certifications only.
 * Grid: col 0 → 2 is progression, row 0 → 2 is a track. `prerequisite` locks a node until it is earned.
 */
export const paths: PathSeed[] = [
  {
    code: 'FOND',
    name: 'Fundamentals',
    nodes: [
      { cert: 'CLF-C02', col: 0, row: 0 },
      { cert: 'AZ-900', col: 0, row: 1 },
      { cert: 'PCEP', col: 0, row: 2 },
      { cert: 'AI-900', col: 1, row: 0 },
      { cert: 'AIF-C01', col: 1, row: 1 },
      { cert: 'ICCA', col: 1, row: 2 },
    ],
  },
  {
    code: 'SDIA',
    name: 'AI & Data Science',
    nodes: [
      { cert: 'PCEP', col: 0, row: 0 },
      { cert: 'PCAP', col: 1, row: 0, prerequisite: 'PCEP' },
      { cert: 'PCPP-32-1/2', col: 2, row: 0, prerequisite: 'PCAP' },
      { cert: 'AI-900', col: 0, row: 1 },
      { cert: 'AIF-C01', col: 1, row: 1 },
      { cert: 'CEPP', col: 2, row: 1, prerequisite: 'PCPP-32-1/2' },
      { cert: 'OCA-DB', col: 0, row: 2 },
      { cert: 'OCP-DB', col: 1, row: 2, prerequisite: 'OCA-DB' },
    ],
  },
  {
    code: 'CIM',
    name: 'Cloud Infrastructure Management',
    nodes: [
      { cert: 'CLF-C02', col: 0, row: 0 },
      { cert: 'SAA-C03', col: 1, row: 0, prerequisite: 'CLF-C02' },
      { cert: 'SOA-C03', col: 2, row: 0, prerequisite: 'SAA-C03' },
      { cert: 'AZ-900', col: 0, row: 1 },
      { cert: 'AZ-104', col: 1, row: 1, prerequisite: 'AZ-900' },
      { cert: 'MCSA', col: 2, row: 1, prerequisite: 'AZ-104' },
      { cert: 'RHCSA', col: 0, row: 2 },
      { cert: 'LFCS', col: 1, row: 2 },
      { cert: 'CKA', col: 2, row: 2, prerequisite: 'LFCS' },
    ],
  },
  {
    code: 'GLOps',
    name: 'Software Engineering & DevOps',
    nodes: [
      { cert: 'RHCSA', col: 0, row: 0 },
      { cert: 'RHCE', col: 1, row: 0, prerequisite: 'RHCSA' },
      { cert: 'CKAD', col: 2, row: 0 },
      { cert: 'AZ-900', col: 0, row: 1 },
      { cert: 'AZ-204', col: 1, row: 1 },
      { cert: 'AZ-400', col: 2, row: 1, prerequisite: 'AZ-204' },
      { cert: 'CLF-C02', col: 0, row: 2 },
      { cert: 'DVA-C02', col: 1, row: 2 },
      { cert: 'DOP-C02', col: 2, row: 2, prerequisite: 'DVA-C02' },
    ],
  },
  {
    code: 'SSIR',
    name: 'Systems Security & Network Infrastructure',
    nodes: [
      { cert: 'CCNA', col: 0, row: 0 },
      { cert: 'CCNP', col: 1, row: 0, prerequisite: 'CCNA' },
      { cert: 'CCIE', col: 2, row: 0, prerequisite: 'CCNP' },
      { cert: 'CND', col: 0, row: 1 },
      { cert: 'CEH', col: 1, row: 1 },
      { cert: 'eCPPT', col: 2, row: 1, prerequisite: 'CEH' },
      { cert: 'eSOC', col: 0, row: 2 },
      { cert: 'eCIR', col: 1, row: 2, prerequisite: 'eSOC' },
      { cert: 'CHFI', col: 2, row: 2 },
    ],
  },
  {
    code: 'AIOT',
    name: 'AI & IoT',
    nodes: [
      { cert: 'AI-900', col: 0, row: 0 },
      { cert: 'AIF-C01', col: 1, row: 0 },
      { cert: 'PCEP', col: 0, row: 1 },
      { cert: 'PCAP', col: 1, row: 1, prerequisite: 'PCEP' },
      { cert: 'CCNA', col: 0, row: 2 },
      { cert: 'AZ-204', col: 1, row: 2 },
    ],
  },
  {
    code: 'DMWM',
    name: 'Mobile, Web & Multimedia Development',
    nodes: [
      { cert: 'AZ-900', col: 0, row: 0 },
      { cert: 'AZ-204', col: 1, row: 0 },
      { cert: 'AAD', col: 2, row: 0 },
      { cert: 'CLF-C02', col: 0, row: 1 },
      { cert: 'DVA-C02', col: 1, row: 1 },
      { cert: 'CKAD', col: 2, row: 1 },
      { cert: 'OCA-JAVA', col: 0, row: 2 },
      { cert: 'OCP-JAVA', col: 1, row: 2, prerequisite: 'OCA-JAVA' },
      { cert: 'eWPT', col: 2, row: 2 },
    ],
  },
];
