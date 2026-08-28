"""
Interview Routes: Session management, rubric generation, and turn orchestration.
"""
from fastapi import APIRouter, Form, HTTPException
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
_openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class OrchestrateRequest(BaseModel):
    candidate_utterance: str
    utterance_id: str


async def _generate_rubric(job_title: str, jd_text: str, resume_text: str) -> dict:
    """Use LLM to generate a custom 5-pillar rubric and dynamic panel personas based on the JD and resume."""
    prompt = f"""You are an expert technical interviewer and recruiter. Generate a concise 5-pillar evaluation rubric, an opening question, and 3 custom dynamic personas for a Technical Round panel and 3 custom dynamic personas for an HR/Behavioral Round panel.

Job Title: {job_title}
Job Description (excerpt): {jd_text[:1500]}
Candidate Resume (excerpt): {resume_text[:1000]}

Return ONLY valid JSON with this structure:
{{
  "rubric": {{
    "architecture": {{
      "label": "Architecture & System Design",
      "description": "<2-sentence focus area based on the JD>",
      "key_signals": ["<signal1>", "<signal2>", "<signal3>"]
    }},
    "product_sense": {{
      "label": "Product & Business Sense",
      "description": "<2-sentence focus area>",
      "key_signals": ["<signal1>", "<signal2>", "<signal3>"]
    }},
    "scalability": {{
      "label": "Scalability & Performance",
      "description": "<2-sentence focus area>",
      "key_signals": ["<signal1>", "<signal2>", "<signal3>"]
    }},
    "clarity": {{
      "label": "Communication & Clarity",
      "description": "<2-sentence focus area>",
      "key_signals": ["<signal1>", "<signal2>", "<signal3>"]
    }},
    "ownership": {{
      "label": "Ownership & Leadership",
      "description": "<2-sentence focus area>",
      "key_signals": ["<signal1>", "<signal2>", "<signal3>"]
    }}
  }},
  "opening_question": "<The opening question tailored to the job description>",
  "dynamic_personas": {{
    "technical": [
      {{
        "name": "<Tech lead name, e.g. Sarah>",
        "role": "<e.g. Lead Architect>",
        "voice_id": "onyx",
        "color": "#06B6D4",
        "agent_uid": 2001,
        "specialties": ["Distributed Systems", "Cloud Design"],
        "system_prompt": "You are Sarah, Lead Architect. Focus on system depth. Keep follow-ups under 80 words."
      }},
      {{
        "name": "<Product manager name, e.g. Maya>",
        "role": "<e.g. Senior PM>",
        "voice_id": "nova",
        "color": "#F59E0B",
        "agent_uid": 2002,
        "specialties": ["ROI", "Product Delivery"],
        "system_prompt": "You are Maya, Senior PM. Focus on user metrics and costs. Keep follow-ups under 80 words."
      }},
      {{
        "name": "<Engineering director name, e.g. David>",
        "role": "<e.g. Eng Director>",
        "voice_id": "echo",
        "color": "#10B981",
        "agent_uid": 2003,
        "specialties": ["Leadership", "Execution"],
        "system_prompt": "You are David, Eng Director. Focus on ownership and metrics. Keep follow-ups under 80 words."
      }}
    ],
    "hr": [
      {{
        "name": "<HR Lead name, e.g. Emily>",
        "role": "<e.g. Talent Partner>",
        "voice_id": "onyx",
        "color": "#06B6D4",
        "agent_uid": 2001,
        "specialties": ["Cultural Alignment", "Teamwork"],
        "system_prompt": "You are Emily, Talent Partner. Focus on team fit. Keep follow-ups under 80 words."
      }},
      {{
        "name": "<Behavioral Lead name, e.g. Marcus>",
        "role": "<e.g. Culture Advocate>",
        "voice_id": "nova",
        "color": "#F59E0B",
        "agent_uid": 2002,
        "specialties": ["Conflict Resolution", "Empathy"],
        "system_prompt": "You are Marcus, Culture Advocate. Focus on behavior and growth. Keep follow-ups under 80 words."
      }},
      {{
        "name": "<Hiring Lead name, e.g. Robert>",
        "role": "<e.g. Hiring Manager>",
        "voice_id": "echo",
        "color": "#10B981",
        "agent_uid": 2003,
        "specialties": ["Career Trajectory", "Motivation"],
        "system_prompt": "You are Robert, Hiring Manager. Focus on motivation and alignment. Keep follow-ups under 80 words."
      }}
    ]
  }}
}}"""

    try:
        response = await _openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        # Fallback values if LLM fails
        return {
            "rubric": {
                "architecture": {"label": "Architecture & System Design", "description": "Assess database scaling and design.", "key_signals": ["CAP theorem", "Sharding"]},
                "product_sense": {"label": "Product & Business Sense", "description": "Assess product costs.", "key_signals": ["ROI", "Product focus"]},
                "scalability": {"label": "Scalability & Performance", "description": "Assess bottlenecks.", "key_signals": ["Concurrency", "Capacity"]},
                "clarity": {"label": "Communication & Clarity", "description": "Assess conciseness.", "key_signals": ["Jargon removal", "Clarity"]},
                "ownership": {"label": "Ownership & Leadership", "description": "Assess STAR answers.", "key_signals": ["Ownership", "Accountability"]}
            },
            "opening_question": "Can you walk me through a challenging technical problem you solved recently?",
            "dynamic_personas": {
                "technical": [
                    {"name": "Sarah", "role": "Lead Architect", "voice_id": "onyx", "color": "#06B6D4", "agent_uid": 2001, "specialties": ["Systems"], "system_prompt": "You are Sarah. Probes systems."},
                    {"name": "Maya", "role": "Senior PM", "voice_id": "nova", "color": "#F59E0B", "agent_uid": 2002, "specialties": ["Product"], "system_prompt": "You are Maya. Probes costs."},
                    {"name": "David", "role": "Eng Director", "voice_id": "echo", "color": "#10B981", "agent_uid": 2003, "specialties": ["STAR"], "system_prompt": "You are David. Probes behavioral fit."}
                ],
                "hr": [
                    {"name": "Emily", "role": "Talent Partner", "voice_id": "onyx", "color": "#06B6D4", "agent_uid": 2001, "specialties": ["Culture"], "system_prompt": "You are Emily. Probes cultural fit."},
                    {"name": "Marcus", "role": "Culture Coach", "voice_id": "nova", "color": "#F59E0B", "agent_uid": 2002, "specialties": ["Conflict"], "system_prompt": "You are Marcus. Probes behavior."},
                    {"name": "Robert", "role": "Hiring Manager", "voice_id": "echo", "color": "#10B981", "agent_uid": 2003, "specialties": ["Career"], "system_prompt": "You are Robert. Probes motivations."}
                ]
            }
        }


