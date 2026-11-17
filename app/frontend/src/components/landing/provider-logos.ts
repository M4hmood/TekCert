/**
 * Provider logos for the landing page's certification cards (design/Landing: "Certifications
 * funded by the institute"). Files live in public/providers; the height is the design's, the
 * width follows the file's proportions (Huawei's is not in the design: its height matches Red
 * Hat's). A provider without a logo shows its name.
 */
export interface ProviderLogo {
  src: string;
  width: number;
  height: number;
}

export const PROVIDER_LOGOS: Readonly<Record<string, ProviderLogo>> = {
  CISCO: { src: '/providers/cisco.svg', width: 83, height: 44 },
  AWS: { src: '/providers/aws.svg', width: 72, height: 43 },
  AZURE: { src: '/providers/azure.svg', width: 40, height: 40 },
  ORACLE: { src: '/providers/oracle-logo.png', width: 163, height: 28 },
  REDHAT: { src: '/providers/redhat.svg', width: 152, height: 36 },
  LF: { src: '/providers/linux-foundation.png', width: 116, height: 40 },
  ECCOUNCIL: { src: '/providers/eccouncil.png', width: 131, height: 30 },
  INE: { src: '/providers/ine.svg', width: 131, height: 40 },
  PYTHON: { src: '/providers/python-institute.png', width: 158, height: 44 },
  HUAWEI: { src: '/providers/huawei.png', width: 160, height: 36 },
};
