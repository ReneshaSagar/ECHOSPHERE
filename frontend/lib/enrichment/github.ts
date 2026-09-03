import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GitHubContext } from '@/lib/db';

export interface ParsedGitHubUrl {
  type: 'profile' | 'repo';
  owner: string;
  repo?: string;
  normalizedUrl: string;
}

/**
 * Validates and parses any GitHub URL into profile or repository targets.
 * Supports http/https and missing protocol.
 */
export function parseGitHubUrl(rawUrl?: string | null): ParsedGitHubUrl | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let clean = rawUrl.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }

  try {
    const parsed = new URL(clean);
    if (!parsed.hostname.includes('github.com')) return null;

    const segments = parsed.pathname.split('/').map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) return null;

    const owner = segments[0];
    // Ignore reserved GitHub paths
    const reserved = ['settings', 'explore', 'topics', 'trending', 'collections', 'events', 'features', 'pricing', 'about', 'contact'];
    if (reserved.includes(owner.toLowerCase())) return null;

    if (segments.length === 1) {
      return {
        type: 'profile',
        owner,
        normalizedUrl: `https://github.com/${owner}`
      };
    }

    const repo = segments[1].replace(/\.git$/i, '');
    return {
      type: 'repo',
      owner,
      repo,
      normalizedUrl: `https://github.com/${owner}/${repo}`
    };
  } catch {
    return null;
  }
}

interface RawRepoInfo {
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  topics: string[];
  url: string;
  languages?: Record<string, number>;
  readmeSnippet?: string;
  updatedAt?: string;
}

interface RawGitHubProfile {
  username: string;
  name?: string;
  bio?: string;
  company?: string;
  location?: string;
  publicReposCount: number;
  followers: number;
  avatarUrl?: string;
  profileUrl: string;
  repos: RawRepoInfo[];
}

/**
 * Creates default GitHub headers with standard User-Agent and optional authorization token.
 */
function getGitHubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'User-Agent': 'EchoSphere-Hiring-Engine/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  return headers;
}

/**
 * Fetches README snippet safely without throwing.
 */
async function fetchReadmeSnippet(owner: string, repo: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
      // Clean markdown badges, take first 600 characters
      const clean = decoded.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '').replace(/#+/g, '').trim();
      return clean.substring(0, 600);
    }
  } catch {
    // Ignore readme fetch error
  }
  return undefined;
}

/**
 * Fetches repository language breakdown.
 */
async function fetchRepoLanguages(owner: string, repo: string): Promise<Record<string, number> | undefined> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore language fetch error
  }
  return undefined;
}

/**
 * Fetches complete GitHub profile data and top public repositories.
 */
async function fetchGitHubProfile(username: string): Promise<RawGitHubProfile | null> {
  try {
    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(8000)
    });

    if (!userRes.ok) {
      console.warn(`[GitHub API] Failed to fetch user ${username}: HTTP ${userRes.status}`);
      return null;
    }

    const userData = await userRes.json();

    // Fetch up to 10 latest updated public repos
    let repos: RawRepoInfo[] = [];
    try {
      const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10&type=owner`, {
        headers: getGitHubHeaders(),
        signal: AbortSignal.timeout(8000)
      });
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        if (Array.isArray(reposData)) {
          // Sort by stars + recency
          const sorted = reposData
            .filter((r: any) => !r.fork) // prioritize original projects
            .slice(0, 5);

          repos = await Promise.all(
            sorted.map(async (r: any) => {
              const [languages, readmeSnippet] = await Promise.all([
                fetchRepoLanguages(username, r.name),
                fetchReadmeSnippet(username, r.name)
              ]);
              return {
                name: r.name,
                fullName: r.full_name,
                description: r.description || undefined,
                language: r.language || undefined,
                stars: r.stargazers_count || 0,
                forks: r.forks_count || 0,
                topics: Array.isArray(r.topics) ? r.topics : [],
                url: r.html_url,
                updatedAt: r.updated_at,
                languages,
                readmeSnippet
              };
            })
          );
        }
      }
    } catch (repoErr: any) {
      console.warn(`[GitHub API] Could not fetch repos for ${username}:`, repoErr.message);
    }

    return {
      username: userData.login,
      name: userData.name || undefined,
      bio: userData.bio || undefined,
      company: userData.company || undefined,
      location: userData.location || undefined,
      publicReposCount: userData.public_repos || 0,
      followers: userData.followers || 0,
      avatarUrl: userData.avatar_url || undefined,
      profileUrl: userData.html_url || `https://github.com/${username}`,
      repos
    };
  } catch (err: any) {
    console.warn(`[GitHub API] Network error for profile ${username}:`, err.message);
    return null;
  }
}

