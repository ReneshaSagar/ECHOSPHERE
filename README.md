# OmniPanel AI — Autonomous Multi-Agent Hiring Platform

> **An AI-powered recruitment platform that conducts real-time voice interviews using multi-agent Gemini Live AI, evaluates candidates with transcript-grounded scorecards, and gives recruiters a rich admin dashboard to make final hiring decisions.**

---

## What is this?

OmniPanel AI replaces the first-round interview panel with two autonomous AI interviewers — **Priya** (Primary Interviewer) and **Arjun** (Technical Challenger) — who conduct a live, voice-based interview in real-time via Agora WebRTC. After the session, a Gemini-powered evaluator synthesizes the transcript into a comprehensive scorecard with competency scores, verbatim evidence quotes, and a hire/no-hire advisory signal.

Recruiters use the admin dashboard to review applications, see the candidate's GitHub/LinkedIn/resume context, view the AI scorecard, check the behavioral integrity audit (anti-cheating), and make the final hiring decision.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Charts | Recharts (RadarChart, BarChart) |
| AI — Voice Agents | Google Gemini 2.0 Flash Multimodal Live API |
| AI — Evaluation | Google Gemini (generative AI SDK) |
| Real-Time Audio | Agora RTC SDK (`agora-rtc-sdk-ng`) |
| Anti-Cheat | MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) — FaceLandmarker in-browser |
| Email | Resend (primary) + Gmail SMTP via Nodemailer (fallback) |
| PDF Parsing | `pdf-parse` |
| LinkedIn Enrichment | Bright Data Web Scraper API |
| GitHub Enrichment | GitHub REST API |
| Database | JSON flat-file (`data.json`) via `lib/db.ts` |
| Icons | Lucide React |

---

## Project Structure

```
echosphere/
├── frontend/               # Main Next.js application
│   ├── app/
│   │   ├── admin/          # Admin dashboard
│   │   │   ├── applications/[id]/   # Per-application review page
│   │   │   ├── jobs/[id]/           # Job posting + pipeline board
│   │   │   └── schedule/            # Interview scheduling
│   │   ├── api/            # Next.js API routes
│   │   │   ├── agora-mllm/         # Agora + Gemini Live token & agent start
│   │   │   ├── applications/[id]/  # PATCH status, trigger emails
│   │   │   ├── interviews/[id]/
│   │   │   │   ├── blueprint/       # Blueprint generation
│   │   │   │   ├── evaluate-final/  # Full scorecard generation
│   │   │   │   ├── evaluate-round/  # Per-round mini-evaluation
│   │   │   │   ├── proctor/         # Save/fetch proctoring events
│   │   │   │   ├── report/          # Full report data for report page
│   │   │   │   └── state/           # Live interview state
│   │   │   ├── jobs/[id]/apply/    # Application submission (async)
│   │   │   └── orchestrator/       # Turn arbiter + floor requests
│   │   ├── interview/[blueprintId]/ # Live interview room
│   │   ├── jobs/[id]/apply/         # Candidate job application form
│   │   └── report/[sessionId]/      # Post-interview report (candidate-facing)
│   ├── lib/
│   │   ├── db.ts                   # JSON database read/write
│   │   ├── agora.ts                # Agora RTC client helpers
│   │   ├── email/                  # Resend + Nodemailer email functions
│   │   ├── enrichment/             # GitHub, LinkedIn, PDF extractors
│   │   │   ├── github.ts
│   │   │   ├── linkedin.ts
│   │   │   ├── extract.ts          # PDF + Google Drive resume parsing
│   │   │   └── correlation.ts      # Cross-source skill corroboration
│   │   └── interview/
│   │       ├── interviewState.ts   # Turn arbiter, floor requests, closing detection
│   │       └── interviewerPool.ts  # Agent persona definitions
│   ├── data.json                   # Flat-file database
│   └── .env.local                  # Environment variables (see below)
└── PROJECT_OVERVIEW.md             # Detailed architecture doc (gitignored)
```

---

## How It Works

### 1. Application Flow
1. Candidate applies at `/jobs/[id]/apply` — uploads resume (PDF or Google Drive link) + LinkedIn/GitHub URLs
2. Application is **instantly accepted** — background worker extracts resume, enriches GitHub/LinkedIn, runs LLM correlation, saves to `data.json`
3. If extraction fails, candidate receives an email explaining the issue

### 2. Admin Reviews Application
- Admin visits `/admin/applications/[id]`
- **Tab 1 — Candidate Profile**: Identity, LinkedIn narrative, resume text, GitHub stats + repos, cross-source verified skills
- **Tab 2 — Interview Intelligence**: AI scorecard (after interview), radar chart, strengths, weaknesses, MoM, rubric, agent briefing/instructions
- **Tab 3 — Live Session**: Proctoring violation timeline, integrity score

### 3. Interview Scheduling
- Admin clicks "Select for Interview" → status → `SHORTLISTED`
- Admin goes to Schedule, sets time, generates AI blueprint
- Blueprint = Gemini-generated interview plan: rounds, agent personas (Priya/Arjun), opening lines, per-round rubric
- Candidate receives email with interview link

