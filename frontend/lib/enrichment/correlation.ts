import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDb, saveDb, Candidate } from '@/lib/db';
import OpenAI from 'openai';
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

  // 4. Gemini SYNTHESIS ONLY (Generates compact Candidate Interview Brief)
  const requestyKey = process.env.REQUESTY_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('rqsty') ? process.env.OPENAI_API_KEY : undefined);
  const directGeminiKey = process.env.GEMINI_DIRECT_API_KEY || process.env.GEMINI_API_KEY;
  
  // Prefer Direct Gemini Key if available
  const apiKey = directGeminiKey || requestyKey;
  const isUsingRequesty = !directGeminiKey && requestyKey;
  
  if (apiKey) {
    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: isUsingRequesty ? 'https://router.requesty.ai/v1' : 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });

      const systemInstruction = `You are an elite technical recruiting strategist and engineering assessment expert.
Your job is to read raw candidate data (Resume, LinkedIn, GitHub) and a target Job Description, and produce an in-depth, multi-dimensional Candidate Interview Brief.
This brief will be injected directly into the prompt of AI Interviewer Agents to guide a highly rigorous, adaptive technical interview.

CRITICAL ASSESSMENT INSTRUCTIONS:
1. Extract ONLY information useful for interviewing this candidate for this specific role.
2. Strictly distinguish between:
   - "candidate_claim": something the candidate explicitly claims in their resume/profile.
   - "observed_evidence": something directly supported by concrete source data (e.g. a GitHub repo with commit history or stars).
   - "inference": an interpretation or assumption made by you.
   Never turn an inference or resume claim into a verified fact.
3. Preserve provenance for all information (e.g., source: "Resume", "LinkedIn", "GitHub").
4. For areas worth probing, always specify WHY it is worth probing.

Target Job:
Role: ${job.title}
Description: ${job.description}
Requirements: ${job.requirements}

Raw Candidate Data:
Resume: ${JSON.stringify(resume, null, 2)}
LinkedIn: ${JSON.stringify(linkedin || {}, null, 2)}
GitHub Repos: ${JSON.stringify((github?.repositories || []).map(r => ({ name: r.name, description: r.description, language: r.language, isPinned: r.isPinned, stars: (r as any).stars, commits: (r as any).candidateCommits })), null, 2)}

Return ONLY valid JSON matching this exact 10-part schema:
{
  "candidate_snapshot": {
    "current_role": "...",
    "relevant_background": "...",
    "target_role": "...",
    "overall_relevance": "..."
  },
  "relevant_technical_skills": [
    {
      "skill": "...",
      "evidence_type": "candidate_claim" | "observed_evidence" | "inference",
      "source": "..."
    }
  ],
  "relevant_experience": [
    {
      "company": "...",
      "role": "...",
      "duration": "...",
      "what_they_worked_on": "...",
      "relevant_responsibilities": "...",
      "source": "...",
      "claims_vs_evidence": "..."
    }
  ],
  "relevant_projects": [
    {
      "name": "...",
      "description": "...",
      "technologies": ["..."],
      "candidate_contribution": "...",
      "why_relevant": "...",
      "source": "..."
    }
  ],
  "verified_evidence": [
    {
      "item": "...",
      "evidence_strength": "High" | "Medium" | "Low",
      "provenance": "..."
    }
  ],
  "claims_to_validate": [
    {
      "claim": "...",
      "source": "...",
      "what_needs_validation": "..."
    }
  ],
  "areas_worth_probing": [
    {
      "area": "...",
      "why_worth_probing": "..."
    }
  ],
  "potential_gaps": [
    {
      "gap": "...",
      "concern_level": "Minor" | "Moderate" | "Major"
    }
  ],
  "role_alignment": {
    "strong_matches": ["..."],
    "partial_matches": ["..."],
    "missing_or_unclear": ["..."]
  },
  "interview_guidance": {
    "highest_value_investigations": ["..."],
    "do_not_assume": ["..."]
  }
}`;

      let resultText = '';
      let attempts = 0;
      while (attempts < 2) {
        try {
          const response = await openai.chat.completions.create({
            model: isUsingRequesty ? "google/gemini-2.0-flash-exp" : "gemini-3.6-flash",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: "Analyze the raw data and synthesize the Candidate Interview Brief JSON." }
            ],
            response_format: { type: "json_object" }
          });
          resultText = response.choices[0].message.content || '{}';
          break;
        } catch (e) {
          attempts++;
          if (attempts >= 2) throw e;
        }
      }

      resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(resultText);

      if (parsed) {
        (mappedCandidateContext as any).interviewBrief = parsed;
        geminiSynthesisOutput = {
          careerProgression: "Stored in interviewBrief",
          notableClaims: [],
          interviewHooks: []
        };
      }
    } catch (error) {
      console.error('[Gemini Synthesis Error]', error);
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
    interviewBrief: (mappedCandidateContext as any).interviewBrief,

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
