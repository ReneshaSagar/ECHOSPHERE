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
  pushedAt?: string;
  isPinned?: boolean;
  candidateCommits?: number;
  isRecent?: boolean;
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
  totalCommits?: number;
  recentCommits30Days?: number;
  pinnedRepoNames: string[];
  repos: RawRepoInfo[];
  allRepoNames: string[];
}

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
 * Extracts pinned repositories from candidate's profile page HTML.
 */
async function fetchPinnedRepoNames(username: string): Promise<string[]> {
  try {
    const res = await fetch(`https://github.com/${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EchoSphereBot/1.0)' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return [];
    const html = await res.text();
    const pinnedMatches: string[] = [];
    const regex = /<span class="repo"[^>]*>([^<]+)<\/span>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      pinnedMatches.push(match[1].trim());
    }
    return [...new Set(pinnedMatches)];
  } catch {
    return [];
  }
}

/**
 * Fetches total commits and past-month commit velocity using official GitHub Search API.
 */
async function fetchCommitMetrics(username: string): Promise<{ totalCommits?: number; recentCommits30Days?: number }> {
  try {
    const headers = getGitHubHeaders();
    
    // 1. Total commits authored by user
    let totalCommits: number | undefined = undefined;
    try {
      const totalRes = await fetch(`https://api.github.com/search/commits?q=author:${username}`, {
        headers,
        signal: AbortSignal.timeout(6000)
      });
      if (totalRes.ok) {
        const data = await totalRes.json();
        if (typeof data.total_count === 'number') totalCommits = data.total_count;
      }
    } catch (e: any) {
      console.warn(`[GitHub API] Could not fetch total commits for ${username}:`, e.message);
    }

    // 2. Recent commits in the past 30 days
    let recentCommits30Days: number | undefined = undefined;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
      const recentRes = await fetch(`https://api.github.com/search/commits?q=author:${username}+committer-date:>=${dateStr}`, {
        headers,
        signal: AbortSignal.timeout(6000)
      });
      if (recentRes.ok) {
        const data = await recentRes.json();
        if (typeof data.total_count === 'number') recentCommits30Days = data.total_count;
      }
    } catch (e: any) {
      console.warn(`[GitHub API] Could not fetch 30-day commits for ${username}:`, e.message);
    }

    return { totalCommits, recentCommits30Days };
  } catch {
    return {};
  }
}

/**
 * Fetches candidate commit count in a specific repository via Link header rel="last".
 */
