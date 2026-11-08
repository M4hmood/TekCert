import type { CertificationDetailsSeed, ResourceSeed } from '../schema';

/**
 * What the certification page shows beyond the syllabus: a summary, the exam facts and the
 * recommended external resources (TekCert hosts no courses).
 *
 * SAA-C03 matches the Fiche-certification design.
 * DRAFT: needs staff review. Everything else was written from general knowledge of each exam
 * (October 2026), and most of it has not been checked against the vendor's page, so durations,
 * question counts, passing scores and validity are unconfirmed. Facts without a confident
 * value are left out and the page hides them. Every certification links to a vendor page
 * first; retired exams link to the vendor's certification hub instead.
 */

type Tuple = readonly [title: string, url: string, duration?: string];

const res =
  (kind: ResourceSeed['kind']) =>
  ([title, url, duration]: Tuple): ResourceSeed =>
    duration ? { kind, title, url, duration } : { kind, title, url };
const doc = (...t: Tuple) => res('doc')(t);
const video = (...t: Tuple) => res('video')(t);
const lab = (...t: Tuple) => res('lab')(t);
const practice = (...t: Tuple) => res('practice')(t);

// ── Shared resources ────────────────────────────────────────────────────────
const ciscoHub = doc(
  'Cisco certifications (official)',
  'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/index.html',
);
const ciscoCommunity = doc('Cisco Learning Network', 'https://learningnetwork.cisco.com/');
const packetTracer = lab(
  'Cisco Packet Tracer (free simulator)',
  'https://www.netacad.com/courses/packet-tracer',
);

const awsSkillBuilder = video('AWS Skill Builder: exam prep courses', 'https://skillbuilder.aws/');
const awsWorkshops = lab('AWS Workshops: guided hands-on labs', 'https://workshops.aws/');
const wellArchitected = doc(
  'AWS Well-Architected Framework',
  'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html',
);
const awsExamGuide = (slug: string, code: string) =>
  doc(
    `Official ${code} exam guide`,
    `https://docs.aws.amazon.com/aws-certification/latest/${slug}/${slug}.html`,
  );
const awsCert = (path: string, name: string) =>
  doc(`${name} (official)`, `https://aws.amazon.com/certification/${path}/`);

const msCert = (path: string, name: string) =>
  doc(
    `${name} (official)`,
    `https://learn.microsoft.com/en-us/credentials/certifications/${path}/`,
  );
const msStudyGuide = (code: string) =>
  doc(
    `${code.toUpperCase()} study guide (Microsoft Learn)`,
    `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/${code}`,
  );

const oracleHub = doc(
  'Oracle certification (official)',
  'https://www.oracle.com/education/certification/',
);
const devJava = doc('Learn Java (dev.java)', 'https://dev.java/learn/');
const javaTutorial = doc('The Java Tutorials', 'https://docs.oracle.com/javase/tutorial/');
const oracleSqlReference = doc(
  'Oracle SQL Language Reference',
  'https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/',
);
const liveSql = lab('Oracle Live SQL (run SQL in the browser)', 'https://livesql.oracle.com/');

const redHatHub = doc(
  'Red Hat certifications (official)',
  'https://www.redhat.com/en/services/certification',
);
const rhelDeveloper = lab(
  'Free RHEL developer subscription',
  'https://developers.redhat.com/products/rhel/download',
);
const ansibleDocs = doc('Ansible documentation', 'https://docs.ansible.com/');
const openStackDocs = doc('OpenStack documentation', 'https://docs.openstack.org/');

const lfHub = doc(
  'Linux Foundation certifications (official)',
  'https://training.linuxfoundation.org/certification/',
);
const k8sDocs = doc('Kubernetes documentation', 'https://kubernetes.io/docs/home/');
const killercoda = lab(
  'Killercoda: interactive Kubernetes and Linux labs',
  'https://killercoda.com/',
);
const killerSh = practice('killer.sh exam simulator', 'https://killer.sh/');

