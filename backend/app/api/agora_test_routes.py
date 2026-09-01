import uuid
import time
import json
import asyncio
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

from app.core.config import settings, openai_client, MODEL_SMALL
from app.core.agora_client import AgoraConvoAIClient, build_rtc_token

router = APIRouter()
agora_client = AgoraConvoAIClient()
test_sessions = {}
global_llm_request_count = 0


class LLMRequest(BaseModel):
    model: str
    messages: list
    stream: bool = False
    temperature: float = 1.0

@router.get('/stats')
async def get_test_stats():
    global global_llm_request_count
    return {"llm_request_count": global_llm_request_count}

@router.get('/test-openai')
async def test_openai():
    from app.core.config import openai_client, MODEL_SMALL
    try:
        response = await openai_client.chat.completions.create(
            model=MODEL_SMALL,
            messages=[{"role": "user", "content": "Say exactly: OpenAI test successful."}]
        )
        return {"status": "ok", "response": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class StartTestRequest(BaseModel):
    session_id: str
    candidate_uid: int

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "Agora Test Lab"}

@router.get('/status/{agent_id}')
async def get_agent_status_route(agent_id: str):
    import httpx
    from app.core.config import settings
    import base64
    credentials = base64.b64encode(f'{settings.AGORA_CUSTOMER_ID}:{settings.AGORA_CUSTOMER_SECRET}'.encode()).decode()
    headers = {
        'Authorization': f'Basic {credentials}',
        'Content-Type': 'application/json'
    }
    url = f'https://api.agora.io/api/conversational-ai-agent/v2/projects/{settings.AGORA_APP_ID}/agents/{agent_id}'
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        return {"status_code": res.status_code, "response": res.text}