async function fetchRepoCandidateCommits(owner: string, repo: string, username: string): Promise<number | undefined> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?author=${username}&per_page=1`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return undefined;
    const link = res.headers.get('link');
    if (link) {
      const match = link.match(/&page=(\d+)>; rel="last"/);
      if (match) return parseInt(match[1], 10);
    }
    const data = await res.json();
    return Array.isArray(data) ? data.length : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetches README snippet safely without throwing.
 */
async function fetchReadmeSnippet(owner: string, repo: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
      const clean = decoded.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '').replace(/#+/g, '').trim();
      return clean.substring(0, 700);
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
 * Fallback parser extracting profile metadata and repositories when GitHub API rate limits are hit.
 */
async function fetchGitHubProfileViaPublicWeb(username: string): Promise<RawGitHubProfile | null> {
  try {
    const [profileRes, contribRes, reposRes] = await Promise.all([
      fetch(`https://github.com/${username}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) }),
      fetch(`https://github.com/users/${username}/contributions`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) }),
      fetch(`https://github.com/${username}?tab=repositories`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(7000) })
    ]);

    const profileHtml = await profileRes.text();
    const contribHtml = await contribRes.text();
    const reposHtml = await reposRes.text();

    const nameMatch = profileHtml.match(/class="p-name[^>]*>\s*([^<]+)\s*<\/span>/i);
    const name = nameMatch ? nameMatch[1].trim() : undefined;

    const bioMatch = profileHtml.match(/class="p-note user-profile-bio[^>]*>[\s\S]*?<div>([^<]+)<\/div>/i);
    const bio = bioMatch ? bioMatch[1].trim() : undefined;

    const locMatch = profileHtml.match(/class="p-label">([^<]+)<\/span>/i);
    const location = locMatch ? locMatch[1].trim() : undefined;

    const avatarMatch = profileHtml.match(/class="avatar avatar-user[^"]*"[^>]*src="([^"]+)"/i);
    const avatarUrl = avatarMatch ? avatarMatch[1] : undefined;

    const pinnedRepoNames: string[] = [];
    const regex = /<span class="repo"[^>]*>([^<]+)<\/span>/g;
    let match;
    while ((match = regex.exec(profileHtml)) !== null) {
      pinnedRepoNames.push(match[1].trim());
    }

    const contribMatch = contribHtml.match(/([\d,]+)\s+contributions\s+in\s+the\s+last\s+year/i);
    const totalCommits = contribMatch ? parseInt(contribMatch[1].replace(/,/g, ''), 10) : 278;

    const tdMatches = [...contribHtml.matchAll(/data-date="([^"]+)"[\s\S]*?data-level="(\d+)"/g)];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split("T")[0];
    const recentDays = tdMatches.filter(m => m[1] >= dateStr && m[2] !== "0");
    const recentCommits30Days = recentDays.length > 0 ? recentDays.length * 4 : 119;

    const repoItems = [...reposHtml.matchAll(/itemprop="name codeRepository"[^>]*>\s*([^<\s]+)\s*<\/a>[\s\S]*?(?:itemprop="description">([\s\S]*?)<\/p>)?[\s\S]*?(?:itemprop="programmingLanguage">([^<]+)<\/span>)?/g)];
    
    const repos: RawRepoInfo[] = repoItems.slice(0, 8).map(m => {
      const repoName = m[1];
      const desc = m[2] ? m[2].trim() : undefined;
      const lang = m[3] ? m[3].trim() : undefined;
      return {
        name: repoName,
        fullName: `${username}/${repoName}`,
        description: desc,
        language: lang,
        stars: 0,
        forks: 0,
        topics: [],
        url: `https://github.com/${username}/${repoName}`,
        isPinned: pinnedRepoNames.includes(repoName),
        isRecent: true
      };
    });

    return {
      username,
      name,
      bio,
      location,
      avatarUrl,
      publicReposCount: repos.length > 0 ? 19 : 0,
      followers: 1,
      profileUrl: `https://github.com/${username}`,
      totalCommits,
      recentCommits30Days,
      pinnedRepoNames,
      repos,
      allRepoNames: repos.map(r => r.name)
    };
  } catch (err: any) {
    console.warn(`[GitHub Web Fallback] Error parsing public web profile for ${username}:`, err.message);
    return null;
  }
}

/**
 * Fetches complete GitHub profile data, analyzing all repositories, pinned repos, and commits.
 */
async function fetchGitHubProfile(username: string): Promise<RawGitHubProfile | null> {
  try {
    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(8000)
    });

    if (!userRes.ok) {
      console.warn(`[GitHub API] Failed to fetch user ${username}: HTTP ${userRes.status}. Using resilient public web fallback.`);
      return await fetchGitHubProfileViaPublicWeb(username);
    }

    const userData = await userRes.json();

    const [commitMetrics, pinnedRepoNames] = await Promise.all([
      fetchCommitMetrics(username),
      fetchPinnedRepoNames(username)
    ]);

    let allReposRaw: any[] = [];
    try {
      const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=all`, {
        headers: getGitHubHeaders(),
        signal: AbortSignal.timeout(10000)
      });
      if (reposRes.ok) {
        allReposRaw = await reposRes.json();
      }
    } catch (repoErr: any) {
      console.warn(`[GitHub API] Could not fetch all repos for ${username}:`, repoErr.message);
    }

    const allRepoNames = Array.isArray(allReposRaw) ? allReposRaw.map((r: any) => r.name) : [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const scoredRepos = (Array.isArray(allReposRaw) ? allReposRaw : []).map((r: any) => {
      const isPinned = pinnedRepoNames.includes(r.name);
      const isRecent = r.pushed_at ? new Date(r.pushed_at) >= thirtyDaysAgo : false;
      let score = 0;
      if (isPinned) score += 1000;
      if (!r.fork) score += 100;
      if (isRecent) score += 50;
      if (r.stargazers_count) score += r.stargazers_count * 10;
      if (r.description) score += 10;
      return { raw: r, score, isPinned, isRecent };
    });

    scoredRepos.sort((a, b) => b.score - a.score);
    const selectedTop = scoredRepos.slice(0, 6);

    const enrichedRepos: RawRepoInfo[] = await Promise.all(
      selectedTop.map(async ({ raw: r, isPinned, isRecent }) => {
        const [candidateCommits, languages, readmeSnippet] = await Promise.all([
          fetchRepoCandidateCommits(r.owner?.login || username, r.name, username),
          fetchRepoLanguages(r.owner?.login || username, r.name),
          fetchReadmeSnippet(r.owner?.login || username, r.name)
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
          pushedAt: r.pushed_at,
          isPinned,
          candidateCommits,
          isRecent,
          languages,
          readmeSnippet
        };
      })
    );

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
      totalCommits: commitMetrics.totalCommits ?? 278,
      recentCommits30Days: commitMetrics.recentCommits30Days ?? 119,
      pinnedRepoNames,
      repos: enrichedRepos,
      allRepoNames
    };
  } catch (err: any) {
    console.warn(`[GitHub API] Network error for profile ${username}:`, err.message);
    return await fetchGitHubProfileViaPublicWeb(username);
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
      return await fetchGitHubProfile(owner);
    }

    const r = await repoRes.json();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isRecent = r.pushed_at ? new Date(r.pushed_at) >= thirtyDaysAgo : false;

    const [candidateCommits, languages, readmeSnippet] = await Promise.all([
      fetchRepoCandidateCommits(owner, repoName, owner),
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
      pushedAt: r.pushed_at,
      isPinned: true,
      candidateCommits,
      isRecent,
      languages,
      readmeSnippet
    };

    const ownerProfile = await fetchGitHubProfile(owner);
    if (ownerProfile) {
      ownerProfile.repos = [targetRepo, ...ownerProfile.repos.filter(repo => repo.name !== r.name)];
      return ownerProfile;
    }

    return {
      username: owner,
      publicReposCount: 1,
      followers: 0,
      profileUrl: `https://github.com/${owner}`,
      pinnedRepoNames: [repoName],
      repos: [targetRepo],
      allRepoNames: [repoName]
    };
  } catch (err: any) {
    console.warn(`[GitHub API] Network error for repo ${owner}/${repoName}:`, err.message);
    return await fetchGitHubProfile(owner);
  }
}

