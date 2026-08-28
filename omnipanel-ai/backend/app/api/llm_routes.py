"""
LLM Routes: Exposes an OpenAI-compatible completions proxy for Agora Conversational AI.
This enables centralized orchestration, real-time evaluation, and panel coordination.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time
import uuid
import asyncio

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

@router.post("/llm/{session_id}/chat/completions")
async def convo_ai_completion_proxy(session_id: str, req: ChatCompletionRequest):
    """
    OpenAI-compatible chat completion proxy. Agora Conversational AI agents call this endpoint.
    Coordinates who speaks, updates the transcript, scores responses, and pushes WebSocket events.
    """
    # 1. Identify which persona is calling us based on system prompt
    from app.main import get_connection_manager
    manager = get_connection_manager()
    
    calling_persona = "alex"  # Default fallback
    system_content = ""
    for msg in req.messages:
        if msg.role == "system":
            system_content = msg.content.lower()
            break
            
    if "alex" in system_content:
        calling_persona = "alex"
    elif "maya" in system_content:
        calling_persona = "maya"
    elif "david" in system_content:
        calling_persona = "david"

    # 2. Retrieve session state
    session = await session_store.get_session(session_id)
    if not session:
        # Fallback to direct completion if session not found to prevent freeze
        from openai import AsyncOpenAI
        from app.core.config import settings
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        messages_dict = [{"role": m.role, "role": m.role, "content": m.content} for m in req.messages]
        res = await client.chat.completions.create(model="gpt-4o-mini", messages=messages_dict, temperature=0.7)
        return json_response(res.choices[0].message.content)

    # 3. Extract candidate's last utterance
    candidate_utterance = ""
    for msg in reversed(req.messages):
        if msg.role == "user":
            candidate_utterance = msg.content
            break

    if not candidate_utterance:
        # If no user message, return empty completion to keep agents silent
        return empty_response()

    # 4. Centralized turn arbitration (only run once per user utterance)
    # We use a Lock in SessionStore to ensure thread safety
    session_lock = session_store._locks.get(session_id)
    if not session_lock:
        session_lock = asyncio.Lock()
        session_store._locks[session_id] = session_lock

    async with session_lock:
        # Check if we already processed this exact candidate utterance to prevent duplication
        last_entry = session.transcript[-1] if session.transcript else None
        is_already_processed = (
            last_entry 
            and last_entry.speaker == "candidate" 
            and last_entry.text == candidate_utterance
        ) or (
            len(session.transcript) > 1 
            and session.transcript[-2].speaker == "candidate" 
            and session.transcript[-2].text == candidate_utterance
        )

        if not is_already_processed:
            # First time seeing this candidate utterance in this turn
            utterance_id = str(uuid.uuid4())
            
            # Run Turn Arbiter + Rubric Scorer
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
            session.turn_history.append({'speaker': 'candidate', 'text': candidate_utterance})
            
            # Calculate hesitation: check time since last agent spoke
            # If no agent spoke yet, it's the beginning of the interview
            last_agent_time = session.start_time
            for entry in reversed(session.transcript[:-1]):
                if entry.speaker in ["alex", "maya", "david"]:
                    last_agent_time = entry.timestamp + session.start_time
                    break
            
            hesitation_sec = max(0.0, time.time() - last_agent_time)
            if hesitation_sec > 3.0:  # Hesitation alert if candidate takes > 3s to answer
                session.hesitations.append({
                    "timestamp": time.time() - session.start_time,
                    "duration_ms": round(hesitation_sec * 1000)
                })

            # Store turn results on session for dynamic routing responses
            session.current_persona = routing.get("next_persona", "alex")
            
            # Store the AI follow-up response
            follow_up_question = routing.get("follow_up_question", "Please tell me more.")
            
            # Dynamic tag-teaming/interruption formatting:
            # If arbiter decides tag-team (confidence > 0.9 and detected_issues), maya might interrupt alex
            is_tag_team = len(routing.get("detected_issues", [])) > 0 and routing.get("confidence", 0) > 0.8
            if is_tag_team:
                interrupted_from = "Alex" if session.current_persona != "alex" else "David"
                follow_up_question = f"[Interrupting {interrupted_from}] Wait, I want to follow up on that. {follow_up_question}"

            session.dynamic_personas["next_question"] = follow_up_question
            
            ai_entry = TranscriptEntry(
                speaker=session.current_persona,
                text=follow_up_question,
                timestamp=time.time() - session.start_time,
                utterance_id=str(uuid.uuid4()),
            )
            session.transcript.append(ai_entry)
            session.turn_history.append({'speaker': session.current_persona, 'text': follow_up_question})

            # Broadcast telemetries over WebSockets
            await manager.broadcast(session_id, {
                "type": "telemetry",
                "session_id": session_id,
                "event": {
                    "active_speaker": session.current_persona,
                    "transcript_line": {
                        "speaker": "candidate",
                        "text": candidate_utterance,
                        "timestamp": cand_entry.timestamp,
                        "vagueness_score": cand_entry.vagueness_score
                    }
                }
            })
            
            await manager.broadcast(session_id, {
                "type": "telemetry",
                "session_id": session_id,
                "event": {
                    "active_speaker": session.current_persona,
                    "transcript_line": {
                        "speaker": session.current_persona,
                        "text": follow_up_question,
                        "timestamp": ai_entry.timestamp
                    }
                }
            })
            
            await manager.broadcast(session_id, {
                "type": "telemetry",
                "session_id": session_id,
                "event": {
                    "vagueness_score": analysis.get("vagueness_score", 0),
                    "difficulty_level": analysis.get("difficulty_level", 2),
                    "buzzwords": analysis.get("buzzwords_found", []),
                    "covered_pillars": [k for k, v in analysis.get("pillar_scores", {}).items() if v > 5]
                }
            })

    # 5. Routing response: Only the SELECTED agent should speak the response text.
    # The other two agents must return a silent response (empty content) so they stay silent.
    target_persona = session.current_persona or "alex"
    
    if calling_persona == target_persona:
        response_text = session.dynamic_personas.get("next_question", "Could you elaborate?")
        return json_response(response_text)
    else:
        # Keep this agent silent
        return empty_response()

def json_response(text: str) -> dict:
    """Helper to return OpenAI chat completion schema."""
    return {
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": text
                },
                "finish_reason": "stop"
            }
        ]
    }

def empty_response() -> dict:
    """Return a silent space response to mute the calling agent."""
    return json_response(" ")
