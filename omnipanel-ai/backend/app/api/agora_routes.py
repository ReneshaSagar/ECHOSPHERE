from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from app.core.agora_client import build_rtc_token, build_rtm_token, agora_client
from app.engine.personas import PERSONAS
from app.core.session_store import session_store
from app.core.config import settings

router = APIRouter()

class AgentStartRequest(BaseModel):
    session_id: str
    channel_name: str
    personas: List[str] = ['alex', 'maya', 'david']

class AgentInstructRequest(BaseModel):
    new_prompt: str

@router.get('/token')
async def get_agora_tokens(channel_name: str, uid: int, role: str = 'publisher'):
    rtc_token = build_rtc_token(channel_name, uid)
    rtm_token = build_rtm_token(str(uid))
    return {
        'rtc_token': rtc_token,
        'rtm_token': rtm_token,
        'uid': uid,
        'channel_name': channel_name
    }

@router.post('/agents/start')
async def start_agents(req: AgentStartRequest):
    agent_ids = {}
    
    # 1. Determine the target LLM completions URL
    llm_url = 'https://api.openai.com/v1/chat/completions'
    if settings.PUBLIC_BACKEND_URL:
        # Route through our FastAPI central completions orchestrator
        llm_url = f"{settings.PUBLIC_BACKEND_URL.rstrip('/')}/api/llm/{req.session_id}/chat/completions"
        print(f"[Agora AI Agent Startup] Exposing local LLM proxy URL: {llm_url}")

    for persona_key in req.personas:
        persona = PERSONAS.get(persona_key.lower())
        if not persona:
            continue
        try:
            res = await agora_client.start_convo_agent(
                channel_name=req.channel_name,
                agent_uid=persona.agent_uid,
                persona_name=persona.name,
                system_prompt=persona.system_prompt,
                voice_id=persona.voice_id,
                llm_url=llm_url
            )
            agent_id = res.get('agent_id') or str(persona.agent_uid)
            agent_ids[persona_key] = agent_id
            await session_store.update_agent_id(req.session_id, persona_key, agent_id)
        except Exception as e:
            print(f'Error starting agent {persona.name}: {e}')
    return {'agent_ids': agent_ids}

@router.delete('/agents/{agent_id}')
async def stop_agent(agent_id: str):
    try:
        res = await agora_client.stop_convo_agent(agent_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/agents/{agent_id}/instruct')
async def instruct_agent(agent_id: str, req: AgentInstructRequest):
    try:
        res = await agora_client.update_agent_instruction(agent_id, req.new_prompt)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