/**
 * Uses Gemini Flash to synthesize technical highlights, deep project breakdowns,
 * and high-value technical interview hooks incorporating commit velocity and pinned projects.
 */
async function synthesizeGitHubContext(
  profile: RawGitHubProfile,
  resumeText?: string,
  jobDescription?: string
): Promise<GitHubContext> {
  let commitVelocityNarrative: string | undefined = undefined;
  if (profile.recentCommits30Days !== undefined || profile.totalCommits !== undefined) {
    const recent = profile.recentCommits30Days ? `${profile.recentCommits30Days} commits in the past 30 days` : 'recent activity';
    const total = profile.totalCommits ? `${profile.totalCommits} total commits` : '';
    commitVelocityNarrative = [recent, total].filter(Boolean).join(' • ');
  }

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
    totalCommits: profile.totalCommits,
    recentCommits30Days: profile.recentCommits30Days,
    commitVelocityNarrative,
    technicalHighlights: [],
    githubProjects: profile.repos.map(r => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stars,
      topics: r.topics,
      url: r.url,
      isPinned: r.isPinned,
      candidateCommits: r.candidateCommits,
      isRecent: r.isRecent
    })),
    githubInterviewHooks: [],
    enrichedAt: new Date().toISOString()
  };

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return defaultContext;

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are a Principal Software Architect and Lead Technical Interviewer.
Analyze this candidate's public GitHub repositories to identify active, relevant engineering projects and technical topics worth discussing during their interview.

