"""
Interview Routes: Session creation with dynamic round planning, rubric generation,
PDF resume integration, and turn orchestration.
"""
from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from pydantic import BaseModel
import uuid
import asyncio
import time
import json
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.session_store import session_store, TranscriptEntry
from app.engine.arbiter import turn_arbiter
from app.engine.evaluator import evaluator

router = APIRouter()

# Use Requesty-compatible OpenAI client
_llm = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_API_BASE,
)


class OrchestrateRequest(BaseModel):
    candidate_utterance: str
    utterance_id: str


async def _generate_session_config(job_title: str, jd_text: str, resume_text: str) -> dict:
    """
    Use LLM to generate:
    - Dynamic evaluation rubric (4-6 pillars relevant to the role)
    - Dynamic round plan (rounds tailored to the job type)
    - Opening question
    Returns full config dict.
    """
    prompt = f"""You are an expert recruiter and interview panel designer.
Given this job posting and candidate resume, design a complete interview configuration.

Job Title: {job_title}
Job Description: {jd_text[:2000]}
Candidate Resume: {resume_text[:1200] if resume_text else 'Not provided'}

Generate a JSON configuration with:
1. A dynamic evaluation rubric with 4-6 pillars SPECIFIC to this role (NOT generic/fixed pillars - use domain-appropriate ones)
2. A dynamic round plan (2-4 rounds appropriate for this role type)
3. Personas tailored to the role (NOT hardcoded names - generate contextually appropriate names)

For a software engineering role → rounds might be: OA coding, Technical Systems, HR Behavioral
For a fashion/design role → rounds might be: Portfolio Review, Creative Brief, Cultural Fit
For a finance role → rounds might be: Case Analysis, Technical Finance, Leadership
Adapt fully to the job type.

Return ONLY valid JSON:
{{
  "rubric": {{
    "<pillar_key>": {{
      "label": "<Human-readable label>",
      "description": "<2 sentences specific to this role>",
      "key_signals": ["<signal1>", "<signal2>", "<signal3>"]
    }}
  }},
  "opening_question": "<Contextual opening question for this specific role>",
  "round_plan": [
    {{
      "type": "oa",
      "label": "Online Assessment",
      "platform_url": "https://www.hackerrank.com",
      "personas": [
        {{
          "name": "<Contextual name e.g. 'Priya'>",
          "role": "<Role e.g. 'Senior Engineer'>",
          "voice_id": "nova",
          "color": "#7c3aed",
          "agent_uid": 3001,
          "specialties": ["<domain1>", "<domain2>"],
          "system_prompt": "<Concise system prompt for this persona under 150 words>"
        }}
      ]
    }},
    {{
      "type": "technical",
      "label": "Technical Interview",
      "platform_url": null,
      "personas": [
        {{
          "name": "<name>",
          "role": "<role>",
          "voice_id": "onyx",
          "color": "#0ea5e9",
          "agent_uid": 3011,
          "specialties": ["<specialty1>", "<specialty2>"],
          "system_prompt": "<system prompt under 150 words>"
        }},
        {{
          "name": "<name2>",
          "role": "<role2>",
          "voice_id": "nova",
          "color": "#a855f7",
          "agent_uid": 3012,
          "specialties": ["<specialty1>", "<specialty2>"],
          "system_prompt": "<system prompt under 150 words>"
        }},
        {{
          "name": "<name3>",
          "role": "<role3>",
          "voice_id": "echo",
          "color": "#10b981",
          "agent_uid": 3013,
          "specialties": ["<specialty1>", "<specialty2>"],
          "system_prompt": "<system prompt under 150 words>"
        }}
      ]
    }},
    {{
      "type": "hr",
      "label": "HR & Culture",
      "platform_url": null,
      "personas": [
        {{
          "name": "<hr name>",
          "role": "<hr role>",
          "voice_id": "shimmer",
          "color": "#f59e0b",
          "agent_uid": 3021,
          "specialties": ["Cultural fit", "Behavioral"],
          "system_prompt": "<system prompt under 150 words>"
        }}
      ]
    }}
  ]
}}"""

    try:
        response = await _llm.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"[interview_routes] LLM config generation failed: {e}")
        # Fallback configuration
        return {
            "rubric": {
                "technical_depth": {"label": "Technical Depth", "description": "Assess depth of technical knowledge relevant to the role.", "key_signals": ["Domain expertise", "Problem solving", "Code quality"]},
                "communication": {"label": "Communication", "description": "Assess clarity and structure of responses.", "key_signals": ["Clarity", "Conciseness", "Structured answers"]},
                "ownership": {"label": "Ownership & Leadership", "description": "Assess accountability and initiative.", "key_signals": ["Takes responsibility", "Proactive", "Delivers results"]},
                "cultural_fit": {"label": "Cultural Fit", "description": "Assess alignment with company values and team dynamics.", "key_signals": ["Collaboration", "Growth mindset", "Adaptability"]},
            },
            "opening_question": f"Can you walk me through your most relevant experience for this {job_title} role?",
            "round_plan": [
                {
                    "type": "technical",
                    "label": "Technical Interview",
                    "platform_url": None,
                    "personas": [
                        {"name": "Morgan", "role": "Lead Interviewer", "voice_id": "onyx", "color": "#0ea5e9", "agent_uid": 3011, "specialties": ["Technical evaluation", "Deep probing"], "system_prompt": f"You are Morgan, Lead Interviewer evaluating candidates for {job_title}. Ask focused technical questions and probe depth. Keep responses under 80 words."},
                        {"name": "Riley", "role": "Product Manager", "voice_id": "nova", "color": "#a855f7", "agent_uid": 3012, "specialties": ["Product thinking", "Business impact"], "system_prompt": f"You are Riley, PM evaluating candidates for {job_title}. Focus on business impact and user thinking. Keep responses under 80 words."},
                    ]
                },
                {
                    "type": "hr",
                    "label": "HR & Culture Fit",
                    "platform_url": None,
                    "personas": [
                        {"name": "Jordan", "role": "HR Partner", "voice_id": "shimmer", "color": "#f59e0b", "agent_uid": 3021, "specialties": ["Cultural alignment", "Behavioral assessment"], "system_prompt": f"You are Jordan, HR Partner for {job_title} hiring. Use STAR method. Probe ownership, culture, and growth mindset. Keep responses under 80 words."},
                    ]
                }
            ]
        }


