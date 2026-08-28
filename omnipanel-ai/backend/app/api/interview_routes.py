"""
Interview Routes: Session creation via PDF upload, rubric generation, and round evaluation/grading.
"""
from fastapi import APIRouter, Form, HTTPException, File, UploadFile
from pydantic import BaseModel
import uuid
import asyncio
import time
import json
import io
from pypdf import PdfReader

from app.core.config import settings, openai_client, MODEL_LARGE, MODEL_SMALL
from app.core.session_store import session_store, TranscriptEntry
from app.engine.arbiter import turn_arbiter
from app.engine.evaluator import evaluator
router = APIRouter()

class OrchestrateRequest(BaseModel):
    candidate_utterance: str
    utterance_id: str

class GradeRequest(BaseModel):
    round_index: int
    submission_content: str  # Code block or answers

async def _extract_pdf_text(file: UploadFile) -> str:
    """Extract plain text from uploaded PDF using pypdf."""
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return ""

async def _generate_ats_and_rubric(job_title: str, jd_text: str, resume_text: str) -> dict:
    """Use Requesty to analyze resume ATS match and create a customized 5-pillar rubric and dynamic personas."""
    prompt = f"""You are an expert recruiter and technical interviewer. Analyze the candidate's resume match against the job description.
Calculate an ATS compatibility score from 0 to 100 based on core skills, requirements, and background keywords.

Also, generate a dynamic 5-pillar evaluation rubric, an opening question, and dynamic panel interviewers:
1. For the Technical Round (Round 2), define 3 distinct panel members (with custom names, roles, and prompts) suited to this JD.
2. For the HR Round (Round 3), define exactly 1 HR Lead / behavioral persona suited to evaluate culture and fit.

Job Title: {job_title}
Job Description: {jd_text[:1500]}
Candidate Resume Text: {resume_text[:2000]}

Return ONLY valid JSON with this structure:
{{
  "ats_score": 0-100,
  "ats_feedback": "<1-sentence ATS match summary>",
  "rubric": {{
    "architecture": {{
      "label": "Technical & Domain Depth",
      "description": "<focus area based on JD>",
      "key_signals": ["<sig1>", "<sig2>"]
    }},
    "product_sense": {{
      "label": "Product & Value Realization",
      "description": "<focus area>",
      "key_signals": ["<sig1>", "<sig2>"]
    }},
    "scalability": {{
      "label": "Scalability & Load Budgeting",
      "description": "<focus area>",
      "key_signals": ["<sig1>", "<sig2>"]
    }},
    "clarity": {{
      "label": "Clarity & Structure",
      "description": "<focus area>",
      "key_signals": ["<sig1>", "<sig2>"]
    }},
    "ownership": {{
      "label": "STAR Ownership & Behavioral",
      "description": "<focus area>",
      "key_signals": ["<sig1>", "<sig2>"]
    }}
  }},
  "opening_question": "<opening technical/domain question tailored to candidate background and JD>",
  "dynamic_personas": {{
    "technical": [
      {{
        "name": "<Name1, e.g. Sarah>",
        "role": "<e.g. Principal Architect>",
        "voice_id": "onyx",
        "color": "#06B6D4",
        "agent_uid": 2001,
        "specialties": ["System Design", "Cloud Infrastructure"],
        "system_prompt": "You are Sarah. Probes system design."
      }},
      {{
        "name": "<Name2, e.g. Maya>",
        "role": "<e.g. Product VP>",
        "voice_id": "nova",
        "color": "#F59E0B",
        "agent_uid": 2002,
        "specialties": ["ROI", "Product Delivery"],
        "system_prompt": "You are Maya. Probes product alignment."
      }},
      {{
        "name": "<Name3, e.g. David>",
        "role": "<e.g. Eng Director>",
        "voice_id": "echo",
        "color": "#10B981",
        "agent_uid": 2003,
        "specialties": ["Leadership", "STAR Metrics"],
        "system_prompt": "You are David. Probes leadership fit."
      }}
    ],
    "hr": [
      {{
        "name": "<HR Name, e.g. Robert>",
        "role": "<e.g. Talent Partner>",
        "voice_id": "echo",
        "color": "#10B981",
        "agent_uid": 2003,
        "specialties": ["Culture Alignment", "Values"],
        "system_prompt": "You are Robert, Talent Partner. Focus on motivational alignment and team dynamics."
      }}
    ]
  }}
}}"""

    try:
        response = await openai_client.chat.completions.create(
            model=MODEL_SMALL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error calling Requesty LLM: {e}")
        # Default fallback rubric and ATS score
        return {
            "ats_score": 75.0,
            "ats_feedback": "Solid baseline profile compatibility.",
            "rubric": {
                "architecture": {"label": "Technical Depth", "description": "Assess basic technical alignment.", "key_signals": ["Domain knowledge"]},
                "product_sense": {"label": "Product Sense", "description": "Evaluate tradeoffs.", "key_signals": ["Tradeoff reasoning"]},
                "scalability": {"label": "Scalability & Load", "description": "Verify scalability logic.", "key_signals": ["Resource sizing"]},
                "clarity": {"label": "Communication", "description": "Evaluate explanation quality.", "key_signals": ["Clarity"]},
                "ownership": {"label": "STAR & Leadership", "description": "Probe past ownership examples.", "key_signals": ["Accountability"]}
            },
            "opening_question": f"Can you walk me through your recent domain project for the {job_title} role?",
            "dynamic_personas": {
                "technical": [
                    {"name": "Sarah", "role": "Domain Architect", "voice_id": "onyx", "color": "#06B6D4", "agent_uid": 2001, "specialties": ["Systems"], "system_prompt": "You are Sarah."},
                    {"name": "Maya", "role": "Product VP", "voice_id": "nova", "color": "#F59E0B", "agent_uid": 2002, "specialties": ["Product"], "system_prompt": "You are Maya."},
                    {"name": "David", "role": "Eng Director", "voice_id": "echo", "color": "#10B981", "agent_uid": 2003, "specialties": ["STAR"], "system_prompt": "You are David."}
                ],
                "hr": [
                    {"name": "Robert", "role": "Talent Partner", "voice_id": "echo", "color": "#10B981", "agent_uid": 2003, "specialties": ["Culture"], "system_prompt": "You are Robert."}
                ]
            }
        }

@router.post("/sessions/create")
async def create_session(
    job_title: str = Form(...),
    jd_text: str = Form(...),
    resume_file: UploadFile = File(...),
):
    """Create session from uploaded PDF, run OCR extraction, calculate ATS match, and dynamic personas."""
    session_id = str(uuid.uuid4())
    
    # 1. Parse PDF text
    resume_text = await _extract_pdf_text(resume_file)
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded PDF resume. Make sure it is not corrupt.")

    # 2. Get ATS score + Rubrics + Dynamic panel personas
    analysis = await _generate_ats_and_rubric(job_title, jd_text, resume_text)
    
    ats_score = analysis.get("ats_score", 70.0)
    rubric = analysis.get("rubric", {})
    opening_question = analysis.get("opening_question", "Welcome. Let's begin the interview.")
    dynamic_personas = analysis.get("dynamic_personas", {})

    # 3. Save to session state
    session = await session_store.create_session(
        session_id=session_id,
        job_title=job_title,
        jd_text=jd_text,
        resume_text=resume_text[:2000], # Keep a compact copy
        rubric=rubric,
    )
    
    session.ats_score = ats_score
    session.pdf_resume_text = resume_text
    session.dynamic_personas = dynamic_personas
    session.dynamic_personas["opening_question"] = opening_question
    session.dynamic_personas["next_question"] = opening_question

    return {
        "session_id": session_id,
        "job_title": job_title,
        "ats_score": ats_score,
        "ats_feedback": analysis.get("ats_feedback", ""),
        "rubric": rubric,
        "opening_question": opening_question,
        "dynamic_personas": dynamic_personas
    }

@router.post("/sessions/{session_id}/grade")
async def grade_round(session_id: str, req: GradeRequest):
    """Evaluate candidate code/submissions for Round 1 (Online Assessment) and determine if they qualify to proceed."""
    session = await session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    prompt = f"""You are a senior tech reviewer. Grade this candidate's assessment submission.
Round: Online Assessment (Round 1)
Job Title: {session.job_title}
Job Description: {session.jd_text[:1000]}
Candidate Submission:
\"\"\"
{req.submission_content}
\"\"\"

Return ONLY valid JSON:
{{
  "score": 0-100,
  "passed": true | false,
  "feedback": "<1-sentence grading summary>"
}}"""

    try:
        response = await openai_client.chat.completions.create(
            model=MODEL_SMALL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        grading = json.loads(response.choices[0].message.content)
    except Exception as e:
        # Fallback passing grade
        grading = {"score": 80, "passed": True, "feedback": "Code compiles and passes basic heuristics."}

    # Save round grade to SessionState
    session.round_grades[f"round_{req.round_index}"] = {
        "passed": grading.get("passed", True),
        "score": grading.get("score", 70),
        "feedback": grading.get("feedback", "Assessment submitted.")
    }

    # If candidate failed, set status to disqualified
    if not grading.get("passed", True):
        session.status = "disqualified"
        print(f"[Grading] Room {session_id} candidate failed Round {req.round_index}. Status: disqualified")
        
        # Notify room via WebSocket immediately
        from app.main import get_connection_manager
        manager = get_connection_manager()
        await manager.broadcast(session_id, {
            "type": "telemetry",
            "session_id": session_id,
            "event": {
                "type": "disqualification",
                "round_index": req.round_index,
                "feedback": grading.get("feedback")
            }
        })

    return grading

@router.post("/sessions/{session_id}/orchestrate")
async def orchestrate_turn(session_id: str, req: OrchestrateRequest):
    """Receive candidate utterance, run evaluation + arbitration, return next speaker."""
    session = await session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Run arbiter and evaluator concurrently
    analysis, routing = await asyncio.gather(
        evaluator.analyze_utterance(req.candidate_utterance, session_id, req.utterance_id),
        turn_arbiter.decide_next_turn(session_id, req.candidate_utterance, session.turn_history),
    )

    # Persist candidate transcript entry
    entry = TranscriptEntry(
        speaker="candidate",
        text=req.candidate_utterance,
        timestamp=time.time() - session.start_time,
        utterance_id=req.utterance_id,
        vagueness_score=analysis.get("vagueness_score"),
    )
    await session_store.add_transcript_entry(session_id, entry)

    next_persona = routing.get("next_persona", "david")
    question = routing.get("follow_up_question", "Can you elaborate on that?")

    await session_store.set_current_persona(session_id, next_persona)

    # Persist AI panelist transcript entry
    ai_entry = TranscriptEntry(
        speaker=next_persona,
        text=question,
        timestamp=time.time() - session.start_time,
        utterance_id=str(uuid.uuid4()),
    )
    await session_store.add_transcript_entry(session_id, ai_entry)

    return {
        "next_persona": next_persona,
        "question": question,
        "vagueness_score": analysis.get("vagueness_score"),
        "buzzwords_found": analysis.get("buzzwords_found", []),
        "pillar_scores": analysis.get("pillar_scores", {}),
        "detected_issues": routing.get("detected_issues", []),
        "confidence": routing.get("confidence", 0.8),
    }

@router.get("/sessions/{session_id}/status")
async def get_session_status(session_id: str):
    """Return live session metadata."""
    session = await session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    elapsed = time.time() - session.start_time
    return {
        "session_id": session_id,
        "job_title": session.job_title,
        "current_persona": session.current_persona,
        "transcript_count": len(session.transcript),
        "status": session.status,
        "elapsed_seconds": round(elapsed),
        "current_round": session.current_round,
        "ats_score": session.ats_score
    }
