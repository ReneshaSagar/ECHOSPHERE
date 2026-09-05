/**
 * Nexora Labs Company Entity & Product Narrative Configuration
 * 
 * Fictional Series B technology company building infrastructure for modern, AI-native software.
 * Hiring Platform / Technology Attribution: OmniPanel
 */

export interface CompanyEntity {
  name: string;
  legalName: string;
  tagline: string;
  mission: string;
  description: string;
  stage: string;
  founded: string;
  headquarters: {
    city: string;
    country: string;
    label: string;
  };
  offices: Array<{
    city: string;
    country: string;
    region: string;
    type: string;
  }>;
  teamSize: string;
  principles: Array<{
    number: string;
    title: string;
    description: string;
  }>;
  departments: string[];
  techStackHighlights: string[];
  platformAttribution: {
    name: string;
    tagline: string;
    badgeText: string;
  };
}

export const NEXORA_LABS: CompanyEntity = {
  name: 'Nexora Labs',
  legalName: 'Nexora Labs, Inc.',
  tagline: 'Nexora Labs builds the infrastructure behind intelligent products.',
  mission: 'Empowering engineers to build, scale, and orchestrate resilient AI-native systems with sub-millisecond reliability.',
  description: 'Nexora Labs is a Series B technology infrastructure company headquartered in Bengaluru with global hubs in Singapore and London. We build foundational developer platforms, distributed real-time audio/data pipelines, and scalable AI inference orchestration engines.',
  stage: 'Series B',
  founded: '2023',
  headquarters: {
    city: 'Bengaluru',
    country: 'India',
    label: 'Bengaluru HQ (Karnataka, India)'
  },
  offices: [
    {
      city: 'Bengaluru',
      country: 'India',
      region: 'APAC',
      type: 'Headquarters & Core Engineering'
    },
    {
      city: 'Singapore',
      country: 'Singapore',
      region: 'APAC',
      type: 'Platform Engineering & Edge Infra'
    },
    {
      city: 'London',
      country: 'United Kingdom',
      region: 'EMEA',
      type: 'Product & Systems Research'
    }
  ],
  teamSize: '180+ team members across 20+ nationalities',
  principles: [
    {
      number: '01',
      title: 'Think in systems',
      description: 'We prioritize foundational, composable architectures over superficial quick-fixes. Every component is designed with clear boundaries and deterministic behavior.'
    },
    {
      number: '02',
      title: 'Bias toward ownership',
      description: 'Engineers own what they create end-to-end—from architectural RFCs and code implementation to production telemetry and operational reliability.'
    },
    {
      number: '03',
      title: 'Make complexity disappear',
      description: 'We turn thorny distributed consensus, real-time media transport, and LLM inference challenges into clean, intuitive primitives for developers.'
    },
    {
      number: '04',
      title: 'Build for scale',
      description: 'We design systems with 10x headroom in mind, enforcing strict latency budgets, partition tolerance, and zero-downtime evolution.'
    },
    {
      number: '05',
      title: 'Stay curious',
      description: 'We push the frontier of what software can do, actively exploring multimodal AI, streaming audio intelligence, and next-generation developer tooling.'
    }
  ],
  departments: [
    'Core Infrastructure',
    'AI Platform & Systems',
    'Product Engineering',
    'Cloud Platform & SRE',
    'Product Management',
    'Product Design',
    'People & Culture'
  ],
  techStackHighlights: [
    'TypeScript',
    'Node.js',
    'Next.js 15',
    'React',
    'Python (FastAPI, asyncio)',
    'Go',
    'PostgreSQL',
    'Redis & Redis Pub/Sub',
    'Apache Kafka',
    'Kubernetes (EKS/GKE)',
    'WebRTC & Web Audio',
    'vLLM & TensorRT-LLM',
    'Terraform & AWS/GCP'
  ],
  platformAttribution: {
    name: 'OmniPanel',
    tagline: 'Autonomous Multi-Persona Voice Evaluation Platform',
    badgeText: 'Powered by OmniPanel'
  }
};
