import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, Candidate, Application, CandidateContext } from '@/lib/db';
import { enrichLinkedInProfile } from '@/lib/enrichment/linkedin';
import { enrichGitHubUrl } from '@/lib/enrichment/github';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('[Apply Route Handler Entered]', req.url);
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams?.id;
    console.log('[Apply Route] Target jobId:', jobId);
    
    const body = await req.json();
    const { name, email, linkedinUrl, githubUrl, portfolioUrl, resumeText, relevantExperience, additionalInfo } = body;

    if (!name || !email || !resumeText) {
      return NextResponse.json({ error: "Name, email, and resume are required." }, { status: 400 });
    }

    const db = getDb();
    
    // Verify job exists
    const job = db.jobs.find(j => j.id === jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    // Automatically trigger LinkedIn profile enrichment if URL is provided
    let candidateContext: CandidateContext | undefined = undefined;
    if (linkedinUrl && typeof linkedinUrl === 'string' && linkedinUrl.trim() !== '') {
      try {
        const enriched = await enrichLinkedInProfile(linkedinUrl.trim(), resumeText);
        if (enriched) {
          candidateContext = enriched;
        }
      } catch (enrichErr: any) {
        console.error("[Apply Route] Bright Data LinkedIn profile enrichment error:", enrichErr?.message);
        if (process.env.MOCK_LINKEDIN_ENRICHMENT === 'false') {
          return NextResponse.json({ error: "Bright Data Enrichment Failed: " + enrichErr?.message }, { status: 502 });
        }
      }
    }

    // Automatically trigger GitHub profile/repository enrichment if URL is provided
    if (githubUrl && typeof githubUrl === 'string' && githubUrl.trim() !== '') {
      try {
        console.log('[Apply Route] Triggering GitHub enrichment for:', githubUrl);
        const enrichedGh = await enrichGitHubUrl(githubUrl.trim(), resumeText, job.description);
        if (enrichedGh) {
          if (!candidateContext) {
            candidateContext = {
              enrichmentSource: 'github',
              enrichedAt: new Date().toISOString()
            };
          }
          candidateContext.githubContext = enrichedGh;
          candidateContext.technicalHighlights = enrichedGh.technicalHighlights;
          candidateContext.githubProjects = enrichedGh.githubProjects;
          candidateContext.githubInterviewHooks = enrichedGh.githubInterviewHooks;
        }
      } catch (ghErr: any) {
        console.warn("[Apply Route] GitHub enrichment failed gracefully without blocking application:", ghErr?.message);
      }
    }

    // Find or create candidate based on email
    let candidate = db.candidates.find(c => c.email.toLowerCase() === email.toLowerCase());
    
    if (candidate) {
      // Update optional fields if provided
      if (linkedinUrl) candidate.linkedinUrl = linkedinUrl;
      if (githubUrl) candidate.githubUrl = githubUrl;
      if (portfolioUrl) candidate.portfolioUrl = portfolioUrl;
      if (candidateContext) candidate.candidateContext = candidateContext;
    } else {
      candidate = {
        id: `cand_${Math.random().toString(36).substring(2, 9)}`,
        name,
        email,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        candidateContext
      };
      db.candidates.push(candidate);
    }

    // Check for duplicate application
    const existingApp = db.applications.find(a => a.jobId === jobId && a.candidateId === candidate.id);
    if (existingApp) {
      return NextResponse.json({ error: "You have already applied for this position." }, { status: 400 });
    }

    // Create application
    const newApplication: Application = {
      id: `app_${Math.random().toString(36).substring(2, 9)}`,
      jobId,
      candidateId: candidate.id,
      resumeText,
      linkedinUrl: linkedinUrl || undefined,
      githubUrl: githubUrl || undefined,
      relevantExperience,
      additionalInfo,
      status: 'APPLIED',
      candidateContext
    };

    db.applications.push(newApplication);
    saveDb(db);

    return NextResponse.json({ success: true, applicationId: newApplication.id });
  } catch (err: any) {
    console.error("Apply Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
