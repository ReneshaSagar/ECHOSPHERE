# OmniPanel AI — Enterprise Proctoring & Dynamic Panel Upgrade

## What Was Upgraded

OmniPanel AI was upgraded into an **Enterprise-Grade AI Interview Platform** with real-time proctoring, dynamic panel personas, multi-round flows, and coordinated conversational tag-teaming.

---

## Enterprise Feature Enhancements

### 1. 🛡️ Real-Time Proctoring & Cheat Detection
- Integrated **MediaPipe Tasks Vision** dynamically inside the webcam feed on the room page.
- Tracks **Gaze Vector Coordinates** in real-time. If the candidate looks away from the screen for more than 4 seconds, a proctor warning is triggered.
- Detects **Multiple Faces** (triggers warnings if more than one face is visible) and **No Face** anomalies.
- Alerts are persisted via WebSocket telemetry to the backend, showing up in the final evaluation report.

### 2. 📹 Automatic Screen Recording
- Automatic screen recording kicks in via browser `navigator.mediaDevices.getDisplayMedia`.
- Streams video chunks to a dedicated `MediaRecorder` instance.

### 3. 🔄 Dynamic Three-Round Interview Panel
The interview is split into three rounds:
1. **Round 1: Screening & Proctoring Verification** — Features a security room scan, webcam setup, screen share prompt, and an Online Assessment code editor interface.
2. **Round 2: Technical Interview** — Spawns 3 customized dynamic technical interviewers (Sarah, Maya, David) tailored to the JD.
3. **Round 3: HR / Behavioral Interview** — Spawns 3 customized HR/recruiter interviewers (Emily, Marcus, Robert) to probe culture and fit.

### 4. 🔀 Centralized Agora completions Routing Proxy (`llm_routes.py`)
- We resolved the feedback loop issue (where multiple voice agents speak simultaneously over each other) by implementing a completions proxy router at `/api/llm/{sessionId}/chat/completions`.
- Agora Conversational AI cloud is pointed to our proxy.
- Our backend:
  - Intercepts incoming messages.
  - Runs the Turn Arbiter to decide who speaks next.
  - Feeds the Rubric Evaluator.
  - Dynamically triggers tag-teaming prompts.
  - Returns the speech answer *only* to the selected active agent, while keeping other agents silent. This results in clean, turn-based, multi-persona audio conversations!

### 5. 📝 Minutes of Meeting & Proctoring Scorecard
- The post-interview report page now outputs separate **Minutes of Meeting (MoM)**:
  - **Recruiter View**: Contains proctoring logs, suspicion level, hesitation pause counts, and hire markers.
  - **Candidate View**: Constructive feedback and action items.
- Alerts flag candidate responses if suspected to be AI-generated (detected via word counts + vagueness anomalies).

---

## Technical Audits Passed

| Check | Result |
|-------|--------|
| Python compiles (`py_compile app/main.py`) | ✅ PASSED |
| TypeScript compiles (`npx tsc --noEmit`) | ✅ PASSED (0 errors) |
| Next.js production build (`npm run build`) | ✅ PASSED (0 errors) |
| Dev servers status | 🟢 Backend (Port 8000) & Frontend (Port 3000) running |
