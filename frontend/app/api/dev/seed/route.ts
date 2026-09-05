import { NextResponse } from 'next/server';
import { getDb, saveDb, Database } from '@/lib/db';

export async function POST() {
  try {
    const defaultDb: Database = {
      companies: [
        { id: 'c1', name: 'Nexora Labs', industry: 'AI Infrastructure & Developer Platform' }
      ],
      jobs: [
        {
          id: 'j1',
          companyId: 'c1',
          title: 'Senior Backend Engineer — Distributed Systems & Real-Time APIs',
          description: 'Nexora Labs builds the infrastructure behind intelligent products. We are seeking a Senior Backend Engineer to design and scale the distributed event pipelines, transactional services, and ultra-low-latency APIs that power our real-time AI platform.\n\nIn this role, you will lead the architecture of high-throughput backend microservices handling millions of concurrent WebSocket events, streaming audio frames, and distributed transactional state. You will work closely with our AI Systems and Core Platform teams to deliver resilient, sub-50ms p99 response times across our global edge network.',
          requirements: 'Required Qualifications:\n• 3–6 years of professional backend engineering experience building and scaling distributed systems in production.\n• Strong proficiency in TypeScript, Node.js, and/or Go, with deep understanding of asynchronous event loops, non-blocking I/O, and concurrency patterns.\n• Deep hands-on experience with relational databases (PostgreSQL indexing, query optimization, connection pooling) and caching layers (Redis).\n• Proven experience designing high-throughput, low-latency REST and WebSocket APIs under strict SLAs.',
          stagesJson: JSON.stringify(['Core Concurrency & API Architecture', 'Distributed Systems & Database Scaling', 'Engineering Leadership & Cultural Alignment'])
        },
        {
          id: 'j2',
          companyId: 'c1',
          title: 'Staff Backend Engineer — Core Infrastructure & Architecture',
          description: 'As a Staff Backend Engineer at Nexora Labs, you will serve as a principal technical leader shaping the next generation of our global AI infrastructure. You will own the technical roadmap for our high-concurrency orchestration platform, multi-region database replication, and real-time inference streaming pipelines.',
          requirements: 'Required Qualifications:\n• 7+ years of software engineering experience with demonstrated technical leadership in large-scale distributed systems.\n• Deep expertise in distributed systems architecture, event-driven topologies, consensus mechanisms (Raft/Paxos), and high-throughput streaming.\n• Mastery of concurrency, memory management, and performance profiling in Go, TypeScript/Node.js, or Rust.',
          stagesJson: JSON.stringify(['System Architecture & Distributed Consensus', 'Scalability, Resiliency & Failure Modes', 'Technical Leadership & Organization Impact'])
        },
        {
          id: 'j3',
          companyId: 'c1',
          title: 'Senior Full Stack Engineer — Next.js & Developer Platform',
          description: 'Nexora Labs is creating the developer interfaces that make intelligent infrastructure easy to orchestrate. We are looking for a Senior Full Stack Engineer to lead the architecture and implementation of our customer-facing web applications, real-time collaboration rooms, and developer analytics consoles.',
          requirements: 'Required Qualifications:\n• 3–6 years of experience building modern full-stack web applications with React, Next.js, and TypeScript.\n• Deep proficiency with Next.js App Router, React Server Components, server actions, and modern state management patterns.\n• Strong foundation in browser APIs: WebRTC, WebSockets, Web Audio API, and DOM performance optimization.',
          stagesJson: JSON.stringify(['Full Stack Architecture & Live Coding', 'WebRTC & Frontend Systems Deep Dive', 'Product Craft & Cultural Alignment'])
        },
        {
          id: 'j4',
          companyId: 'c1',
          title: 'AI / Machine Learning Engineer — Conversational Systems & LLM Infra',
          description: 'At Nexora Labs, our AI Platform team researches, evaluates, and deploys the intelligence models that power our multi-persona conversational agents and autonomous evaluation engines. We are seeking an AI/ML Engineer to push the boundaries of real-time conversational agents, streaming speech-to-speech pipelines, and grounded LLM evaluation.',
          requirements: 'Required Qualifications:\n• 2–5 years of hands-on experience building, fine-tuning, and evaluating production ML models and LLM systems.\n• Strong proficiency in Python, PyTorch, Hugging Face Transformers, and modern ML engineering tooling.\n• Deep understanding of LLM architectures, prompt engineering, few-shot grounding, and RAG retrieval pipelines.',
          stagesJson: JSON.stringify(['Machine Learning Fundamentals & Model Tuning', 'Conversational AI Architecture & RAG Systems', 'Research Rigor & Cross-Functional Alignment'])
        },
        {
          id: 'j5',
          companyId: 'c1',
          title: 'Senior Platform Engineer — Cloud Infrastructure & Kubernetes',
          description: 'Nexora Labs runs a globally distributed cloud footprint across multi-region AWS and GCP environments. We are seeking a Senior Platform Engineer based in our Singapore hub to build, automate, and harden the core cloud infrastructure that powers our real-time voice and data workloads.',
          requirements: 'Required Qualifications:\n• 4–7 years of experience in Platform Engineering, DevOps, or Site Reliability Engineering.\n• Deep hands-on expertise with Kubernetes container orchestration, Helm charts, ingress controllers, and cluster autoscaling.\n• Mastery of Terraform and cloud infrastructure architecture on AWS or GCP.',
          stagesJson: JSON.stringify(['Cloud Infrastructure Architecture & Troubleshooting', 'Kubernetes & Platform Scaling Deep Dive', 'SRE Culture & Incident Leadership'])
        },
        {
          id: 'j6',
          companyId: 'c1',
          title: 'Product Manager — AI Platform & Developer Infrastructure',
          description: 'As a Product Manager for AI Platform at Nexora Labs, you will define the roadmap and developer experience for our core infrastructure products. You will work at the intersection of developer tooling, real-time voice intelligence, and high-scale distributed systems.',
          requirements: 'Required Qualifications:\n• 4+ years of product management experience focused on developer platforms, API products, cloud infrastructure, or enterprise AI tools.\n• Strong technical literacy—ability to discuss distributed architecture, API design, and ML workflows with engineering leads.',
          stagesJson: JSON.stringify(['Product Strategy & Technical Problem Solving', 'Developer Experience & API Design Deep Dive', 'Cross-Functional Execution & Leadership'])
        },
        {
          id: 'j7',
          companyId: 'c1',
          title: 'Product Designer — Developer Systems & Experience',
          description: 'Nexora Labs is looking for a thoughtful Product Designer to craft the user experience and interface systems across our developer consoles, real-time collaboration environments, and enterprise dashboards. We believe developer tools should be as beautiful, intuitive, and fast as the best consumer software.',
          requirements: 'Required Qualifications:\n• 3–6 years of product design experience working on complex SaaS platforms, developer tools, or data-dense web applications.\n• Strong portfolio demonstrating structured design thinking, elegant typography, high visual polish, and clean component systems.',
          stagesJson: JSON.stringify(['Design Portfolio & Systems Review', 'Interactive Problem Solving & Whiteboard Challenge', 'Collaboration & Craft Values'])
        }
      ],
      candidates: [
        { id: 'cand1', name: 'Alice Smith', email: 'alice@example.com', linkedinUrl: 'https://linkedin.com/in/alicesmith' },
        { id: 'cand2', name: 'Bob Johnson', email: 'bob@example.com', githubUrl: 'https://github.com/bobj' }
      ],
      applications: [
        { id: 'app1', jobId: 'j1', candidateId: 'cand1', resumeText: 'Alice Smith\n5 years of Python, FastAPI, and Postgres.', status: 'UNDER_REVIEW' },
        { id: 'app2', jobId: 'j3', candidateId: 'cand2', resumeText: 'Bob Johnson\nFull Stack Dev with 3 years Next.js experience.', status: 'APPLIED' }
      ],
      interviews: [],
      blueprints: [],
      emails: []
    };
    
    saveDb(defaultDb);

    return NextResponse.json({ success: true, message: 'JSON Database seeded successfully with Nexora Labs entity and 7 jobs' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
