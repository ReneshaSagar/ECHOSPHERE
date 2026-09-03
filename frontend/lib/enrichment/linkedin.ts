import type { CandidateContext } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  return clean;
}

/**
 * Bright Data LinkedIn Profile Scraper Raw Response Interface.
 * Only targets the requested fields:
 * - Headline, About, Experience, Skills, Education, Projects, Certifications, Organizations
 * Explicitly ignores: Recent Posts, Activity, Featured content.
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
}

/**
 * Calls Bright Data's LinkedIn Profile Scraper API.
 * Uses BRIGHTDATA_API_TOKEN environment variable.
 */
async function fetchFromBrightData(cleanUrl: string, apiToken: string): Promise<BrightDataLinkedInProfileRaw | null> {
  const datasetId = process.env.BRIGHTDATA_DATASET_ID || 'gd_l1viktl72bvl7bjuj0';
  const scrapeEndpoint = 'https://api.brightdata.com/datasets/v3/scrape?dataset_id=' + datasetId + '&format=json&include_errors=true';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000);

  try {
    console.log('[Bright Data] Calling live synchronous scrape endpoint for:', cleanUrl);
    const scrapeRes = await fetch(scrapeEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ url: cleanUrl }]),
      signal: controller.signal
    });

    if (!scrapeRes.ok) {
      const errText = await scrapeRes.text();
      console.error('[Bright Data] Scrape request failed (HTTP ' + scrapeRes.status + '):', errText);
      clearTimeout(timeoutId);
      throw new Error('Bright Data API Error (HTTP ' + scrapeRes.status + '): ' + errText);
    }

    const results = await scrapeRes.json();
    clearTimeout(timeoutId);
    if (Array.isArray(results) && results.length > 0) {
      return results[0] as BrightDataLinkedInProfileRaw;
    }
    throw new Error('Bright Data returned an empty array of results for: ' + cleanUrl);
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[Bright Data] API request error:', err.message);
    throw err;
  }
}

/**
 * Extracts strictly allowed profile fields from Bright Data raw response.
 * Strictly ignores any Posts, Activity, or Featured items.
 */
function mapBrightDataToCandidateContext(raw: any): CandidateContext {
  const headline = raw.headline || raw.position || (raw.current_company_name ? ('Leader / Executive at ' + raw.current_company_name) : undefined);
  const about = raw.about || raw.summary;

  let experience = (raw.experience || []).map((e: any) => {
    let duration = e.duration;
    if (!duration && e.start_date) {
      duration = e.start_date + ' - ' + (e.end_date || 'Present');
    }
    return {
      title: e.title || e.position || 'Professional',
      company: e.company || e.company_name || 'Organization',
      duration: duration || undefined,
      description: e.description || undefined
    };
  });

  // If live profile experience is in current_company, populate it
  if (experience.length === 0 && raw.current_company_name) {
    experience = [{
      title: raw.position || 'Current Leadership Role',
      company: raw.current_company_name,
      duration: 'Present',
      description: raw.about ? raw.about.substring(0, 300) : undefined
    }];
  }

  const skills = (raw.skills || []).map((s: any) => (typeof s === 'string' ? s : s.name || s.title || '')).filter(Boolean);

  const education = (raw.education || []).map((ed: any) => ({
    school: ed.school || ed.school_name || ed.title || 'University',
    degree: ed.degree || ed.degree_name || undefined,
    fieldOfStudy: ed.field_of_study || undefined,
    year: ed.end_year ? String(ed.end_year) : (ed.year ? String(ed.year) : undefined)
  }));

  const projects = (raw.projects || []).map((p: any) => ({
    title: p.title || p.name || 'Project',
    description: p.description || undefined,
    url: p.url || p.link || undefined
  }));

  const certifications = (raw.certifications || []).map((c: any) => ({
    name: c.name || c.title || 'Certification',
    issuer: c.issuer || c.authority || undefined,
    year: c.year ? String(c.year) : (c.date ? String(c.date) : undefined)
  }));

  const organizations = (raw.organizations || []).map((o: any) => {
    if (typeof o === 'string') return o;
    const role = o.role || o.title || 'Member';
    const org = o.organization || o.company || o.name || 'Community';
    return role + ' at ' + org;
  });

  return {
    headline: headline || undefined,
    about: about || undefined,
    experience,
    skills,
    education,
    projects,
    certifications,
    organizations,
    enrichmentSource: 'brightdata',
    enrichedAt: new Date().toISOString()
  };
}

/**
 * Generates an intelligent development fallback simulating Bright Data's LinkedIn Profile Scraper
 * output when BRIGHTDATA_API_TOKEN is absent.
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
 * Uses Gemini Flash to distill career progression, notable claims, and interview hooks
 * from the combined LinkedIn profile and resume data.
 */
