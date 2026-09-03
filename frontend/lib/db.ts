import fs from 'fs';
import path from 'path';

export interface Company {
  id: string;
  name: string;
  industry: string;
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string;
  stagesJson: string; // JSON array of strings
  mcpServerUrl?: string;
}

export interface CandidateContext {
  headline?: string;
  about?: string;
  experience?: {
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }[];
  skills?: string[];
  education?: {
    school: string;
    degree?: string;
    fieldOfStudy?: string;
    year?: string;
  }[];
  projects?: {
    title: string;
    description?: string;
    url?: string;
  }[];
  certifications?: {
    name: string;
    issuer?: string;
    year?: string;
  }[];
  organizations?: string[];
  careerProgression?: string;
  notableClaims?: string[];
  interviewHooks?: string[];
  enrichmentSource?: string;
  enrichedAt?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  candidateContext?: CandidateContext;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  resumeText: string;
  linkedinUrl?: string;
  relevantExperience?: string;
  additionalInfo?: string;
  status: string;
  candidateContext?: CandidateContext;
}

export interface Interview {
  id: string;
  applicationId: string;
  scheduledAt: string;
  status: string; // PENDING, IN_PROGRESS, COMPLETED, FAILED
  transcript?: { round: string, speaker: string, text: string }[];
  evaluations?: { round: string, decision: string, score: number, reason: string }[];
  suspiciousEvents?: { timestamp: string, type: string, details: string }[];
  scorecard?: any;
}

export interface InterviewBlueprint {
  id: string;
  interviewId: string;
  blueprintJson: string;
}

export interface Database {
  companies: Company[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  interviews: Interview[];
  blueprints: InterviewBlueprint[];
}

const dbPath = path.join(process.cwd(), 'data.json');

const defaultDb: Database = {
  companies: [
    { id: 'c1', name: 'EchoSphere Tech', industry: 'Artificial Intelligence' }
  ],
  jobs: [
    {
      id: 'j1',
      companyId: 'c1',
      title: 'Senior Backend Engineer',
      description: 'We are looking for a Senior Backend Engineer to scale our AI infrastructure.',
      requirements: '- 5+ years Python/FastAPI\n- PostgreSQL\n- System Design',
      stagesJson: JSON.stringify(['Technical', 'System Design', 'HR'])
    },
    {
      id: 'j2',
      companyId: 'c1',
      title: 'Full Stack Engineer',
      description: 'Join our core product team building the next generation of Next.js apps.',
      requirements: '- React/Next.js\n- Node.js\n- Tailwind CSS',
      stagesJson: JSON.stringify(['Frontend Technical', 'HR'])
    },
    {
      id: 'j3',
      companyId: 'c1',
      title: 'AI/ML Engineer',
      description: 'Help us improve our voice models and evaluation LLMs.',
      requirements: '- PyTorch\n- LLM finetuning\n- Python',
      stagesJson: JSON.stringify(['ML Technical', 'HR'])
    }
  ],
  candidates: [
    { id: 'cand1', name: 'Alice Smith', email: 'alice@example.com', linkedinUrl: 'https://linkedin.com/in/alicesmith' },
    { id: 'cand2', name: 'Bob Johnson', email: 'bob@example.com', githubUrl: 'https://github.com/bobj' }
  ],
  applications: [
    { id: 'app1', jobId: 'j1', candidateId: 'cand1', resumeText: 'Alice Smith\n5 years of Python, FastAPI, and Postgres.', status: 'UNDER_REVIEW' },
    { id: 'app2', jobId: 'j2', candidateId: 'cand2', resumeText: 'Bob Johnson\nFull Stack Dev with 3 years Next.js experience.', status: 'APPLIED' }
  ]
};

export function getDb(): Database {
  if (!fs.existsSync(dbPath)) {
    // Add new arrays to defaultDb
    const fullDefaultDb = { ...defaultDb, interviews: [], blueprints: [] };
    fs.writeFileSync(dbPath, JSON.stringify(fullDefaultDb, null, 2));
    return fullDefaultDb;
  }
  const data = fs.readFileSync(dbPath, 'utf8');
  const parsed = JSON.parse(data);
  
  // Backwards compatibility for older data.json files
  if (!parsed.interviews) parsed.interviews = [];
  if (!parsed.blueprints) parsed.blueprints = [];
  
  return parsed;
}

export function saveDb(db: Database) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}