@router.post("/sessions/create")
async def create_session(
    job_title: str = Form(...),
    jd_text: str = Form(...),
    resume_text: str = Form(""),
    ats_score: float = Form(0.0),
):
    """
    Create an interview session with dynamic rubric and round plan.
    resume_text: pre-extracted text from PDF upload (optional).
    ats_score: ATS score from resume upload endpoint (optional).
    """
    session_id = str(uuid.uuid4())

    # Generate all configuration via LLM
    config = await _generate_session_config(job_title, jd_text, resume_text)

    rubric = config.get("rubric", {})
    round_plan = config.get("round_plan", [])
    opening_question = config.get("opening_question", f"Welcome! Tell me about yourself and why you're interested in the {job_title} role.")

    # Create session state
    session = await session_store.create_session(
        session_id=session_id,
        job_title=job_title,
        jd_text=jd_text,
        resume_text=resume_text,
        rubric=rubric,
        round_plan=round_plan,
        ats_score=ats_score,
    )
    session.resume_pdf_text = resume_text
    session.session_meta["opening_question"] = opening_question
    session.session_meta["next_question"] = opening_question

    return {
        "session_id": session_id,
        "rubric": rubric,
        "job_title": job_title,
        "opening_question": opening_question,
        "round_plan": round_plan,
        "ats_score": ats_score,
    }


@router.post("/sessions/{session_id}/orchestrate")
async def orchestrate_turn(session_id: str, req: OrchestrateRequest):
    """Receive candidate utterance, run parallel evaluation + arbitration."""
    session = await session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    analysis, routing = await asyncio.gather(
        evaluator.analyze_utterance(req.candidate_utterance, session_id, req.utterance_id),
        turn_arbiter.decide_next_turn(session_id, req.candidate_utterance, session.turn_history),
    )

    entry = TranscriptEntry(
        speaker="candidate",
        text=req.candidate_utterance,
        timestamp=time.time() - session.start_time,
        utterance_id=req.utterance_id,
        vagueness_score=analysis.get("vagueness_score"),
    )
    await session_store.add_transcript_entry(session_id, entry)

    next_persona = routing.get("next_persona", "")
    question = routing.get("follow_up_question", "Can you elaborate on that?")
    await session_store.set_current_persona(session_id, next_persona)

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


@router.post("/sessions/{session_id}/advance_round")
async def advance_round(session_id: str):
    """Advance session to the next round."""
    session = await session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    new_index = await session_store.advance_round(session_id)
    if new_index == -1:
        return {"status": "completed", "message": "All rounds completed", "round_index": session.current_round_index}

    new_round = session.round_plan[new_index]
    return {
        "status": "advanced",
        "round_index": new_index,
        "round": new_round,
    }


@router.get("/sessions/{session_id}/status")
async def get_session_status(session_id: str):
    session = await session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    current_round = session.round_plan[session.current_round_index] if session.round_plan else {}
    elapsed = time.time() - session.start_time
    return {
        "session_id": session_id,
        "job_title": session.job_title,
        "current_persona": session.current_persona,
        "transcript_count": len(session.transcript),
        "status": session.status,
        "elapsed_seconds": round(elapsed),
        "current_round_index": session.current_round_index,
        "current_round": current_round,
        "round_plan": session.round_plan,
        "rubric": session.rubric,
        "ats_score": session.ats_score,
    }