@router.post("/start")
async def start_test_agent(req: StartTestRequest):
    session_id = req.session_id
    candidate_uid = req.candidate_uid
    channel_name = f"test_{session_id}"
    
    # 1. Generate tokens
    candidate_token = build_rtc_token(channel_name, candidate_uid)
    
    agent_uid = 9999
    agent_token = build_rtc_token(channel_name, agent_uid)
    
    # 2. Build LLM URL
    base_url = settings.PUBLIC_BACKEND_URL.rstrip('/')
    llm_url = f"{base_url}/api/agora-test/llm/{session_id}/chat/completions"
    
    # 3. Simple Persona
    system_prompt = (
        "You are a friendly test interviewer. "
        "Your only purpose is to verify that the Agora conversational AI pipeline is working. "
        "Introduce yourself briefly. Ask the candidate a simple question. "
        "Respond naturally to the candidate's answers. Keep responses short. "
        "Do not perform evaluation. Do not mention implementation details unless asked."
    )
    
    # 4. Start Agent
    try:
        agent_data = await agora_client.start_convo_agent(
            channel_name=channel_name,
            agent_uid=agent_uid,
            persona_name="TestAgent",
            system_prompt="You are a test agent.",
            rtc_token=agent_token,
            session_id=session_id,
            candidate_uid=candidate_uid,
            voice_id="nova",
            tts_provider="openai",
            llm_url=llm_url
        )
        
        test_sessions[session_id] = {
            "agent_id": agent_data["agent_id"],
            "channel": channel_name,
            "llm_url": llm_url,
            "status": "running"
        }
        
        return {
            "status": "started",
            "agent_id": agent_data.get('agent_id'),
            "channel_name": channel_name,
            "candidate_token": candidate_token,
            "agent_id": agent_data["agent_id"],
            "llm_url": llm_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_test_agent(req: StartTestRequest):
    session = test_sessions.get(req.session_id)
    if not session:
        return {"status": "not_found"}
    try:
        await agora_client.stop_convo_agent(session["agent_id"])
        test_sessions.pop(req.session_id, None)
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 300
    stream: bool = False

@router.post('/tts')
async def test_tts_proxy(request: Request):
    """
    Dummy TTS endpoint to see if Agora actually hits this URL.
    """
    raw_body = await request.json()
    print(f"\n[AGORA TEST TTS] Request received!")
    print(f"[AGORA TEST TTS] Raw Request Body: {json.dumps(raw_body, indent=2)}")
    return {"status": "ok"}

@router.post('/llm/{session_id}/chat/completions')
async def test_llm_proxy(session_id: str, request: Request):
    """
    Very simple LLM proxy for the test lab.
    Just proxies to OpenAI and streams back. No turn arbitration.
    """
    global global_llm_request_count
    global_llm_request_count += 1
    raw_body = await request.json()
    print(f"\n[AGORA TEST LLM] Request received for session {session_id}")
    print(f"[AGORA TEST LLM] Raw Request Body: {json.dumps(raw_body, indent=2)}")
    
    messages = raw_body.get('messages', [])
    stream = raw_body.get('stream', False)
    temperature = raw_body.get('temperature', 1.0)
    
    print(f"[AGORA TEST LLM] message count: {len(messages)}")
    
    last_user_msg = next((m.get('content') for m in reversed(messages) if m.get('role') == 'user'), None)
    print(f"[AGORA TEST LLM] last user message: {last_user_msg}")
    
    from app.main import get_connection_manager
    manager = get_connection_manager()
    
    # Broadcast that we received the candidate's text
    if last_user_msg:
        asyncio.create_task(manager.broadcast(session_id, {
            "type": "test_transcript",
            "speaker": "candidate",
            "text": last_user_msg
        }))

    # Forward to OpenAI directly
    print(f"[AGORA TEST LLM] Calling OpenAI")
    from app.core.config import openai_client, MODEL_SMALL
    messages_dict = [{"role": m.get("role"), "content": m.get("content")} for m in messages]
        
    DEBUG_AGORA_HARDCODED_LLM = True

    if stream:
        async def event_stream():
            try:
                import uuid, time, json
                
                if DEBUG_AGORA_HARDCODED_LLM:
                    print(f"[AGORA TEST LLM] Using HARDCODED response")
                    words = ["Hello!", " This", " is", " the", " Agora", " voice", " output", " test."]
                    full_text = ""
                    for w in words:
                        await asyncio.sleep(0.1)
                        full_text += w
                        yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{"content":{json.dumps(w)}}},"finish_reason":null}}]}}\n\n'
                    yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{}},"finish_reason":"stop"}}]}}\n\n'
                    yield 'data: [DONE]\n\n'
                    
                    print(f"[AGORA TEST LLM] SSE completed (hardcoded)")
                    asyncio.create_task(manager.broadcast(session_id, {
                        "type": "test_transcript",
                        "speaker": "ai",
                        "text": full_text
                    }))
                    return
                
                stream = await openai_client.chat.completions.create(
                    model=MODEL_SMALL,
                    messages=messages_dict,
                    temperature=req.temperature,
                    stream=True
                )
                
                full_text = ""
                async for chunk in stream:
                    content = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
                    if content:
                        full_text += content
                        yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{"content":{json.dumps(content)}}},"finish_reason":null}}]}}\n\n'
                
                yield f'data: {{"id":"chatcmpl-{uuid.uuid4()}","object":"chat.completion.chunk","created":{int(time.time())},"model":"gpt-4o","choices":[{{"index":0,"delta":{{}},"finish_reason":"stop"}}]}}\n\n'
                yield 'data: [DONE]\n\n'
                
                print(f"[AGORA TEST LLM] SSE completed")
                
                # Broadcast AI response
                asyncio.create_task(manager.broadcast(session_id, {
                    "type": "test_transcript",
                    "speaker": "ai",
                    "text": full_text
                }))
                
            except Exception as e:
                print(f"[AGORA TEST LLM] Stream Error: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                
        return StreamingResponse(event_stream(), media_type="text/event-stream")
    else:
        res = await openai_client.chat.completions.create(model=MODEL_SMALL, messages=messages_dict, temperature=temperature)
        text = res.choices[0].message.content
        print(f"[AGORA TEST LLM] OpenAI request completed (non-streaming)")
        asyncio.create_task(manager.broadcast(session_id, {
            "type": "test_transcript",
            "speaker": "ai",
            "text": text
        }))
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
            ]
        }
