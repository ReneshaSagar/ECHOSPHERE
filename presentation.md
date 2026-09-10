# OMNIPANEL // The Autonomous Multi-Agent AI Interview & Evaluation Platform
### Engineering Architecture, System Flow, and Design Philosophy
*Built for Plantra Labs by the OmniPanel Systems Team*

---

## Executive Summary & The Core Thesis

Modern technical hiring is fundamentally broken. 

1. **Resume Screening is Superficial**: Thousands of resumes are filtered by basic keyword search engines, ignoring genuine engineering depth and github repositories.
2. **LeetCode Tests Memorization, Not Real-World Engineering**: Traditional coding tests present artificial puzzle problems in isolated sandbox boxes without the ability to discuss trade-offs, architecture, or system constraints.
3. **Interviewer Fatigue & Human Inconsistency**: Human interview panels suffer from cognitive bias, inconsistent question difficulty, scheduling friction, and subjective scoring.
4. **Conversational AI in Recruitment Has Been Toy-Like**: Single-prompt chatbots or basic voice bots interrupt candidates awkwardly, hallucinate candidate claims, and lack technical depth.

### The OmniPanel Breakthrough

**OmniPanel** is the first enterprise-grade, **autonomous multi-agent hiring ecosystem** that combines:
- **Autonomous Multi-Source Enrichment** (Resume + GitHub repository commits + LinkedIn profile correlation).
- **Dynamic Multi-Persona AI Voice Panels** with realistic peer turn-taking (Lead Interviewer + Challenger Specialist + HR Partner).
- **Live Interactive Engineering Workspace** unifying a real-time Monaco Code Editor and an Excalidraw-like System Design Canvas.
- **Deterministic Turn Arbitration & Volume Gating** ensuring zero voice crosstalk and human-first interruption responsiveness.
- **Real-Time Proctoring & Integrity Telemetry** detecting tab switches, audio anomalies, and copy-paste events.
- **Mathematical 3-Round Evaluation Synthesis** ($35\%$ Coding Workspace + $50\%$ Technical Panel + $15\%$ Behavioral/HR) delivering fully grounded, evidence-backed executive scorecards.

```
+----------------------------------------------------------------------------------------------------+
|                                    OMNIPANEL SYSTEM FLOW                                          |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ 1. Job Requisition ] ---> [ 2. Candidate Application ] ---> [ 3. Parallel Enrichment Engine ]   |
|        (Plantra ATS)               (Drive / PDF / Text)             (GitHub + LinkedIn + Resume)   |
|                                                                                 |                  |
|                                                                                 v                  |
|  [ 6. Final Scorecard ] <--- [ 5. 3-Round AI Interview ] <--- [ 4. Dynamic Blueprint Engine ]       |
|    - 35% Round 1 (Coding)       - Round 1: Workspace              - Persona Selection              |
|    - 50% Round 2 (Technical)    - Round 2: Multi-Agent Panel      - Grounded Question Design       |
|    - 15% Round 3 (Culture/HR)   - Round 3: Behavioral Fit         - Anti-Hallucination Constraints |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 1. The End-to-End User & System Journey

Let us walk through the exact journey of both a **Candidate** and a **Hiring Team** using OmniPanel.

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    actor Recruiter as Hiring Team (Plantra Labs)
    participant Platform as OmniPanel Web Portal
    participant Enrichment as Async Enrichment Engine
    participant LLM as Gemini / AI Orchestrator
    participant Agora as Agora RTC Voice Mesh
    participant Eval as Multi-Round Evaluation Arbiter

    Recruiter->>Platform: Post Job Requisition (Requirements & Stages)
    Candidate->>Platform: Browse Jobs & Apply (Upload PDF / Google Drive / GitHub)
    Platform->>Candidate: Instant Application Receipt Confirmation
    Platform->>Enrichment: Spawn Parallel Ingestion (GitHub Repos + LinkedIn + Resume)
    Enrichment->>LLM: Correlate Sources -> Build Verified CandidateContext
    Enrichment->>Platform: Send Scheduled Interview Invitation Email (GCal / .ics)
    
    Candidate->>Platform: Enter Interview Room Lobby (Device & Mic Check)
    Platform->>Agora: Initialize Low-Latency Multi-Agent Audio Mesh
    
    rect rgb(20, 30, 50)
        note over Candidate,Agora: Round 1: Practical Workspace Assessment (35% Weight)
        Platform->>Candidate: Render Monaco Code Editor + System Design Canvas
        Agora->>Candidate: Primary Technical Lead (Priya) welcomes candidate & observes code
        Candidate->>Platform: Write code, run test cases, construct architecture diagrams
        Platform->>Eval: Submit Workspace Artifacts & Execution Stats (Pass/Fail/Time)
    end

    rect rgb(40, 25, 50)
        note over Candidate,Agora: Round 2: Multi-Agent Technical Panel (50% Weight)
        Agora->>Candidate: Primary Lead (Priya) + Specialist Challenger (Arjun)
        Agora->>Candidate: Lead explores architecture; Challenger probes edge cases & scale
        Candidate->>Agora: Live voice responses (interruption priority & turn-taking)
        Platform->>Eval: Transcribe & Capture Round 2 Technical Dialogue
    end

    rect rgb(50, 35, 20)
        note over Candidate,Agora: Round 3: Behavioral & Cultural Alignment (15% Weight)
        Agora->>Candidate: Head of People & Culture (Tara) conducts STAR interview
        Candidate->>Agora: Explains past incident ownership, conflict resolution, values
        Platform->>Eval: Transcribe & Capture Round 3 Behavioral Evidence
    end

    Eval->>LLM: Synthesize Evidence Across All 3 Rounds with Formula
    Eval->>Recruiter: Generate Master Executive Scorecard on ATS Dashboard
    Recruiter->>Candidate: Trigger One-Click Offer, Waitlist, or Feedback Email
```