/**
 * Fetches repository data when candidate provided a specific repo URL.
 */
async function fetchGitHubRepo(owner: string, repoName: string): Promise<RawGitHubProfile | null> {
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(8000)
    });

    if (!repoRes.ok) {
      console.warn(`[GitHub API] Failed to fetch repo ${owner}/${repoName}: HTTP ${repoRes.status}`);
      return null;
    }

    const r = await repoRes.json();
    const [languages, readmeSnippet] = await Promise.all([
      fetchRepoLanguages(owner, repoName),
      fetchReadmeSnippet(owner, repoName)
    ]);

    const targetRepo: RawRepoInfo = {
      name: r.name,
      fullName: r.full_name,
      description: r.description || undefined,
      language: r.language || undefined,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      topics: Array.isArray(r.topics) ? r.topics : [],
      url: r.html_url,
      updatedAt: r.updated_at,
      languages,
      readmeSnippet
    };

    // Also fetch owner profile info
    const ownerProfile = await fetchGitHubProfile(owner);
    if (ownerProfile) {
      // Ensure target repo is first in list
      ownerProfile.repos = [targetRepo, ...ownerProfile.repos.filter(repo => repo.name !== r.name)];
      return ownerProfile;
    }

    return {
      username: owner,
      publicReposCount: 1,
      followers: 0,
      profileUrl: `https://github.com/${owner}`,
      repos: [targetRepo]
    };
  } catch (err: any) {
    console.warn(`[GitHub API] Network error for repo ${owner}/${repoName}:`, err.message);
    return null;
  }
}

/**
 * Uses Gemini Flash to synthesize technical highlights, deep project breakdowns,
 * and high-value technical interview hooks grounded in real GitHub repositories.
 */
async function synthesizeGitHubContext(
  profile: RawGitHubProfile,
  resumeText?: string,
  jobDescription?: string
): Promise<GitHubContext> {
  const defaultContext: GitHubContext = {
    username: profile.username,
    profileUrl: profile.profileUrl,
    name: profile.name,
    bio: profile.bio,
    company: profile.company,
    location: profile.location,
    publicReposCount: profile.publicReposCount,
    followers: profile.followers,
    avatarUrl: profile.avatarUrl,
    technicalHighlights: [],
    githubProjects: profile.repos.map(r => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stars,
      topics: r.topics,
      url: r.url
    })),
    githubInterviewHooks: [],
    enrichedAt: new Date().toISOString()
  };

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return defaultContext;

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are a Principal Software Architect and Lead Technical Interviewer.
Analyze this candidate's verified GitHub activity (fetched via official GitHub REST API) and their resume.

Synthesize technical interview context:
1. "technicalHighlights": An array of 2-4 bullet points highlighting their software engineering craft, languages, architectural patterns, and open-source contributions.
2. "githubProjects": An array of 2-4 deep project summaries for their most significant repositories:
   - "name": Repository name
   - "description": Concise description
   - "language": Primary language/stack
   - "stars": Star count
   - "topics": Array of topic tags
   - "keyInsights": 1-2 sentences explaining the technical architecture, problem solved, or trade-offs made in this project based on its description and README.
   - "url": Repository URL
3. "githubInterviewHooks": An array of 2-4 deep, respectful, and engaging technical questions the AI interviewer can ask to explore their actual codebase, design decisions, data structures, concurrency, or optimization.

CRITICAL RULES:
- NEVER hallucinate or invent fake repositories, commits, or languages not present in the data.
- Use GitHub data ONLY to personalize technical interview questions and follow-ups.
- Keep questions technical, curious, and appreciative of their codecraft.

