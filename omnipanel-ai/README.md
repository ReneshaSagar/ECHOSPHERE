# OmniPanel AI 🎙️

> **Autonomous, Multi-Persona Voice Interview Panel with Dynamic Cross-Examination**  
> Built for the **EchoSphere: Agora Conversational AI Hackathon**

---

## What is OmniPanel AI?

OmniPanel AI places a candidate inside a real-time, ultra-low-latency voice room with a 3-member autonomous AI panel powered by **Agora Conversational AI**:

| Persona | Role | Color | Focus |
|---------|------|-------|-------|
| **Alex** | Staff Systems Architect | Cyan `#06B6D4` | Distributed systems, latency, fault tolerance, CAP theorem |
| **Maya** | VP of Product | Amber `#F59E0B` | ROI, user friction, implementation velocity, business impact |
| **David** | Engineering Director | Emerald `#10B981` | Ownership, STAR method, buzzword detection, behavioral depth |

---

## Architecture

```
[ Candidate WebRTC Client ] → [ Agora SD-RTN™ Audio Channel ]
                                    ↙                    ↘
         [Agora Conversational AI Engine]     [Agora RTM 2.x Signaling]
         • Sub-250ms VAD Barge-in            • Live transcript streaming
         • Native Multi-Voice TTS             • Active speaker indicators
         • Utterance detection               • Vagueness radar telemetry
                    ↓
        [OmniPanel FastAPI Orchestrator]
             ↙              ↘
  [Turn Arbiter]    [Sidecar Rubric Evaluator]
  • Shared context  • Vagueness scoring (0-100)
  • Hand-off logic  • Buzzword detection
  • Persona routing • 5-Pillar scoring
             ↘              ↙
          [In-Memory Session Store]
          (Transcripts, Rubrics, Scorecards)
```

---

## Project Structure

```
omnipanel-ai/
├── backend/                         # FastAPI Python backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── agora_routes.py      # RTC/RTM token + Convo AI agent lifecycle
│   │   │   ├── interview_routes.py  # Session CRUD + LLM rubric generation + orchestration
│   │   │   └── report_routes.py     # Post-interview analytics & evaluation
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic Settings (env var loading)
│   │   │   ├── agora_client.py      # RTC Token Builder v2 + Convo AI REST client
│   │   │   └── session_store.py     # Async in-memory session state
│   │   ├── engine/
│   │   │   ├── personas.py          # Alex / Maya / David prompt definitions
│   │   │   ├── arbiter.py           # LLM-powered turn-taking router
│   │   │   └── evaluator.py         # Real-time vagueness + rubric scorer
│   │   └── main.py                  # FastAPI app + WebSocket telemetry
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                        # Next.js 15 frontend
    ├── app/
    │   ├── page.tsx                 # Landing page
    │   ├── setup/page.tsx           # 4-step setup wizard
    │   ├── room/[sessionId]/page.tsx# Live interview room
    │   └── report/[sessionId]/page.tsx # Post-interview report
    ├── components/
    │   ├── room/
    │   │   ├── AvatarCard.tsx       # Animated persona cards with glow states
    │   │   ├── AudioVisualizer.tsx  # Canvas waveform visualizer
    │   │   ├── LiveTranscript.tsx   # Auto-scroll streaming transcript
    │   │   └── VaguenessRadar.tsx   # Real-time SVG gauge + pillar checklist
    │   ├── ui/ (Button, Card, Badge)
    │   ├── Navbar.tsx
    │   └── ThemeToggle.tsx
    ├── lib/
    │   ├── agora.ts                 # Agora RTC/RTM wrapper (SSR-safe dynamic import)
    │   ├── api.ts                   # Type-safe fetch client
    │   └── types.ts                 # Shared TypeScript interfaces
    └── package.json
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Agora account (App ID + Certificate + Conversational AI access)
- OpenAI API key

### 1. Backend Setup

```bash
cd omnipanel-ai/backend

# Copy env file and fill in your credentials
cp .env.example .env

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health`

### 2. Frontend Setup

```bash
cd omnipanel-ai/frontend

# Copy env file
cp .env.local.example .env.local
# Edit .env.local and set NEXT_PUBLIC_AGORA_APP_ID

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open: `http://localhost:3000`

---

## Environment Variables

### Backend `.env`

```env
# Agora
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
AGORA_CUSTOMER_ID=your_agora_customer_id_here
AGORA_CUSTOMER_SECRET=your_agora_customer_secret_here

# AI
OPENAI_API_KEY=your_openai_api_key_here

# Server
PORT=8000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions/create` | Create session + LLM-generated rubric |
| `POST` | `/api/agora/token` | Get RTC + RTM tokens |
| `POST` | `/api/agora/agents/start` | Start all 3 AI panel agents |
| `POST` | `/api/sessions/{id}/orchestrate` | Submit utterance → get next speaker |
| `GET`  | `/api/sessions/{id}/status` | Live session metadata |
| `GET`  | `/api/sessions/{id}/report` | Full evaluation report |
| `POST` | `/api/sessions/{id}/end` | End session + stop agents |
| `WS`   | `/ws/telemetry/{id}` | Real-time speaker + vagueness stream |

---

## Hackathon Compliance

| Requirement | Implementation |
|------------|----------------|
| ✅ Real-time voice | Agora SD-RTN™ < 250ms |
| ✅ Natural interruption | Agora AI-VAD barge-in |
| ✅ Contextual memory | Shared session store across all 3 agents |
| ✅ Multi-persona turn-taking | GPT-4o-mini turn arbiter |
| ✅ Evidence-linked scoring | Timestamped transcript evidence quotes |
| ✅ AI disclosure | Alex opens with explicit AI panel announcement |

---

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Recharts, Agora RTC/RTM SDK
- **Backend**: FastAPI, Python 3.11, AsyncIO, Pydantic v2, HTTPX, OpenAI SDK
- **Agora**: SD-RTN™ RTC, Conversational AI Gateway, RTM 2.x Signaling
- **AI**: GPT-4o (report) + GPT-4o-mini (turn routing + evaluation)
