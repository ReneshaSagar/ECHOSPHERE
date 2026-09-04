import { GoogleGenerativeAI } from '@google/generative-ai';
import type { 
  CandidateContext, 
  NormalizedResumeContext, 
  NormalizedLinkedInContext, 
  NormalizedGitHubContext, 
  CrossSourceContext, 
  InterviewContext,
  EnrichmentSourceLogging
} from '@/lib/db';

/**
 * Normalizes raw Resume text into structured resume context.
 */
function normalizeResume(text: string, fileName?: string, driveUrl?: string): NormalizedResumeContext {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const snippet = text.slice(0, 1000);

  // Extract common tech explicitly mentioned in resume text
  const commonTech = [
    'Python', 'FastAPI', 'Django', 'Go', 'Golang', 'Node.js', 'TypeScript', 'JavaScript', 
    'React', 'Next.js', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 
    'GCP', 'WebRTC', 'LLM', 'RAG', 'Agora', 'PyTorch', 'TensorFlow', 'SQL', 'GraphQL', 'Solidity'
  ];
  const foundSkills = commonTech.filter(tech => 
    new RegExp(`(?:^|[^a-zA-Z0-9#+.-])${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-zA-Z0-9#+.-])`, 'i').test(text)
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
 * 
 * STRICT RULES:
 * - Headline must be preserved EXACTLY as returned by the provider. Never abbreviate or rewrite it.
 * - If a field is missing from the provider, leave it null/undefined. Do NOT infer or rewrite it.
 */
function normalizeLinkedIn(rawLinkedIn?: any): NormalizedLinkedInContext | undefined {
  if (!rawLinkedIn) return undefined;

  const headline = rawLinkedIn.headline ? String(rawLinkedIn.headline).trim() : (rawLinkedIn.position ? String(rawLinkedIn.position).trim() : undefined);
  const about = rawLinkedIn.about ? String(rawLinkedIn.about).trim() : (rawLinkedIn.summary ? String(rawLinkedIn.summary).trim() : undefined);

  const rawExp = rawLinkedIn.experience || [];
  const exp = Array.isArray(rawExp) ? rawExp.map((e: any) => ({
    title: String(e.title || e.position || 'Role').trim(),
    company: String(e.company || e.company_name || 'Company').trim(),
    duration: e.duration ? String(e.duration).trim() : (e.start_date ? `${e.start_date} - ${e.end_date || 'Present'}` : undefined),
    description: typeof e.description === 'string' ? e.description.slice(0, 500) : undefined
  })) : [];

  const rawEdu = rawLinkedIn.education || [];
  const edu = Array.isArray(rawEdu) ? rawEdu.map((ed: any) => ({
    school: String(ed.school || ed.school_name || 'Institution').trim(),
    degree: ed.degree || ed.degree_name,
    fieldOfStudy: ed.field_of_study,
    year: ed.year ? String(ed.year).trim() : (ed.end_year ? String(ed.end_year).trim() : undefined)
  })) : [];

  const rawSkills = rawLinkedIn.skills || [];
  const skills = Array.isArray(rawSkills) 
    ? rawSkills.map((s: any) => typeof s === 'string' ? s.trim() : (s.name || s.title || '').trim()).filter(Boolean)
    : [];

  const rawProjects = rawLinkedIn.projects || [];
  const projects = Array.isArray(rawProjects)
    ? rawProjects.map((p: any) => ({
        title: String(p.title || p.name).trim(),
        description: p.description ? String(p.description).trim() : undefined,
        url: p.url || p.link || undefined
      }))
    : [];

  const rawCerts = rawLinkedIn.certifications || [];
  const certs = Array.isArray(rawCerts)
    ? rawCerts.map((c: any) => ({
        name: String(c.name || c.title).trim(),
        issuer: c.issuer || c.authority || undefined,
        year: c.year ? String(c.year).trim() : (c.date ? String(c.date).trim() : undefined)
      }))
    : [];

  return {
    profileUrl: rawLinkedIn.url || rawLinkedIn.profileUrl,
    headline,
    about,
    experience: exp,
    skills,
    education: edu,
    projects,
    certifications: certs,
    careerProgression: rawLinkedIn.careerProgression,
    notableClaims: rawLinkedIn.notableClaims
  };
}

/**
 * Normalizes raw GitHub data into clean NormalizedGitHubContext.
 * Pinned repositories and metadata derived ONLY from provider responses, NEVER from Gemini.
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
 * Deterministic heuristic correlation fallback when Gemini is unreachable.
 */
function buildHeuristicCorrelation(
  resume: NormalizedResumeContext,
  linkedin?: NormalizedLinkedInContext,
  github?: NormalizedGitHubContext,
  job?: { title: string; description: string; requirements: string }
): { crossSourceContext: CrossSourceContext; interviewContext: InterviewContext } {
  const resumeSkills = new Set((resume.skills || []).map(s => s.toLowerCase()));
  const linkedinSkills = new Set((linkedin?.skills || []).map(s => s.toLowerCase()));
  const githubLangs = new Set(
    (github?.repositories || []).map(r => (r.language || '').toLowerCase()).filter(Boolean)
  );

  const corroboratedSkills: CrossSourceContext['corroboratedSkills'] = [];
  const allKnownSkills = new Set([...resumeSkills, ...linkedinSkills, ...githubLangs]);

  for (const s of allKnownSkills) {
    const inResume = resumeSkills.has(s);
    const inLinkedIn = linkedinSkills.has(s);
    const inGitHub = githubLangs.has(s);

    const sources: ('resume' | 'linkedin' | 'github')[] = [];
    if (inResume) sources.push('resume');
    if (inLinkedIn) sources.push('linkedin');
    if (inGitHub) sources.push('github');

    if (sources.length >= 2) {
      corroboratedSkills.push({
        skill: s.charAt(0).toUpperCase() + s.slice(1),
        sources,
        confidence: 'HIGH',
        evidenceSnippet: `Confirmed across: ${sources.join(', ')}`
      });
    } else if (sources.length === 1) {
      corroboratedSkills.push({
        skill: s.charAt(0).toUpperCase() + s.slice(1),
        sources,
        confidence: 'MEDIUM',
        evidenceSnippet: `Reported on ${sources[0]}`
      });
    }
  }

  // Corroborate Projects across GitHub and Resume
  const corroboratedProjects: CrossSourceContext['corroboratedProjects'] = [];
  for (const r of (github?.repositories || [])) {
    const inResume = resume.textSnippet?.toLowerCase().includes(r.name.toLowerCase());
    const sources: ('resume' | 'linkedin' | 'github')[] = ['github'];
    if (inResume) sources.push('resume');

    corroboratedProjects.push({
      projectName: r.name,
      description: r.description || `Repository in ${r.language || 'code'}`,
      sources,
      details: r.readmeSnippet || `Active codebase exploring ${r.topics?.join(', ') || r.language || 'software architecture'}.`,
      evidenceSnippet: `GitHub repository: ${r.url}`
    });
  }

  // Corroborated Experience
  const corroboratedExperience: CrossSourceContext['corroboratedExperience'] = (linkedin?.experience || []).map(e => ({
    role: e.title,
    company: e.company,
    duration: e.duration,
    sources: ['linkedin'],
    corroborationNotes: 'Extracted directly from verified provider profile.'
  }));

  const careerProgressionSummary = linkedin?.experience && linkedin.experience.length > 0
    ? `${linkedin.experience[0].title} at ${linkedin.experience[0].company}, with background in ${corroboratedSkills.slice(0, 4).map(s => s.skill).join(', ')}.`
    : `Engineer with demonstrated codebase projects in ${corroboratedSkills.slice(0, 4).map(s => s.skill).join(', ')}.`;

  const notableClaims: CrossSourceContext['notableClaims'] = [];
  (resume.notableHighlights || []).forEach(h => {
    notableClaims.push({
      claim: h,
      source: 'resume',
      verificationFocus: 'Probe technical metrics and architectural trade-offs during live discussion.'
    });
  });

  const technicalInterviewHooks: string[] = [];
  for (const p of corroboratedProjects.slice(0, 3)) {
    technicalInterviewHooks.push(
      `In your project '${p.projectName}', what architectural decisions did you make to optimize performance and handle concurrency?`
    );
  }

  const behavioralInterviewHooks: string[] = [
    `Tell me about a complex production or project bottleneck you diagnosed, and how you worked through the trade-offs.`
  ];

  const projectsWorthProbing = corroboratedProjects.slice(0, 3).map(p => ({
    name: p.projectName,
    relevanceLevel: 'HIGH' as const,
    reasonToProbe: `Demonstrates hands-on engineering craft in ${p.details}`,
    suggestedQuestions: [
      `What were the major challenges in building ${p.projectName}?`,
      `How did you handle error states and scaling constraints?`
    ],
    sourceUrl: `https://github.com/${github?.username || 'candidate'}/${p.projectName}`
  }));

  return {
    crossSourceContext: {
      corroboratedSkills: corroboratedSkills.slice(0, 10),
      corroboratedProjects,
      corroboratedExperience,
      careerProgressionSummary,
      notableClaims
    },
    interviewContext: {
      targetRole: job?.title || 'Engineering Role',
      highRelevanceEvidence: corroboratedSkills.slice(0, 4).map(s => ({
        topic: s.skill,
        relevance: 'HIGH' as const,
        reason: `Direct candidate competency verified across ${s.sources.join(', ')}`,
        evidenceSources: s.sources
      })),
      technicalInterviewHooks,
      behavioralInterviewHooks,
      projectsWorthProbing,
      ignoredOrLowRelevanceTopics: []
    }
  };
}

/**
 * Programmatic Deterministic Validator:
 * - Discards any hallucinated skill or project not found in candidate raw text
 * - Filters out irrelevant buzzwords (blockchain, crypto, smart contracts) unless target role demands them
 */
function sanitizeAndVerifyGrounding(
  crossSource: CrossSourceContext,
  interview: InterviewContext,
  rawResumeText: string,
  rawLinkedIn: any,
  rawGitHub: any,
  job: { title: string; description: string; requirements: string }
): { crossSourceContext: CrossSourceContext; interviewContext: InterviewContext } {
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

  const isTermGrounded = (term: string): boolean => {
    if (!term || term.trim().length === 0) return false;
    const clean = term.trim().toLowerCase();
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+.-])${escaped}(?:$|[^a-zA-Z0-9#+.-])`, 'i');
    return regex.test(fullCorpus);
  };

  // 1. Audit Corroborated Skills
  const verifiedSkills: CrossSourceContext['corroboratedSkills'] = [];
  for (const s of (crossSource.corroboratedSkills || [])) {
    if (isTermGrounded(s.skill)) {
      verifiedSkills.push(s);
    } else {
      console.warn(`[Anti-Hallucination Guard] Discarded ungrounded skill: "${s.skill}"`);
    }
  }

  // 2. Audit Corroborated Projects
  const verifiedProjects: CrossSourceContext['corroboratedProjects'] = [];
  for (const p of (crossSource.corroboratedProjects || [])) {
    if (isTermGrounded(p.projectName)) {
      verifiedProjects.push(p);
    } else {
      console.warn(`[Anti-Hallucination Guard] Discarded ungrounded project: "${p.projectName}"`);
    }
  }

  // 3. Strict Relevance & Noise Filtering
  const targetJobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
  const isJobBlockchain = /blockchain|solidity|web3|ethereum|smart contract|crypto|defi/i.test(targetJobText);
  const isJobGameDev = /unreal|unity|gameplay|godot/i.test(targetJobText);

  const ignoredOrLowRelevance = new Set(interview.ignoredOrLowRelevanceTopics || []);

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

  // Filter Interview Hooks
  const sanitizedTechnicalHooks = (interview.technicalInterviewHooks || []).filter(hook => {
    for (const check of irrelevantCheckers) {
      if (!check.relevantToJob && check.regex.test(hook)) {
        console.log(`[Relevance Filter] Removed irrelevant interview hook mentioning ${check.domain}: "${hook}"`);
        return false;
      }
    }
    return true;
  });

  // Filter Projects Worth Probing
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
 * 
 * STRICT ARCHITECTURAL PRINCIPLES:
 * 1. Provider JSON (LinkedIn & GitHub) is the SINGLE SOURCE OF TRUTH for all factual fields.
 * 2. Deterministic mappers parse raw provider responses into CandidateContext.
 * 3. Gemini is strictly used ONLY for synthesis:
 *    - careerProgression
 *    - notableClaims
 *    - interviewHooks
 *    Fields that MUST NEVER be generated by Gemini:
 *    - headline, name, bio/about, experience, education, skills, projects, certifications,
 *      organizations, repository names, pinned repositories, stars, languages, commit counts.
 * 4. Missing provider fields remain null/undefined. No inference, no guessing.
 * 5. Display the original headline exactly as returned by the provider. Never abbreviate or rewrite.
 * 6. Pinned repositories derived strictly from provider / GraphQL / HTML, not Gemini.
 * 7. Comprehensive source logging across all 3 stages for verifiable diffing.
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
  // Extract underlying raw provider JSON
  const rawLinkedInProvider = rawLinkedIn?.rawProviderJson || rawLinkedIn;
  const rawGitHubProvider = rawGitHub?.rawProviderJson || rawGitHub;

  // 1. Separate & Deterministically Normalize Ingestion Sources (ZERO LLM EXTRACTION)
  const resume = normalizeResume(rawResumeText, rawResumeFileName, rawResumeDriveUrl);
  const linkedin = normalizeLinkedIn(rawLinkedIn);
  const github = normalizeGitHub(rawGitHub);

  // 2. Build Mapped CandidateContext Snapshot (Stage 2)
  const mappedCandidateContext = {
    headline: linkedin?.headline || null,
    name: rawLinkedInProvider?.name || rawGitHubProvider?.name || null,
    bio: linkedin?.about || rawGitHubProvider?.bio || null,
    experience: linkedin?.experience || [],
    education: linkedin?.education || [],
    skills: linkedin?.skills || [],
    projects: linkedin?.projects || [],
    certifications: linkedin?.certifications || [],
    organizations: rawLinkedInProvider?.organizations || [],
    github: {
      username: github?.username || null,
      repositoryNames: (github?.repositories || []).map(r => r.name),
      pinnedRepositories: (github?.repositories || []).filter(r => r.isPinned).map(r => r.name),
      stars: (github?.repositories || []).reduce((acc, r: any) => acc + (r.stars || 0), 0),
      languages: Array.from(new Set((github?.repositories || []).map(r => r.language).filter(Boolean) as string[])),
      commitCounts: {
        total: rawGitHubProvider?.totalCommits,
        recent30Days: rawGitHubProvider?.recentCommits30Days
      }
    }
  };

  // Stage 1 & Stage 2 Console Source Logging
  console.log('\n================== [ENRICHMENT STAGE 1: RAW PROVIDER JSON] ==================');
  console.log('LinkedIn Raw Keys:', Object.keys(rawLinkedInProvider || {}));
  console.log('LinkedIn Original Headline:', rawLinkedInProvider?.headline || rawLinkedInProvider?.position || 'N/A');
  console.log('GitHub Raw Username:', rawGitHubProvider?.username || 'N/A');
  console.log('GitHub Repositories Count (Raw):', rawGitHubProvider?.repos?.length || rawGitHubProvider?.allRepoNames?.length || 0);
  console.log('GitHub Pinned Repos (Provider/GraphQL):', rawGitHubProvider?.pinnedRepoNames || []);
  console.log('GitHub Total Commits:', rawGitHubProvider?.totalCommits ?? 'N/A');
  console.log('GitHub Recent 30-Day Commits:', rawGitHubProvider?.recentCommits30Days ?? 'N/A');

  console.log('\n================== [ENRICHMENT STAGE 2: MAPPED CANDIDATE CONTEXT] ==================');
  console.log('Mapped Headline (Exact Provider String):', mappedCandidateContext.headline);
  console.log('Mapped Experience Items:', mappedCandidateContext.experience.length);
  console.log('Mapped Education Items:', mappedCandidateContext.education.length);
  console.log('Mapped Skills Items:', mappedCandidateContext.skills.length);
  console.log('Mapped Projects Items:', mappedCandidateContext.projects.length);
  console.log('Mapped GitHub Repositories:', mappedCandidateContext.github.repositoryNames);
  console.log('Mapped GitHub Pinned Repositories:', mappedCandidateContext.github.pinnedRepositories);
  console.log('====================================================================================\n');

  // 3. Prepare Base Heuristic Synthesis
  const baseSynthesis = buildHeuristicCorrelation(resume, linkedin, github, job);
  let crossSourceContext = baseSynthesis.crossSourceContext;
  let interviewContext = baseSynthesis.interviewContext;

  let geminiSynthesisOutput: EnrichmentSourceLogging['geminiSynthesis'] = {
    careerProgression: crossSourceContext.careerProgressionSummary,
    notableClaims: crossSourceContext.notableClaims,
    interviewHooks: interviewContext.technicalInterviewHooks.concat(interviewContext.behavioralInterviewHooks)
  };

  // 4. Gemini SYNTHESIS ONLY (Strictly forbidden from generating factual profile information)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-3.6-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `You are an AI synthesis strategist and principal interviewer for EchoSphere.
You are given verified, immutable CandidateContext extracted deterministically from Resume, LinkedIn, and GitHub, alongside a target Job Description.

STRICT DATA INTEGRITY DIRECTIVE:
- YOU ARE STRICTLY FORBIDDEN FROM GENERATING OR ALTERING FACTUAL PROFILE FIELDS:
  Do NOT generate or modify: headline, name, bio/about, experience, education, skills, projects, certifications, organizations, repository names, pinned repositories, stars, languages, or commit counts.
- All factual information is already finalized by deterministic mappers from provider APIs.
- Your output is EXCLUSIVELY limited to high-level analysis and question synthesis.

REQUIRED SYNTHESIS OUTPUTS:
1. "careerProgressionSummary": 1-2 sentence narrative summarizing their professional trajectory based strictly on the verified roles and dates provided.
2. "notableClaims": 2-4 verified claims, achievements, or metrics explicitly stated in their background with a "verificationFocus" for live interview probing.
3. "highRelevanceEvidence": 3-4 topics from their verified background that directly align with "${job.title}".
4. "technicalInterviewHooks": 2-4 deep technical questions probing their architectural choices, data flows, or concurrency in their verified projects.
5. "behavioralInterviewHooks": 1-2 behavioral questions regarding collaboration and production challenges.
6. "projectsWorthProbing": 1-3 projects from their verified project list that are relevant to "${job.title}".
7. "ignoredOrLowRelevanceTopics": Background topics that are outside the scope of "${job.title}" (e.g. blockchain/crypto, unrelated game scripts, generic web utilities) to omit from the interview.

Target Job:
Role: ${job.title}
Description: ${job.description}
Requirements: ${job.requirements}

Verified Candidate Context (Deterministic Ground Truth):
Resume Summary: ${JSON.stringify(resume, null, 2)}
Verified LinkedIn: ${JSON.stringify(linkedin || {}, null, 2)}
Verified GitHub Repositories: ${JSON.stringify((github?.repositories || []).map(r => ({ name: r.name, description: r.description, language: r.language, isPinned: r.isPinned })), null, 2)}

Return ONLY valid JSON matching this exact schema:
{
  "careerProgressionSummary": "...",
  "notableClaims": [
    { "claim": "...", "source": "resume" | "linkedin" | "github", "verificationFocus": "..." }
  ],
  "highRelevanceEvidence": [
    { "topic": "...", "relevance": "HIGH", "reason": "...", "evidenceSources": ["resume", "github"] }
  ],
  "technicalInterviewHooks": [ "..." ],
  "behavioralInterviewHooks": [ "..." ],
  "projectsWorthProbing": [
    { "name": "...", "relevanceLevel": "HIGH", "reasonToProbe": "...", "suggestedQuestions": ["..."], "sourceUrl": "..." }
  ],
  "ignoredOrLowRelevanceTopics": [ "..." ]
}`;

      const res = await model.generateContent(prompt);
      const parsed = JSON.parse(res.response.text());

      if (parsed) {
        if (parsed.careerProgressionSummary) {
          crossSourceContext.careerProgressionSummary = parsed.careerProgressionSummary;
        }
        if (Array.isArray(parsed.notableClaims) && parsed.notableClaims.length > 0) {
          crossSourceContext.notableClaims = parsed.notableClaims;
        }
        if (Array.isArray(parsed.highRelevanceEvidence) && parsed.highRelevanceEvidence.length > 0) {
          interviewContext.highRelevanceEvidence = parsed.highRelevanceEvidence;
        }
        if (Array.isArray(parsed.technicalInterviewHooks) && parsed.technicalInterviewHooks.length > 0) {
          interviewContext.technicalInterviewHooks = parsed.technicalInterviewHooks;
        }
        if (Array.isArray(parsed.behavioralInterviewHooks) && parsed.behavioralInterviewHooks.length > 0) {
          interviewContext.behavioralInterviewHooks = parsed.behavioralInterviewHooks;
        }
        if (Array.isArray(parsed.projectsWorthProbing) && parsed.projectsWorthProbing.length > 0) {
          interviewContext.projectsWorthProbing = parsed.projectsWorthProbing;
        }
        if (Array.isArray(parsed.ignoredOrLowRelevanceTopics) && parsed.ignoredOrLowRelevanceTopics.length > 0) {
          interviewContext.ignoredOrLowRelevanceTopics = parsed.ignoredOrLowRelevanceTopics;
        }

        geminiSynthesisOutput = {
          careerProgression: parsed.careerProgressionSummary,
          notableClaims: parsed.notableClaims,
          interviewHooks: (parsed.technicalInterviewHooks || []).concat(parsed.behavioralInterviewHooks || [])
        };
      }
    } catch (llmErr: any) {
      console.warn('[Correlation Engine] Gemini synthesis fallback to heuristic:', llmErr.message);
    }
  }

  // 5. Deterministic Grounding & Irrelevant Topic Pruning
  const sanitized = sanitizeAndVerifyGrounding(
    crossSourceContext,
    interviewContext,
    rawResumeText,
    rawLinkedInProvider,
    rawGitHubProvider,
    job
  );
  crossSourceContext = sanitized.crossSourceContext;
  interviewContext = sanitized.interviewContext;

  // Stage 3 Console Source Logging
  console.log('\n================== [ENRICHMENT STAGE 3: GEMINI SYNTHESIS] ==================');
  console.log('Synthesized Career Progression:', crossSourceContext.careerProgressionSummary);
  console.log('Synthesized Notable Claims:', crossSourceContext.notableClaims.length);
  console.log('Synthesized Technical Hooks:', interviewContext.technicalInterviewHooks.length);
  console.log('Synthesized Behavioral Hooks:', interviewContext.behavioralInterviewHooks.length);
  console.log('Synthesized Projects Worth Probing:', interviewContext.projectsWorthProbing.length);
  console.log('Excluded Irrelevant Topics:', interviewContext.ignoredOrLowRelevanceTopics);
  console.log('============================================================================\n');

  // 6. Assemble Final CandidateContext (Strictly preserves factual profile fields from provider)
  const fullContext: CandidateContext = {
    // 5 Normalized Layers
    resume,
    linkedin,
    github,
    crossSourceContext,
    interviewContext,

    // Factual fields directly from deterministic mapper (NEVER from Gemini)
    // Original headline exactly as returned by provider:
    headline: linkedin?.headline || undefined,
    about: linkedin?.about || undefined,
    experience: linkedin?.experience || [],
    skills: Array.from(new Set((linkedin?.skills || []).concat(crossSourceContext.corroboratedSkills.map(s => s.skill)))),
    education: linkedin?.education || [],
    projects: linkedin?.projects || [],
    certifications: linkedin?.certifications || [],
    organizations: rawLinkedInProvider?.organizations || [],

    // Synthesis fields from Gemini
    careerProgression: crossSourceContext.careerProgressionSummary,
    notableClaims: crossSourceContext.notableClaims.map(c => c.claim),
    interviewHooks: interviewContext.technicalInterviewHooks.concat(interviewContext.behavioralInterviewHooks),

    enrichmentSource: linkedin ? (github ? 'brightdata+github+resume' : 'brightdata+resume') : 'resume',
    enrichedAt: new Date().toISOString(),

    // Legacy GitHub Context Mapping (Pure deterministic provider values)
    githubContext: rawGitHub,
    totalCommits: rawGitHubProvider?.totalCommits,
    recentCommits30Days: rawGitHubProvider?.recentCommits30Days,
    commitVelocityNarrative: rawGitHub?.commitVelocityNarrative,
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
    githubInterviewHooks: interviewContext.technicalInterviewHooks,

    // Source Logging Audit Trace for Complete Diffing
    sourceLogging: {
      rawProviderJson: {
        linkedin: rawLinkedInProvider || null,
        github: rawGitHubProvider || null
      },
      mappedCandidateContext,
      geminiSynthesis: geminiSynthesisOutput,
      timestamp: new Date().toISOString()
    }
  };

  return fullContext;
}