async function synthesizeInterviewHooks(context: CandidateContext, resumeText?: string): Promise<CandidateContext> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return context;

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = 'You are an executive technical recruiter and interview strategist.\n' +
      'Analyze this candidate\'s verified LinkedIn profile data (extracted via Bright Data) and their submitted resume.\n' +
      'Synthesize strategic interview fields:\n' +
      '1. "careerProgression": A 1-2 sentence narrative summarizing their promotion history, company transitions, and growth trajectory.\n' +
      '2. "notableClaims": A list of 2-4 specific technical claims, performance improvements, scale claims, or architectural feats mentioned in their profile/resume.\n' +
      '3. "interviewHooks": A list of 3-4 deep conversational questions or follow-up hooks the AI technical interviewer can use to naturally start discussions.\n' +
      '4. "extractedExperience": If the candidate profile experience is empty or missing (e.g., semi-restricted LinkedIn profile), extract any companies they work/worked at from their resume as an array of [{ "title": "...", "company": "...", "duration": "...", "description": "..." }]. Otherwise return [].\n' +
      '5. "extractedEducation": If the candidate profile education is empty or missing, extract any universities/degrees from their resume as an array of [{ "school": "...", "year": "..." }]. Otherwise return [].\n' +
      '6. "extractedHeadline": If the candidate profile headline is empty or missing, synthesize a professional headline (e.g., "Role | Domain").\n\n' +
      'Return ONLY a JSON object with this structure:\n' +
      '{\n  "careerProgression": "...",\n  "notableClaims": ["claim 1", "claim 2"],\n  "interviewHooks": ["hook 1", "hook 2"],\n  "extractedExperience": [],\n  "extractedEducation": [],\n  "extractedHeadline": ""\n}\n\n' +
      '--- CANDIDATE PROFILE (BRIGHT DATA) ---\n' +
      'Headline: ' + (context.headline || 'N/A') + '\n' +
      'About: ' + (context.about || 'N/A') + '\n' +
      'Experience: ' + JSON.stringify(context.experience || [], null, 2) + '\n' +
      'Skills: ' + (context.skills || []).join(', ') + '\n' +
      'Projects: ' + JSON.stringify(context.projects || [], null, 2) + '\n\n' +
      '--- RESUME TEXT (for additional context) ---\n' +
      (resumeText || 'None provided');

    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const parsed = JSON.parse(text);

    const updatedExperience = (!context.experience || context.experience.length === 0) && Array.isArray(parsed.extractedExperience) && parsed.extractedExperience.length > 0
      ? parsed.extractedExperience
      : context.experience;

    const updatedEducation = (!context.education || context.education.length === 0) && Array.isArray(parsed.extractedEducation) && parsed.extractedEducation.length > 0
      ? parsed.extractedEducation
      : context.education;

    const updatedHeadline = !context.headline && parsed.extractedHeadline
      ? parsed.extractedHeadline
      : context.headline;

    return {
      ...context,
      headline: updatedHeadline,
      experience: updatedExperience,
      education: updatedEducation,
      careerProgression: parsed.careerProgression || context.careerProgression,
      notableClaims: Array.isArray(parsed.notableClaims) ? parsed.notableClaims : context.notableClaims,
      interviewHooks: Array.isArray(parsed.interviewHooks) ? parsed.interviewHooks : context.interviewHooks
    };
  } catch (err: any) {
    console.warn('[Bright Data Enrichment] AI hook synthesis fallback:', err.message);
    return context;
  }
}

/**
 * Main Profile Enrichment Function using Bright Data LinkedIn Profile Scraper.
 * Gracefully handles invalid/private/missing profiles so application flow never fails.
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

  const brightdataToken = process.env.BRIGHTDATA_API_TOKEN;

  // 1. Live Bright Data Scraper Integration
  if (brightdataToken && brightdataToken.trim() !== '') {
    console.log('[Bright Data Enrichment] Fetching profile via Bright Data LinkedIn Scraper for:', cleanUrl);
    try {
      const rawData = await fetchFromBrightData(cleanUrl, brightdataToken.trim());
      if (rawData) {
        // Log ONLY provider response field names (not personal data)
        console.log('[Bright Data Enrichment] Provider response field names:', Object.keys(rawData));
        const structuredContext = mapBrightDataToCandidateContext(rawData);
        return await synthesizeInterviewHooks(structuredContext, resumeText);
      }
    } catch (apiErr: any) {
      console.error('[Bright Data Enrichment] Live API call failed:', apiErr.message);
      if (process.env.MOCK_LINKEDIN_ENRICHMENT !== 'true') {
        // Do NOT silently fall back when MOCK_LINKEDIN_ENRICHMENT is false
        throw apiErr;
      }
    }
  }

  // 2. Development Mock Fallback (strictly gated by MOCK_LINKEDIN_ENRICHMENT=true)
  const allowMock = process.env.MOCK_LINKEDIN_ENRICHMENT === 'true';

  if (allowMock) {
    console.log('[Bright Data Enrichment] Utilizing Bright Data scraper simulated fallback for development.');
    const mockRaw = generateDevMockBrightDataRaw(cleanUrl);
    console.log('[Bright Data Enrichment] Provider response field names:', Object.keys(mockRaw));
    const structuredContext = mapBrightDataToCandidateContext(mockRaw);
    structuredContext.enrichmentSource = 'brightdata_simulated_dev';
    return await synthesizeInterviewHooks(structuredContext, resumeText);
  }

  console.warn('[Bright Data Enrichment] Live enrichment failed or token missing, and mock fallback is disabled (MOCK_LINKEDIN_ENRICHMENT=false).');
  return null;
}