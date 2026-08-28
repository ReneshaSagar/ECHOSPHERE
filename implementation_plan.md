# Implementation Plan — OmniPanel AI Enterprise

## Goal Description
Enhance OmniPanel AI into a hyper-realistic, enterprise-grade proctored interview platform. The interview will be split into three consecutive rounds (Assessment, Technical, HR). It will feature frontend MediaPipe eye/face tracking for cheat detection, automatic screen recording, a professional dark navy/slate theme, dynamic panel persona generation, and a centralized LLM completion proxy on the backend to coordinate the Agora Conversational AI agents without feedback loops or overlap.

---

## User Review Required

> [!IMPORTANT]
> **Agora LLM Completion Proxy Setup**
> To coordinate the 3 separate AI interviewers (Alex, Maya, David) and prevent them from speaking over each other, their Agora LLM endpoints will be routed through our FastAPI backend.
> This requires a public URL (e.g. via `ngrok` or a tunnel) so the Agora cloud can reach our local backend.
> A new environment variable `PUBLIC_BACKEND_URL` will be added to `.env` (e.g., `PUBLIC_BACKEND_URL=https://xxxx.ngrok-free.app`). If this is not set, the platform will fall back to local browser-based simulation to ensure it remains functional.

---

## Proposed Changes

### 1. Backend: LLM Proxy & Dynamic Rounds
#### [MODIFY] [config.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/core/config.py)
- Add `PUBLIC_BACKEND_URL` to allow routing Agora agent requests to our backend.

#### [MODIFY] [session_store.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/core/session_store.py)
- Add fields to `SessionState` for tracking current round, proctoring alerts, dynamic personas, and hesitation metrics.

#### [MODIFY] [agora_client.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/core/agora_client.py)
- Route the LLM URL to `PUBLIC_BACKEND_URL/api/llm/chat/completions` on agent startup if configured.

#### [NEW] [llm_routes.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/api/llm_routes.py)
- Implement an OpenAI-compatible endpoint `/api/llm/chat/completions`.
- It acts as the routing proxy: receives transcripts, runs TurnArbiter/Evaluator, generates the response in the chosen persona's style (with interruption prompts), and returns the completion to the Agora gateway.

#### [MODIFY] [main.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/main.py)
- Mount the new `llm_routes` router.

#### [MODIFY] [interview_routes.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/api/interview_routes.py)
- Generate dynamic personas matching the job description and round type (Technical vs HR).

#### [MODIFY] [evaluator.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/engine/evaluator.py)
- Include cheating metrics, eye-gaze alerts, and hesitation analysis in the final report. Generate "Minutes of Meeting" for recruiter and candidate.

---

### 2. Frontend: Proctoring & Zoom-like UI
#### [MODIFY] [package.json](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/frontend/package.json)
- Add `@mediapipe/tasks-vision` or use CDN scripts for browser-based face tracking to ensure fast startup.

#### [MODIFY] [globals.css](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/frontend/app/globals.css)
- Implement a polished Dark Navy theme (`#030712`, `#0B1329`, `#1C2541`). Add zoom-like grid layout classes.

#### [MODIFY] [room/[sessionId]/page.tsx](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/frontend/app/room/[sessionId]/page.tsx)
- Rebuild layout to feature a Google Meet / Zoom grid:
  - Left panel: Grid containing Candidate Video + Screen Share.
  - Center/Right panel: Three AI interviewers in a horizontal grid.
  - Sidebar: Dynamic tab switcher (Online Assessment, Code editor, Live Transcript, AI Proctoring Feed).
- Add Webcam proctoring:
  - Load MediaPipe Task Vision dynamically.
  - Track gaze direction, face count, and mouth movements.
  - Stream alerts to backend via WebSocket telemetry.
- Add Screen Recording:
  - Request screen capture automatically on launch.
  - Record the stream using `MediaRecorder`.

---

## Verification Plan

### Automated Checks
- Compile TypeScript: `npx tsc --noEmit`
- Run Next.js production build: `npm run build`
- Validate Python syntax: `python -m py_compile`

### Manual Verification
- Expose local server using ngrok and test real voice coordination.
- Verify cheating detection alerts trigger when looking away or when face is not detected.
- Verify screen recording prompt triggers automatically.
- Check final recruiter report contains the detailed proctoring summary.
