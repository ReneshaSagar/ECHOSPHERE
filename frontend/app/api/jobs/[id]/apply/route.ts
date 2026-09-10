import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, Candidate, Application, CandidateContext } from '@/lib/db';
import { enrichLinkedInProfile } from '@/lib/enrichment/linkedin';
import { enrichGitHubUrl } from '@/lib/enrichment/github';
import { extractResumeFromGoogleDrive } from '@/lib/drive';
import { extractTextFromPdfBuffer } from '@/lib/resume/extract';
import { sendApplicationReceivedEmail, sendApplicationFailedEmail } from '@/lib/email';

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

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !name) {
      return NextResponse.json({ error: "Name and email address are required." }, { status: 400 });
    }

    // 0. Instant Pre-Flight Check: Prevent duplicate application for THIS specific role
    const existingCandidate = db.candidates.find(c => c.email.toLowerCase() === cleanEmail);
    if (existingCandidate) {
      const alreadyAppliedThisJob = db.applications.find(a => a.jobId === jobId && a.candidateId === existingCandidate.id);
      if (alreadyAppliedThisJob) {
        console.log(`[Apply Route Pre-Flight] Blocked duplicate application: ${cleanEmail} already applied to ${job.title} (${jobId})`);
        return NextResponse.json({ 
          error: `You have already applied for ${job.title}. You cannot apply to the same role twice, but you are welcome to apply to other open positions at Plantra Labs!`,
          alreadyApplied: true,
          jobTitle: job.title
        }, { status: 400 });
      }
    }

    // Prepare response instantly
    const response = NextResponse.json({ 
      success: true, 
      pending: true,
      message: "Application is processing in the background." 
    });

    // Execute heavy extraction and enrichment asynchronously
    (async () => {
      try {
        console.log('[Async Apply] Starting background extraction for', cleanEmail);
        let resumeText = (rawResumeText || '').trim();

        if (resumeDriveUrl && typeof resumeDriveUrl === 'string' && resumeDriveUrl.trim() !== '') {
          try {
            console.log('[Async Apply] Processing resume from Google Drive:', resumeDriveUrl);
            resumeText = await extractResumeFromGoogleDrive(resumeDriveUrl.trim());
          } catch (driveErr: any) {
            console.warn('[Async Apply] Google Drive extraction error:', driveErr.message);
            await sendApplicationFailedEmail({ name, email: cleanEmail }, { title: job.title }, driveErr.message || "Failed to retrieve resume from Google Drive. Please ensure link sharing is set to 'Anyone with the link can view'.");
            return;
          }
        } else if (resumePdfBase64 && typeof resumePdfBase64 === 'string' && resumePdfBase64.trim() !== '') {
          try {
            console.log('[Async Apply] Processing uploaded PDF resume:', resumeFileName || 'resume.pdf');
            const cleanBase64 = resumePdfBase64.replace(/^data:application\/pdf;base64,/, '');
            const buffer = Buffer.from(cleanBase64, 'base64');
            resumeText = await extractTextFromPdfBuffer(buffer);
          } catch (pdfErr: any) {
            console.warn('[Async Apply] PDF extraction error:', pdfErr.message);
            await sendApplicationFailedEmail({ name, email: cleanEmail }, { title: job.title }, pdfErr.message || "Failed to extract text from uploaded PDF. Please ensure it is a valid, readable text PDF.");
            return;
          }
        }

        if (!resumeText) {
          await sendApplicationFailedEmail({ name, email: cleanEmail }, { title: job.title }, "No resume content was provided or successfully extracted. Please attach a valid resume.");
          return;
        }

        // 1 & 2. Ingest LinkedIn and GitHub Concurrently in Parallel
        console.log('[Async Apply] Ingesting profile sources in parallel...');
        const [rawLinkedIn, rawGitHub] = await Promise.all([
          (linkedinUrl && typeof linkedinUrl === 'string' && linkedinUrl.trim() !== '')
            ? enrichLinkedInProfile(linkedinUrl.trim(), resumeText).catch(enrichErr => {
                console.warn('[Async Apply] LinkedIn ingestion notice:', enrichErr?.message);
                return null;
              })
            : Promise.resolve(null),
          (githubUrl && typeof githubUrl === 'string' && githubUrl.trim() !== '')
            ? enrichGitHubUrl(githubUrl.trim(), resumeText, job.description).catch(ghErr => {
                console.warn('[Async Apply] GitHub ingestion notice:', ghErr?.message);
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

        // Ensure we fetch a fresh DB instance before writing
        const currentDb = getDb();
        
        let candidate = currentDb.candidates.find(c => c.email.toLowerCase() === cleanEmail);
        if (candidate) {
          if (linkedinUrl) candidate.linkedinUrl = linkedinUrl;
          if (githubUrl) candidate.githubUrl = githubUrl;
          if (portfolioUrl) candidate.portfolioUrl = portfolioUrl;
          if (resumeDriveUrl) candidate.resumeDriveUrl = resumeDriveUrl;
          if (candidateContext) candidate.candidateContext = candidateContext;
        } else {
          candidate = {
            id: `cand_${Math.random().toString(36).substring(2, 9)}`,
            name,
            email: cleanEmail,
            linkedinUrl,
            githubUrl,
            portfolioUrl,
            resumeDriveUrl: resumeDriveUrl || undefined,
            candidateContext
          };
          currentDb.candidates.push(candidate);
        }

        // Check again to avoid race conditions
        const existingApp = currentDb.applications.find(a => a.jobId === jobId && a.candidateId === candidate.id);
        if (existingApp) {
          console.warn('[Async Apply] Application already exists for candidate during async resolution.');
          return;
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

        currentDb.applications.push(newApplication);
        saveDb(currentDb);
        console.log('[Async Apply] Application saved successfully for', cleanEmail);

        // Send Application Received Confirmation Email
        try {
          await sendApplicationReceivedEmail({ name, email: cleanEmail }, { title: job.title });
        } catch (mailErr: any) {
          console.warn('[Async Apply] Failed to send confirmation email:', mailErr.message);
        }
      } catch (err: any) {
        console.error("[Async Apply] Background Processing Error:", err);
        await sendApplicationFailedEmail(
          { name, email: cleanEmail }, 
          { title: job.title }, 
          err.message || "An unexpected error occurred while parsing your profile data."
        ).catch(() => {});
      }
    })();

    return response;
  } catch (err: any) {
    console.error("Apply Route Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