---

## 2. Deep Dive: Architectural Subsystems

### 2.1 Parallel Multi-Source Enrichment Engine

When a candidate applies with a resume, Google Drive link, GitHub profile, and LinkedIn URL, OmniPanel does not simply do plain text matching. It launches an asynchronous, non-blocking ingestion pipeline (`frontend/lib/enrichment/`):

1. **Resume Text Extraction (`pdfExtractor.ts` & Google Drive API)**:
   - Parses binary PDF buffers directly or fetches public Google Drive document streams.
   - Normalizes unicode characters, formats multi-column layouts, and extracts work history, technologies, and projects.
2. **GitHub Ingestion (`github.ts`)**:
   - Queries the candidate's GitHub public repository profile.
   - Inspects language breakdowns, recent repositories, commit histories, README files, and pull requests.
   - Filters out toy repositories (e.g. hello-world, course forks) and prioritizes production-grade systems.
3. **LinkedIn Profiling (`linkedin.ts`)**:
   - Extracts employment trajectory, tenure duration, promotions, and organizational scale.
4. **Cross-Source Correlation Layer (`correlation.ts`)**:
   - Compares resume claims against actual GitHub repositories and LinkedIn timelines.
   - Generates a rich, structured **`CandidateContext`**:
     - `highRelevanceEvidence`: Concrete repositories and architecture projects matching the job description.
     - `technicalInterviewHooks`: Specific technical questions to probe (e.g., "Ask about their Raft consensus implementation in repo X").
     - `claimsToVerify`: Assertions in the resume that lack code corroboration and need verbal probing.
     - `ignoredOrLowRelevanceTopics`: Skills mentioned on resume that do not relate to the role and should **not** waste interview time.

```
+------------------------------------------------------------------------------------+
|                             CANDIDATE CONTEXT MATRIX                               |
+------------------------------------------------------------------------------------+
|  [ Resume Claims ]  +  [ GitHub Commit Code ]  +  [ LinkedIn Career Trajectory ]   |
|                                       |                                            |
|                                       v                                            |
|                  +-----------------------------------------+                       |
|                  |       Correlation Engine & Filter       |                       |
|                  +-----------------------------------------+                       |
|                                       |                                            |
|         +-----------------------------+-----------------------------+              |
|         |                             |                             |              |
|         v                             v                             v              |
|  [ High-Signal Hooks ]       [ Claims to Verify ]       [ Low-Relevance Filter ]   |
|  "Ask about lock-free        "Claimed 100k QPS;         "Ignore legacy PHP skill   |
|   Go ring buffers in          verify partitioning        as role is modern Go /    |
|   chronos-raft repo"          architecture"              distributed systems"      |
+------------------------------------------------------------------------------------+
```

---

### 2.2 The 3-Round Modular Interview Architecture

