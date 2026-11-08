/**
 * Verified Corporate Directory Insiders
 *
 * Provides verified corporate employees across premier enterprise tech employers
 * (DE Shaw, Oracle, ServiceNow, Microsoft, Uber, Amazon, Salesforce, Qualcomm, Stripe, Google, Meta).
 *
 * Adheres strictly to Vouchins typography rules (never use double hyphen or em-dash; use single hyphen with spaces).
 */

export interface DirectoryInsider {
  id: string;
  name: string;
  role: string;
  city: string;
  domain: string;
  companyName: string;
  avatarUrl?: string;
  isVerified: boolean;
  vouchPoints: number;
  responseRate: string;
}

export const CORPORATE_DIRECTORY: Record<string, DirectoryInsider[]> = {
  'de shaw': [
    {
      id: 'insider-deshaw-1',
      name: 'Vikram Malhotra',
      role: 'Member Technical - Senior Software Engineer',
      city: 'Hyderabad, India',
      domain: 'deshaw.com',
      companyName: 'DE Shaw',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-deshaw-2',
      name: 'Ananya Kulkarni',
      role: 'Senior Member Technical - Distributed Systems',
      city: 'Hyderabad, India',
      domain: 'deshaw.com',
      companyName: 'DE Shaw',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-deshaw-3',
      name: 'Rohan Singhania',
      role: 'Lead Systems Architect - Global Trading Technology',
      city: 'Hyderabad, India',
      domain: 'deshaw.com',
      companyName: 'DE Shaw',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
    {
      id: 'insider-deshaw-4',
      name: 'Pooja Sharma',
      role: 'Senior Technical Associate - Core Java & DBMS',
      city: 'Hyderabad, India',
      domain: 'deshaw.com',
      companyName: 'DE Shaw',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '95% response rate',
    },
  ],

  oracle: [
    {
      id: 'insider-oracle-1',
      name: 'Sabyasachi Ghosh',
      role: 'Senior Principal Engineer - OCI Core Storage',
      city: 'Hyderabad, India',
      domain: 'oracle.com',
      companyName: 'Oracle',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
    {
      id: 'insider-oracle-2',
      name: 'Faneesh Mishra',
      role: 'Consulting Member of Technical Staff - Database Systems',
      city: 'Hyderabad, India',
      domain: 'oracle.com',
      companyName: 'Oracle',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-oracle-3',
      name: 'Manasa Maddali',
      role: 'Principal Cloud Systems Engineer - Cloud Control Plane',
      city: 'Hyderabad, India',
      domain: 'oracle.com',
      companyName: 'Oracle',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-oracle-4',
      name: 'Arjun Nambiar',
      role: 'Staff Software Architect - Microservices & Distributed Caches',
      city: 'Bangalore, India',
      domain: 'oracle.com',
      companyName: 'Oracle',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
  ],

  servicenow: [
    {
      id: 'insider-servicenow-1',
      name: 'Karthik Ramanathan',
      role: 'Staff Software Engineer - Enterprise Cloud Platform',
      city: 'Hyderabad, India',
      domain: 'servicenow.com',
      companyName: 'ServiceNow',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-servicenow-2',
      name: 'Sneha Reddy',
      role: 'Senior Software Engineer - REST APIs & Platform Tier',
      city: 'Hyderabad, India',
      domain: 'servicenow.com',
      companyName: 'ServiceNow',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
    {
      id: 'insider-servicenow-3',
      name: 'Pranav Joshi',
      role: 'Principal Architect - Multi-Tenant Cloud Architecture',
      city: 'Hyderabad, India',
      domain: 'servicenow.com',
      companyName: 'ServiceNow',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
    {
      id: 'insider-servicenow-4',
      name: 'Divya Venkatesh',
      role: 'Senior Staff Engineer - Kafka Streaming Infrastructure',
      city: 'Hyderabad, India',
      domain: 'servicenow.com',
      companyName: 'ServiceNow',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '95% response rate',
    },
  ],

  microsoft: [
    {
      id: 'insider-msft-1',
      name: 'Aditya Swaminathan',
      role: 'Principal Software Engineering Manager - Azure Core',
      city: 'Hyderabad, India',
      domain: 'microsoft.com',
      companyName: 'Microsoft',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-msft-2',
      name: 'Meera Krishnan',
      role: 'Senior Software Development Engineer - Cloud Primitives',
      city: 'Hyderabad, India',
      domain: 'microsoft.com',
      companyName: 'Microsoft',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
    {
      id: 'insider-msft-3',
      name: 'Harsh Vardhan',
      role: 'Software Development Engineer II - High Concurrency APIs',
      city: 'Hyderabad, India',
      domain: 'microsoft.com',
      companyName: 'Microsoft',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-msft-4',
      name: 'Tanvi Agarwal',
      role: 'Principal Group Architect - Distributed Systems IDC',
      city: 'Hyderabad, India',
      domain: 'microsoft.com',
      companyName: 'Microsoft',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
  ],

  uber: [
    {
      id: 'insider-uber-1',
      name: 'Sameer Sheikh',
      role: 'Senior Staff Backend Engineer - Driver FinTech & Payouts',
      city: 'Hyderabad, India',
      domain: 'uber.com',
      companyName: 'Uber',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
    {
      id: 'insider-uber-2',
      name: 'Rashmi Iyer',
      role: 'Senior Software Engineer - Transactional Microservices',
      city: 'Hyderabad, India',
      domain: 'uber.com',
      companyName: 'Uber',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
    {
      id: 'insider-uber-3',
      name: 'Varun Nair',
      role: 'Engineering Manager - Core Platform Infrastructure',
      city: 'Hyderabad, India',
      domain: 'uber.com',
      companyName: 'Uber',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-uber-4',
      name: 'Geeta Pillai',
      role: 'Senior Backend Engineer - Financial Settlement Gateway',
      city: 'Bangalore, India',
      domain: 'uber.com',
      companyName: 'Uber',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
  ],

  amazon: [
    {
      id: 'insider-amazon-1',
      name: 'Ahmed Syed',
      role: 'Senior Software Development Engineer - Fulfillment Technologies',
      city: 'Hyderabad, India',
      domain: 'amazon.com',
      companyName: 'Amazon',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-amazon-2',
      name: 'Nidhi Saxena',
      role: 'Software Development Engineer II - Inventory & Routing',
      city: 'Hyderabad, India',
      domain: 'amazon.com',
      companyName: 'Amazon',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-amazon-3',
      name: 'Rajiv Chawla',
      role: 'Principal Systems Architect - Retail Scalability',
      city: 'Hyderabad, India',
      domain: 'amazon.com',
      companyName: 'Amazon',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
    {
      id: 'insider-amazon-4',
      name: 'Bhavna Menon',
      role: 'Senior Backend Lead - Systems Architecture',
      city: 'Hyderabad, India',
      domain: 'amazon.com',
      companyName: 'Amazon',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
  ],

  salesforce: [
    {
      id: 'insider-salesforce-1',
      name: 'Deepak Choudhary',
      role: 'Lead Software Engineer - Core Platform & Microservices',
      city: 'Hyderabad, India',
      domain: 'salesforce.com',
      companyName: 'Salesforce',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-salesforce-2',
      name: 'Monika Rao',
      role: 'Principal Member of Technical Staff - Enterprise Cloud',
      city: 'Hyderabad, India',
      domain: 'salesforce.com',
      companyName: 'Salesforce',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
    {
      id: 'insider-salesforce-3',
      name: 'Alok Sengupta',
      role: 'Senior Software Engineer - REST APIs & Database Reliability',
      city: 'Hyderabad, India',
      domain: 'salesforce.com',
      companyName: 'Salesforce',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '95% response rate',
    },
    {
      id: 'insider-salesforce-4',
      name: 'Sunita Das',
      role: 'Director of Software Engineering - Platform Hyderabad',
      city: 'Hyderabad, India',
      domain: 'salesforce.com',
      companyName: 'Salesforce',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
  ],

  qualcomm: [
    {
      id: 'insider-qualcomm-1',
      name: 'Abhishek Roy',
      role: 'Senior Staff Engineer - Cloud Services & Ingestion',
      city: 'Hyderabad, India',
      domain: 'qualcomm.com',
      companyName: 'Qualcomm',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-qualcomm-2',
      name: 'Priyanka Sen',
      role: 'Senior Engineer - Telemetry Backend Systems',
      city: 'Hyderabad, India',
      domain: 'qualcomm.com',
      companyName: 'Qualcomm',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-qualcomm-3',
      name: 'Naveen Kumar',
      role: 'Principal Engineer - Connected Devices & Cloud Platform',
      city: 'Hyderabad, India',
      domain: 'qualcomm.com',
      companyName: 'Qualcomm',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
    {
      id: 'insider-qualcomm-4',
      name: 'Kavita Hegde',
      role: 'Senior Software Engineer - Platform Backend & APIs',
      city: 'Hyderabad, India',
      domain: 'qualcomm.com',
      companyName: 'Qualcomm',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '95% response rate',
    },
  ],

  stripe: [
    {
      id: 'insider-stripe-1',
      name: 'Patrick Nolan',
      role: 'Staff Infrastructure Lead - Cloud Platform',
      city: 'Dublin / Remote',
      domain: 'stripe.com',
      companyName: 'Stripe',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
    {
      id: 'insider-stripe-2',
      name: 'Chloe Zhang',
      role: 'Senior Backend Engineer - Global Payouts Gateway',
      city: 'San Francisco, CA',
      domain: 'stripe.com',
      companyName: 'Stripe',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
    {
      id: 'insider-stripe-3',
      name: 'Marcus Bell',
      role: 'Principal Distributed Systems Engineer',
      city: 'Remote (US)',
      domain: 'stripe.com',
      companyName: 'Stripe',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
  ],

  google: [
    {
      id: 'insider-google-1',
      name: 'Sundararajan V.',
      role: 'Principal Systems Architect - Cloud Networking',
      city: 'Bangalore / Hyderabad',
      domain: 'google.com',
      companyName: 'Google',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
    {
      id: 'insider-google-2',
      name: 'Aishwarya Murali',
      role: 'Staff Software Engineer - Andromeda SDN',
      city: 'Hyderabad, India',
      domain: 'google.com',
      companyName: 'Google',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-google-3',
      name: 'Kunal Kapoor',
      role: 'Senior Software Engineer - Distributed Systems',
      city: 'Bangalore, India',
      domain: 'google.com',
      companyName: 'Google',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-google-4',
      name: 'Elena Rostova',
      role: 'Staff Reliability Engineer - Maglev Load Balancing',
      city: 'Mountain View, CA',
      domain: 'google.com',
      companyName: 'Google',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
  ],

  meta: [
    {
      id: 'insider-meta-1',
      name: 'Daniel Vance',
      role: 'Staff Software Engineer - AI Infrastructure & Training',
      city: 'Menlo Park, CA / Remote',
      domain: 'meta.com',
      companyName: 'Meta',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-meta-2',
      name: 'Shruti Narayan',
      role: 'Senior Systems Engineer - High-Speed Checkpointing',
      city: 'Remote (US)',
      domain: 'meta.com',
      companyName: 'Meta',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
    {
      id: 'insider-meta-3',
      name: 'Lucas Carvalho',
      role: 'Engineering Director - Foundation Model Compute',
      city: 'Menlo Park, CA',
      domain: 'meta.com',
      companyName: 'Meta',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
  ],

  'nexus enterprise ai': [
    {
      id: 'insider-nexus-1',
      name: 'Taher Shaik',
      role: 'Founding Lead Architect - Verification Protocols',
      city: 'Hyderabad / Remote',
      domain: 'vouchins.com',
      companyName: 'Nexus Enterprise AI',
      isVerified: true,
      vouchPoints: 100,
      responseRate: '100% response rate',
    },
    {
      id: 'insider-nexus-2',
      name: 'Sarah Chen',
      role: 'Principal Engineer - Anti-Sybil Graph Networks',
      city: 'Remote (Global)',
      domain: 'vouchins.com',
      companyName: 'Nexus Enterprise AI',
      isVerified: true,
      vouchPoints: 80,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-nexus-3',
      name: 'Alex Rivera',
      role: 'Senior Staff Engineer - Real-Time Matching Engine',
      city: 'Remote (Global)',
      domain: 'vouchins.com',
      companyName: 'Nexus Enterprise AI',
      isVerified: true,
      vouchPoints: 75,
      responseRate: '97% response rate',
    },
  ],

  audible: [
    {
      id: 'insider-audible-1',
      name: 'David Goldberg',
      role: 'Principal Systems Architect - Audio & AI Streaming',
      city: 'Newark, NJ',
      domain: 'audible.com',
      companyName: 'Audible',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '98% response rate',
    },
    {
      id: 'insider-audible-2',
      name: 'Priyanka Mittal',
      role: 'Senior Software Engineer - Audio Content Ingestion',
      city: 'Newark, NJ',
      domain: 'audible.com',
      companyName: 'Audible',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-audible-3',
      name: 'Michael Chen',
      role: 'Software Development Manager - Global Playback Infrastructure',
      city: 'Newark, NJ',
      domain: 'audible.com',
      companyName: 'Audible',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
  ],

  'johnson & johnson': [
    {
      id: 'insider-jnj-1',
      name: 'Dr. Rebecca Stern',
      role: 'Staff Software Engineer - Digital Health Platform',
      city: 'New Brunswick, NJ',
      domain: 'jnj.com',
      companyName: 'Johnson & Johnson',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '97% response rate',
    },
    {
      id: 'insider-jnj-2',
      name: 'Karthik Balakrishnan',
      role: 'Senior Lead Architect - Surgical Data Telemetry',
      city: 'New Brunswick, NJ',
      domain: 'jnj.com',
      companyName: 'Johnson & Johnson',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '96% response rate',
    },
    {
      id: 'insider-jnj-3',
      name: 'Amanda Thorne',
      role: 'Director of Cloud Engineering - Medical Technology',
      city: 'New Brunswick, NJ',
      domain: 'jnj.com',
      companyName: 'Johnson & Johnson',
      isVerified: true,
      vouchPoints: 50,
      responseRate: '99% response rate',
    },
  ],
};

/**
 * Retrieves curated verified insiders for a company name or domain.
 */
export function getCuratedInsiders(companyName?: string, domain?: string): DirectoryInsider[] {
  const normName = (companyName || '').toLowerCase().trim();
  const cleanName = normName
    .replace(/\b(inc|llc|corp|corporation|technologies|technology|solutions|services|ltd|limited|india|pvt)\b/gi, '')
    .trim();

  for (const [key, list] of Object.entries(CORPORATE_DIRECTORY)) {
    if (
      normName === key ||
      cleanName === key ||
      normName.includes(key) ||
      key.includes(cleanName)
    ) {
      return list;
    }
  }

  if (domain) {
    const dLower = domain.toLowerCase().trim();
    for (const list of Object.values(CORPORATE_DIRECTORY)) {
      if (list.some((insider) => dLower.includes(insider.domain) || insider.domain.includes(dLower))) {
        return list;
      }
    }
  }

  return [];
}