--- GITHUB PROFILE & REPOSITORIES ---
Username: ${profile.username}
Bio: ${profile.bio || 'None'}
Public Repos Count: ${profile.publicReposCount}
Followers: ${profile.followers}
Repositories:
${JSON.stringify(profile.repos, null, 2)}

--- TARGET JOB (for relevance) ---
${jobDescription || 'Senior Software Engineer'}

--- CANDIDATE RESUME ---
${resumeText || 'None provided'}

Return ONLY a JSON object matching this schema:
{
  "technicalHighlights": ["highlight 1", "highlight 2"],
  "githubProjects": [
    {
      "name": "...",
      "description": "...",
      "language": "...",
      "stars": 0,
      "topics": [],
      "keyInsights": "...",
      "url": "..."
    }
  ],
  "githubInterviewHooks": ["hook 1", "hook 2"]
}`;

    let res: any = null;
    let attempts = 0;
    while (attempts < 3) {
      try {
        res = await model.generateContent(prompt);
        break;
      } catch (gemErr: any) {
        attempts++;
        if (attempts >= 3) throw gemErr;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    const text = res.response.text();
    const parsed = JSON.parse(text);

    return {
      ...defaultContext,
      technicalHighlights: Array.isArray(parsed.technicalHighlights) ? parsed.technicalHighlights : [],
      githubProjects: Array.isArray(parsed.githubProjects) && parsed.githubProjects.length > 0 
        ? parsed.githubProjects 
        : defaultContext.githubProjects,
      githubInterviewHooks: Array.isArray(parsed.githubInterviewHooks) ? parsed.githubInterviewHooks : []
    };
  } catch (err: any) {
    console.warn('[GitHub Enrichment] AI synthesis fallback:', err.message);
    // Fallback deterministic synthesis
    if (defaultContext.githubProjects && defaultContext.githubProjects.length > 0) {
      const topRepo = defaultContext.githubProjects[0];
      defaultContext.technicalHighlights = [
        `Active GitHub contributor with ${profile.publicReposCount} public repositories.`,
        topRepo.language ? `Primary development stack includes ${topRepo.language}.` : 'Multi-language developer.'
      ];
      defaultContext.githubInterviewHooks = [
        `In your GitHub project ${topRepo.name}, what were the most significant technical trade-offs you made during its implementation?`,
        `Walk me through the architectural decisions behind ${topRepo.name} and how you structured the code for maintainability.`
      ];
    }
    return defaultContext;
  }
}

/**
 * Main GitHub enrichment function.
 * Automatically parses URL, queries GitHub REST API, and synthesizes technical hooks.
 * Gracefully returns null if invalid, private, or unavailable so application flow never fails.
 */
export async function enrichGitHubUrl(
  rawUrl?: string | null,
  resumeText?: string,
  jobDescription?: string
): Promise<GitHubContext | null> {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return null;
  }

  const parsed = parseGitHubUrl(rawUrl);
  if (!parsed) {
    console.warn('[GitHub Enrichment] Invalid GitHub URL provided:', rawUrl, '. Skipping.');
    return null;
  }

  try {
    console.log(`[GitHub Enrichment] Fetching ${parsed.type} data for ${parsed.owner}${parsed.repo ? '/' + parsed.repo : ''} via official GitHub REST API`);
    
    let profileData: RawGitHubProfile | null = null;
    if (parsed.type === 'repo' && parsed.repo) {
      profileData = await fetchGitHubRepo(parsed.owner, parsed.repo);
    } else {
      profileData = await fetchGitHubProfile(parsed.owner);
    }

    if (!profileData) {
      console.warn(`[GitHub Enrichment] No public data found for GitHub user/repo: ${parsed.owner}. Skipping gracefully.`);
      return null;
    }

    console.log(`[GitHub Enrichment] Extracted ${profileData.repos.length} repos for ${profileData.username}. Synthesizing AI interview hooks...`);
    const enriched = await synthesizeGitHubContext(profileData, resumeText, jobDescription);
    return enriched;
  } catch (err: any) {
    console.warn('[GitHub Enrichment] Failed gracefully without blocking application:', err.message);
    return null;
  }
}