OmniPanel is structured around a **3-Round Architecture** where each round has a distinct purpose, a dedicated environment, isolated evidence collection, and transparent mathematical weighting:

```
+-------------------------------------------------------------------------------------------+
|                               OMNIPANEL 3-ROUND SUITE                                     |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  ROUND 1: PRACTICAL WORKSPACE ASSESSMENT (Weight: 35%)                                    |
|  - Real-time Monaco Code Editor (TypeScript / Python / Go) + System Design Canvas         |
|  - Live compilation, automated test runners, test pass/fail rate calculation             |
|  - Single AI Interviewer observing code events as telemetry without noisy interruptions   |
|  - Evaluates: Implementation Correctness, Architecture Simplicity, Problem Solving        |
|                                                                                           |
|  ROUND 2: MULTI-AGENT TECHNICAL PANEL (Weight: 50%)                                       |
|  - Multi-Persona Voice Panel (Primary Lead Interviewer + Challenger Specialist)           |
|  - Deterministic Turn Arbiter & Volume Gating preventing voice collisions                |
|  - Probes: Core Architecture, Concurrency, Distributed Scaling, Failure Modes             |
|  - Evaluates: Technical Depth, Engineering Trade-offs, Quantitative Scaling Rigor         |
|                                                                                           |
|  ROUND 3: BEHAVIORAL & CULTURAL ALIGNMENT (Weight: 15%)                                   |
|  - Head of People & Culture / HR Partner                                                  |
|  - Strict Evidence Isolation: Does NOT inherit technical code; purely behavioral         |
|  - Probes: Engineering Ownership, Incident Retrospectives, Conflict Resolution, Mentorship|
|  - Evaluates: 7 Standardized Behavioral Competencies + Verbatim STAR Moments              |
|                                                                                           |
+-------------------------------------------------------------------------------------------+
```

---

### 2.3 Dynamic Multi-Persona Interviewer Pool

To eliminate single-interviewer bias, OmniPanel maintains a company-wide persistent pool of AI interviewer personas (`frontend/lib/interview/interviewerPool.ts`). When a job requisition is created or an interview blueprint is generated, the system dynamically selects complementary interviewers tailored to the domain:

| Domain | Primary Lead Interviewer | Challenger / Deep-Dive Specialist | Culture / People Lead |
| :--- | :--- | :--- | :--- |
| **Backend & Distributed Systems** | **Priya Nair** *(Principal Infra Lead, Aoede voice)* | **Arjun Malhotra** *(Staff Architect, Charon voice)* | **Tara Sharma** *(Head of People, Aoede voice)* |
| **AI / Machine Learning** | **Neha Kapoor** *(Senior ML Engineer, Aoede voice)* | **Karan Varma** *(Staff ML Infra Architect, Charon voice)* | **Tara Sharma** *(Head of People, Aoede voice)* |
| **Full Stack & Web Platforms** | **Priya Nair** *(Senior Full Stack, Aoede voice)* | **Arjun Malhotra** *(Staff Systems Lead, Charon voice)* | **Tara Sharma** *(Head of People, Aoede voice)* |
| **Cloud Platform & SRE** | **Kabir Sen** *(Senior SRE, Fenrir voice)* | **Dev Mukherjee** *(Staff Cloud Architect, Charon voice)* | **Tara Sharma** *(Head of People, Aoede voice)* |
| **Product Management** | **Rohan Sen** *(Senior PM, Aoede voice)* | **Nisha Mehra** *(Group PM & Strategy Lead, Charon voice)* | **Tara Sharma** *(Head of People, Aoede voice)* |
| **Product Design** | **Maya Patel** *(Senior Designer, Aoede voice)* | **Aarav Joshi** *(Principal Design Lead, Charon voice)* | **Tara Sharma** *(Head of People, Aoede voice)* |

**Why Multi-Agent Panels Matter**:
- Real engineering interviews rarely have just one person. One interviewer explores general architecture, while a technical specialist challenges scaling limits and edge cases.
- In OmniPanel, **Arjun** does not interrupt **Priya's** opening greeting. Arjun stays silent until Priya hands off the floor (*"Arjun, do you want to probe their Kafka partitioning logic?"*) or until the candidate makes a high-scale claim.

---

### 2.4 Deterministic Turn Arbiter & Audio Mesh

One of the hardest challenges in real-time conversational AI is **audio turn-taking**. Standard bots either talk over the candidate or respond with awkward 3-second delays.

