# Implementation Plan — Requesty, Agora SDK, and Dynamic Proctoring Platform

## Goal Description
Upgrading the OmniPanel AI platform to use Requesty's unified API completions endpoint, implementing official Agora token generation to fix mic/audio issues, adding a PDF upload feature with real text extraction (OCR/pypdf) and ATS score calculation, designing a dynamic round progression flow (Assessment, Technical, HR) with disqualification checks, and refining the Next.js UI to be highly minimalist and modern (synthetic-audience style).

---

## Proposed Changes

### 1. Backend Modifications
#### [MODIFY] [config.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/core/config.py)
- Centrally expose `AsyncOpenAI` with Requesty configuration (`base_url="https://router.requesty.ai/v1"`).
- Define default model constants: `MODEL_LARGE = "openai/gpt-4o"` and `MODEL_SMALL = "openai/gpt-4o-mini"`.

#### [MODIFY] [agora_client.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/core/agora_client.py)
- Replace custom struct-packing Rtc Token generation with the official `RtcTokenBuilder` from the `agora-token-builder` package:
  ```python
  from agora_token_builder import RtcTokenBuilder
  ```

#### [MODIFY] [session_store.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/core/session_store.py)
- Add `ats_score`, `pdf_resume_text`, and round status/grades.

#### [MODIFY] [interview_routes.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/api/interview_routes.py)
- Change `/sessions/create` to accept a multi-part `.pdf` file instead of simple resume text.
- Use `pypdf.PdfReader` to extract plain text from the uploaded PDF.
- Prompt Requesty LLM to calculate an ATS score and parse the resume details.
- Adapt the round execution checks (disqualifying candidates if their assessment or technical rounds do not meet a grade threshold).

#### [MODIFY] [llm_routes.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/api/llm_routes.py)
- Update models to use Requesty models (`openai/gpt-4o` / `openai/gpt-4o-mini`).

#### [MODIFY] [arbiter.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/engine/arbiter.py) & [evaluator.py](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/backend/app/engine/evaluator.py)
- Inject Requesty models and base URL.
- Update evaluator to merge ATS Resume score into the final scorecard.

---

### 2. Frontend Modifications
#### [MODIFY] [globals.css](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/frontend/app/globals.css)
- Revamp theme styles to use deep slate/black tones (`#020408`), thin border lines (`border-[#131B2E]`), glowing borders, and clean monospace font pairings to match `synthetic-audience`.

#### [MODIFY] [setup/page.tsx](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/frontend/app/setup/page.tsx)
- Change the resume copy-paste text box to a drag-and-drop file upload component accepting `.pdf`.
- Display a professional parsing visualizer showing ATS metrics.

#### [MODIFY] [room/[sessionId]/page.tsx](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/frontend/app/room/[sessionId]/page.tsx)
- Reorganize layout into a hyper-minimalist grid.
- Integrate step-by-step round progression: if candidate fails Assessment/Round 1, show a rejection status and prevent proceeding.
- Embed a proctoring eye gaze canvas layer.

#### [MODIFY] [report/[sessionId]/page.tsx](file:///C:/Users/Renesha Sagar/Desktop/ecosophere/omnipanel-ai/frontend/app/report/[sessionId]/page.tsx)
- Upgrade report UI to show recruiter MoM details, ATS scores, and proctoring log records in a sleek, minimalist dashboard.

---

## Verification Plan

### Automated Checks
- Compile TypeScript: `npx tsc --noEmit`
- Run Next.js production build: `npm run build`
- Validate Python syntax: `python -m py_compile`

### Manual Verification
- Test PDF upload with a sample resume and confirm text extraction and ATS scores.
- Test Agora join and verify that the official token builder resolves the audio/mic gateway issues.
- Verify disqualification state terminates the room page.
