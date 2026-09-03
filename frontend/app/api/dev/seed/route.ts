import { NextResponse } from 'next/server';
import { getDb, saveDb, Database } from '@/lib/db';

export async function POST() {
  try {
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
    
    saveDb(defaultDb);

    return NextResponse.json({ success: true, message: 'JSON Database seeded successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