@router.post("/sessions/create")
async def create_session(
    job_title: str = Form(...),
    jd_text: str = Form(...),
    resume_text: str = Form(...),
):
    """Create an interview session and generate a custom 5-pillar rubric and dynamic personas."""
    session_id = str(uuid.uuid4())
    res = await _generate_rubric(job_title, jd_text, resume_text)
    
    rubric = res.get("rubric", {})
    opening_question = res.get("opening_question", "Can you introduce yourself?")
    dynamic_personas = res.get("dynamic_personas", {})

    # Save to SessionState
    session = await session_store.create_session(
        session_id=session_id,
        job_title=job_title,
        jd_text=jd_text,
        resume_text=resume_text,
        rubric=rubric,
    )
    
    # Store dynamic personas and round settings in session
    session.dynamic_personas = dynamic_personas
    session.dynamic_personas["opening_question"] = opening_question
    session.dynamic_personas["next_question"] = opening_question

    return {
        "session_id": session_id,
        "rubric": rubric,
        "job_title": job_title,
        "opening_question": opening_question,
        "dynamic_personas": dynamic_personas
    }


@router.post("/sessions/{session_id}/orchestrate")
async def orchestrate_turn(session_id: str, req: OrchestrateRequest):
    """Receive candidate utterance, run parallel evaluation + arbitration, return next speaker."""
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
    }

