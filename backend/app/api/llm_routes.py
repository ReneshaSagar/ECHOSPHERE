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

@router.post("/{session_id}/chat/completions")
async def convo_ai_completion_proxy(session_id: str, req: ChatCompletionRequest):
    """
    OpenAI-compatible chat completion proxy. Agora Conversational AI agents call this endpoint.
    Coordinates who speaks, updates the transcript, scores responses, and pushes WebSocket events.
    """
    # 1. Identify which persona is calling us based on system prompt
    from app.main import get_connection_manager
    manager = get_connection_manager()
    
    import re
    calling_persona = "agent_1"  # Default fallback
    system_content = ""
    for msg in req.messages:
        if msg.role == "system":
            system_content = msg.content
            break
            
    match = re.search(r"\[AGENT_ID:\s*([^\]]+)\]", system_content)
    if match:
        calling_persona = match.group(1).strip()
    # 2. Retrieve session state
    session = await session_store.get_session(session_id)
    if not session:
        # Fallback to direct completion if session not found to prevent freeze
        from app.core.config import openai_client, MODEL_SMALL
        messages_dict = [{"role": m.role, "content": m.content} for m in req.messages]
        res = await openai_client.chat.completions.create(model=MODEL_SMALL, messages=messages_dict, temperature=0.7)
        return json_response(res.choices[0].message.content)

    # 3. Extract candidate's last utterance
    candidate_utterance = ""
    for msg in reversed(req.messages):
        if msg.role == "user":
            candidate_utterance = msg.content
            break

    if not candidate_utterance:
        # If no user message and the transcript is empty, it's the start of the interview!
        if not session.transcript:
            target_persona = session.current_persona or "agent_1"
            if calling_persona == target_persona:
                response_text = getattr(session, "opening_question", "Hello! Let's begin the interview.")
                # Save to transcript so we don't repeat it endlessly
                ai_entry = TranscriptEntry(
                    speaker=target_persona,
                    text=response_text,
                    timestamp=time.time() - session.start_time,
                    utterance_id=str(uuid.uuid4()),
                )
                session.transcript.append(ai_entry)
                session.turn_history.append({'speaker': target_persona, 'text': response_text})
                print(f"[LLM Proxy] Interview Start! {target_persona} speaks opening question.")
                return json_response(response_text, stream=req.stream)
                
        # Otherwise, keep silent
        return empty_response(stream=req.stream)

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
                evaluation=analysis.get("evaluation"),
                observations=analysis.get("observations")
            )
            session.transcript.append(cand_entry)
            session.turn_history.append({'speaker': 'candidate', 'text': candidate_utterance})
            
            # Calculate hesitation: check time since last agent spoke
            # If no agent spoke yet, it's the beginning of the interview
            last_agent_time = session.start_time
            for entry in reversed(session.transcript[:-1]):
                if entry.speaker not in ["candidate", "system"]:
                    last_agent_time = entry.timestamp + session.start_time
                    break
            
            hesitation_sec = max(0.0, time.time() - last_agent_time)
            if hesitation_sec > 3.0:  # Hesitation alert if candidate takes > 3s to answer
                session.hesitations.append({
                    "timestamp": time.time() - session.start_time,
                    "duration_ms": round(hesitation_sec * 1000)
                })

            # Store turn results on session for dynamic routing responses
            session.current_persona = routing.get("next_persona_id", "agent_1")
            
            # Since the arbiter no longer generates the text, we don't save the AI entry yet.
            # We will save it after the actual LLM streams the response.

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
                    "vagueness_score": analysis.get("vagueness_score", 0),
                    "difficulty_level": analysis.get("difficulty_level", 2),
                    "buzzwords": analysis.get("buzzwords_found", []),
                    "covered_pillars": [k for k, v in analysis.get("pillar_scores", {}).items() if v > 5]
                }
            })

    # 5. Routing response: Only the SELECTED agent should speak the response text.
    target_persona = session.current_persona or "agent_1"
    
    print(f"[LLM Proxy] Calling Persona: {calling_persona} | Target Persona: {target_persona}")
    print(f"[LLM Proxy] Candidate Utterance: {candidate_utterance}")
    
    if calling_persona == target_persona:
        # ALLOW: Forward the request to OpenAI and stream it back to Agora
        from app.core.config import openai_client, MODEL_SMALL
        messages_dict = [{"role": m.role, "content": m.content} for m in req.messages]
        
        async def event_stream():
            try:
                stream = await openai_client.chat.completions.create(
                    model=MODEL_SMALL,
                    messages=messages_dict,
                    temperature=0.7,
                    stream=True
                )
                
                full_text = ""
                async for chunk in stream:
                    content = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
                    if content:
                        full_text += content
                        # Forward exactly in SSE format expected by Agora
                        yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{"content":{json.dumps(content)}}},"finish_reason":null}}]}}\n\n'
                
                yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{}},"finish_reason":"stop"}}]}}\n\n'
                yield 'data: [DONE]\n\n'
                
                # Save generated text to our transcript!
                ai_entry = TranscriptEntry(
                    speaker=target_persona,
                    text=full_text,
                    timestamp=time.time() - session.start_time,
                    utterance_id=str(uuid.uuid4()),
                )
                session.transcript.append(ai_entry)
                session.turn_history.append({'speaker': target_persona, 'text': full_text})
                
                # Push websocket event
                from app.main import get_connection_manager
                manager = get_connection_manager()
                asyncio.create_task(manager.broadcast_to_session(session_id, {
                    "type": "transcript",
                    "speaker": target_persona,
                    "text": full_text,
                    "timestamp": ai_entry.timestamp,
                }))
                
            except Exception as e:
                print(f"[LLM Proxy] Streaming error: {e}")
                
        if req.stream:
            return StreamingResponse(event_stream(), media_type="text/event-stream")
        else:
            # Fallback for non-streaming requests
            res = await openai_client.chat.completions.create(model=MODEL_SMALL, messages=messages_dict, temperature=0.7)
            text = res.choices[0].message.content
            ai_entry = TranscriptEntry(speaker=target_persona, text=text, timestamp=time.time() - session.start_time, utterance_id=str(uuid.uuid4()))
            session.transcript.append(ai_entry)
            session.turn_history.append({'speaker': target_persona, 'text': text})
            return json_response(text, stream=False)
    else:
        # Keep this agent silent
        print(f"[LLM Proxy] Silencing {calling_persona}")
        return empty_response(stream=req.stream)

