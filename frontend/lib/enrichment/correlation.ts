import { GoogleGenerativeAI } from '@google/generative-ai';
import type { 
  CandidateContext, 
  NormalizedResumeContext, 
  NormalizedLinkedInContext, 
  NormalizedGitHubContext, 
  CrossSourceContext, 
  InterviewContext 
} from '@/lib/db';

/**
 * Normalizes raw Resume text into structured resume context.
 */
function normalizeResume(text: string, fileName?: string, driveUrl?: string): NormalizedResumeContext {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const snippet = text.slice(0, 1000);

  // Extract rough skills if mentioned
  const commonTech = [
    'Python', 'FastAPI', 'Django', 'Go', 'Golang', 'Node.js', 'TypeScript', 'JavaScript', 
    'React', 'Next.js', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 
    'GCP', 'WebRTC', 'LLM', 'RAG', 'Agora', 'PyTorch', 'TensorFlow', 'SQL', 'GraphQL'
  ];
  const foundSkills = commonTech.filter(tech => 
    new RegExp(`\\b${tech}\\b`, 'i').test(text)
  );

  return {
    textSnippet: snippet,
    fileName,
    driveUrl,
    skills: foundSkills,
    experienceTitles: lines.filter(l => /engineer|developer|intern|lead|architect|manager/i.test(l)).slice(0, 5),
    projects: lines.filter(l => /project|built|developed|designed|implemented/i.test(l)).slice(0, 5),
    notableHighlights: lines.filter(l => /\d+%|\d+M|\d+k|scaled|optimized|architected|concurrency/i.test(l)).slice(0, 5)
  };
}

/**
 * Normalizes raw LinkedIn data into clean NormalizedLinkedInContext.
 */
function normalizeLinkedIn(rawLinkedIn?: any): NormalizedLinkedInContext | undefined {
  if (!rawLinkedIn) return undefined;

  const rawExp = rawLinkedIn.experience || [];
  const exp = Array.isArray(rawExp) ? rawExp.map((e: any) => ({
    title: e.title || e.position || 'Role',
    company: e.company || e.company_name || 'Company',
    duration: e.duration || (e.start_date ? `${e.start_date} - ${e.end_date || 'Present'}` : undefined),
    description: typeof e.description === 'string' ? e.description.slice(0, 500) : undefined
  })) : [];

  const rawEdu = rawLinkedIn.education || [];
  const edu = Array.isArray(rawEdu) ? rawEdu.map((ed: any) => ({
    school: ed.school || ed.school_name || 'Institution',
    degree: ed.degree || ed.degree_name,
    fieldOfStudy: ed.field_of_study,
    year: ed.year ? String(ed.year) : (ed.end_year ? String(ed.end_year) : undefined)
  })) : [];

  const rawSkills = rawLinkedIn.skills || [];
  const skills = Array.isArray(rawSkills) 
    ? rawSkills.map((s: any) => typeof s === 'string' ? s : (s.name || s.title || '')).filter(Boolean)
    : [];

  return {
    profileUrl: rawLinkedIn.url || rawLinkedIn.profileUrl,
    headline: rawLinkedIn.headline || rawLinkedIn.position,
    about: rawLinkedIn.about || rawLinkedIn.summary,
    experience: exp,
    skills,
    education: edu,
    projects: rawLinkedIn.projects,
    certifications: rawLinkedIn.certifications,
    careerProgression: rawLinkedIn.careerProgression,
    notableClaims: rawLinkedIn.notableClaims
  };
}

/**
 * Normalizes raw GitHub data into clean NormalizedGitHubContext.
 * STRICT: Excludes commit velocity as quality scoring or verification metrics.
 * Uses repositories solely as contextual evidence of active work and architectural topics.
 */
function normalizeGitHub(rawGitHub?: any): NormalizedGitHubContext | undefined {
  if (!rawGitHub) return undefined;

  const repos = Array.isArray(rawGitHub.repos || rawGitHub.githubProjects) 
    ? (rawGitHub.repos || rawGitHub.githubProjects).map((r: any) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        topics: Array.isArray(r.topics) ? r.topics : [],
        url: r.url || r.html_url,
        isPinned: Boolean(r.isPinned),
        readmeSnippet: r.readmeSnippet || r.keyInsights
      }))
    : [];

  return {
    username: rawGitHub.username,
    profileUrl: rawGitHub.profileUrl,
    bio: rawGitHub.bio,
    publicReposCount: rawGitHub.publicReposCount || repos.length,
    repositories: repos,
    activeProjects: repos.map((r: any) => r.name)
  };
}

