# OmniPanel AI 🎙️

> **Autonomous, Dynamic Multi-Persona Voice Interview Panel with Proctoring & ATS Scoring**  
> Built for the **EchoSphere: Agora Conversational AI Hackathon** (Grand Finale Ready & Enterprise SaaS Grade)

---

## What is OmniPanel AI?

OmniPanel AI is an advanced automated screening platform. Instead of generic single-agent bots, it places candidates in a real-time, low-latency voice room with a **dynamically generated panel of AI interviewers** tailored to the Job Description (JD). 

### Key Features
1. **Dynamic Round Planning & Personas**: No more hardcoded interviewers. The system generates $N$ rounds (e.g., Online Assessment, Portfolio Review, Deep Technical, Case Study, HR/Behavioral) and corresponding contextual personas (e.g., Lead Architect, PM, Design Director, Culture Advocate) matching the job requirements.
2. **ATS Resume Scoring (30% weight)**: Real PDF file upload with OCR (using `pdfminer.six` and `pytesseract` fallback) to extract resume content and calculate a parsed ATS match score.
3. **Multi-Persona Voice Room (70% weight)**: Live multi-persona interview powered by **Agora Conversational AI** and **Agora SD-RTN™** with a centralized proxy turn arbiter coordinating speaker turn-taking and tag-team interruptions.
4. **MediaPipe & Screen Share Proctoring**: Real-time webcam eye-gaze tracking, multi-face detection, and automatic proctored screen recording.
5. **Minutes of Meeting (MoM)**: AI-generated post-interview Minutes of Meeting (MoM) customized for both recruiters (summary, decision markers, proctoring log) and candidates (constructive feedback, learning action items).

---

## Architecture

```
[ Candidate WebRTC Client ] → [ Agora SD-RTN™ Audio Channel ]
  • MediaPipe eye gaze tracker           ↙                    ↘
  • Automatic screen recording    [Agora Conversational AI]  [Agora RTM Signaling]
                                         ↓                            ↓
                           [FastAPI Orchestration Proxy]    [Telemetry WebSocket]
                                  ↙              ↘
                         [Turn Arbiter]     [Sidecar Scorer]
                         • Shared context   • Gaze/hesitation alerts
                         • Cooldown rule    • Jargon & vagueness scoring
                         • Rubric pillar evaluations
                                         ↘              ↙
                                     [In-Memory Session Store]
                                     (ATS score, rounds, scorecard)
```

---

## Project Structure

```
omnipanel-ai/
├── backend/                         # FastAPI Python backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── agora_routes.py      # RTC/RTM token + dynamic agent lifecycle
│   │   │   ├── interview_routes.py  # Session CRUD + dynamic round plan & rubric generator
│   │   │   ├── llm_routes.py        # Centralized LLM proxy for Conversational AI agents
│   │   │   ├── upload_routes.py     # PDF Resume upload, OCR extraction & ATS scoring
│   │   │   └── report_routes.py     # Post-interview MoM & final report generation
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic Settings (Requesty base URL)
│   │   │   ├── agora_client.py      # RTC Token Builder v2 + Convo AI client
│   │   │   └── session_store.py     # Async in-memory session store (multiround state)
│   │   ├── engine/
│   │   │   ├── arbiter.py           # LLM-powered dynamic turn-taking arbiter
│   │   │   └── evaluator.py         # Real-time vagueness, hesitation & rubric evaluator
│   │   └── main.py                  # FastAPI server + WebSocket telemetry broadcaster
│   ├── requirements.txt
│   └── .env
│
└── frontend/                        # Next.js 15 frontend
    ├── app/
    │   ├── page.tsx                 # Minimalist vibey landing page
    │   ├── setup/page.tsx           # 4-step wizard (JD, PDF Upload + ATS, Round Plan, Devices)
    │   ├── room/[sessionId]/page.tsx# Real-time interview room (OA + Video Grid + Gaze vectors)
    │   └── report/[sessionId]/page.tsx # Composite scorecard + Radar chart + MoMs
    ├── components/
    │   └── room/
    │       ├── AvatarCard.tsx       # Dynamic persona avatar cards with glowing states
    │       ├── AudioVisualizer.tsx  # Canvas waveform audio visualizer
    │       └── LiveTranscript.tsx   # Streaming chat transcripts with hashed colors
    ├── lib/
    │   ├── agora.ts                 # Agora RTC SDK helper (mute/unmute, volume indicators)
    │   ├── api.ts                   # Type-safe API client (uploadResume, createSession, etc.)
    │   └── types.ts                 # Shared TypeScript interfaces
    └── package.json
```

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Agora developer account (App ID + Certificate + Customer credentials)
- Requesty API key (or OpenAI compatible key)

### 1. Backend Setup

```bash
cd omnipanel-ai/backend

# Create .env and enter your credentials (see variables below)
touch .env

# Install dependencies (includes pdfminer.six, pytesseract, pillow)
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health`

### 2. Frontend Setup

```bash
cd omnipanel-ai/frontend

# Create .env.local
touch .env.local

# Install dependencies
npm install

# Start next.js app
npm run dev
```

Open: `http://localhost:3000`

---

## Environment Variables

### Backend `.env`

```env
# Agora App Credentials
AGORA_APP_ID=b4ad06d39e1d4b26b3897a4d8120a59e
AGORA_APP_CERTIFICATE=fe6593a213a141fba29d061e87a7b33f

# Agora REST Gateway Credentials (Basic Auth)
AGORA_CUSTOMER_ID=eaaf2817a23e46a791aa7240c8e19138
AGORA_CUSTOMER_SECRET=b2e97c4073d243d8a407b0dea0250864

# LLM Gateway (Requesty compatible proxy)
OPENAI_API_KEY=rqsty-sk-jMUUawhwT2moRKZCaGHxpvulFKJTohN7CkE/WWODaec0lLQCv2KukFtZP+Vf68iVP80eo548+4gUru38Q5bnt1bM4q6L1tL4Ol7bw60ESQQ=
OPENAI_API_BASE=https://router.requesty.ai/v1

# Server Settings
PORT=8000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
PUBLIC_BACKEND_URL=
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_AGORA_APP_ID=b4ad06d39e1d4b26b3897a4d8120a59e
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Technical Features & API

- **PDF upload / OCR**: Real extraction using `pdfminer.six` and fallback OCR scanning using `pytesseract`.
- **Centralized LLM completions proxy**: Every persona accesses completions from the FastAPI proxy (`/api/llm/{session_id}/chat/completions`). The proxy reads the calling persona's name from the system prompt dynamically and silences other agents (`" "` response) to prevent cross-talking.
- **WebSocket Telemetry**: Heartbeat ping/pong (every 25 seconds) keeps live connection active while streaming cheating alerts, gaze details, and active speaker status.
- **Unified Score Formula**:
  $$\text{Final Score} = (\text{ATS Score} \times 0.3) + (\text{Interview Performance} \times 0.7)$$
