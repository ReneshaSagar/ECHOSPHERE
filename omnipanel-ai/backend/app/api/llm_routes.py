"""
LLM Routes: OpenAI-compatible completions proxy for Agora Conversational AI.
Identifies calling persona dynamically from session round_plan — zero hardcoded names.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Optional
import time
import uuid
import asyncio
import json

from app.core.session_store import session_store, TranscriptEntry
from app.engine.arbiter import turn_arbiter
from app.engine.evaluator import evaluator

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 300
    stream: bool = False


def _identify_calling_persona(system_content: str, personas: list) -> Optional[str]:
    """
    Identify which persona is calling by checking if its name appears in the system prompt.
    Returns persona name string or None.
    """
    system_lower = system_content.lower()
    for persona in personas:
        persona_name = persona.get("name", "").lower()
        if persona_name and persona_name in system_lower:
            return persona.get("name")
    return None


@router.post("/llm/{session_id}/chat/completions")
async def convo_ai_completion_proxy(session_id: str, req: ChatCompletionRequest):
    """
    Agora Conversational AI agents call this endpoint for LLM completions.
    - Identifies which persona is calling via system prompt inspection
    - Runs Turn Arbiter to decide who speaks
    - Returns speech to active persona, silence to others
    """
    from app.main import get_connection_manager
    manager = get_connection_manager()

    # 1. Get session
    session = await session_store.get_session(session_id)
    if not session:
        return _empty_response()

    # 2. Get current round's personas
    personas = session_store.get_current_personas(session)
    if not personas:
        return _empty_response()

    # 3. Identify which persona is calling us
    system_content = ""
    for msg in req.messages:
        if msg.role == "system":
            system_content = msg.content
            break

    calling_persona_name = _identify_calling_persona(system_content, personas)
    if not calling_persona_name:
        # Can't identify caller — return silence
        return _empty_response()

    # 4. Extract candidate's last utterance
    candidate_utterance = ""
    for msg in reversed(req.messages):
        if msg.role == "user":
            candidate_utterance = msg.content.strip()
            break

    if not candidate_utterance:
        return _empty_response()

    # 5. Centralized turn arbitration with lock
    session_lock = session_store._locks.get(session_id)
    if not session_lock:
        session_lock = asyncio.Lock()
        session_store._locks[session_id] = session_lock

    async with session_lock:
        # Dedup check: avoid processing same utterance twice
        already_processed = False
        for entry in reversed(session.transcript[-4:]):
            if entry.speaker == "candidate" and entry.text == candidate_utterance:
                already_processed = True
                break

        if not already_processed:
            utterance_id = str(uuid.uuid4())

            # Run Turn Arbiter + Evaluator in parallel
            analysis, routing = await asyncio.gather(
                evaluator.analyze_utterance(candidate_utterance, session_id, utterance_id),
                turn_arbiter.decide_next_turn(session_id, candidate_utterance, session.turn_history),
            )

            # Save candidate transcript
            cand_entry = TranscriptEntry(
                speaker="candidate",
                text=candidate_utterance,
                timestamp=time.time() - session.start_time,
                utterance_id=utterance_id,
                vagueness_score=analysis.get("vagueness_score"),
            )
            session.transcript.append(cand_entry)
            session.turn_history.append({"speaker": "candidate", "text": candidate_utterance})

            # Hesitation detection
            last_agent_time = session.start_time
            for entry in reversed(session.transcript[:-1]):
                if entry.speaker != "candidate":
                    last_agent_time = entry.timestamp + session.start_time
                    break
            hesitation_sec = max(0.0, time.time() - last_agent_time)
            if hesitation_sec > 3.0:
                session.hesitations.append({
                    "timestamp": time.time() - session.start_time,
                    "duration_ms": round(hesitation_sec * 1000),
                })

            # Set active persona
            next_persona_name = routing.get("next_persona", personas[0].get("name", ""))
            session.current_persona = next_persona_name
            follow_up = routing.get("follow_up_question", "Could you elaborate on that?")

            # Tag-team interruption formatting
            detected_issues = routing.get("detected_issues", [])
            if detected_issues and routing.get("confidence", 0) > 0.85:
                last_speaker = session.turn_history[-2].get("speaker", "") if len(session.turn_history) > 1 else ""
                if last_speaker and last_speaker != next_persona_name and last_speaker != "candidate":
                    follow_up = f"[Jumping in] — {follow_up}"

            session.session_meta["next_question"] = follow_up

            # Save AI transcript entry
            ai_entry = TranscriptEntry(
                speaker=next_persona_name,
                text=follow_up,
                timestamp=time.time() - session.start_time,
                utterance_id=str(uuid.uuid4()),
            )
            session.transcript.append(ai_entry)
            session.turn_history.append({"speaker": next_persona_name, "text": follow_up})

            # Broadcast WebSocket telemetry
            await manager.broadcast(session_id, {
                "type": "telemetry",
                "session_id": session_id,
                "event": {
                    "type": "transcript_line",
                    "speaker": "candidate",
                    "text": candidate_utterance,
                    "timestamp": cand_entry.timestamp,
                    "vagueness_score": cand_entry.vagueness_score,
                    "id": utterance_id,
                }
            })
            await manager.broadcast(session_id, {
                "type": "telemetry",
                "session_id": session_id,
                "event": {
                    "type": "transcript_line",
                    "speaker": next_persona_name,
                    "text": follow_up,
                    "timestamp": ai_entry.timestamp,
                    "id": ai_entry.utterance_id,
                }
            })
            await manager.broadcast(session_id, {
                "type": "telemetry",
                "session_id": session_id,
                "event": {
                    "type": "speaker_change",
                    "speaker": next_persona_name,
                }
            })
            await manager.broadcast(session_id, {
                "type": "telemetry",
                "session_id": session_id,
                "event": {
                    "type": "vagueness_alert",
                    "score": analysis.get("vagueness_score", 0),
                    "difficulty_level": analysis.get("difficulty_level", 2),
                    "buzzwords": analysis.get("buzzwords_found", []),
                    "covered_pillars": [k for k, v in analysis.get("pillar_scores", {}).items() if v > 5],
                }
            })

    # 6. Route response: only active persona speaks, others return silence
    active = session.current_persona or ""
    if calling_persona_name == active:
        text = session.session_meta.get("next_question", "Could you elaborate?")
        return _json_response(text)
    else:
        return _empty_response()


def _json_response(text: str) -> dict:
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": text},
            "finish_reason": "stop",
        }],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


def _empty_response() -> dict:
    return _json_response(" ")