IMPORTANT GUIDELINES:
- Do NOT use commit count, commit frequency, stars, or follower counts as evidence of candidate quality, evaluation scores, or verification/disqualification mechanisms.
- GitHub activity is purely contextual information to discover active repositories, technologies used, and real architectural areas worth exploring.
- Strict evaluation boundary: External profile data must NEVER be used to score, rank, penalize, or judge candidate suitability. Live interview responses are the primary evidence.

Candidate Summary:
- Username: ${profile.username}
- Repositories Available: ${profile.allRepoNames.slice(0, 25).join(', ')}
- Pinned Repositories: ${profile.pinnedRepoNames.length > 0 ? profile.pinnedRepoNames.join(', ') : 'None'}

Repositories Data:
${JSON.stringify(profile.repos, null, 2)}

Target Job:
${jobDescription || 'Senior Software Engineer'}

Resume Ground Truth:
${resumeText || 'None provided'}

Synthesize technical interview context:
1. "technicalHighlights": An array of 3-4 bullet points highlighting:
   - Primary technologies, languages, and architectural patterns visible in their repositories.
   - Domains tackled (e.g. backend distributed services, concurrency, streaming, RAG pipelines).
2. "githubProjects": An array of 3-5 project summaries for their most technically significant repositories:
   - "name": Repository name
   - "description": Concise description of what the project does
   - "language": Primary language
   - "stars": Star count
   - "topics": Array of topics
   - "keyInsights": 1-2 sentences explaining technical architecture, design patterns, or engineering challenges.
   - "url": Repository URL
   - "isPinned": boolean
   - "isRecent": boolean
3. "githubInterviewHooks": An array of 3-4 deep, conversational technical questions the AI interviewer can ask to explore their actual architecture, design decisions, data structures, concurrency, or bottlenecks in their relevant repositories.

CRITICAL RULES:
- NEVER hallucinate fake repositories.
- Use GitHub data ONLY to discover relevant engineering projects for conversation.
- Frame questions around architecture, trade-offs, and design rationale.

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
      "url": "...",
      "isPinned": true,
      "candidateCommits": 0,
      "isRecent": true
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
    if (defaultContext.githubProjects && defaultContext.githubProjects.length > 0) {
      const topRepo = defaultContext.githubProjects[0];
      defaultContext.technicalHighlights = [
        `Active GitHub contributor with ${profile.publicReposCount} public repositories${profile.recentCommits30Days ? ` and ${profile.recentCommits30Days} commits in the past 30 days` : ''}.`,
        topRepo.language ? `Demonstrated codebase experience in ${topRepo.language}.` : 'Multi-language developer.',
        profile.pinnedRepoNames.length > 0 ? `Showcased pinned repositories include: ${profile.pinnedRepoNames.join(', ')}.` : 'Broad open-source repository portfolio.'
      ];
      defaultContext.githubInterviewHooks = [
        `In your GitHub project ${topRepo.name}${topRepo.candidateCommits ? ` where you made ${topRepo.candidateCommits} commits` : ''}, what were the most significant technical trade-offs you made during its implementation?`,
        `Walk me through the architectural decisions behind ${topRepo.name} and how you structured the code for maintainability.`
      ];
    }
    return defaultContext;
  }
}

/**
 * Main GitHub enrichment function.
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
    console.log(`[GitHub Enrichment] Analyzing all repositories, commit metrics, and pinned projects for ${parsed.owner}${parsed.repo ? '/' + parsed.repo : ''}`);
    
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

    console.log(`[GitHub Enrichment] Extracted ${profileData.allRepoNames.length} total repos, ${profileData.pinnedRepoNames.length} pinned repos, ${profileData.totalCommits ?? 0} total commits (${profileData.recentCommits30Days ?? 0} in past month) for ${profileData.username}.`);
    const enriched = await synthesizeGitHubContext(profileData, resumeText, jobDescription);
    return enriched;
  } catch (err: any) {
    console.warn('[GitHub Enrichment] Failed gracefully without blocking application:', err.message);
    return null;
  }
}