OmniPanel solves this with a **Two-Tier Real-Time Voice Engine**:

```
                                  +-----------------------+
                                  | Candidate Microphone  |
                                  +-----------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    Agora WebRTC Audio Mesh    |
                              |  (Candidate UID: 1000)        |
                              +-------------------------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
       +----------------------------+                    +----------------------------+
       | Engine A: Cascading Mesh   |                    | Engine B: Multimodal Live  |
       | - Whisper Streaming ASR    |                    | - Gemini 2.0 Multimodal    |
       | - Deterministic Turn State |                    | - Sub-500ms Audio Turn     |
       | - Volume Gating (<200ms)   |                    | - Direct Speech-to-Speech  |
       | - ElevenLabs / Gemini TTS  |                    +----------------------------+
       +----------------------------+                                  |
                     |                                                 |
                     +------------------------+------------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    Deterministic Arbiter      |
                              |  - Primary AI (UID: 9991)     |
                              |  - Challenger AI (UID: 9992)  |
                              |  - Candidate Priority Muting  |
                              +-------------------------------+
                                              |
                                              v
                                  +-----------------------+
                                  | Candidate Headphones  |
                                  +-----------------------+
```

1. **Strict Volume Gating**: When the candidate begins speaking, the Turn Arbiter immediately sets the remote audio tracks of active AI agents to 0 volume within 150ms.
2. **Deterministic Floor Control**: The floor transitions between `CANDIDATE_SPEAKING`, `PRIMARY_AI_SPEAKING`, and `CHALLENGER_AI_SPEAKING`.
3. **Barge-In Support**: If the candidate interrupts an AI agent midway through a sentence, the agent stops synthesizing immediately and yields the floor.
4. **Co-Interviewer Courtesy**: When Priya is speaking, Arjun's audio generation is locked; when Priya hands off to Arjun, Priya's audio track is softly muted after a 300ms buffer so words are never clipped.

---

### 2.5 Real-Time Proctoring & Integrity Telemetry

Trust in autonomous evaluation requires robust integrity monitoring without invasive spyware:

- **Tab Switching & Window Blur Telemetry**: Detects when the candidate leaves the interview tab.
- **Copy-Paste Event Tracking**: Monitors large external code pastes into the Monaco editor.
- **Audio Anomaly & Cross-Talk Monitor**: Flags secondary voices or unusual acoustic patterns.
- **Transparent Logging**: All integrity events are stored with ISO timestamps and attached to the candidate's interview record (`suspiciousEvents: []`).
- **Integrity Floor Guard**: If significant proctoring anomalies are verified, the score is capped or flagged as *Integrity Disqualified* for human committee review.

---

### 2.6 The Mathematical Evaluation & Scorecard Engine

At the conclusion of an interview, OmniPanel executes a multi-stage evaluation pipeline (`app/api/interviews/[id]/evaluate-round` and `app/api/interviews/[id]/evaluate-final`):

$$\text{Final Composite Score} = \left(\text{Score}_{R1} \times 0.35\right) + \left(\text{Score}_{R2} \times 0.50\right) + \left(\text{Score}_{R3} \times 0.15\right)$$

```
========================================================================================
                          FINAL CANDIDATE SCORECARD SYNTHESIS
========================================================================================

  ROUND 1: Coding & System Design Workspace (35% Weight)
  • Implementation Correctness & Code Quality (30%):  85 / 100
  • Problem Solving & Algorithmic Approach (25%):     90 / 100
  • Architecture & System Design (20%):               80 / 100
  • Concurrency & Edge-Case Handling (15%):           85 / 100
  • Communication & Complexity Articulation (10%):    80 / 100
  ==> Round 1 Raw Score: 85/100  ---> Contributes: +29.75 pts

  ROUND 2: Multi-Agent Technical Panel Interview (50% Weight)
  • System Architecture & Topology Design (20%):      88 / 100
  • Concurrency & State Management (20%):             85 / 100
  • Scalability & Performance Trade-offs (20%):       82 / 100
  • Failure Modes & Resiliency (15%):                 80 / 100
  • Codecraft & Practical Execution (15%):            85 / 100
  • Communication Clarity & Reasoning (10%):          90 / 100
  ==> Round 2 Raw Score: 85/100  ---> Contributes: +42.50 pts

  ROUND 3: Behavioral & Cultural Alignment (15% Weight)
  • Engineering Ownership & Accountability (20%):     92 / 100
  • Cross-Functional Collaboration & Teamwork (15%):  90 / 100
  • Conflict Resolution & Pragmatism (15%):           85 / 100
  • Leadership & Mentorship (15%):                    88 / 100
  • Adaptability & Growth Mindset (15%):              90 / 100
  • Cultural Alignment & Values (10%):                92 / 100
  • Communication & Executive Articulation (10%):     90 / 100
  ==> Round 3 Raw Score: 90/100  ---> Contributes: +13.50 pts

----------------------------------------------------------------------------------------
  FINAL COMPOSITE SCORE: 86 / 100   |   RECOMMENDATION: STRONG HIRE (Ready for Offer)
========================================================================================
```