/**
 * Heuristic fallback correlation engine if Gemini is unreachable.
 */
function buildHeuristicCorrelation(
  resume: NormalizedResumeContext,
  linkedin?: NormalizedLinkedInContext,
  github?: NormalizedGitHubContext,
  job?: { title: string; description: string; requirements: string }
): { crossSourceContext: CrossSourceContext; interviewContext: InterviewContext } {
  // 1. Corroborate Skills across sources
  const resumeSkills = new Set((resume.skills || []).map(s => s.toLowerCase()));
  const linkedinSkills = new Set((linkedin?.skills || []).map(s => s.toLowerCase()));
  const githubLangs = new Set((github?.repositories || []).map(r => (r.language || '').toLowerCase()).filter(Boolean));

  const allSkills = new Set([...resumeSkills, ...linkedinSkills, ...githubLangs]);
  const corroboratedSkills: CrossSourceContext['corroboratedSkills'] = [];

  for (const skill of allSkills) {
    const sources: ('resume' | 'linkedin' | 'github')[] = [];
    if (resumeSkills.has(skill)) sources.push('resume');
    if (linkedinSkills.has(skill)) sources.push('linkedin');
    if (githubLangs.has(skill)) sources.push('github');

    if (sources.length >= 2) {
      corroboratedSkills.push({
        skill: skill.charAt(0).toUpperCase() + skill.slice(1),
        sources,
        confidence: sources.length >= 3 ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  // 2. Corroborate Projects
  const corroboratedProjects: CrossSourceContext['corroboratedProjects'] = [];
  const resumeTextLower = (resume.textSnippet || '').toLowerCase();
  (github?.repositories || []).forEach(r => {
    if (resumeTextLower.includes(r.name.toLowerCase())) {
      corroboratedProjects.push({
        projectName: r.name,
        description: r.description || `Repository ${r.name} in ${r.language || 'code'}`,
        sources: ['resume', 'github'],
        details: `Corroborated across Resume and public GitHub repository (${r.url || 'GitHub'}).`
      });
    }
  });

  // 3. Corroborate Experience
  const corroboratedExperience: CrossSourceContext['corroboratedExperience'] = [];
  (linkedin?.experience || []).forEach(exp => {
    if (resumeTextLower.includes(exp.company.toLowerCase())) {
      corroboratedExperience.push({
        role: exp.title,
        company: exp.company,
        duration: exp.duration,
        sources: ['resume', 'linkedin'],
        corroborationNotes: `Role verified across Resume and LinkedIn profile.`
      });
    }
  });

  // 4. JD-Specific Relevance Filter
  const jobTextLower = `${job?.title || ''} ${job?.description || ''} ${job?.requirements || ''}`.toLowerCase();
  const isBackend = /backend|distributed|systems|api|concurrency|database|infrastructure|microservice/i.test(jobTextLower);
  
  const highRelevanceEvidence: InterviewContext['highRelevanceEvidence'] = [];
  const projectsWorthProbing: InterviewContext['projectsWorthProbing'] = [];
  const ignoredOrLowRelevanceTopics: string[] = [];

  (github?.repositories || []).forEach(r => {
    const repoText = `${r.name} ${r.description || ''} ${r.language || ''} ${(r.topics || []).join(' ')}`.toLowerCase();
    const isTutorial = /tutorial|assignment|learn|practice|course|exercise|demo/i.test(r.name);
    const isUIOnly = /css|html|landing|template|portfolio/i.test(repoText) && !/node|python|go|backend|db/i.test(repoText);

    if (isTutorial) {
      ignoredOrLowRelevanceTopics.push(`${r.name} (flagged as basic practice/tutorial repository)`);
    } else if (isBackend && isUIOnly) {
      ignoredOrLowRelevanceTopics.push(`${r.name} (static UI project; deprioritized for Backend role)`);
    } else {
      const matchScore = (r.language && jobTextLower.includes(r.language.toLowerCase()) ? 1 : 0) +
        (r.topics || []).filter((t: string) => jobTextLower.includes(t.toLowerCase())).length;

      const relevanceLevel = matchScore > 0 || r.isPinned ? 'HIGH' : 'MEDIUM';

      highRelevanceEvidence.push({
        topic: `${r.name} (${r.language || 'Multi-language'})`,
        relevance: relevanceLevel,
        reason: r.description || `Engineering project relevant to ${job?.title || 'target role'}`,
        evidenceSources: ['github']
      });

      projectsWorthProbing.push({
        name: r.name,
        relevanceLevel,
        reasonToProbe: `Explore hands-on architecture, code structure, and trade-offs in ${r.name}.`,
        suggestedQuestions: [
          `In your project ${r.name}, walk me through the core architectural decisions and concurrency model.`,
          `What were the major technical trade-offs or bottlenecks you encountered while implementing ${r.name}?`
        ],
        sourceUrl: r.url
      });
    }
  });

  const technicalInterviewHooks = [
    `Discuss real-world system design and concurrency trade-offs based on candidate's corroborated projects: ${corroboratedProjects.map(p => p.projectName).join(', ') || 'backend services'}.`,
    `Probe deep technical implementations in ${corroboratedSkills.slice(0, 3).map(s => s.skill).join(', ')} under high throughput or scale.`
  ];

  const behavioralInterviewHooks = [
    `Tell me about an instance in your past work where an architectural decision had unexpected trade-offs, and how you iterated on it.`,
    `How do you collaborate across engineering and product when balancing technical debt vs shipping speed?`
  ];

  return {
    crossSourceContext: {
      corroboratedSkills,
      corroboratedProjects,
      corroboratedExperience,
      careerProgressionSummary: linkedin?.careerProgression || 'Direct transition into advanced engineering responsibilities.',
      notableClaims: (linkedin?.notableClaims || []).map(c => ({
        claim: c,
        source: 'linkedin',
        verificationFocus: 'Explore technical scale, benchmarks, and concrete implementation details.'
      }))
    },
    interviewContext: {
      targetRole: job?.title || 'Engineering Role',
      highRelevanceEvidence,
      technicalInterviewHooks,
      behavioralInterviewHooks,
      projectsWorthProbing,
      ignoredOrLowRelevanceTopics
    }
  };
}

/**
 * Main Pipeline Function:
 * Takes raw Ingestion Sources (Resume, LinkedIn, GitHub) + Job Description,
 * executes Cross-Source Correlation & JD-Specific Relevance Filtering,
 * and produces the unified 5-layer CandidateContext.
 */
export async function correlateAndBuildCandidateContext({
  rawResumeText,
  rawResumeFileName,
  rawResumeDriveUrl,
  rawLinkedIn,
  rawGitHub,
  job
}: {
  rawResumeText: string;
  rawResumeFileName?: string;
  rawResumeDriveUrl?: string;
  rawLinkedIn?: any;
  rawGitHub?: any;
  job: { id: string; title: string; description: string; requirements: string };
}): Promise<CandidateContext> {
  // 1. Separate & Normalize Ingestion Sources
  const resume = normalizeResume(rawResumeText, rawResumeFileName, rawResumeDriveUrl);
  const linkedin = normalizeLinkedIn(rawLinkedIn);
  const github = normalizeGitHub(rawGitHub);

  // 2. Prepare Base Heuristic Synthesis
  const baseSynthesis = buildHeuristicCorrelation(resume, linkedin, github, job);
  let crossSourceContext = baseSynthesis.crossSourceContext;
  let interviewContext = baseSynthesis.interviewContext;

  // 3. Enhance with Gemini LLM Reasoning if API key is present
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-3.6-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `You are a Principal Software Architect & Head of Technical Hiring.
You are given candidate data from 3 ingestion sources (Resume, LinkedIn, GitHub) and a target Job Description.

Perform a deep Cross-Source Correlation and JD-Specific Relevance Filtering.

CRITICAL INSTRUCTIONS & STRICT BOUNDARIES:
1. Cross-Source Correlation (crossSourceContext):
   - Identify corroborated skills (appearing in 2 or 3 sources).
   - Identify corroborated projects (mentioned in Resume/LinkedIn that correspond to GitHub repositories).
   - Corroborate employment and roles between Resume and LinkedIn.
   - Extract notable claims (e.g., "10M events/day", "built real-time pipeline").

2. JD-Specific Relevance (interviewContext):
   - Tailor relevance EXCLUSIVELY to the target Job Description: "${job.title}".
   - Prioritize technologies, architectures, and projects directly relevant to this specific role.
   - For example, if target is a Backend Engineer:
     * FastAPI, Kafka, Redis, WebRTC audio, concurrency, distributed storage -> HIGH RELEVANCE
     * Static CSS landing pages, basic React templates -> LOW RELEVANCE
     * Generic practice/tutorial repos -> IGNORE in ignoredOrLowRelevanceTopics
   - Formulate 3-4 deep technical interview hooks targeting corroborated high-relevance claims.
   - Formulate 2-3 behavioral/trade-off hooks (ownership, design disagreements, scalability failures).
   - Select 2-4 projects worth probing in the live voice interview with specific questions.

3. STRICT EVALUATION RULES:
   - NEVER use GitHub commit count, commit frequency, stars, or followers as candidate-quality signals, verification scores, or disqualification mechanisms.
   - GitHub data is solely contextual information to discover real projects for technical discussion.
   - External profile data must NEVER score, penalize, or judge the candidate. The candidate's live spoken responses during the interview remain the primary evidence for evaluation.

Target Job:
Title: ${job.title}
Description: ${job.description}
Requirements: ${job.requirements}

Candidate Ingestion Sources:
Resume Summary:
${JSON.stringify(resume, null, 2)}

LinkedIn Profile:
${JSON.stringify(linkedin || {}, null, 2)}

GitHub Repositories:
${JSON.stringify(github?.repositories || [], null, 2)}

Return ONLY valid JSON matching this exact schema:
{
  "crossSourceContext": {
    "corroboratedSkills": [
      { "skill": "...", "sources": ["resume", "github"], "confidence": "HIGH" }
    ],
    "corroboratedProjects": [
      { "projectName": "...", "description": "...", "sources": ["resume", "github"], "details": "..." }
    ],
    "corroboratedExperience": [
      { "role": "...", "company": "...", "duration": "...", "sources": ["resume", "linkedin"], "corroborationNotes": "..." }
    ],
    "careerProgressionSummary": "...",
    "notableClaims": [
      { "claim": "...", "source": "resume", "verificationFocus": "Probe architecture and concurrency bottlenecks" }
    ]
  },
  "interviewContext": {
    "targetRole": "${job.title}",
    "highRelevanceEvidence": [
      { "topic": "...", "relevance": "HIGH", "reason": "...", "evidenceSources": ["resume", "github"] }
    ],
    "technicalInterviewHooks": [
      "In project X, walk me through how you handled concurrency and locking...",
      "You mentioned scaling Y to 10M events/day, what were the memory and network bottlenecks?"
    ],
    "behavioralInterviewHooks": [
      "Tell me about a production failure in system Z and how you led the recovery..."
    ],
    "projectsWorthProbing": [
      {
        "name": "...",
        "relevanceLevel": "HIGH",
        "reasonToProbe": "...",
        "suggestedQuestions": ["...", "..."],
        "sourceUrl": "..."
      }
    ],
    "ignoredOrLowRelevanceTopics": [
      "..."
    ]
  }
}`;

      const res = await model.generateContent(prompt);
      const parsed = JSON.parse(res.response.text());
      if (parsed.crossSourceContext && parsed.interviewContext) {
        crossSourceContext = parsed.crossSourceContext;
        interviewContext = parsed.interviewContext;
      }
    } catch (llmErr: any) {
      console.warn('[Correlation Engine] Gemini synthesis fallback to heuristic:', llmErr.message);
    }
  }

  // 4. Construct Full Unified CandidateContext
  const fullContext: CandidateContext = {
    // 5 Normalized Layers
    resume,
    linkedin,
    github,
    crossSourceContext,
    interviewContext,

    // Backwards Compatibility Mapping for Existing ATS Panels
    headline: linkedin?.headline || resume.experienceTitles?.[0],
    about: linkedin?.about || resume.textSnippet?.slice(0, 300),
    experience: linkedin?.experience,
    skills: crossSourceContext.corroboratedSkills.map(s => s.skill).concat(linkedin?.skills || []),
    education: linkedin?.education,
    projects: linkedin?.projects,
    certifications: linkedin?.certifications,
    careerProgression: crossSourceContext.careerProgressionSummary,
    notableClaims: crossSourceContext.notableClaims.map(c => c.claim),
    interviewHooks: interviewContext.technicalInterviewHooks.concat(interviewContext.behavioralInterviewHooks),
    enrichmentSource: linkedin ? (github ? 'linkedin+github+resume' : 'linkedin+resume') : 'resume',
    enrichedAt: new Date().toISOString(),

    // Legacy GitHub Context Mapping
    githubContext: rawGitHub,
    githubProjects: rawGitHub?.githubProjects || github?.repositories?.map((r: any) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      topics: r.topics,
      keyInsights: r.readmeSnippet,
      url: r.url,
      isPinned: r.isPinned,
      isRecent: true
    })),
    githubInterviewHooks: interviewContext.technicalInterviewHooks
  };

  return fullContext;
}