### 4. Live Interview Room (`/interview/[blueprintId]`)
- Candidate joins → Agora RTC channel opens
- Two Gemini Live MLLM sessions start (one per agent: Priya with voice `Aoede`, Arjun with voice `Charon`)
- **Turn Arbiter** controls who speaks:
  - Priya leads — asks structured questions per round
  - Arjun monitors transcript for technical claims using regex triggers (e.g. "Kafka", "Raft", "Redis")
  - When triggered, Arjun raises a `FloorRequest` — arbiter grants/denies based on priority + Priya's speaking state
  - If candidate addresses Arjun by name, he gets the floor immediately
- **ProctorEngine** (MediaPipe FaceLandmarker in-browser) detects: no face, multiple faces, gaze out-of-bounds, tab switching, heavy typing, clipboard paste
- Each round ends when closing utterance detected → per-round mini-evaluation runs

### 5. Scorecard Generation
- After interview completes, admin triggers final evaluation at `/admin/applications/[id]`
- Full transcript → Gemini evaluates against job description + rubric → returns JSON scorecard:
  - `overall_recommendation`: Strong Hire / Hire / Leaning Hire / Leaning No Hire / No Hire
  - `overallScore`: 0–100
  - `rubric_evaluations`: per-pillar scores, evidence quality, verbatim quotes, missing evidence
  - `strengths`, `weaknesses`

### 6. Hiring Decision
- Admin reviews scorecard (AI advisory — **not** auto-decision)
- Clicks "Extend Job Offer" → triggers offer email to candidate
- Clicks "Reject" → triggers rejection email

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Install

```bash
cd frontend
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required due to a peer dependency conflict between `next-themes` and React 19.

### Environment Variables

Create `frontend/.env.local`:

```env
# Agora (real-time audio transport)
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
AGORA_CUSTOMER_ID=your_agora_customer_id

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Email — Resend (primary)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Email — Gmail SMTP (fallback, no domain needed)
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password

# LinkedIn Enrichment — Bright Data (optional)
BRIGHTDATA_API_KEY=your_brightdata_key
BRIGHTDATA_DATASET_ID=gd_l1viktl72bvl7bjuj0
MOCK_LINKEDIN_ENRICHMENT=true   # set false for live calls

# GitHub Enrichment
GITHUB_TOKEN=your_github_pat    # optional, increases rate limit
MOCK_GITHUB_ENRICHMENT=false

# App
FRONTEND_URL=http://localhost:3000
```

### Run Dev Server

```bash
cd frontend
npm run dev
```

App runs at **http://localhost:3000**

---

## Key Pages

| URL | Description |
|---|---|
| `/` | Landing page |
| `/jobs` | Job listings (candidate-facing) |
| `/jobs/[id]/apply` | Job application form |
| `/interview/[blueprintId]` | Live AI interview room |
| `/report/[sessionId]` | Post-interview report (candidate-facing) |
| `/admin` | Admin dashboard |
| `/admin/jobs/[id]` | Job detail + applicant pipeline |
| `/admin/applications/[id]` | Full application review + scorecard |
| `/admin/schedule` | Schedule interviews |

---

## AI Agents

### Priya (Primary Interviewer)
- Voice: `Aoede`
- Role: Leads structured interview rounds, asks behavioural and technical questions per blueprint
- Detects round completion via closing utterance patterns

### Arjun (Technical Challenger)
- Voice: `Charon`
- Role: Monitors candidate responses for technical claims, raises floor requests to challenge depth
- Triggered by: Kafka, Raft, Redis, WebRTC, RAG, concurrency keywords etc.
- Persona: Senior Principal Engineer, technically rigorous

### Turn Arbiter
- Shared state machine in `lib/interview/interviewState.ts`
- Manages speaking lock, floor request queue, candidate-directed interrupts
- Ensures only one agent speaks at a time

---

## Email Events

| Trigger | Email |
|---|---|
| Application submitted | Application received confirmation |
| Extraction failed | Application failed with reason |
| Selected for interview | Interview invitation with link + time |
| Rejected | Rejection email |
| Offer extended | Job offer email |

---

## Anti-Cheating System

MediaPipe FaceLandmarker runs at 30fps in the browser. Detected violations:

| Event | Severity |
|---|---|
| `NO_FACE_DETECTED` | HIGH |
| `MULTIPLE_FACES` | HIGH |
| `GAZE_OUT_OF_BOUNDS` | MEDIUM |
| `TAB_SWITCH` | HIGH |
| `HEAVY_TYPING` | MEDIUM |
| `CLIPBOARD_PASTE` | MEDIUM |

Events are saved to `data.json` via `POST /api/interviews/[id]/proctor` and shown in the admin dashboard with deduplication (`×N` grouping) and an integrity score.

---

## Data

All data is stored in `frontend/data.json` (flat-file JSON database). No external database required for development. Schema includes:

- `companies[]`
- `jobs[]`
- `candidates[]`
- `applications[]` — includes `resumeText`, `candidateContext` (enriched), `scorecard`, `status`
- `interviews[]` — includes `transcript`, `suspiciousEvents`, `scorecard`, `proctoringReport`
- `blueprints[]` — includes `blueprintJson` (full agent briefing)

---

## Notes

- **Human authority**: AI never makes the final hire/reject decision — it only provides advisory signals. Final authority rests with the human hiring committee.
- **No cascading pipeline**: Both AI agents use native Gemini Live MLLM (not STT → LLM → TTS), eliminating the ~2–3s latency of a cascaded approach.
- **Instant submission**: Applications are accepted immediately; enrichment runs in the background.