---

## 3. Technology Stack & Key Libraries

OmniPanel is engineered using a modern, ultra-reliable full-stack architecture:

| Subsystem | Technologies & Frameworks | Key Rationale & Usage |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15 (App Router)**, React 19, TypeScript | Server Components for instant initial loads; client-side hooks for WebRTC audio and real-time state. |
| **Styling & Motion** | **Tailwind CSS**, Framer Motion, Lucide Icons | Dark-mode editorial design, bespoke typographic hierarchy, matrix sculpture visuals, smooth micro-interactions. |
| **Live Code Workspace** | **Monaco Editor** (`@monaco-editor/react`) | Industry-standard VS Code editor with syntax highlighting, indentation, multi-language support (TS, Go, Python). |
| **System Design Canvas** | **HTML5 Canvas / Excalidraw Engine** | Visual whiteboard for microservice topology, distributed database nodes, message queues, and API gateways. |
| **Real-Time Voice RTC** | **Agora RTC SDK** (`agora-rtc-sdk-ng`) | Sub-100ms global voice mesh, multi-channel multi-UID orchestration, remote volume gating, mute/deafen. |
| **Foundation AI Models** | **Google Gemini 2.0 Flash / Pro**, Gemini Live | Real-time multimodal audio streaming, dynamic blueprint synthesis, STAR behavioral evaluation. |
| **Document & Data Ingestion** | **PDF-Parse**, Google Drive REST API, GitHub REST API | Parallel resume parsing, repository commit history extraction, LinkedIn profile normalization. |
| **Email Dispatch Engine** | **Nodemailer / SMTP Client** | Transactional HTML emails with responsive layouts, status updates, and RFC-compliant `.ics` calendar files. |
| **Database & Persistence** | **Atomic JSON File Database** (`lib/db.ts`) | Fast local state persistence with transactional writes, auto-seeding, and cross-session resume storage. |

---

## 4. Key Innovations & Differentiators

Why does OmniPanel win against any standard interview tool or AI mock platform?

### 1. Factual Grounding & Anti-Hallucination Guardrails
Generic AI bots ask candidate questions about tools they never used (e.g. asking a Go developer about Django). OmniPanel's correlation layer enforces strict **Zero-Assumption Constraints**: interviewers are forbidden from asking questions outside verified candidate evidence.

### 2. Multi-Persona Panel Dynamics
Instead of a monologue with a single bot, OmniPanel simulates real-world committee dynamics. Priya and Arjun act as distinct interviewers with distinct voices, areas of focus, and respectful handoffs.

### 3. Integrated Coding + System Design + Voice
Candidates do not leave the voice call to complete a test. They code or draw directly in the live workspace while the AI observes their thought process, creating an authentic pair-programming environment.

### 4. Objective, Non-Diluted Behavioral Evaluation
Round 3 is completely insulated from technical results. If a candidate struggled with a dynamic programming question in Round 1, the HR round evaluates their leadership and communication on its own merits without bias.

### 5. Automated Recruiter Operations
From application submission to interview scheduling (with GCal & `.ics` generation) to final offer/waitlist/rejection dispatch, the entire operational pipeline runs seamlessly.

---

## 5. Summary of Key Files in the Codebase

For quick architectural navigation, here is how the core modules are structured:

```
frontend/
├── app/
│   ├── page.tsx                             # Landing page with Pixel Matrix Flower & editorial copy
│   ├── layout.tsx                           # Global fonts (Plus Jakarta, JetBrains Mono, Newsreader) & theme
│   ├── company/page.tsx                     # Plantra Labs company overview & principles
│   ├── products/page.tsx                    # Platform product suite overview
│   ├── developers/page.tsx                  # Developer SDKs and integration guide
│   ├── solutions/page.tsx                   # Enterprise solutions overview
│   ├── jobs/
│   │   ├── page.tsx                         # Public Job Board with live filterable requisitions
│   │   ├── layout.tsx                       # Careers layout & footer
│   │   └── [id]/
│   │       ├── page.tsx                     # Job Requisition details & stage overview
│   │       └── apply/page.tsx               # Application form (Google Drive / PDF / Text upload)
│   ├── admin/
│   │   ├── page.tsx                         # ATS Dashboard with candidate metrics & pipeline stats
│   │   ├── AdminSidebar.tsx                 # Navigation bar for hiring operations
│   │   ├── applicants/page.tsx              # Applicant tracking list & stage review
│   │   ├── applications/[id]/page.tsx       # Live Candidate Scorecard, verified context & decision actions
│   │   ├── schedule/page.tsx                # ATS Interview Calendar with Google Calendar / .ics export
│   │   └── jobs/new/page.tsx                # Job requisition builder with stage & MCP configuration
│   ├── interview/[blueprintId]/
│   │   ├── page.tsx                         # Entry point for live candidate interview session
│   │   ├── InterviewLobbyWrapper.tsx        # Pre-interview device check, countdown, & calendar sync
│   │   ├── InterviewRoom.tsx                # Full-screen 3-round interview room (Monaco, Canvas, Agora RTC)
│   │   ├── ProctorEngine.tsx                # Tab blur, copy-paste, and audio anomaly proctoring
│   │   └── completed/page.tsx               # Interview completion confirmation & next-steps screen
│   └── api/
│       ├── jobs/[id]/apply/route.ts         # Async application ingestion & email dispatch
│       ├── interviews/[id]/blueprint/route.ts # Dynamic 3-round blueprint generator
│       ├── interviews/[id]/evaluate-round/route.ts # Round 1, 2, and 3 specialized evaluators
│       ├── interviews/[id]/evaluate-final/route.ts # Multi-round weighted scorecard synthesizer
│       └── dev/demo-interview/route.ts      # 1-click demo candidate & test environment seeder
├── components/
│   ├── Navbar.tsx                           # Global brand wordmark & navigation pill
│   ├── ScorecardDisplay.tsx                 # Executive Scorecard visualizer with weighted breakdown
│   └── hero/PixelMatrixFlower.tsx           # Interactive 3D ASCII typographic floral sculpture
└── lib/
    ├── company.ts                           # Plantra Labs single source of truth company metadata
    ├── db.ts                                # JSON database layer with atomic file writes
    ├── email/index.ts                       # Responsive HTML email templates & notification dispatcher
    ├── enrichment/
    │   ├── correlation.ts                   # Resume + GitHub + LinkedIn correlation engine
    │   ├── github.ts                        # GitHub repository commit & code analysis
    │   ├── linkedin.ts                      # LinkedIn employment verification & tenure parser
    │   └── pdfExtractor.ts                  # PDF binary buffer text extractor
    └── interview/
        └── interviewerPool.ts               # Multi-domain persistent interviewer personas
```

---

## 6. How to Run & Experience OmniPanel

### 1. Launch the Application
```bash
cd frontend
npm run dev
```
Navigate to `http://localhost:3000` to explore the public **Plantra Labs** careers portal.

### 2. Experience the ATS & Hiring Command Center
- Visit `http://localhost:3000/admin` to inspect incoming applications, stage progressions, and candidate scorecards.
- Visit `http://localhost:3000/admin/schedule` to manage interview calendars and download `.ics` calendar files.

### 3. Launch the 1-Click Interactive Test Studio
- Visit `http://localhost:3000/test-interview` to launch the **Self-Contained Sandbox**:
  - Launch live dual-agent voice interview with pre-seeded demo candidate (Alex Rivera).
  - Run the **1-Click Instant Simulation (2s)** to run all 3 rounds synthetically, calculate weighted scores, and inspect the final scorecard on the Admin dashboard.

---

## Conclusion: Why OmniPanel Represents the Future of Hiring

OmniPanel proves that AI in recruitment should not be about cold automation or impersonal rejection. When built with **deep engineering craft, deterministic turn-taking, multi-persona diversity, and rigorous mathematical evaluation**, AI can make hiring **faster, fairer, deeply technical, and far more human**.

*Plantra Labs · OmniPanel Systems Team · 2026*
