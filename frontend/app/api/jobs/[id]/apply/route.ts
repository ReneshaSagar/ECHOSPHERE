import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, Candidate, Application, CandidateContext } from '@/lib/db';
import { enrichLinkedInProfile } from '@/lib/enrichment/linkedin';
import { enrichGitHubUrl } from '@/lib/enrichment/github';
import { extractResumeFromGoogleDrive } from '@/lib/drive';
import { extractTextFromPdfBuffer } from '@/lib/resume/extract';
import { sendApplicationReceivedEmail } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('[Apply Route Handler Entered]', req.url);
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams?.id;
    console.log('[Apply Route] Target jobId:', jobId);
    
    const body = await req.json();
    const { 
      name, 
      email, 
      linkedinUrl, 
      githubUrl, 
      portfolioUrl, 
      resumeText: rawResumeText,
      resumeDriveUrl,
      resumePdfBase64,
      resumeFileName,
      relevantExperience, 
      additionalInfo 
    } = body;

    const db = getDb();
    
    // Verify job exists
    const job = db.jobs.find(j => j.id === jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    // Resolve resumeText from Google Drive link, uploaded PDF, or direct text
    let resumeText = (rawResumeText || '').trim();

    if (resumeDriveUrl && typeof resumeDriveUrl === 'string' && resumeDriveUrl.trim() !== '') {
      try {
        console.log('[Apply Route] Processing resume from Google Drive:', resumeDriveUrl);
        resumeText = await extractResumeFromGoogleDrive(resumeDriveUrl.trim());
      } catch (driveErr: any) {
        console.warn('[Apply Route] Google Drive extraction error:', driveErr.message);
        return NextResponse.json({ 
          error: driveErr.message || "Failed to retrieve resume from Google Drive. Please ensure link sharing is set to 'Anyone with the link can view'." 
        }, { status: driveErr.statusCode || 400 });
      }
    } else if (resumePdfBase64 && typeof resumePdfBase64 === 'string' && resumePdfBase64.trim() !== '') {
      try {
        console.log('[Apply Route] Processing uploaded PDF resume:', resumeFileName || 'resume.pdf');
        const cleanBase64 = resumePdfBase64.replace(/^data:application\/pdf;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        resumeText = await extractTextFromPdfBuffer(buffer);
      } catch (pdfErr: any) {
        console.warn('[Apply Route] PDF extraction error:', pdfErr.message);
        return NextResponse.json({ 
          error: pdfErr.message || "Failed to extract text from uploaded PDF. Please ensure it is a valid, readable text PDF." 
        }, { status: 400 });
      }
    }

    if (!name || !email || !resumeText) {
      return NextResponse.json({ 
        error: "Name, email, and resume (upload PDF, Google Drive link, or plain text) are required." 
      }, { status: 400 });
    }

    // 1 & 2. Ingest LinkedIn and GitHub Concurrently in Parallel
    console.log('[Apply Route] Ingesting profile sources in parallel...');
    const [rawLinkedIn, rawGitHub] = await Promise.all([
      (linkedinUrl && typeof linkedinUrl === 'string' && linkedinUrl.trim() !== '')
        ? enrichLinkedInProfile(linkedinUrl.trim(), resumeText).catch(enrichErr => {
            console.warn('[Apply Route] LinkedIn ingestion notice:', enrichErr?.message);
            return null;
          })
        : Promise.resolve(null),
      (githubUrl && typeof githubUrl === 'string' && githubUrl.trim() !== '')
        ? enrichGitHubUrl(githubUrl.trim(), resumeText, job.description).catch(ghErr => {
            console.warn('[Apply Route] GitHub ingestion notice:', ghErr?.message);
            return null;
          })
        : Promise.resolve(null)
    ]);

    // 3. Relevance & Cross-Source Correlation Layer (Resume + LinkedIn + GitHub -> CandidateContext)
    const { correlateAndBuildCandidateContext } = await import('@/lib/enrichment/correlation');
    const candidateContext: CandidateContext = await correlateAndBuildCandidateContext({
      rawResumeText: resumeText,
      rawResumeFileName: resumeFileName || undefined,
      rawResumeDriveUrl: resumeDriveUrl || undefined,
      rawLinkedIn,
      rawGitHub,
      job
    });

    // Find or create candidate based on email
    let candidate = db.candidates.find(c => c.email.toLowerCase() === email.toLowerCase());
    
    if (candidate) {
      // Update optional fields if provided
      if (linkedinUrl) candidate.linkedinUrl = linkedinUrl;
      if (githubUrl) candidate.githubUrl = githubUrl;
      if (portfolioUrl) candidate.portfolioUrl = portfolioUrl;
      if (resumeDriveUrl) candidate.resumeDriveUrl = resumeDriveUrl;
      if (candidateContext) candidate.candidateContext = candidateContext;
    } else {
      candidate = {
        id: `cand_${Math.random().toString(36).substring(2, 9)}`,
        name,
        email,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        resumeDriveUrl: resumeDriveUrl || undefined,
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
      resumeDriveUrl: resumeDriveUrl || undefined,
      resumeFileName: resumeFileName || undefined,
      linkedinUrl: linkedinUrl || undefined,
      githubUrl: githubUrl || undefined,
      relevantExperience,
      additionalInfo,
      status: 'APPLIED',
      candidateContext
    };

    db.applications.push(newApplication);
    saveDb(db);

    // Send Application Received Confirmation Email
    try {
      await sendApplicationReceivedEmail({ name, email }, { title: job.title });
    } catch (mailErr: any) {
      console.warn('[Apply Route] Failed to send confirmation email:', mailErr.message);
    }

    return NextResponse.json({ success: true, applicationId: newApplication.id });
  } catch (err: any) {
    console.error("Apply Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
