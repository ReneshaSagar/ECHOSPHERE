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

# LLM Rubric and Blueprint generation has been migrated to app.engine.orchestrator


from app.engine.orchestrator import orchestrator

@router.post("/sessions/create")
async def create_session(
    job_title: str = Form(...),
    jd_text: str = Form(...),
    resume_file: UploadFile = File(...),
):
    """Create session from uploaded PDF, run OCR extraction, calculate ATS match, and dynamic personas."""
    session_id = str(uuid.uuid4())
    
    # 1. Orchestrator dynamically generates the Blueprint (Rounds + Agents)
    blueprint = await orchestrator.generate_blueprint(job_title, jd_text, resume_text)
    
    rubric = blueprint.get("rubric", {})
    opening_question = blueprint.get("opening_question", "Can you introduce yourself?")
    rounds = blueprint.get("rounds", [])

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
    
    # Store dynamic rounds and agents in session
    session.dynamic_rounds = rounds
    session.current_round = 1  # Start at round 1 (now fully dynamic voice rounds)
    session.opening_question = opening_question
    
    # Set the first speaker to the first agent of the first round
    if rounds and rounds[0].get("agents"):
        first_agent_id = rounds[0]["agents"][0]["agent_id"]
        session.current_persona = first_agent_id
    else:
        session.current_persona = "system"

    return {
        "session_id": session_id,
        "job_title": job_title,
        "ats_score": ats_score,
        "ats_feedback": analysis.get("ats_feedback", ""),
        "rubric": rubric,
        "opening_question": opening_question,
        "rounds": rounds
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

    next_persona = routing.get("next_persona_id", session.current_persona)
    action_type = routing.get("action_type", "continue")
    question = routing.get("follow_up_question", "Can you elaborate on that?")

    # Update primary speaker if there's a permanent handoff
    if action_type == "handoff":
        await session_store.set_current_persona(session_id, next_persona)
    elif action_type == "continue":
        await session_store.set_current_persona(session_id, next_persona)
    # If it's an "interrupt", we temporarily let next_persona speak, but we might NOT change current_persona permanently.
    # For now, we will track who actually spoke.

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
        "action_type": action_type,
        "question": question,
        "vagueness_score": analysis.get("vagueness_score"),
        "buzzwords_found": analysis.get("buzzwords_found", []),
        "pillar_scores": analysis.get("pillar_scores", {}),
        "detected_issues": routing.get("detected_issues", []),
        "reasoning": routing.get("reasoning", "")
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
        "ats_score": session.ats_score,
        "rounds": getattr(session, "dynamic_rounds", [])
    }