const tryHackMe = lab('TryHackMe: guided security labs', 'https://tryhackme.com/');
const hackTheBox = lab('Hack The Box: practice machines', 'https://www.hackthebox.com/');
const portSwigger = lab('PortSwigger Web Security Academy', 'https://portswigger.net/web-security');
const owaspWstg = doc(
  'OWASP Web Security Testing Guide',
  'https://owasp.org/www-project-web-security-testing-guide/',
);
const ineHub = doc(
  'INE Security certifications (official)',
  'https://security.ine.com/certifications/',
);
const ineCert = (slug: string, name: string) =>
  doc(`${name} (official)`, `https://security.ine.com/certifications/${slug}-certification/`);

const pythonTutorial = doc('The Python Tutorial', 'https://docs.python.org/3/tutorial/');
const pythonLibrary = doc(
  'Python Standard Library reference',
  'https://docs.python.org/3/library/',
);
const edube = video('Python Essentials courses (OpenEDG, free)', 'https://edube.org/');

const huaweiTalent = doc(
  'Huawei Talent: certifications (official)',
  'https://e.huawei.com/en/talent/',
);
const huaweiDatacom = doc(
  'Huawei Datacom certification announcement',
  'https://www.huawei.com/en/news/2020/11/huawei-datacom-certification',
);

const AWS_FACTS = {
  languages: 'English, French and others',
  delivery: 'Test centre or online',
  validityYears: 3,
} as const;
const AZURE_FACTS = {
  passingScore: '700 / 1,000',
  languages: 'English, French and others',
  delivery: 'Test centre or online',
} as const;
const RED_HAT_FACTS = {
  passingScore: '210 / 300',
  delivery: 'Test centre or remote, hands-on',
  validityYears: 3,
} as const;
const LF_FACTS = { delivery: 'Online, hands-on', languages: 'English' } as const;
const PYTHON_FACTS = { delivery: 'Test centre or online', languages: 'English' } as const;

