import type { CertificationSeed } from '../schema';

/**
 * The certifications funded by the institute.
 *
 * SAA-C03 matches the Fiche-certification design exactly.
 * DRAFT: needs staff review. For every other certification, level, difficulty, specialties,
 * domains and chapters are drafted from the vendor's public exam outline. Weights are null when
 * the vendor does not publish them (performance-based exams).
 */

type ChapterTuple = readonly [title: string, minutes: number, order?: number];

const d = (
  title: string,
  short: string,
  weight: number | null,
  chapters: ChapterTuple[],
): CertificationSeed['domains'][number] => ({
  title,
  short,
  weight,
  chapters: chapters.map(([t, minutes, order]) =>
    order ? { title: t, minutes, order } : { title: t, minutes },
  ),
});

export const certifications: CertificationSeed[] = [
  // ── Cisco ────────────────────────────────────────────────────────────────
  {
    code: 'CCENT',
    slug: 'ccent',
    name: 'Cisco Certified Entry Networking Technician',
    examCode: '100-105 ICND1',
    provider: 'CISCO',
    level: 'foundational',
    difficulty: 2,
    specialties: ['SSIR', 'CIM'],
    badgeAsset: null,
    domains: [
      d('Network fundamentals', 'Fundamentals', null, [
        ['OSI and TCP/IP models, cabling and topologies', 150],
        ['IPv4 and IPv6 addressing and subnetting', 240],
      ]),
      d('LAN switching', 'Switching', null, [
        ['Switch operation, VLANs and trunking', 180],
        ['Basic switch security and Spanning Tree', 120],
      ]),
      d('Routing', 'Routing', null, [['Static routing and basic OSPF', 180]]),
      d('Infrastructure services and management', 'Services', null, [
        ['DHCP, NAT and access control list basics', 150],
        ['IOS command line, configuration files and device maintenance', 120],
      ]),
    ],
  },
  {
    code: 'CCNA-RS',
    slug: 'ccna-rs',
    name: 'Cisco Certified Network Associate Routing & Switching',
    examCode: '200-125',
    provider: 'CISCO',
    level: 'associate',
    difficulty: 3,
    specialties: ['SSIR', 'CIM', 'AIOT'],
    badgeAsset: 'cisco-ccna.webp',
    domains: [
      d('LAN switching technologies', 'Switching', null, [
        ['VLANs, trunking and EtherChannel', 180],
        ['Spanning Tree and switch security', 180],
      ]),
      d('Routing technologies', 'Routing', null, [
        ['Static routing, RIP and EIGRP', 180],
        ['OSPFv2 and OSPFv3', 180],
        ['First hop redundancy protocols', 90],
      ]),
      d('WAN technologies', 'WAN', null, [['PPP, Frame Relay, eBGP and VPN basics', 150]]),
      d('Infrastructure services', 'Services', null, [
        ['DHCP, DNS, NAT, NTP and SNMP', 150],
        ['Access control lists', 120],
      ]),
      d('Infrastructure maintenance', 'Maintenance', null, [
        ['Device security, monitoring and troubleshooting', 150],
      ]),
    ],
  },
  {
    code: 'CCNA-SEC',
    slug: 'ccna-sec',
    name: 'Cisco Certified Network Associate Security',
    examCode: '210-260 IINS',
    provider: 'CISCO',
    level: 'associate',
    difficulty: 3,
    specialties: ['SSIR'],
    badgeAsset: null,
    domains: [
      d('Security concepts', 'Concepts', null, [
        ['Threats, cryptography and security policy', 150],
      ]),
      d('Secure access', 'Access', null, [
        ['AAA, 802.1X and device management security', 150],
        ['Zone-based firewall and ACLs', 150],
      ]),
      d('VPN', 'VPN', null, [['IPsec and SSL VPN', 150]]),
      d('Secure routing and switching', 'Infrastructure', null, [
        ['Layer 2 and routing protocol security', 150],
      ]),
      d('Cisco firewall and intrusion prevention', 'Firewall', null, [
        ['ASA firewall, IPS and endpoint security', 150],
      ]),
    ],
  },
  {
    code: 'CCNP-SWITCH',
    slug: 'ccnp-switch',
    name: 'Cisco Certified Network Professional Switch',
    examCode: '300-115 SWITCH',
    provider: 'CISCO',
    level: 'professional',
    difficulty: 4,
    specialties: ['SSIR'],
    badgeAsset: 'cisco-ccnp.webp',
    domains: [
      d('Layer 2 infrastructure', 'Layer 2', null, [
        ['Campus design, VLANs and trunking', 150],
        ['Spanning Tree: PVST+, RSTP and MST', 180],
        ['EtherChannel and link aggregation', 120],
      ]),
      d('Layer 3 and high availability', 'High availability', null, [
        ['Inter-VLAN routing and first hop redundancy', 150],
        ['Stacking, StackWise and device redundancy', 90],
      ]),
      d('Infrastructure security and services', 'Security', null, [
        ['Switch security features and QoS basics', 150],
      ]),
    ],
  },
  {
    code: 'CCNP-ROUTE',
    slug: 'ccnp-route',
    name: 'Cisco Certified Network Professional Route',
    examCode: '300-101 ROUTE',
    provider: 'CISCO',
    level: 'professional',
    difficulty: 4,
    specialties: ['SSIR'],
    badgeAsset: 'cisco-ccnp.webp',
    domains: [
      d('Network principles', 'Principles', null, [['Routing design and IPv6 addressing', 150]]),
      d('Layer 3 technologies', 'Layer 3', null, [
        ['EIGRP', 180],
        ['OSPF multi-area', 210],
        ['BGP', 240],
        ['Route redistribution and path control', 180],
      ]),
      d('VPN technologies', 'VPN', null, [['GRE tunnels and basic VPN', 120]]),
      d('Infrastructure security and services', 'Security', null, [
        ['Router security and services', 150],
      ]),
    ],
  },
  {
    code: 'CCNP-RS',
    slug: 'ccnp-rs',
    name: 'Cisco Certified Network Professional Routing & Switching',
    examCode: 'ROUTE + SWITCH + TSHOOT',
    provider: 'CISCO',
    level: 'professional',
    difficulty: 4,
    specialties: ['SSIR'],
    badgeAsset: 'cisco-ccnp.webp',
    domains: [
      d('Routing (ROUTE)', 'Routing', null, [
        ['EIGRP, OSPF and BGP', 360],
        ['Redistribution and path control', 180],
      ]),
      d('Switching (SWITCH)', 'Switching', null, [
        ['Campus Layer 2 and Layer 3 design', 240],
        ['High availability and switch security', 180],
      ]),
      d('Troubleshooting (TSHOOT)', 'Troubleshooting', null, [
        ['Troubleshooting methodology and tools', 150],
        ['Troubleshooting layer 2 and layer 3 faults', 240],
      ]),
    ],
  },
  {
    code: 'CCIE-RS',
    slug: 'ccie-rs',
    name: 'Cisco Certified Internetwork Expert Routing & Switching',
    examCode: 'Written + lab',
    provider: 'CISCO',
    level: 'expert',
    difficulty: 5,
    specialties: ['SSIR'],
    badgeAsset: 'cisco-ccie.webp',
    domains: [
      d('Layer 2 and switching', 'Layer 2', null, [
        ['Advanced switching, STP and Layer 2 security', 300],
      ]),
      d('Layer 3 and routing', 'Layer 3', null, [
        ['Advanced OSPF, EIGRP and BGP design', 360],
        ['MPLS and multicast', 300],
      ]),
      d('VPN and services', 'Services', null, [['DMVPN, QoS and infrastructure services', 240]]),
      d('Troubleshooting', 'Troubleshooting', null, [['Troubleshooting end-to-end networks', 240]]),
    ],
  },

  // ── Amazon Web Services ──────────────────────────────────────────────────
  {
    code: 'CLF-C02',
    slug: 'clf-c02',
    name: 'AWS Certified Cloud Practitioner',
    examCode: null,
    provider: 'AWS',
    level: 'foundational',
    difficulty: 1,
    specialties: 'ALL',
    badgeAsset: 'aws-clf-c02.webp',
    domains: [
      d('Cloud concepts', 'Concepts', 24, [
        ['Benefits of the AWS Cloud', 90],
        ['Well-Architected Framework basics', 90],
        ['Migration strategies and cloud economics', 90],
      ]),
      d('Security and compliance', 'Security', 30, [
        ['Shared responsibility model', 60],
        ['Identity and access management', 120],
        ['Security, governance and compliance services', 120],
      ]),
      d('Cloud technology and services', 'Services', 34, [
        ['Global infrastructure and deployment methods', 90],
        ['Compute services', 120],
        ['Storage and database services', 120],
        ['Networking and content delivery', 90],
        ['AI, analytics and other services', 90],
      ]),
      d('Billing, pricing and support', 'Billing', 12, [
        ['Pricing models and cost management tools', 90],
        ['Support plans and resources', 60],
      ]),
    ],
  },
  {
    code: 'SAA-C03',
    slug: 'saa-c03',
    name: 'AWS Certified Solutions Architect – Associate',
    examCode: null,
    provider: 'AWS',
    level: 'associate',
    difficulty: 3,
    specialties: ['CIM', 'GLOps', 'SSIR'],
    badgeAsset: 'aws-saa-c03.webp',
    // Chapters, durations and domain grouping are taken verbatim from the Fiche-certification design.
    domains: [
      d('Secure architectures', 'Security', 30, [
        ['Identity and access: IAM, Organizations', 180, 1],
        ['Networking: VPC, subnets, routing', 240, 2],
      ]),
      d('Resilient architectures', 'Resilience', 26, [
        ['Decoupling: SQS, SNS, EventBridge', 120, 6],
        ['Serverless: Lambda, API Gateway', 180, 7],
        ['High availability and disaster recovery', 180, 8],
      ]),
      d('High performance', 'Performance', 24, [
        ['Compute: EC2, Auto Scaling, ELB', 240, 3],
        ['Storage: S3, EBS, EFS', 180, 4],
        ['Databases: RDS, Aurora, DynamoDB', 240, 5],
        ['Caching and delivery: ElastiCache, CloudFront', 120, 9],
      ]),
      d('Cost optimisation', 'Cost', 20, [
        ['Monitoring: CloudWatch, CloudTrail', 120, 10],
        ['Cost optimisation', 120, 11],
      ]),
    ],
  },
  {
    code: 'DVA-C02',
    slug: 'dva-c02',
    name: 'AWS Certified Developer – Associate',
    examCode: null,
    provider: 'AWS',
    level: 'associate',
    difficulty: 3,
    specialties: ['GLOps', 'DMWM', 'AIOT'],
    badgeAsset: 'aws-dva-c02.webp',
    domains: [
      d('Development with AWS services', 'Development', 32, [
        ['Building on Lambda and API Gateway', 240],
        ['DynamoDB data modelling and access', 180],
        ['Messaging and events: SQS, SNS, EventBridge, Step Functions', 180],
      ]),
      d('Security', 'Security', 26, [
        ['Authentication with IAM and Cognito', 150],
        ['Encryption and secrets: KMS, Secrets Manager, Parameter Store', 150],
      ]),
      d('Deployment', 'Deployment', 24, [
        ['Packaging with SAM and CloudFormation', 150],
        ['CI/CD with CodePipeline, CodeBuild and CodeDeploy', 180],
      ]),
      d('Troubleshooting and optimisation', 'Troubleshooting', 18, [
        ['Observability with CloudWatch and X-Ray', 120],
        ['Caching and performance tuning', 120],
      ]),
    ],
  },
  {
    code: 'SOA-C03',
    slug: 'soa-c03',
    name: 'AWS Certified CloudOps Engineer – Associate',
    examCode: null,
    provider: 'AWS',
    level: 'associate',
    difficulty: 3,
    specialties: ['CIM', 'GLOps'],
    badgeAsset: null,
    domains: [
      d('Monitoring, logging, analysis and performance', 'Monitoring', 22, [
        ['CloudWatch metrics, logs and alarms', 150],
        ['Performance optimisation of compute and storage', 150],
      ]),
      d('Reliability and business continuity', 'Reliability', 22, [
        ['Scaling and high availability', 150],
        ['Backup, restore and disaster recovery', 150],
      ]),
      d('Deployment, provisioning and automation', 'Automation', 22, [
        ['Infrastructure as code with CloudFormation and CDK', 180],
        ['Systems Manager automation', 120],
      ]),
      d('Security and compliance', 'Security', 16, [
        ['Policies, auditing and data protection', 150],
      ]),
      d('Networking and content delivery', 'Networking', 18, [
        ['VPC connectivity and troubleshooting', 150],
        ['Route 53 and CloudFront', 120],
      ]),
    ],
  },
  {
    code: 'AIF-C01',
    slug: 'aif-c01',
    name: 'AWS Certified AI Practitioner',
    examCode: null,
    provider: 'AWS',
    level: 'foundational',
    difficulty: 2,
    specialties: ['SDIA', 'AIOT'],
    badgeAsset: 'aws-aif-c01.webp',
    domains: [
      d('Fundamentals of AI and ML', 'AI and ML', 20, [
        ['AI, ML and deep learning concepts', 90],
        ['The ML development lifecycle', 90],
      ]),
      d('Fundamentals of generative AI', 'Generative AI', 24, [
        ['Foundation models, tokens and embeddings', 90],
        ['Generative AI on AWS: Bedrock and Q', 90],
      ]),
      d('Applications of foundation models', 'Applications', 28, [
        ['Prompt engineering', 90],
        ['Retrieval-augmented generation and fine-tuning', 120],
        ['Evaluating model performance', 60],
      ]),
      d('Guidelines for responsible AI', 'Responsible AI', 14, [
        ['Bias, fairness and transparency', 60],
      ]),
      d('Security, compliance and governance for AI', 'Governance', 14, [
        ['Securing AI systems and data governance', 60],
      ]),
    ],
  },
  {
    code: 'DOP-C02',
    slug: 'dop-c02',
    name: 'AWS Certified DevOps Engineer – Professional',
    examCode: null,
    provider: 'AWS',
    level: 'professional',
    difficulty: 5,
    specialties: ['GLOps', 'CIM'],
    badgeAsset: null,
    domains: [
      d('SDLC automation', 'SDLC', 22, [
        ['Multi-account CI/CD pipelines', 240],
        ['Deployment strategies: blue/green, canary, rolling', 180],
      ]),
      d('Configuration management and IaC', 'IaC', 17, [
        ['CloudFormation StackSets and CDK at scale', 180],
        ['Configuration with Systems Manager and OpsWorks', 120],
      ]),
      d('Resilient cloud solutions', 'Resilience', 15, [
        ['Multi-AZ and multi-region architectures', 180],
      ]),
      d('Monitoring and logging', 'Monitoring', 15, [['Centralised logging and metrics', 150]]),
      d('Incident and event response', 'Incidents', 14, [['Event-driven remediation', 150]]),
      d('Security and compliance', 'Security', 17, [
        ['Guardrails, Config rules and Security Hub', 150],
      ]),
    ],
  },

  {
    code: 'SAP-C02',
    slug: 'sap-c02',
    name: 'AWS Certified Solutions Architect – Professional',
    examCode: null,
    provider: 'AWS',
    level: 'professional',
    difficulty: 5,
    specialties: ['CIM', 'GLOps', 'SSIR'],
    badgeAsset: 'aws-sap-c02.webp',
    domains: [
      d('Design solutions for organizational complexity', 'Organizations', 26, [
        ['Multi-account strategy: Organizations and Control Tower', 180],
        ['Hybrid connectivity: Direct Connect, VPN and Transit Gateway', 180],
        ['Security controls and cost allocation at scale', 150],
      ]),
      d('Design for new solutions', 'New solutions', 29, [
        ['Deployment strategies and infrastructure as code', 180],
        ['Business continuity and disaster recovery', 180],
        ['Security architecture and data protection', 150],
        ['Reliability, resilience and performance design', 180],
      ]),
      d('Continuous improvement for existing solutions', 'Improvement', 25, [
        ['Operational excellence and monitoring', 150],
        ['Performance and reliability improvements', 150],
        ['Cost optimisation of existing workloads', 120],
      ]),
      d('Accelerate workload migration and modernization', 'Migration', 20, [
        ['Migration strategies: the 7 Rs and migration tools', 180],
        ['Modernisation with containers and serverless', 180],
      ]),
    ],
  },

  // ── Microsoft Azure ──────────────────────────────────────────────────────
  {
    code: 'AZ-900',
    slug: 'az-900',
    name: 'Microsoft Azure Fundamentals',
    examCode: null,
    provider: 'AZURE',
    level: 'foundational',
    difficulty: 1,
    specialties: 'ALL',
    badgeAsset: 'azure-fundamentals.webp',
    domains: [
      d('Cloud concepts', 'Concepts', 28, [
        ['Cloud computing and the shared responsibility model', 60],
        ['Cloud models: public, private, hybrid', 60],
        ['Service types: IaaS, PaaS, SaaS', 60],
      ]),
      d('Azure architecture and services', 'Services', 37, [
        ['Core architecture: regions, zones, resource groups', 90],
        ['Compute and networking services', 120],
        ['Storage services', 90],
        ['Identity, access and security', 90],
      ]),
      d('Azure management and governance', 'Governance', 35, [
        ['Cost management and SLAs', 60],
        ['Governance and compliance: Policy, locks, Purview', 90],
        ['Managing and deploying resources', 60],
        ['Monitoring tools', 60],
      ]),
    ],
  },
  {
    code: 'AI-900',
    slug: 'ai-900',
    name: 'Microsoft Azure AI Fundamentals',
    examCode: null,
    provider: 'AZURE',
    level: 'foundational',
    difficulty: 1,
    specialties: ['SDIA', 'AIOT'],
    badgeAsset: 'azure-fundamentals.webp',
    domains: [
      d('AI workloads and considerations', 'Workloads', 20, [
        ['AI workloads and responsible AI', 60],
      ]),
      d('Fundamental principles of ML on Azure', 'Machine learning', 20, [
        ['Regression, classification and clustering', 90],
        ['Azure Machine Learning', 60],
      ]),
      d('Computer vision workloads', 'Vision', 18, [['Computer vision on Azure', 90]]),
      d('Natural language processing workloads', 'Language', 18, [['NLP on Azure', 90]]),
      d('Generative AI workloads', 'Generative AI', 24, [
        ['Generative AI concepts', 60],
        ['Azure OpenAI and AI Foundry', 90],
      ]),
    ],
  },
  {
    code: 'AZ-104',
    slug: 'az-104',
    name: 'Microsoft Azure Administrator',
    examCode: null,
    provider: 'AZURE',
    level: 'associate',
    difficulty: 3,
    specialties: ['CIM', 'GLOps'],
    badgeAsset: 'azure-associate.webp',
    domains: [
      d('Manage Azure identities and governance', 'Identity', 25, [
        ['Microsoft Entra users and groups', 120],
        ['RBAC, Azure Policy and subscriptions', 150],
      ]),
      d('Implement and manage storage', 'Storage', 20, [
        ['Storage accounts, access and redundancy', 150],
        ['Blob and Azure Files', 120],
      ]),
      d('Deploy and manage compute resources', 'Compute', 25, [
        ['ARM and Bicep templates', 120],
        ['Virtual machines and scale sets', 150],
        ['Containers and App Service', 120],
      ]),
      d('Implement and manage virtual networking', 'Networking', 18, [
        ['Virtual networks, peering and NSGs', 150],
        ['Load balancing and name resolution', 120],
      ]),
      d('Monitor and maintain Azure resources', 'Monitoring', 12, [
        ['Azure Monitor and backup', 120],
      ]),
    ],
  },
  {
    code: 'AZ-204',
    slug: 'az-204',
    name: 'Microsoft Azure Developer Associate',
    examCode: null,
    provider: 'AZURE',
    level: 'associate',
    difficulty: 3,
    specialties: ['GLOps', 'DMWM', 'AIOT'],
    badgeAsset: 'azure-associate.webp',
    domains: [
      d('Develop Azure compute solutions', 'Compute', 30, [
        ['Containerised solutions', 150],
        ['App Service web apps', 150],
        ['Azure Functions', 150],
      ]),
      d('Develop for Azure storage', 'Storage', 18, [
        ['Cosmos DB', 150],
        ['Blob storage', 90],
      ]),
      d('Implement Azure security', 'Security', 20, [
        ['Authentication with the Microsoft identity platform', 150],
        ['Key Vault and managed identities', 90],
      ]),
      d('Monitor, troubleshoot and optimise', 'Monitoring', 10, [
        ['Application Insights and caching', 90],
      ]),
      d('Connect to and consume Azure services', 'Integration', 22, [
        ['API Management', 90],
        ['Event-based and message-based solutions', 150],
      ]),
    ],
  },
  {
    code: 'AZ-500',
    slug: 'az-500',
    name: 'Microsoft Azure Security Engineer Associate',
    examCode: null,
    provider: 'AZURE',
    level: 'associate',
    difficulty: 4,
    specialties: ['SSIR'],
    badgeAsset: 'azure-associate.webp',
    domains: [
      d('Secure identity and access', 'Identity', 20, [
        ['Entra ID, PIM and conditional access', 180],
      ]),
      d('Secure networking', 'Networking', 25, [
        ['Network security groups, firewall and private endpoints', 180],
      ]),
      d('Secure compute, storage and databases', 'Workloads', 25, [
        ['Securing VMs, containers and App Service', 150],
        ['Securing storage and SQL', 150],
      ]),
      d('Manage security operations', 'Operations', 30, [
        ['Defender for Cloud', 150],
        ['Microsoft Sentinel', 150],
      ]),
    ],
  },
  {
    code: 'AZ-400',
    slug: 'az-400',
    name: 'Microsoft DevOps Engineer Expert',
    examCode: null,
    provider: 'AZURE',
    level: 'expert',
    difficulty: 4,
    specialties: ['GLOps'],
    badgeAsset: 'azure-expert.webp',
    domains: [
      d('Configure processes and communications', 'Processes', 11, [
        ['Work tracking and collaboration', 90],
      ]),
      d('Design and implement source control', 'Source control', 15, [
        ['Branching strategies and repository management', 120],
      ]),
      d('Design and implement build and release pipelines', 'Pipelines', 50, [
        ['Pipeline design with Azure Pipelines and GitHub Actions', 240],
        ['Package management and testing strategy', 150],
        ['Deployment strategies and infrastructure as code', 240],
        ['Pipeline maintenance and optimisation', 120],
      ]),
      d('Develop a security and compliance plan', 'Security', 14, [
        ['Secrets, scanning and compliance', 150],
      ]),
      d('Implement an instrumentation strategy', 'Instrumentation', 10, [
        ['Monitoring for DevOps', 90],
      ]),
    ],
  },

  // ── Oracle ───────────────────────────────────────────────────────────────
  // Two Oracle certs each share the short code "OCA"/"OCP" on the Landing screen, so codes are suffixed.
  {
    code: 'OCA-JAVA',
    slug: 'oca-java',
    name: 'Oracle Certified Associate, Java SE 8 Programmer',
    examCode: '1Z0-808',
    provider: 'ORACLE',
    level: 'associate',
    difficulty: 2,
    specialties: ['GLOps', 'DMWM'],
    badgeAsset: null,
    domains: [
      d('Java basics and data types', 'Basics', null, [
        ['Java basics: classes, main, packages', 90],
        ['Working with Java data types', 120],
        ['Operators and decision constructs', 120],
      ]),
      d('Arrays, loops and methods', 'Structures', null, [
        ['Arrays and loop constructs', 120],
        ['Methods and encapsulation', 150],
      ]),
      d('Object-oriented Java', 'OOP', null, [
        ['Inheritance and polymorphism', 150],
        ['Handling exceptions', 120],
        ['Selected classes from the Java API', 120],
      ]),
    ],
  },
  {
    code: 'OCP-JAVA',
    slug: 'ocp-java',
    name: 'Oracle Certified Professional, Java SE 8 Programmer',
    examCode: '1Z0-809',
    provider: 'ORACLE',
    level: 'professional',
    difficulty: 4,
    specialties: ['GLOps', 'DMWM'],
    badgeAsset: null,
    domains: [
      d('Class design', 'Design', null, [
        ['Java class design', 120],
        ['Advanced class design', 150],
        ['Generics and collections', 180],
      ]),
      d('Functional programming', 'Functional', null, [
        ['Lambda built-in functional interfaces', 150],
        ['Java Stream API', 180],
      ]),
      d('Platform APIs', 'APIs', null, [
        ['Exceptions and assertions', 90],
        ['Date/Time API', 90],
        ['Java I/O and NIO.2', 180],
        ['Concurrency', 180],
        ['JDBC and localisation', 150],
      ]),
    ],
  },
  {
    code: 'OCA-DB',
    slug: 'oca-db',
    name: 'Oracle Certified Associate, Database SQL',
    examCode: '1Z0-071',
    provider: 'ORACLE',
    level: 'associate',
    difficulty: 2,
    specialties: ['SDIA', 'GLOps'],
    badgeAsset: null,
    domains: [
      d('Querying data', 'Queries', null, [
        ['Relational concepts and SELECT', 90],
        ['Restricting and sorting data', 90],
        ['Single-row functions and conversions', 120],
        ['Aggregation and grouping', 120],
      ]),
      d('Combining data', 'Joins', null, [
        ['Joins', 150],
        ['Subqueries and set operators', 150],
      ]),
      d('Managing data and schema', 'Schema', null, [
        ['DML and transactions', 120],
        ['DDL, constraints and schema objects', 150],
        ['Data dictionary views and privileges', 90],
      ]),
    ],
  },
  {
    code: 'OCP-DB',
    slug: 'ocp-db',
    name: 'Oracle Certified Professional, Database SQL',
    examCode: null,
    provider: 'ORACLE',
    level: 'professional',
    difficulty: 4,
    specialties: ['SDIA', 'CIM'],
    badgeAsset: null,
    domains: [
      d('Database architecture', 'Architecture', null, [
        ['Instance and memory architecture', 150],
        ['Storage structures and tablespaces', 150],
      ]),
      d('Administration', 'Administration', null, [
        ['Users, roles and security', 120],
        ['Multitenant containers and PDBs', 150],
      ]),
      d('Operations', 'Operations', null, [
        ['Backup and recovery with RMAN', 180],
        ['Performance tuning and SQL plans', 180],
      ]),
    ],
  },

  // ── Red Hat ──────────────────────────────────────────────────────────────
  {
    code: 'RHCSA',
    slug: 'rhcsa',
    name: 'Red Hat Certified System Administrator',
    examCode: 'EX200',
    provider: 'REDHAT',
    level: 'associate',
    difficulty: 4,
    specialties: ['CIM', 'GLOps', 'SSIR'],
    badgeAsset: null,
    domains: [
      d('Essential tools and scripting', 'Tools', null, [
        ['Essential command-line tools', 150],
        ['Simple shell scripts', 120],
      ]),
      d('Running systems and storage', 'Systems', null, [
        ['Operating running systems: boot, processes, logs', 150],
        ['Local storage: partitions and LVM', 150],
        ['File systems and network file systems', 120],
      ]),
      d('Deployment and maintenance', 'Maintenance', null, [
        ['Software, services and scheduled tasks', 120],
        ['Basic networking', 120],
      ]),
      d('Users and security', 'Security', null, [
        ['Users and groups', 90],
        ['Firewall, SELinux and SSH keys', 150],
      ]),
    ],
  },
  {
    code: 'RHCSA-OS',
    slug: 'rhcsa-openstack',
    name: 'Red Hat Certified System Administrator in Red Hat OpenStack',
    examCode: 'EX210',
    provider: 'REDHAT',
    level: 'associate',
    difficulty: 4,
    specialties: ['CIM'],
    badgeAsset: null,
    domains: [
      d('OpenStack users and projects', 'Projects', null, [
        ['Keystone: users, roles, projects and quotas', 120],
      ]),
      d('Compute and images', 'Compute', null, [
        ['Nova instances, flavors and key pairs', 150],
        ['Glance images', 90],
      ]),
      d('Networking and storage', 'Network and storage', null, [
        ['Neutron networks, routers and security groups', 180],
        ['Cinder volumes and Swift object storage', 150],
      ]),
      d('Orchestration', 'Orchestration', null, [['Heat templates and stacks', 120]]),
    ],
  },
  {
    code: 'RHCE',
    slug: 'rhce',
    name: 'Red Hat Certified Engineer',
    examCode: 'EX294',
    provider: 'REDHAT',
    level: 'professional',
    difficulty: 5,
    specialties: ['GLOps', 'CIM'],
    badgeAsset: null,
    domains: [
      d('Ansible foundations', 'Foundations', null, [
        ['Core components of Ansible', 120],
        ['Control node and managed nodes', 120],
      ]),
      d('Playbooks', 'Playbooks', null, [
        ['Plays, playbooks and automation content navigator', 180],
        ['Variables, facts, loops and conditionals', 180],
        ['Templates and Ansible Vault', 120],
      ]),
      d('Reuse and automation', 'Reuse', null, [
        ['Roles and content collections', 150],
        ['Automating standard RHCSA tasks', 240],
      ]),
    ],
  },
  {
    code: 'RHCE-OS',
    slug: 'rhce-openstack',
    name: 'Red Hat Certified Engineer in Red Hat OpenStack',
    examCode: 'EX310',
    provider: 'REDHAT',
    level: 'professional',
    difficulty: 5,
    specialties: ['CIM'],
    badgeAsset: null,
    domains: [
      d('Deploying OpenStack', 'Deployment', null, [
        ['Overcloud deployment with director', 240],
        ['Scaling and updating the overcloud', 150],
      ]),
      d('Operating OpenStack services', 'Operations', null, [
        ['Managing compute, networking and storage services', 240],
        ['High availability, Ceph and monitoring', 180],
      ]),
      d('Troubleshooting', 'Troubleshooting', null, [
        ['Diagnosing OpenStack service failures', 150],
      ]),
    ],
  },
  {
    code: 'RHCA',
    slug: 'rhca',
    name: 'Red Hat Certified Architect',
    examCode: 'RHCE + 5 specialist exams',
    provider: 'REDHAT',
    level: 'expert',
    difficulty: 5,
    specialties: ['CIM', 'GLOps'],
    badgeAsset: null,
    domains: [
      d('Prerequisite engineer track', 'Engineer', null, [
        ['RHCE competencies: Linux administration and automation', 240],
      ]),
      d('Specialist exams', 'Specialists', null, [
        ['Choosing the five specialist exams: OpenShift, Ansible, Satellite, Ceph, Identity', 150],
        ['Preparing the specialist exams', 300],
      ]),
      d('Architecture practice', 'Architecture', null, [
        ['Designing and integrating enterprise Red Hat platforms', 240],
      ]),
    ],
  },
  {
    code: 'RHCJA',
    slug: 'rhcja',
    name: 'Red Hat Certified JBoss Administrator',
    examCode: 'EX248',
    provider: 'REDHAT',
    level: 'associate',
    difficulty: 4,
    specialties: ['GLOps'],
    badgeAsset: null,
    domains: [
      d('Installing and configuring JBoss EAP', 'Installation', null, [
        ['Installing and configuring JBoss EAP', 150],
        ['Standalone and domain operating modes', 150],
      ]),
      d('Deploying and securing applications', 'Applications', null, [
        ['Deploying applications and data sources', 150],
        ['Securing the server and applications', 150],
      ]),
      d('Operating a cluster', 'Operations', null, [
        ['Clustering and load balancing', 150],
        ['Monitoring and troubleshooting', 120],
      ]),
    ],
  },
  {
    code: 'RHCS-ANS',
    slug: 'rhcs-ansible',
    name: 'Red Hat Certified Specialist in Ansible Automation',
    examCode: 'EX407',
    provider: 'REDHAT',
    level: 'associate',
    difficulty: 4,
    specialties: ['GLOps', 'CIM'],
    badgeAsset: null,
    domains: [
      d('Ansible basics', 'Basics', null, [
        ['Installing Ansible, inventories and ad hoc commands', 150],
      ]),
      d('Playbooks and modules', 'Playbooks', null, [
        ['Writing playbooks and using core modules', 180],
        ['Variables, facts, templates and handlers', 180],
      ]),
      d('Roles and operations', 'Roles', null, [
        ['Roles, Galaxy and Ansible Vault', 150],
        ['Troubleshooting playbooks and managing Tower', 120],
      ]),
    ],
  },

  // ── The Linux Foundation ─────────────────────────────────────────────────
  {
    code: 'LFCS',
    slug: 'lfcs',
    name: 'Linux Foundation Certified System Administrator',
    examCode: null,
    provider: 'LF',
    level: 'associate',
    difficulty: 3,
    specialties: ['CIM', 'GLOps', 'SSIR'],
    badgeAsset: null,
    domains: [
      d('Operations deployment', 'Operations', 25, [
        ['Kernel, boot and services', 150],
        ['Packages, processes and containers', 150],
      ]),
      d('Networking', 'Networking', 25, [
        ['Interfaces, routing and name resolution', 150],
        ['Firewalls and network services', 120],
      ]),
      d('Storage', 'Storage', 20, [['Partitions, LVM and file systems', 150]]),
      d('Essential commands', 'Commands', 20, [['Files, text processing and archives', 150]]),
      d('Users and groups', 'Users', 10, [['Users, groups and PAM', 90]]),
    ],
  },
  {
    code: 'LFCE',
    slug: 'lfce',
    name: 'Linux Foundation Certified Engineer',
    examCode: null,
    provider: 'LF',
    level: 'professional',
    difficulty: 4,
    specialties: ['CIM', 'SSIR'],
    badgeAsset: null,
    domains: [
      d('Network administration', 'Network', null, [
        ['Advanced routing and network configuration', 180],
        ['DNS and DHCP services', 150],
      ]),
      d('Network services', 'Services', null, [
        ['HTTP services and proxies', 150],
        ['Email services', 120],
        ['Network file systems and file services', 120],
      ]),
      d('Security and remote access', 'Security', null, [
        ['Packet filtering and network security', 150],
        ['Remote access and SSH hardening', 90],
      ]),
    ],
  },
  {
    code: 'CKA',
    slug: 'cka',
    name: 'Certified Kubernetes Administrator',
    examCode: null,
    provider: 'LF',
    level: 'professional',
    difficulty: 4,
    specialties: ['CIM', 'GLOps'],
    badgeAsset: 'lf-cka.webp',
    domains: [
      d('Storage', 'Storage', 10, [['Volumes, PersistentVolumes and StorageClasses', 120]]),
      d('Troubleshooting', 'Troubleshooting', 30, [
        ['Troubleshooting clusters and nodes', 180],
        ['Troubleshooting workloads and networking', 180],
      ]),
      d('Workloads and scheduling', 'Workloads', 15, [
        ['Deployments, ConfigMaps and Secrets', 150],
        ['Scheduling, resources and autoscaling', 120],
      ]),
      d('Cluster architecture, installation and configuration', 'Cluster', 25, [
        ['Installing clusters with kubeadm', 180],
        ['RBAC, upgrades and etcd backup', 180],
      ]),
      d('Services and networking', 'Networking', 20, [
        ['Services, Ingress and Gateway API', 150],
        ['Network policies and CoreDNS', 120],
      ]),
    ],
  },
  {
    code: 'CKAD',
    slug: 'ckad',
    name: 'Certified Kubernetes Application Developer',
    examCode: null,
    provider: 'LF',
    level: 'associate',
    difficulty: 4,
    specialties: ['GLOps', 'DMWM'],
    badgeAsset: 'lf-ckad.png',
    domains: [
      d('Application design and build', 'Design', 20, [
        ['Container images and multi-container pods', 150],
        ['Jobs, CronJobs and volumes', 120],
      ]),
      d('Application deployment', 'Deployment', 20, [
        ['Deployments, rolling updates and Helm', 150],
      ]),
      d('Application observability and maintenance', 'Observability', 15, [
        ['Probes, logs and debugging', 120],
      ]),
      d('Application environment, configuration and security', 'Configuration', 25, [
        ['ConfigMaps, Secrets and ServiceAccounts', 150],
        ['Resource limits and security contexts', 120],
      ]),
      d('Services and networking', 'Networking', 20, [
        ['Services, Ingress and network policies', 150],
      ]),
    ],
  },
  {
    code: 'CFCD',
    slug: 'cfcd',
    name: 'Cloud Foundry Certified Developer',
    examCode: null,
    provider: 'LF',
    level: 'associate',
    difficulty: 3,
    specialties: ['GLOps', 'DMWM'],
    badgeAsset: null,
    domains: [
      d('Cloud Foundry basics', 'Basics', null, [
        ['Platform architecture, orgs and spaces', 90],
        ['Pushing applications and manifests', 120],
      ]),
      d('Application lifecycle', 'Lifecycle', null, [
        ['Services and bindings', 120],
        ['Scaling, logging and health checks', 120],
        ['Zero-downtime deployments and troubleshooting', 120],
      ]),
    ],
  },
  {
    code: 'COA',
    slug: 'coa',
    name: 'Certified OpenStack Administrator',
    examCode: null,
    provider: 'LF',
    level: 'associate',
    difficulty: 4,
    specialties: ['CIM'],
    badgeAsset: null,
    domains: [
      d('Core services', 'Core', null, [
        ['Identity with Keystone', 120],
        ['Compute with Nova', 150],
        ['Images with Glance', 90],
      ]),
      d('Networking and storage', 'Infrastructure', null, [
        ['Networking with Neutron', 180],
        ['Block storage with Cinder', 120],
        ['Object storage with Swift', 120],
      ]),
      d('Orchestration and operations', 'Operations', null, [
        ['Orchestration with Heat', 120],
        ['Troubleshooting OpenStack', 120],
      ]),
    ],
  },
  {
    code: 'CHSA',
    slug: 'chsa',
    name: 'Certified Hyperledger Sawtooth Administrator',
    examCode: null,
    provider: 'LF',
    level: 'associate',
    difficulty: 3,
    specialties: ['SSIR', 'GLOps'],
    badgeAsset: null,
    domains: [
      d('Sawtooth fundamentals', 'Fundamentals', null, [
        ['Blockchain and Sawtooth architecture', 120],
        ['Installing and configuring a network', 150],
      ]),
      d('Operating a network', 'Operations', null, [
        ['Consensus and on-chain settings', 120],
        ['Transaction families', 120],
        ['Permissioning, security and troubleshooting', 150],
      ]),
    ],
  },
  {
    code: 'MCSA',
    slug: 'mcsa',
    name: 'MCSA: Linux on Azure',
    examCode: null,
    provider: 'LF',
    level: 'associate',
    difficulty: 3,
    specialties: ['CIM'],
    badgeAsset: null,
    domains: [
      d('Linux administration', 'Linux', null, [
        ['Linux system administration essentials', 180],
        ['Storage, networking and services on Linux', 150],
      ]),
      d('Linux workloads on Azure', 'Azure', null, [
        ['Deploying Linux virtual machines', 150],
        ['Azure storage and networking for Linux', 150],
        ['Identity, monitoring and automation', 150],
      ]),
    ],
  },

  // ── EC-Council ───────────────────────────────────────────────────────────
  {
    code: 'CEH',
    slug: 'ceh',
    name: 'Certified Ethical Hacker',
    examCode: '312-50',
    provider: 'ECCOUNCIL',
    level: 'associate',
    difficulty: 3,
    specialties: ['SSIR'],
    badgeAsset: null,
    domains: [
      d('Information security and ethical hacking overview', 'Overview', 6, [
        ['Ethical hacking concepts and laws', 60],
      ]),
      d('Reconnaissance techniques', 'Recon', 21, [
        ['Footprinting and reconnaissance', 120],
        ['Scanning and enumeration', 150],
        ['Vulnerability analysis', 120],
      ]),
      d('System hacking phases and attack techniques', 'System hacking', 17, [
        ['System hacking and privilege escalation', 150],
        ['Malware threats', 120],
      ]),
      d('Network and perimeter hacking', 'Network', 14, [
        ['Sniffing, social engineering and DoS', 150],
        ['Evading IDS, firewalls and honeypots', 120],
      ]),
      d('Web application hacking', 'Web', 16, [
        ['Web server and web application attacks', 150],
        ['SQL injection', 120],
      ]),
      d('Wireless network hacking', 'Wireless', 6, [['Wireless attacks', 90]]),
      d('Mobile, IoT and OT hacking', 'Mobile & IoT', 8, [['Mobile, IoT and OT attacks', 120]]),
      d('Cloud computing', 'Cloud', 6, [['Cloud computing threats', 90]]),
      d('Cryptography', 'Crypto', 6, [['Cryptography and cryptanalysis', 90]]),
    ],
  },
  {
    code: 'CHFI',
    slug: 'chfi',
    name: 'Computer Hacking Forensic Investigator',
    examCode: '312-49',
    provider: 'ECCOUNCIL',
    level: 'professional',
    difficulty: 4,
    specialties: ['SSIR'],
    badgeAsset: null,
    domains: [
      d('Forensics fundamentals', 'Fundamentals', null, [
        ['The investigation process', 90],
        ['Hard disks and file systems', 150],
        ['Data acquisition and anti-forensics', 150],
      ]),
      d('System forensics', 'Systems', null, [
        ['Windows, Linux and macOS forensics', 180],
        ['Malware forensics', 150],
      ]),
      d('Network, web and cloud forensics', 'Network', null, [
        ['Network and web attack investigation', 150],
        ['Email, dark web and cloud forensics', 150],
        ['Mobile and IoT forensics', 120],
      ]),
    ],
  },
  {
    code: 'CND',
    slug: 'cnd',
    name: 'Certified Network Defender',
    examCode: '312-38',
    provider: 'ECCOUNCIL',
    level: 'associate',
    difficulty: 3,
    specialties: ['SSIR'],
    badgeAsset: null,
    domains: [
      d('Protect', 'Protect', null, [
        ['Network attacks and defence strategies', 90],
        ['Administrative and technical network security', 150],
        ['Perimeter and endpoint security', 150],
        ['Cloud, virtual and wireless network security', 150],
      ]),
      d('Detect', 'Detect', null, [['Traffic and log monitoring', 150]]),
      d('Respond and predict', 'Respond', null, [
        ['Incident response and forensic investigation', 120],
        ['Business continuity and risk management', 120],
      ]),
    ],
  },

  // ── INE Security ─────────────────────────────────────────────────────────
  {
    code: 'eWPT',
    slug: 'ewpt',
    name: 'INE Security Web Application Penetration Tester',
    examCode: null,
    provider: 'INE',
    level: 'associate',
    difficulty: 3,
    specialties: ['SSIR', 'DMWM'],
    badgeAsset: 'ine-ewpt.svg',
    domains: [
      d('Methodology and reconnaissance', 'Recon', null, [
        ['Web pentest methodology', 90],
        ['Information gathering and mapping', 120],
      ]),
      d('Attacks', 'Attacks', null, [
        ['Authentication and session attacks', 150],
        ['Injection attacks', 180],
        ['XSS and client-side attacks', 150],
        ['File and server-side attacks', 150],
      ]),
      d('Reporting', 'Reporting', null, [['Writing a penetration test report', 90]]),
    ],
  },
  {
    code: 'eMAPT',
    slug: 'emapt',
    name: 'INE Security Mobile Application Penetration Tester',
    examCode: null,
    provider: 'INE',
    level: 'professional',
    difficulty: 4,
    specialties: ['SSIR', 'DMWM'],
    badgeAsset: null,
    domains: [
      d('Mobile platforms', 'Platforms', null, [['Android and iOS architecture', 120]]),
      d('Analysis', 'Analysis', null, [
        ['Static analysis and reverse engineering', 180],
        ['Dynamic analysis and instrumentation', 180],
        ['Intercepting network traffic', 120],
      ]),
      d('Exploitation and reporting', 'Exploitation', null, [
        ['Insecure storage and IPC attacks', 150],
        ['Reporting mobile findings', 90],
      ]),
    ],
  },
  {
    code: 'eJPT',
    slug: 'ejpt',
    name: 'eLearnSecurity Junior Penetration Tester',
    examCode: null,
    provider: 'INE',
    level: 'foundational',
    difficulty: 2,
    specialties: ['SSIR'],
    badgeAsset: 'ine-ejpt.svg',
    domains: [
      d('Assessment methodologies', 'Methodology', null, [
        ['Information gathering and footprinting', 120],
        ['Scanning and enumeration', 150],
      ]),
      d('Host and network auditing', 'Auditing', null, [
        ['Exploitation basics and post-exploitation', 180],
        ['Network attacks and pivoting', 150],
      ]),
      d('Web application basics', 'Web', null, [['Common web vulnerabilities', 150]]),
    ],
  },
  {
    code: 'eCPPT',
    slug: 'ecppt',
    name: 'INE Security Certified Professional Penetration Tester',
    examCode: null,
    provider: 'INE',
    level: 'professional',
    difficulty: 4,
    specialties: ['SSIR'],
    badgeAsset: 'ine-ecppt.svg',
    domains: [
      d('Reconnaissance and exploitation', 'Exploitation', null, [
        ['Methodology and reconnaissance', 120],
        ['Network and system exploitation', 180],
      ]),
      d('Post-exploitation', 'Post-exploitation', null, [
        ['Windows and Linux privilege escalation', 180],
        ['Lateral movement and pivoting', 150],
        ['Active Directory attacks', 180],
      ]),
      d('Web attacks and reporting', 'Web', null, [
        ['Web application attacks', 150],
        ['Reporting', 90],
      ]),
    ],
  },
  {
    code: 'ICCA',
    slug: 'icca',
    name: 'INE Certified Cloud Associate',
    examCode: null,
    provider: 'INE',
    level: 'foundational',
    difficulty: 2,
    specialties: ['CIM', 'SSIR', 'GLOps'],
    badgeAsset: null,
    domains: [
      d('Cloud concepts', 'Concepts', null, [
        ['Cloud computing concepts', 90],
        ['Service and deployment models', 90],
      ]),
      d('Cloud operations', 'Operations', null, [
        ['Cloud security basics', 90],
        ['Management, cost and governance', 90],
        ['Migrating to the cloud', 90],
      ]),
    ],
  },
  {
    code: 'eCIR',
    slug: 'ecir',
    name: 'INE Security Certified Incident Responder',
    examCode: null,
    provider: 'INE',
    level: 'professional',
    difficulty: 4,
    specialties: ['SSIR'],
    badgeAsset: null,
    domains: [
      d('Incident handling', 'Handling', null, [['The incident handling process', 90]]),
      d('Detection and analysis', 'Analysis', null, [
        ['Log analysis and SIEM', 180],
        ['Network traffic analysis', 150],
        ['Endpoint and memory analysis', 180],
      ]),
      d('Hunting and reporting', 'Hunting', null, [
        ['Threat hunting and malware triage', 150],
        ['Incident reporting', 90],
      ]),
    ],
  },
  {
    code: 'eSOC',
    slug: 'esoc',
    name: 'INE Security Operations',
    examCode: null,
    provider: 'INE',
    level: 'associate',
    difficulty: 3,
    specialties: ['SSIR'],
    badgeAsset: 'ine-esoc.svg',
    domains: [
      d('SOC foundations', 'Foundations', null, [
        ['SOC roles and operations', 90],
        ['Log sources and SIEM', 150],
      ]),
      d('Monitoring and triage', 'Triage', null, [
        ['Alert triage', 120],
        ['Network and endpoint monitoring', 150],
        ['Threat intelligence', 90],
        ['Escalation and reporting', 90],
      ]),
    ],
  },

  // ── Python Institute ─────────────────────────────────────────────────────
  {
    code: 'PCEP',
    slug: 'pcep',
    name: 'Certified Entry-Level Python Programmer',
    examCode: 'PCEP-30-02',
    provider: 'PYTHON',
    level: 'foundational',
    difficulty: 1,
    specialties: 'ALL',
    badgeAsset: 'pi-pcep.png',
    domains: [
      d('Computer programming and Python fundamentals', 'Fundamentals', 18, [
        ['Python basics: literals, variables, operators', 90],
        ['Input and output', 60],
      ]),
      d('Control flow', 'Control flow', 29, [
        ['Conditional statements', 90],
        ['Loops', 90],
      ]),
      d('Data collections', 'Collections', 25, [
        ['Lists and tuples', 90],
        ['Dictionaries and strings', 90],
      ]),
      d('Functions and exceptions', 'Functions', 28, [
        ['Functions and scope', 90],
        ['Exceptions', 60],
      ]),
    ],
  },
  {
    code: 'PCAP',
    slug: 'pcap',
    name: 'Certified Associate in Python Programming',
    examCode: 'PCAP-31-03',
    provider: 'PYTHON',
    level: 'associate',
    difficulty: 2,
    specialties: ['SDIA', 'GLOps', 'AIOT', 'DMWM'],
    badgeAsset: 'pi-pcap.png',
    domains: [
      d('Modules and packages', 'Modules', 12, [['Modules, packages and pip', 90]]),
      d('Exceptions', 'Exceptions', 14, [['Exception hierarchy and custom exceptions', 90]]),
      d('Strings', 'Strings', 18, [['String methods and encoding', 90]]),
      d('Object-oriented programming', 'OOP', 34, [
        ['Classes, objects and attributes', 120],
        ['Inheritance and polymorphism', 120],
      ]),
      d('Miscellaneous', 'Misc', 22, [
        ['Comprehensions, lambdas and closures', 90],
        ['Generators and file processing', 90],
      ]),
    ],
  },
  {
    code: 'PCPP-32-1/2',
    slug: 'pcpp-32-1-2',
    name: 'Certified Professional in Python Programming 1/2',
    examCode: 'PCPP-32-1xx / PCPP-32-2xx',
    provider: 'PYTHON',
    level: 'professional',
    difficulty: 4,
    specialties: ['SDIA', 'GLOps'],
    badgeAsset: 'pi-pcpp.png',
    domains: [
      d('PCPP1: advanced Python', 'PCPP1', null, [
        ['Advanced OOP and metaclasses', 180],
        ['Coding conventions: PEP 8 and PEP 257', 60],
        ['GUI programming', 150],
        ['Network programming and REST', 150],
        ['File processing and the environment', 120],
      ]),
      d('PCPP2: professional practice', 'PCPP2', null, [
        ['Creating and distributing packages', 120],
        ['Design patterns', 150],
        ['Interprocess communication', 150],
        ['Testing principles and techniques', 150],
      ]),
    ],
  },
  {
    code: 'CEPP',
    slug: 'cepp',
    name: 'Certified Expert in Python Programming',
    examCode: null,
    provider: 'PYTHON',
    level: 'expert',
    difficulty: 5,
    specialties: ['SDIA', 'GLOps'],
    badgeAsset: null,
    domains: [
      d('Expert language features', 'Language', null, [
        ['Metaprogramming and descriptors', 180],
        ['Concurrency and parallelism', 180],
      ]),
      d('Engineering at scale', 'Engineering', null, [
        ['Performance profiling and optimisation', 150],
        ['Testing and packaging at scale', 150],
        ['Advanced data processing', 150],
      ]),
    ],
  },

  // ── Huawei ───────────────────────────────────────────────────────────────
  {
    code: 'HCNA',
    slug: 'hcna',
    name: 'Huawei Certified Network Associate',
    examCode: 'HCNA Routing & Switching',
    provider: 'HUAWEI',
    level: 'associate',
    difficulty: 3,
    specialties: ['SSIR', 'CIM'],
    badgeAsset: null,
    domains: [
      d('Network fundamentals', 'Fundamentals', null, [
        ['TCP/IP, addressing and VRP basics', 180],
        ['Ethernet, VLAN and Spanning Tree', 180],
      ]),
      d('Routing', 'Routing', null, [['Static routing, OSPF and RIP', 180]]),
      d('Network services', 'Services', null, [
        ['ACL, AAA, NAT and DHCP', 150],
        ['WAN technologies and network management', 120],
      ]),
    ],
  },
  {
    code: 'HCNP-WLAN',
    slug: 'hcnp-wlan',
    name: 'Huawei Certified Network Professional – WLAN',
    examCode: 'HCNP WLAN',
    provider: 'HUAWEI',
    level: 'professional',
    difficulty: 4,
    specialties: ['SSIR'],
    badgeAsset: null,
    domains: [
      d('WLAN principles', 'Principles', null, [
        ['802.11 standards, radio and antenna basics', 180],
        ['WLAN architecture: AC and AP', 150],
      ]),
      d('WLAN deployment', 'Deployment', null, [
        ['AP provisioning and roaming', 180],
        ['WLAN planning and site survey', 150],
      ]),
      d('WLAN security and operations', 'Operations', null, [
        ['WLAN security, QoS and troubleshooting', 180],
      ]),
    ],
  },
  {
    code: 'HCIE',
    slug: 'hcie',
    name: 'Huawei Certified Internet Expert',
    examCode: 'Written + lab',
    provider: 'HUAWEI',
    level: 'expert',
    difficulty: 5,
    specialties: ['SSIR'],
    badgeAsset: null,
    domains: [
      d('Advanced routing and switching', 'Routing and switching', null, [
        ['Advanced OSPF, IS-IS and BGP', 360],
        ['MPLS, VPN and multicast', 300],
      ]),
      d('Network security and services', 'Security', null, [
        ['Network security, QoS and IPv6 transition', 240],
      ]),
      d('Design and troubleshooting', 'Design', null, [
        ['Large network design and fault diagnosis', 300],
      ]),
    ],
  },
];
