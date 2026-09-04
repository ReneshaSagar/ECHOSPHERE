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
 * Deterministic Anti-Hallucination & Relevance Validator.
 * 1. Verifies every AI-extracted skill against the raw candidate text. If the skill does not appear
 *    anywhere in the candidate's raw data, it is permanently purged.
 * 2. Filters out irrelevant buzzwords (e.g., blockchain, smart contracts, crypto, game scripts)
 *    from interview question hooks unless the target job is specifically in that domain.
 */
function sanitizeAndVerifyGrounding(
  crossSource: CrossSourceContext,
  interview: InterviewContext,
  rawResumeText: string,
  rawLinkedIn: any,
  rawGitHub: any,
  job: { title: string; description: string; requirements: string }
): { crossSourceContext: CrossSourceContext; interviewContext: InterviewContext } {
  // Build unified search corpus from candidate's raw sources
  const resumeStr = (rawResumeText || '').toLowerCase();
  
  const linkedinParts: string[] = [];
  if (rawLinkedIn) {
    if (rawLinkedIn.headline) linkedinParts.push(rawLinkedIn.headline);
    if (rawLinkedIn.about) linkedinParts.push(rawLinkedIn.about);
    if (Array.isArray(rawLinkedIn.skills)) {
      rawLinkedIn.skills.forEach((s: any) => linkedinParts.push(typeof s === 'string' ? s : s.name || s.title || ''));
    }
    if (Array.isArray(rawLinkedIn.experience)) {
      rawLinkedIn.experience.forEach((e: any) => linkedinParts.push(`${e.title || ''} ${e.company || ''} ${e.description || ''}`));
    }
    if (Array.isArray(rawLinkedIn.projects)) {
      rawLinkedIn.projects.forEach((p: any) => linkedinParts.push(`${p.title || p.name || ''} ${p.description || ''}`));
    }
  }
  const linkedinStr = linkedinParts.join(' ').toLowerCase();

  const githubParts: string[] = [];
  if (rawGitHub) {
    const repos = rawGitHub.repos || rawGitHub.githubProjects || [];
    repos.forEach((r: any) => {
      githubParts.push(`${r.name || ''} ${r.description || ''} ${r.language || ''} ${(r.topics || []).join(' ')}`);
      if (r.readmeSnippet) githubParts.push(r.readmeSnippet);
    });
  }
  const githubStr = githubParts.join(' ').toLowerCase();

  const fullCorpus = `${resumeStr} ${linkedinStr} ${githubStr}`;

  // Helper to test if a term exists in text (handling symbols like C++, C#, .NET, Node.js)
  const isTermGrounded = (term: string): boolean => {
    if (!term || term.trim().length === 0) return false;
    const clean = term.trim().toLowerCase();
    
    // Short acronyms or common terms
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+.-])${escaped}(?:$|[^a-zA-Z0-9#+.-])`, 'i');
    return regex.test(fullCorpus);
  };

  // 1. Audit Corroborated Skills: purge any hallucinated skill
  const verifiedSkills: CrossSourceContext['corroboratedSkills'] = [];
  for (const s of (crossSource.corroboratedSkills || [])) {
    if (isTermGrounded(s.skill)) {
      // Validated against real candidate text
      verifiedSkills.push(s);
    } else {
      console.warn(`[Anti-Hallucination Guard] Discarded ungrounded skill: "${s.skill}" (not found in candidate raw data)`);
    }
  }

  // 2. Audit Corroborated Projects: must appear in resume or match a GitHub/LinkedIn project
  const verifiedProjects: CrossSourceContext['corroboratedProjects'] = [];
  for (const p of (crossSource.corroboratedProjects || [])) {
    if (isTermGrounded(p.projectName)) {
      verifiedProjects.push(p);
    } else {
      console.warn(`[Anti-Hallucination Guard] Discarded ungrounded project: "${p.projectName}"`);
    }
  }

  // 3. Strict Relevance & Noise Filtering (User requirement: "just cuz you saw something on the resume doesnt mean you have to ask about it like if its not relevant at all like asking blockchain is irrelevant unless until it comes up")
  const targetJobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
  const isJobBlockchain = /blockchain|solidity|web3|ethereum|smart contract|crypto|defi/i.test(targetJobText);
  const isJobGameDev = /unreal|unity|gameplay|godot/i.test(targetJobText);

  const ignoredOrLowRelevance = new Set(interview.ignoredOrLowRelevanceTopics || []);

  // Irrelevant domains to flag if NOT part of target job
  const irrelevantCheckers = [
    {
      domain: 'Blockchain / Web3 / Smart Contracts',
      regex: /\b(blockchain|solidity|web3|ethereum|smart contract|crypto|nft|token|hardhat|truffle|defi)\b/i,
      relevantToJob: isJobBlockchain,
      reason: 'Candidate mentioned blockchain/smart contract technology on profile, but it is outside the scope of this role. Omit from interview unless candidate introduces it.'
    },
    {
      domain: 'Unrelated Game Engines',
      regex: /\b(unity|unreal engine|godot|roblox)\b/i,
      relevantToJob: isJobGameDev,
      reason: 'Game development framework noted on resume is not applicable to target engineering role. Do not probe.'
    }
  ];

  for (const check of irrelevantCheckers) {
    if (!check.relevantToJob && check.regex.test(fullCorpus)) {
      ignoredOrLowRelevance.add(`[IRRELEVANT TO ROLE] ${check.domain}: ${check.reason}`);
    }
  }

  // Filter Interview Hooks: remove any questions that ask about ignored/irrelevant topics
  const sanitizedTechnicalHooks = (interview.technicalInterviewHooks || []).filter(hook => {
    for (const check of irrelevantCheckers) {
      if (!check.relevantToJob && check.regex.test(hook)) {
        console.log(`[Relevance Filter] Removed irrelevant interview hook mentioning ${check.domain}: "${hook}"`);
        return false;
      }
    }
    return true;
  });

  // Filter Projects Worth Probing: do not probe projects focused on irrelevant tech
  const sanitizedProjectsToProbe = (interview.projectsWorthProbing || []).filter(proj => {
    for (const check of irrelevantCheckers) {
      if (!check.relevantToJob && (check.regex.test(proj.name) || check.regex.test(proj.reasonToProbe))) {
        console.log(`[Relevance Filter] Excluded irrelevant project probing for ${check.domain}: "${proj.name}"`);
        ignoredOrLowRelevance.add(`${proj.name} (${check.domain} project; excluded from technical interview)`);
        return false;
      }
    }
    return true;
  });

  return {
    crossSourceContext: {
      ...crossSource,
      corroboratedSkills: verifiedSkills,
      corroboratedProjects: verifiedProjects
    },
    interviewContext: {
      ...interview,
      technicalInterviewHooks: sanitizedTechnicalHooks,
      projectsWorthProbing: sanitizedProjectsToProbe,
      ignoredOrLowRelevanceTopics: Array.from(ignoredOrLowRelevance)
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

Perform a deep Cross-Source Correlation, Strict Factual Grounding, and JD-Specific Relevance Filtering.

CRITICAL POLICY 1: ANTI-HALLUCINATION & STRICT FACTUAL GROUNDING (ZERO ASSUMPTIONS)
- CLOSED-BOOK EVALUATION: You may ONLY use information explicitly stated in the candidate's Resume, LinkedIn, or GitHub data. Assume NOTHING else.
- ZERO EXTRAPOLATION: Never infer, guess, or extrapolate unmentioned companion technologies:
  * Stating "Python" does NOT mean they know Django, FastAPI, or Celery unless explicitly written.
  * Stating "React" does NOT mean they know Next.js, Redux, or Tailwind unless explicitly written.
  * Stating "Backend" does NOT mean they know Docker, Kubernetes, Kafka, or AWS unless explicitly written.
- ZERO JD CONTAMINATION: Technologies in the Target Job are employer requirements, NOT candidate skills. Never attribute any technology from the target job to the candidate unless candidate raw sources explicitly state they have used it.
- EVIDENCE CITATION: For every item in "corroboratedSkills", provide an "evidenceSnippet" citing the exact quote or repository proving the candidate actually stated or used it.

CRITICAL POLICY 2: STRICT RELEVANCE & NOISE FILTERING (DO NOT ASK ABOUT IRRELEVANT RESUME TOPICS)
- JUST BECAUSE IT IS ON THE RESUME DOES NOT MEAN YOU SHOULD ASK ABOUT IT:
  * If a candidate mentioned an irrelevant, niche, or mismatched technology (for example: Blockchain, Solidity, Web3, Smart Contracts, Crypto, unrelated game scripts, or obsolete coursework) that does NOT directly relate to the core duties of "${job.title}", DO NOT generate interview questions or hooks for it!
  * Put these unrelated technologies into "ignoredOrLowRelevanceTopics" with an explicit reason (e.g. "Blockchain / Solidity on resume: irrelevant to ${job.title}; omit from interview unless candidate initiates").
- FOCUS 100% OF INTERVIEW HOOKS ON HIGH-RELEVANCE COMPETENCIES:
  * Only formulate "technicalInterviewHooks" and "projectsWorthProbing" around technologies and projects that directly inform their ability to succeed in "${job.title}".

CRITICAL POLICY 3: STRICT EVALUATION BOUNDARIES
- NEVER use GitHub commit count, commit frequency, stars, or followers as candidate-quality signals, verification scores, or disqualification mechanisms.
- External profile data is solely contextual information to discover real projects for technical discussion.

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
${JSON.stringify((github?.repositories || []).slice(0, 15), null, 2)}

Return ONLY valid JSON matching this exact schema:
{
  "crossSourceContext": {
    "corroboratedSkills": [
      { 
        "skill": "Exact skill name", 
        "sources": ["resume", "github"], 
        "confidence": "HIGH",
        "evidenceSnippet": "Resume: 'Built microservices with Python' | GitHub repo: ExpensWise (Python)"
      }
    ],
    "corroboratedProjects": [
      { 
        "projectName": "Exact project name", 
        "description": "...", 
        "sources": ["resume", "github"], 
        "details": "...",
        "evidenceSnippet": "..." 
      }
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
      "Targeting only high-relevance corroborated tech: In project X, walk me through how you handled..."
    ],
    "behavioralInterviewHooks": [
      "Tell me about a production challenge in system Z and how you navigated the trade-offs..."
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
      "[IRRELEVANT TO ROLE] e.g. Blockchain/Solidity — on resume but unrelated to ${job.title}; omit from interview unless candidate initiates."
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

  // 4. Programmatic Deterministic Anti-Hallucination & Relevance Audit
  const sanitized = sanitizeAndVerifyGrounding(
    crossSourceContext,
    interviewContext,
    rawResumeText,
    rawLinkedIn,
    rawGitHub,
    job
  );
  crossSourceContext = sanitized.crossSourceContext;
  interviewContext = sanitized.interviewContext;

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