from fastapi.responses import StreamingResponse

def json_response(text: str, stream: bool = False):
    """Helper to return OpenAI chat completion schema, handling SSE streaming if requested."""
    if not stream:
        return {
            "id": f"chatcmpl-{uuid.uuid4()}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "gpt-4o",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        }
    else:
        # SSE Streaming Format
        async def event_stream():
            # Chunk 1: The role
            yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{"role":"assistant"}},"finish_reason":null}}]}}\n\n'
            
            # Chunk 2: The content
            yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{"content":{json.dumps(text)}}},"finish_reason":null}}]}}\n\n'
            
            # Chunk 3: Done
            yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{}},"finish_reason":"stop"}}]}}\n\n'
            yield 'data: [DONE]\n\n'
            
        return StreamingResponse(event_stream(), media_type="text/event-stream")

def empty_response(stream: bool = False):
    """Return an empty response to mute the calling agent."""
    return json_response("", stream=stream)

def get_dynamic_name(session, key: str) -> str:
    """Resolve the dynamically generated display name for alex/maya/david in this round."""
    round_index = getattr(session, 'current_round', 2)
    round_type = "technical" if round_index == 2 else "hr"
    
    dynamic_list = []
    if session and hasattr(session, "dynamic_personas") and session.dynamic_personas:
        dynamic_list = session.dynamic_personas.get(round_type, [])
        
    uid = 2001 if key == "alex" else 2002 if key == "maya" else 2003
    for p in dynamic_list:
        if p.get("agent_uid") == uid:
            return p.get("name")
            
    # Fallbacks
    return "Alex" if key == "alex" else "Maya" if key == "maya" else "David"
