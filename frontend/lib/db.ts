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
      title: 'Senior Backend Engineer — Distributed Systems & AI Infrastructure',
      description: 'EchoSphere is pioneering autonomous multi-persona conversational AI agent systems for enterprise hiring and technical evaluation. We are looking for a Senior Backend Engineer to lead the architecture, scaling, and operational reliability of our core real-time inference and voice orchestration platform.\n\nIn this role, you will design ultra-low-latency backend microservices bridging WebRTC media pipelines, streaming LLM inference gateways, and transactional persistence layers. You will directly own the infrastructure handling thousands of concurrent real-time audio streams, WebSocket event loops, and distributed state coordination.\n\nKey Responsibilities:\n• Architect, deploy, and scale high-concurrency microservices in Python (FastAPI/asyncio) and Go to support thousands of simultaneous voice interview sessions.\n• Optimize database schemas, indexing strategies, and connection pooling across PostgreSQL clusters and Redis caching layers.\n• Build fault-tolerant event ingestion pipelines using Apache Kafka and Redis Pub/Sub with sub-50ms p99 latency targets.\n• Implement robust observability, distributed tracing (OpenTelemetry), and auto-healing infrastructure for mission-critical AI workloads.\n• Collaborate with our AI Research and WebRTC teams to streamline model deployment, GPU batching, and semantic context caching.',
      requirements: 'Required Qualifications:\n• 5+ years of software engineering experience building and maintaining distributed backend systems in production.\n• Deep proficiency in Python (FastAPI, asyncio, Celery) or Go, with comprehensive knowledge of concurrent programming and asynchronous I/O.\n• Strong expertise in relational databases (PostgreSQL query optimization, partitioning, indexing, connection pooling) and key-value caches (Redis).\n• Proven track record designing and maintaining high-throughput, low-latency REST and WebSocket APIs under strict SLAs.\n• Solid understanding of distributed systems fundamentals: consensus, partition tolerance, eventual consistency, and idempotent design.\n\nPreferred Qualifications:\n• Experience with real-time media streaming, WebRTC, or voice AI pipelines (Agora, LiveKit, Deepgram, Twilio).\n• Familiarity with container orchestration (Docker, Kubernetes) and infrastructure-as-code (Terraform, AWS/GCP).\n• Prior experience deploying or scaling LLM inference engines (vLLM, TensorRT-LLM, Triton).',
      stagesJson: JSON.stringify(['Technical Architecture & Concurrency', 'Distributed System Design', 'Engineering Leadership & Cultural Alignment'])
    },
    {
      id: 'j2',
      companyId: 'c1',
      title: 'Senior Full Stack Engineer — Next.js & Real-Time WebRTC',
      description: 'Join EchoSphere\'s core product team to build the next generation of real-time AI interview rooms, collaborative proctoring systems, and enterprise ATS dashboards. We are seeking a Senior Full Stack Engineer to lead our frontend architecture and full-stack product interfaces.\n\nYou will bridge cutting-edge browser technologies (WebRTC, Web Audio API, Canvas, Web Workers) with Next.js 15+ App Router architectures to deliver responsive, zero-lag, mission-critical voice interview experiences used by global talent teams.\n\nKey Responsibilities:\n• Lead full-stack development across candidate-facing live interview rooms and recruiter administrative dashboards.\n• Implement high-performance WebRTC client audio/video handling, real-time waveform visualizers, and stateful turn arbiters.\n• Design scalable Next.js architectures utilizing React Server Components, server actions, and optimistic UI updates.\n• Optimize client-side compute performance to support simultaneous background audio processing and proctoring analytics without dropping frames.\n• Build accessible, beautiful UI components with Tailwind CSS, TypeScript, and modern component design systems.',
      requirements: 'Required Qualifications:\n• 4+ years of professional full-stack development experience building responsive, high-scale web applications.\n• Mastery of modern TypeScript, React, and Next.js (App Router, Server Components, SSR/SSG).\n• Strong experience with real-time browser APIs: WebRTC, WebSockets, Web Audio API, and MediaStream processing.\n• Deep proficiency with modern state management, Tailwind CSS, and component design patterns.\n• Solid backend foundation in Node.js / Next.js API route handlers, REST APIs, and database integration.\n\nPreferred Qualifications:\n• Experience building real-time collaboration tools, video conferencing applications, or interactive audio platforms.\n• Familiarity with client-side ML / computer vision (MediaPipe, TensorFlow.js) in the browser.\n• Experience designing responsive, accessible, enterprise SaaS design systems.',
      stagesJson: JSON.stringify(['Full Stack Architecture & Live Coding', 'Frontend Systems & WebRTC Deep Dive', 'Culture & Product Execution'])
    },
    {
      id: 'j3',
      companyId: 'c1',
      title: 'Staff AI / Machine Learning Engineer — Speech & Conversational LLMs',
      description: 'EchoSphere is pushing the frontier of multimodal real-time conversational agents. As a Staff AI / Machine Learning Engineer, you will drive the core models behind our multi-persona voice interviewers, evaluation scoring rubrics, and automated profile synthesis engines.\n\nYou will lead research, fine-tuning, and production serving of multimodal speech-to-speech and large language models, optimizing for sub-500ms voice turnaround latency, natural conversational turn-taking, and rigorous, bias-free candidate evaluation.\n\nKey Responsibilities:\n• Train, fine-tune, and optimize state-of-the-art LLMs (Llama, Gemini Live, Mistral) for specialized interviewing personas and domain-specific technical probing.\n• Architect real-time voice intelligence pipelines integrating streaming ASR, low-latency LLM generation, and expressive neural TTS.\n• Design advanced multi-round evaluation rubrics with automated chain-of-thought grading, grounded retrieval (RAG), and calibrated confidence scoring.\n• Implement techniques to eliminate hallucinations, enforce floor-control turn arbitration, and ensure fair, objective candidate assessments.\n• Optimize model inference latency and throughput on GPU clusters using TensorRT-LLM, vLLM, and speculative decoding.',
      requirements: 'Required Qualifications:\n• 5+ years of experience developing and deploying production machine learning models and LLM applications.\n• Strong proficiency in Python, PyTorch, Hugging Face ecosystem, and modern deep learning frameworks.\n• Deep experience fine-tuning LLMs (LoRA, QLoRA, SFT, DPO/RLHF) and building retrieval-augmented generation (RAG) architectures.\n• Solid understanding of conversational AI architectures, acoustic models, streaming speech recognition, and neural audio synthesis.\n• Solid foundation in machine learning system design, latency optimization, and distributed GPU serving.\n\nPreferred Qualifications:\n• Published research or open-source contributions in NLP, Speech Recognition, or Conversational Agents.\n• Experience with Triton Inference Server, vLLM, DeepSpeed, or ONNX Runtime.\n• Prior work in automated bias mitigation, fairness metrics, or enterprise talent assessment models.',
      stagesJson: JSON.stringify(['ML Fundamentals & Deep Learning', 'Conversational AI Architecture & RAG', 'Research Impact & Cross-Functional Leadership'])
    },
    {
      id: 'j_m769m72',
      companyId: 'c1',
      title: 'Senior DevOps / Cloud Infrastructure Engineer — Kubernetes & GPU Platform',
      description: 'We are looking for a Senior DevOps / Cloud Infrastructure Engineer to design, automate, and harden our cloud foundation. You will own the Kubernetes clusters, GPU compute nodes, CI/CD pipelines, and multi-region networking that power EchoSphere\'s live voice sessions globally.\n\nYou will ensure 99.99% uptime, automated zero-downtime deployments, zero-trust security compliance, and elastic auto-scaling under fluctuating real-time interview traffic.\n\nKey Responsibilities:\n• Architect and maintain enterprise cloud infrastructure across AWS / GCP using Terraform and GitOps (ArgoCD).\n• Manage and scale production Kubernetes (EKS/GKE) clusters with dynamic GPU node autoscaling for AI inference workloads.\n• Design resilient CI/CD pipelines with GitHub Actions, automated regression testing, and security vulnerability scanning.\n• Implement comprehensive observability stacks with Prometheus, Grafana, OpenTelemetry, and structured logging.\n• Establish enterprise security baselines: SOC 2 compliance, KMS secret management, network isolation (VPC peering, WAF, Cloudflare).',
      requirements: 'Required Qualifications:\n• 4+ years of dedicated DevOps, Site Reliability, or Cloud Infrastructure Engineering experience.\n• Deep hands-on expertise with Kubernetes container orchestration, Helm, and ingress controllers.\n• Proficiency with Infrastructure as Code (Terraform) and configuration management in AWS or GCP.\n• Strong scripting and automation skills in Python, Bash, or Go.\n• Experience maintaining production networking: DNS, load balancers, CDN routing, VPC architectures, and TLS termination.\n\nPreferred Qualifications:\n• Experience managing GPU workloads (NVIDIA GPU Operator, CUDA drivers, Triton deployment on Kubernetes).\n• Familiarity with SOC 2, GDPR, or ISO 27001 compliance standards in enterprise SaaS environments.\n• Experience optimizing cloud spend, spot instance orchestration, and reserved capacity planning.',
      stagesJson: JSON.stringify(['Infrastructure Architecture & Live Troubleshooting', 'Kubernetes & Cloud System Design', 'SRE Culture & Incident Leadership'])
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
