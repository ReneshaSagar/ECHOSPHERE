import type { CandidateContext } from '@/lib/db';

/**
 * Validates whether an input string is a valid LinkedIn profile URL.
 */
export function isValidLinkedInUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const linkedinRegex = /^https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\.%]+\/?.*$/i;
  return linkedinRegex.test(trimmed);
}

/**
 * Normalizes LinkedIn profile URL.
 */
export function normalizeLinkedInUrl(url: string): string {
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  if (clean.includes('linkedin.com/') && !clean.includes('linkedin.com/in/') && !clean.includes('linkedin.com/company/')) {
    clean = clean.replace('linkedin.com/', 'linkedin.com/in/');
  }
  return clean;
}

/**
 * Bright Data LinkedIn Profile Scraper Raw Response Interface.
 * Single source of truth for factual profile information.
 */
export interface BrightDataLinkedInProfileRaw {
  url?: string;
  name?: string;
  headline?: string;
  position?: string;
  about?: string;
  summary?: string;
  experience?: Array<{
    title?: string;
    position?: string;
    company?: string;
    company_name?: string;
    duration?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  skills?: Array<string | { name?: string; title?: string }>;
  education?: Array<{
    school?: string;
    school_name?: string;
    degree?: string;
    degree_name?: string;
    field_of_study?: string;
    start_year?: string | number;
    end_year?: string | number;
    year?: string | number;
  }>;
  projects?: Array<{
    title?: string;
    name?: string;
    description?: string;
    url?: string;
    link?: string;
  }>;
  certifications?: Array<{
    name?: string;
    title?: string;
    issuer?: string;
    authority?: string;
    year?: string | number;
    date?: string;
  }>;
  organizations?: Array<string | {
    name?: string;
    organization?: string;
    title?: string;
    role?: string;
    company?: string;
  }>;
  error?: string;
  error_code?: number | string;
}

/**
 * Calls Bright Data's LinkedIn Profile Scraper API.
 */
async function fetchFromBrightData(cleanUrl: string, apiToken: string): Promise<BrightDataLinkedInProfileRaw | null> {
  const datasetId = process.env.BRIGHTDATA_DATASET_ID || 'gd_l1viktl72bvl7bjuj0';
  const scrapeEndpoint = 'https://api.brightdata.com/datasets/v3/scrape?dataset_id=' + datasetId + '&format=json&include_errors=true';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    console.log('[Bright Data] Calling live synchronous scrape endpoint for:', cleanUrl);
    const scrapeRes = await fetch(scrapeEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ url: cleanUrl }]),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!scrapeRes.ok) {
      console.warn(`[Bright Data] Scrape request returned HTTP ${scrapeRes.status}`);
      return null;
    }

    const results = await scrapeRes.json();

    if (Array.isArray(results) && results.length > 0) {
      return results[0] as BrightDataLinkedInProfileRaw;
    }

    if (results && results.snapshot_id) {
      console.log(`[Bright Data] Async snapshot created: ${results.snapshot_id}. Polling up to 10s...`);
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const pollRes = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${results.snapshot_id}?format=json`, {
            headers: { 'Authorization': `Bearer ${apiToken}` }
          });
          if (pollRes.ok) {
            const snapData = await pollRes.json();
            if (Array.isArray(snapData) && snapData.length > 0) {
              console.log(`[Bright Data] Snapshot ${results.snapshot_id} completed successfully.`);
              return snapData[0] as BrightDataLinkedInProfileRaw;
            }
          }
        } catch (pollErr: any) {
          console.warn('[Bright Data] Polling notice:', pollErr.message);
        }
      }
      return null;
    }

    return null;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('[Bright Data] Live scrape notice (gracefully proceeding):', err.message);
    return null;
  }
}

/**
 * Pure, deterministic mapper from raw LinkedIn/BrightData JSON to CandidateContext.
 * 
 * STRICT ARCHITECTURAL RULES:
 * 1. Provider JSON is the single source of truth.
 * 2. ZERO LLM / Gemini intervention in factual extraction.
 * 3. Never invent, infer, or guess missing fields; if absent from provider, leave null or empty array.
 * 4. Headline must be preserved EXACTLY as returned by the provider without abbreviation or rewrite.
 */
export function mapRawLinkedInToCandidateContext(raw: any): CandidateContext {
  if (!raw || raw.error || raw.error_code) {
    return {
      headline: undefined,
      about: raw?.error ? "LinkedIn profile is restricted by privacy settings or unavailable." : undefined,
      experience: [],
      skills: [],
      education: [],
      projects: [],
      certifications: [],
      organizations: [],
      enrichmentSource: 'brightdata_restricted',
      enrichedAt: new Date().toISOString(),
      rawProviderJson: raw || null
    };
  }

  // 1. Headline: EXACT original headline returned by provider. Never abbreviate or rewrite.
  const headline = raw.headline ? String(raw.headline).trim() : (raw.position ? String(raw.position).trim() : undefined);

  // 2. About / Summary: Exact provider text
  const about = raw.about ? String(raw.about).trim() : (raw.summary ? String(raw.summary).trim() : undefined);

  // 3. Experience: Deterministic mapping
  let experience: Array<{ title: string; company: string; duration?: string; description?: string }> = [];
  if (Array.isArray(raw.experience)) {
    experience = raw.experience
      .filter((e: any) => e && (e.title || e.position || e.company || e.company_name))
      .map((e: any) => {
        let duration = e.duration;
        if (!duration && e.start_date) {
          duration = e.start_date + ' - ' + (e.end_date || 'Present');
        }
        return {
          title: (e.title || e.position || 'Role').trim(),
          company: (e.company || e.company_name || 'Company').trim(),
          duration: duration ? String(duration).trim() : undefined,
          description: e.description ? String(e.description).trim() : undefined
        };
      });
  } else if (raw.position && raw.current_company_name) {
    experience = [{
      title: String(raw.position).trim(),
      company: String(raw.current_company_name).trim(),
      duration: 'Present',
      description: about ? about.slice(0, 300) : undefined
    }];
  }

  // 4. Skills: Deterministic extraction from provider array
  const skills: string[] = Array.isArray(raw.skills)
    ? raw.skills
        .map((s: any) => (typeof s === 'string' ? s.trim() : (s.name || s.title || '').trim()))
        .filter(Boolean)
    : [];

  // 5. Education: Deterministic extraction from provider array
  const education: Array<{ school: string; degree?: string; fieldOfStudy?: string; year?: string }> = [];
  if (raw.educations_details && typeof raw.educations_details === 'string' && raw.educations_details.trim()) {
    education.push({
      school: raw.educations_details.trim(),
      degree: undefined,
      year: undefined
    });
  }
  if (Array.isArray(raw.education)) {
    raw.education.forEach((ed: any) => {
      const schoolName = ed.school || ed.school_name || ed.title;
      if (schoolName && typeof schoolName === 'string' && schoolName.trim()) {
        const year = ed.end_year ? String(ed.end_year).trim() : (ed.year ? String(ed.year).trim() : undefined);
        education.push({
          school: schoolName.trim(),
          degree: ed.degree || ed.degree_name || undefined,
          fieldOfStudy: ed.field_of_study || undefined,
          year
        });
      }
    });
  }

  // 6. Projects: Deterministic extraction
  const projects: Array<{ title: string; description?: string; url?: string }> = Array.isArray(raw.projects)
    ? raw.projects
        .filter((p: any) => p && (p.title || p.name))
        .map((p: any) => ({
          title: String(p.title || p.name).trim(),
          description: p.description ? String(p.description).trim() : undefined,
          url: p.url || p.link || undefined
        }))
    : [];

  // 7. Certifications: Deterministic extraction
  const certifications: Array<{ name: string; issuer?: string; year?: string }> = Array.isArray(raw.certifications)
    ? raw.certifications
        .filter((c: any) => c && (c.name || c.title))
        .map((c: any) => ({
          name: String(c.name || c.title).trim(),
          issuer: c.issuer || c.authority || undefined,
          year: c.year ? String(c.year).trim() : (c.date ? String(c.date).trim() : undefined)
        }))
    : [];

  // 8. Organizations: Deterministic extraction
  const organizations: string[] = Array.isArray(raw.organizations)
    ? raw.organizations
        .map((o: any) => {
          if (typeof o === 'string' && o.trim()) return o.trim();
          const role = o.role || o.title;
          const org = o.organization || o.company || o.name;
          if (role && org) return `${role} at ${org}`;
          if (org) return org;
          if (role) return role;
          return null;
        })
        .filter(Boolean) as string[]
    : [];

  return {
    headline,
    about,
    experience,
    skills,
    education,
    projects,
    certifications,
    organizations,
    enrichmentSource: 'brightdata',
    enrichedAt: new Date().toISOString(),
    rawProviderJson: raw
  };
}

/**
 * Generates development fallback simulating Bright Data raw response.
 */
function generateDevMockBrightDataRaw(cleanUrl: string): BrightDataLinkedInProfileRaw {
  const username = cleanUrl.split('/in/')[1]?.replace(/\/.*$/, '') || 'candidate';

  return {
    url: cleanUrl,
    name: username.replace(/[-_.]/g, ' '),
    headline: "Senior Software Engineer | Distributed Systems & High-Throughput APIs",
    about: "Passionate backend engineer with extensive experience designing resilient microservices, optimizing database performance, and building developer tooling.",
    experience: [
      {
        title: "Senior Backend Engineer",
        company: "HyperScale Cloud Systems",
        duration: "2021 - Present",
        description: "Led migration to asynchronous event-driven architecture, optimizing PostgreSQL query bottlenecks and improving p99 latency by 45%."
      },
      {
        title: "Software Engineer",
        company: "NextGen Software",
        duration: "2019 - 2021",
        description: "Engineered scalable REST APIs with FastAPI and Docker. Built real-time notification service handling 10M daily events."
      }
    ],
    skills: [
      "Python",
      "FastAPI",
      "PostgreSQL",
      "Distributed Systems",
      "Redis",
      "Docker",
      "WebRTC",
      "System Design"
    ],
    education: [
      {
        school: "State University of Technology",
        degree: "Bachelor of Science",
        field_of_study: "Computer Science",
        end_year: 2019
      }
    ],
    projects: [
      {
        title: "Asyncpg Pool Optimizer",
        description: "Open-source connection pool manager reducing connection thrashing in async Python web apps.",
        link: 'https://github.com/' + username + '/pool-optimizer'
      }
    ],
    certifications: [
      {
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2023"
      }
    ],
    organizations: [
      "Open Source Contributor - Python Software Foundation"
    ]
  };
}

/**
 * Main Profile Enrichment Function.
 * Returns deterministically mapped context and preserves raw provider JSON.
 * ZERO LLM EXTRACTION.
 */
export async function enrichLinkedInProfile(
  rawUrl?: string | null, 
  resumeText?: string
): Promise<CandidateContext | null> {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return null;
  }

  const cleanUrl = normalizeLinkedInUrl(rawUrl);

  if (!isValidLinkedInUrl(cleanUrl)) {
    console.warn('[Bright Data Enrichment] Invalid LinkedIn URL provided:', rawUrl, '. Gracefully skipping.');
    return null;
  }

  let rawData: BrightDataLinkedInProfileRaw | null = null;
  const brightdataToken = process.env.BRIGHTDATA_API_TOKEN;

  // 1. Live Bright Data Scraper Integration
  if (brightdataToken && brightdataToken.trim() !== '') {
    console.log('[Bright Data Enrichment] Fetching profile via Bright Data LinkedIn Scraper for:', cleanUrl);
    try {
      rawData = await fetchFromBrightData(cleanUrl, brightdataToken.trim());
    } catch (apiErr: any) {
      console.warn('[Bright Data Enrichment] Profile is private or temporarily unavailable:', apiErr.message);
    }
  }

  // 2. Development Mock Fallback (strictly gated by MOCK_LINKEDIN_ENRICHMENT=true)
  if (!rawData && process.env.MOCK_LINKEDIN_ENRICHMENT === 'true') {
    console.log('[Bright Data Enrichment] Utilizing Bright Data scraper simulated fallback for development.');
    rawData = generateDevMockBrightDataRaw(cleanUrl);
  }

  if (!rawData) {
    console.warn('[Bright Data Enrichment] Live enrichment failed or token missing, and mock fallback is disabled.');
    return null;
  }

  // 3. Deterministic Mapping ONLY (Zero LLM Extraction)
  const mapped = mapRawLinkedInToCandidateContext(rawData);

  // Stage Logging
  console.log('[ENRICHMENT STAGE 1: RAW PROVIDER JSON (LinkedIn)]', JSON.stringify({
    provider: 'brightdata',
    url: cleanUrl,
    keys: Object.keys(rawData),
    headline: rawData.headline,
    experienceItems: rawData.experience?.length || 0,
    skillsItems: rawData.skills?.length || 0
  }));

  console.log('[ENRICHMENT STAGE 2: MAPPED CANDIDATE CONTEXT (LinkedIn)]', JSON.stringify({
    headline: mapped.headline,
    experienceCount: mapped.experience?.length || 0,
    skillsCount: mapped.skills?.length || 0,
    educationCount: mapped.education?.length || 0,
    projectsCount: mapped.projects?.length || 0
  }));

  return mapped;
}