export const certificationDetails: Record<string, CertificationDetailsSeed> = {
  // ── Cisco ────────────────────────────────────────────────────────────────
  CCENT: {
    summary:
      'Entry-level networking: how LANs, IP addressing, switching and basic routing work on Cisco devices. A first step towards the CCNA.',
    minutes: 90,
    delivery: 'Test centre',
    validityYears: 3,
    resources: [ciscoHub, ciscoCommunity, packetTracer],
  },
  'CCNA-RS': {
    summary:
      'Install, configure and troubleshoot switched and routed networks: VLANs, OSPF, EIGRP, WAN links and core IP services.',
    minutes: 90,
    delivery: 'Test centre',
    validityYears: 3,
    resources: [
      doc(
        'CCNA (official)',
        'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccna/index.html',
      ),
      ciscoCommunity,
      packetTracer,
    ],
  },
  'CCNA-SEC': {
    summary:
      'Secure a Cisco network: device hardening, firewalls, site-to-site and remote-access VPNs, intrusion prevention and access control.',
    minutes: 90,
    delivery: 'Test centre',
    validityYears: 3,
    resources: [
      doc(
        'Cisco security certifications (official)',
        'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/security/index.html',
      ),
      ciscoCommunity,
      packetTracer,
    ],
  },
  'CCNP-SWITCH': {
    summary:
      'Plan and run enterprise campus switching: VLAN design, Spanning Tree tuning, EtherChannel, first-hop redundancy and switch security.',
    minutes: 120,
    delivery: 'Test centre',
    validityYears: 3,
    resources: [
      doc(
        'CCNP Enterprise (official)',
        'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccnp-enterprise/index.html',
      ),
      ciscoCommunity,
      packetTracer,
    ],
  },
  'CCNP-ROUTE': {
    summary:
      'Advanced IP routing for enterprise networks: EIGRP, OSPF and BGP design, route redistribution, filtering and IPv6 routing.',
    minutes: 120,
    delivery: 'Test centre',
    validityYears: 3,
    resources: [
      doc(
        'CCNP Enterprise (official)',
        'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccnp-enterprise/index.html',
      ),
      ciscoCommunity,
      packetTracer,
    ],
  },
  'CCNP-RS': {
    summary:
      'The full professional routing and switching track: ROUTE, SWITCH and TSHOOT together, for engineers who run large enterprise networks.',
    delivery: 'Test centre',
    validityYears: 3,
    resources: [
      doc(
        'CCNP Enterprise (official)',
        'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccnp-enterprise/index.html',
      ),
      ciscoCommunity,
      packetTracer,
    ],
  },
  'CCIE-RS': {
    summary:
      'Expert-level enterprise networking: a written exam followed by an 8-hour hands-on lab where you design, build and fix a complex network.',
    delivery: 'Test centre (written) and Cisco lab',
    validityYears: 3,
    resources: [
      doc(
        'CCIE Enterprise Infrastructure (official)',
        'https://www.cisco.com/site/us/en/learn/training-certifications/certifications/enterprise/ccie-enterprise-infrastructure/index.html',
      ),
      ciscoCommunity,
    ],
  },

  // ── Amazon Web Services ──────────────────────────────────────────────────
  'CLF-C02': {
    summary:
      'The AWS basics: core services, the shared responsibility model, security, pricing and support. No hands-on experience needed.',
    minutes: 90,
    questions: 65,
    passingScore: '700 / 1,000',
    ...AWS_FACTS,
    resources: [
      awsCert('certified-cloud-practitioner', 'AWS Certified Cloud Practitioner'),
      awsExamGuide('cloud-practitioner-02', 'CLF-C02'),
      awsSkillBuilder,
    ],
  },
  'SAA-C03': {
    summary:
      'Validates your ability to design secure, resilient, high-performing and cost-optimised architectures on AWS. The most taken Associate certification at TEK-UP.',
    description:
      'The exam tests your ability to choose the right AWS services for a given need: networking, compute, storage, databases, security. Questions are scenarios where several answers work, but only one best meets the cost, availability or security constraints.',
    minutes: 130,
    questions: 65,
    passingScore: '720 / 1,000',
    languages: 'English, French and 8 others',
    delivery: 'Test centre or online',
    validityYears: 3,
    resources: [
      doc(
        'Official SAA-C03 exam guide',
        'https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html',
        '30 min',
      ),
      { ...wellArchitected, duration: '3 h' },
      video('Exam Prep SAA-C03 (Skill Builder)', 'https://skillbuilder.aws/', '6 h'),
      video(
        'Free AWS exam prep videos (freeCodeCamp)',
        'https://www.youtube.com/@freecodecamp',
        '≈ 10 h',
      ),
      lab('Guided labs: VPC, EC2, S3', 'https://workshops.aws/', '4 h'),
      practice(
        'Official sample questions',
        'https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Sample-Questions.pdf',
        '1 h',
      ),
      practice('Timed practice tests', 'https://tutorialsdojo.com/', '8 h'),
    ],
  },
  'DVA-C02': {
    summary:
      'Build, deploy and debug cloud applications on AWS: Lambda, API Gateway, DynamoDB, SDKs, CI/CD and application security.',
    minutes: 130,
    questions: 65,
    passingScore: '720 / 1,000',
    ...AWS_FACTS,
    resources: [
      awsCert('certified-developer-associate', 'AWS Certified Developer – Associate'),
      awsExamGuide('developer-associate-02', 'DVA-C02'),
      awsSkillBuilder,
      awsWorkshops,
    ],
  },
  'SOA-C03': {
    summary:
      'Operate workloads on AWS: monitoring, automation, reliability, networking, security and cost controls for systems in production.',
    minutes: 130,
    questions: 65,
    passingScore: '720 / 1,000',
    ...AWS_FACTS,
    resources: [
      awsCert(
        'certified-cloudops-engineer-associate',
        'AWS Certified CloudOps Engineer – Associate',
      ),
      awsSkillBuilder,
      awsWorkshops,
    ],
  },
  'AIF-C01': {
    summary:
      'AI, machine learning and generative AI concepts on AWS: use cases, foundation models, prompt engineering and responsible AI.',
    minutes: 90,
    questions: 65,
    passingScore: '700 / 1,000',
    ...AWS_FACTS,
    resources: [
      awsCert('certified-ai-practitioner', 'AWS Certified AI Practitioner'),
      awsExamGuide('ai-practitioner-01', 'AIF-C01'),
      awsSkillBuilder,
    ],
  },
  'DOP-C02': {
    summary:
      'Automate delivery and operations on AWS: CI/CD pipelines, infrastructure as code, monitoring, incident response and resilient deployments.',
    minutes: 180,
    questions: 75,
    passingScore: '750 / 1,000',
    ...AWS_FACTS,
    resources: [
      awsCert(
        'certified-devops-engineer-professional',
        'AWS Certified DevOps Engineer – Professional',
      ),
      awsExamGuide('devops-engineer-professional-02', 'DOP-C02'),
      awsSkillBuilder,
      awsWorkshops,
    ],
  },
  'SAP-C02': {
    summary:
      'Design complex AWS solutions across many accounts: migrations, hybrid networks, cost control and continuous improvement at scale.',
    minutes: 180,
    questions: 75,
    passingScore: '750 / 1,000',
    ...AWS_FACTS,
    resources: [
      awsCert(
        'certified-solutions-architect-professional',
        'AWS Certified Solutions Architect – Professional',
      ),
      awsExamGuide('solutions-architect-professional-02', 'SAP-C02'),
      wellArchitected,
      awsSkillBuilder,
    ],
  },

  // ── Microsoft Azure ──────────────────────────────────────────────────────
  'AZ-900': {
    summary:
      'Cloud concepts and the core Azure services: compute, networking, storage, identity, governance, pricing and support.',
    minutes: 45,
    ...AZURE_FACTS,
    resources: [
      msCert('azure-fundamentals', 'Microsoft Azure Fundamentals'),
      msStudyGuide('az-900'),
    ],
  },
  'AI-900': {
    summary:
      'AI workloads on Azure: machine learning basics, computer vision, natural language processing and generative AI services.',
    minutes: 45,
    ...AZURE_FACTS,
    resources: [
      msCert('azure-ai-fundamentals', 'Microsoft Azure AI Fundamentals'),
      msStudyGuide('ai-900'),
    ],
  },
  'AZ-104': {
    summary:
      'Run an Azure environment: identities and governance, storage, virtual machines and containers, virtual networks and monitoring.',
    minutes: 100,
    ...AZURE_FACTS,
    validityYears: 1,
    resources: [
      msCert('azure-administrator', 'Microsoft Azure Administrator'),
      msStudyGuide('az-104'),
    ],
  },
  'AZ-204': {
    summary:
      'Develop for Azure: App Service, Functions, containers, Cosmos DB and Blob storage, authentication, API Management and messaging.',
    minutes: 100,
    ...AZURE_FACTS,
    validityYears: 1,
    resources: [
      msCert('azure-developer', 'Microsoft Azure Developer Associate'),
      msStudyGuide('az-204'),
    ],
  },
  'AZ-500': {
    summary:
      'Secure Azure workloads: identity and access, network security, compute and storage protection, and security operations with Defender and Sentinel.',
    minutes: 100,
    ...AZURE_FACTS,
    validityYears: 1,
    resources: [
      msCert('azure-security-engineer', 'Microsoft Azure Security Engineer Associate'),
      msStudyGuide('az-500'),
    ],
  },
  'AZ-400': {
    summary:
      'DevOps on Azure: source control strategy, CI/CD with Azure Pipelines and GitHub Actions, security and compliance, and instrumentation.',
    minutes: 100,
    ...AZURE_FACTS,
    validityYears: 1,
    resources: [
      msCert('devops-engineer', 'Microsoft DevOps Engineer Expert'),
      msStudyGuide('az-400'),
    ],
  },

  // ── Oracle ───────────────────────────────────────────────────────────────
  'OCA-JAVA': {
    summary:
      'Java SE 8 fundamentals: data types, operators, control flow, classes and objects, inheritance, exceptions and the core APIs.',
    minutes: 120,
    questions: 56,
    passingScore: '65 %',
    delivery: 'Test centre or online',
    resources: [
      doc(
        'Exam 1Z0-808 (official)',
        'https://education.oracle.com/java-se-8-programmer-i/pexam_1Z0-808',
      ),
      devJava,
      javaTutorial,
    ],
  },
  'OCP-JAVA': {
    summary:
      'Advanced Java SE 8: generics and collections, lambdas and streams, the date-time API, I/O and NIO.2, concurrency and JDBC.',
    minutes: 120,
    questions: 68,
    passingScore: '65 %',
    delivery: 'Test centre or online',
    resources: [
      doc(
        'Exam 1Z0-809 (official)',
        'https://education.oracle.com/java-se-8-programmer-ii/pexam_1Z0-809',
      ),
      devJava,
      javaTutorial,
    ],
  },
  'OCA-DB': {
    summary:
      'SQL on Oracle Database: queries, joins, subqueries, set operators, data manipulation, DDL and managing schema objects.',
    minutes: 120,
    questions: 78,
    passingScore: '63 %',
    delivery: 'Test centre or online',
    resources: [
      doc(
        'Exam 1Z0-071 (official)',
        'https://education.oracle.com/oracle-database-sql/pexam_1Z0-071',
      ),
      oracleSqlReference,
      liveSql,
    ],
  },
  'OCP-DB': {
    summary:
      'Professional-level Oracle Database skills: advanced SQL, performance, schema design and administration of production databases.',
    delivery: 'Test centre or online',
    resources: [oracleHub, oracleSqlReference, liveSql],
  },

  // ── Red Hat ──────────────────────────────────────────────────────────────
  RHCSA: {
    summary:
      'Core Linux administration on Red Hat Enterprise Linux, tested hands-on: storage, users, permissions, services, networking, SELinux and containers.',
    minutes: 180,
    ...RED_HAT_FACTS,
    resources: [
      doc('RHCSA (official)', 'https://www.redhat.com/en/services/certification/rhcsa'),
      doc(
        'Exam EX200 objectives',
        'https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam',
      ),
      rhelDeveloper,
    ],
  },
  'RHCSA-OS': {
    summary:
      'Administer Red Hat OpenStack Platform: projects, users, networks, images, instances and block storage, tested hands-on.',
    minutes: 180,
    ...RED_HAT_FACTS,
    resources: [redHatHub, openStackDocs],
  },
  RHCE: {
    summary:
      'Automate Red Hat Enterprise Linux administration with Ansible: inventories, playbooks, roles, templates and system roles. Requires the RHCSA.',
    minutes: 240,
    ...RED_HAT_FACTS,
    resources: [
      doc(
        'Exam EX294 (official)',
        'https://www.redhat.com/en/services/training/ex294-red-hat-certified-engineer-rhce-exam-red-hat-enterprise-linux-9',
      ),
      ansibleDocs,
      rhelDeveloper,
    ],
  },
  'RHCE-OS': {
    summary:
      'Engineer Red Hat OpenStack clouds: deploy and tune compute, networking and storage services, and troubleshoot a running cloud.',
    ...RED_HAT_FACTS,
    resources: [redHatHub, openStackDocs],
  },
  RHCA: {
    summary:
      "Red Hat's highest level: an RHCE who has passed five more specialist exams in areas such as automation, OpenShift or cloud.",
    delivery: 'Test centre or remote, hands-on',
    validityYears: 3,
    resources: [redHatHub, ansibleDocs],
  },
  RHCJA: {
    summary:
      'Install, configure and secure JBoss Enterprise Application Platform: deployments, data sources, messaging, clustering and the management CLI.',
    ...RED_HAT_FACTS,
    resources: [redHatHub, doc('WildFly documentation', 'https://docs.wildfly.org/')],
  },
  'RHCS-ANS': {
    summary:
      'Automate Linux administration with Ansible: inventories, playbooks, variables, templates, roles and Ansible Vault, tested hands-on.',
    minutes: 240,
    ...RED_HAT_FACTS,
    resources: [redHatHub, ansibleDocs, rhelDeveloper],
  },

  // ── The Linux Foundation ─────────────────────────────────────────────────
  LFCS: {
    summary:
      'Linux system administration solved live in a terminal: essential commands, operations, users and groups, networking, storage and services.',
    minutes: 120,
    passingScore: '67 %',
    ...LF_FACTS,
    validityYears: 2,
    resources: [
      doc(
        'LFCS (official)',
        'https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/',
      ),
      killercoda,
    ],
  },
  LFCE: {
    summary:
      'Advanced Linux engineering: network administration, service configuration, security and system design across several machines.',
    ...LF_FACTS,
    resources: [lfHub, killercoda],
  },
  CKA: {
    summary:
      'Run Kubernetes clusters, tested live: installation and upgrades, workloads and scheduling, services and networking, storage and troubleshooting.',
    minutes: 120,
    passingScore: '66 %',
    ...LF_FACTS,
    validityYears: 2,
    resources: [
      doc(
        'CKA (official)',
        'https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/',
      ),
      k8sDocs,
      killercoda,
      killerSh,
    ],
  },
  CKAD: {
    summary:
      'Build and deploy applications on Kubernetes, tested live: pods and deployments, configuration, observability, services and networking.',
    minutes: 120,
    passingScore: '66 %',
    ...LF_FACTS,
    validityYears: 2,
    resources: [
      doc(
        'CKAD (official)',
        'https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/',
      ),
      k8sDocs,
      killercoda,
      killerSh,
    ],
  },
  CFCD: {
    summary:
      'Develop cloud-native applications for Cloud Foundry: pushing apps, services, scaling, logging and the twelve-factor principles.',
    ...LF_FACTS,
    resources: [lfHub, doc('Cloud Foundry documentation', 'https://docs.cloudfoundry.org/')],
  },
  COA: {
    summary:
      'Day-to-day OpenStack administration, tested live: identity, compute, networking, images, block and object storage.',
    ...LF_FACTS,
    resources: [
      doc('Certified OpenStack Administrator (official)', 'https://www.openstack.org/coa/'),
      openStackDocs,
    ],
  },
  CHSA: {
    summary:
      'Install, configure and operate a Hyperledger Sawtooth blockchain network: nodes, consensus, permissions and transaction families.',
    ...LF_FACTS,
    resources: [
      lfHub,
      doc('LF Decentralized Trust (Hyperledger projects)', 'https://www.lfdecentralizedtrust.org/'),
    ],
  },
  MCSA: {
    summary:
      'Run Linux workloads on Azure: deploy and manage Linux virtual machines, storage and networking in Azure, plus core Linux administration.',
    resources: [
      lfHub,
      doc(
        'Linux virtual machines in Azure',
        'https://learn.microsoft.com/en-us/azure/virtual-machines/linux/overview',
      ),
    ],
  },

  // ── EC-Council ───────────────────────────────────────────────────────────
  CEH: {
    summary:
      'The ethical hacking method end to end: reconnaissance, scanning, system hacking, malware, web and wireless attacks, and how to defend against them.',
    minutes: 240,
    questions: 125,
    passingScore: '60–85 % (varies by exam form)',
    delivery: 'Test centre or online',
    validityYears: 3,
    resources: [
      doc(
        'CEH (official)',
        'https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/',
      ),
      tryHackMe,
      hackTheBox,
    ],
  },
  CHFI: {
    summary:
      'Digital forensics: collect and preserve evidence, analyse disks, memory, networks and logs, and report on an investigation.',
    minutes: 240,
    questions: 150,
    passingScore: '60–78 % (varies by exam form)',
    delivery: 'Test centre or online',
    validityYears: 3,
    resources: [
      doc(
        'CHFI (official)',
        'https://www.eccouncil.org/train-certify/computer-hacking-forensic-investigator-chfi/',
      ),
      doc('Autopsy digital forensics platform', 'https://www.autopsy.com/'),
      tryHackMe,
    ],
  },
  CND: {
    summary:
      'Defend a network: security policies, perimeter and endpoint protection, monitoring, incident response and risk management.',
    minutes: 240,
    questions: 100,
    passingScore: '60–85 % (varies by exam form)',
    delivery: 'Test centre or online',
    validityYears: 3,
    resources: [
      doc(
        'CND (official)',
        'https://www.eccouncil.org/train-certify/certified-network-defender-cnd/',
      ),
      tryHackMe,
      doc('Wireshark documentation', 'https://www.wireshark.org/docs/'),
    ],
  },

  // ── INE Security ─────────────────────────────────────────────────────────
  eWPT: {
    summary:
      'Web application penetration testing, assessed on a real target: mapping, injection, authentication and session flaws, and reporting.',
    delivery: 'Online, hands-on',
    validityYears: 3,
    resources: [ineCert('ewpt', 'eWPT'), owaspWstg, portSwigger],
  },
  eMAPT: {
    summary:
      'Mobile application penetration testing on Android and iOS: static and dynamic analysis, reverse engineering and insecure storage.',
    delivery: 'Online, hands-on',
    validityYears: 3,
    resources: [
      ineCert('emapt', 'eMAPT'),
      doc('OWASP Mobile Application Security Testing Guide', 'https://mas.owasp.org/MASTG/'),
    ],
  },
  eJPT: {
    summary:
      'Entry-level penetration testing in a live lab: assessment methodology, host and network auditing, exploitation and web application basics.',
    minutes: 2880,
    questions: 35,
    passingScore: '70 %',
    delivery: 'Online, hands-on',
    validityYears: 3,
    resources: [ineCert('ejpt', 'eJPT'), tryHackMe, hackTheBox],
  },
  eCPPT: {
    summary:
      'Professional penetration testing in a live network: exploitation, post-exploitation, pivoting, Active Directory and a full written report.',
    delivery: 'Online, hands-on',
    validityYears: 3,
    resources: [ineCert('ecppt', 'eCPPT'), hackTheBox],
  },
  ICCA: {
    summary:
      'Cloud fundamentals across providers: service and deployment models, core compute, storage and networking, identity and cloud security basics.',
    delivery: 'Online',
    resources: [ineHub, awsSkillBuilder],
  },
  eCIR: {
    summary:
      'Incident response, assessed hands-on: detect, investigate and contain attacks using logs, SIEM queries and endpoint and network evidence.',
    delivery: 'Online, hands-on',
    validityYears: 3,
    resources: [ineCert('ecir', 'eCIR'), tryHackMe],
  },
  eSOC: {
    summary:
      'Security operations centre work: alert triage, log analysis, threat detection and the first steps of an investigation.',
    delivery: 'Online, hands-on',
    validityYears: 3,
    resources: [ineHub, tryHackMe],
  },

  // ── Python Institute ─────────────────────────────────────────────────────
  PCEP: {
    summary:
      'Python from scratch: data types, variables, operators, control flow, lists, tuples, dictionaries, functions and exceptions.',
    minutes: 40,
    questions: 30,
    passingScore: '70 %',
    ...PYTHON_FACTS,
    resources: [doc('PCEP (official)', 'https://pythoninstitute.org/pcep'), edube, pythonTutorial],
  },
  PCAP: {
    summary:
      'Intermediate Python: modules and packages, strings, exceptions, object-oriented programming, generators, closures and file processing.',
    minutes: 65,
    questions: 40,
    passingScore: '70 %',
    ...PYTHON_FACTS,
    resources: [doc('PCAP (official)', 'https://pythoninstitute.org/pcap'), edube, pythonTutorial],
  },
  'PCPP-32-1/2': {
    summary:
      'Professional Python in two exams: advanced OOP, coding conventions, GUIs, network and file processing (PCPP1), then design patterns, packaging, testing and IPC (PCPP2).',
    minutes: 65,
    questions: 45,
    passingScore: '70 %',
    ...PYTHON_FACTS,
    resources: [
      doc('PCPP1 (official)', 'https://pythoninstitute.org/pcpp1'),
      doc('PCPP2 (official)', 'https://pythoninstitute.org/pcpp2'),
      pythonLibrary,
    ],
  },
  CEPP: {
    summary:
      "The Python Institute's top level: expert Python design, performance, concurrency and building maintainable systems.",
    resources: [
      doc('Python Institute certifications (official)', 'https://pythoninstitute.org/'),
      pythonLibrary,
    ],
  },

  // ── Huawei ───────────────────────────────────────────────────────────────
  HCNA: {
    summary:
      'Small and medium enterprise networks on Huawei equipment: IP addressing, switching, routing, WLAN basics and network security.',
    minutes: 90,
    questions: 60,
    passingScore: '600 / 1,000',
    delivery: 'Test centre',
    validityYears: 3,
    resources: [huaweiTalent, huaweiDatacom],
  },
  'HCNP-WLAN': {
    summary:
      'Design and run enterprise wireless networks on Huawei equipment: WLAN planning, roaming, security, optimisation and troubleshooting.',
    delivery: 'Test centre',
    validityYears: 3,
    resources: [huaweiTalent],
  },
  HCIE: {
    summary:
      "Huawei's expert level: a written exam, then a hands-on lab and an interview on designing and troubleshooting large networks.",
    delivery: 'Test centre (written) and Huawei lab',
    validityYears: 3,
    resources: [huaweiTalent, huaweiDatacom],
  },
};
