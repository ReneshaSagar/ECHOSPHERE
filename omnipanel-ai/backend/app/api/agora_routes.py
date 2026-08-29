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
    
    session = await session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # 1. Determine the target LLM completions URL
    llm_url = 'https://api.openai.com/v1/chat/completions'
    if settings.PUBLIC_BACKEND_URL:
        # Route through our FastAPI central completions orchestrator
        llm_url = f"{settings.PUBLIC_BACKEND_URL.rstrip('/')}/api/llm/{req.session_id}/chat/completions"
        print(f"[Agora AI Agent Startup] Exposing local LLM proxy URL: {llm_url}")

    # Find the requested personas in the dynamic rounds
    dynamic_agents = {}
    for round_data in getattr(session, "dynamic_rounds", []):
        for ag in round_data.get("agents", []):
            dynamic_agents[ag["name"].lower()] = ag

    for persona_key in req.personas:
        ag_data = dynamic_agents.get(persona_key.lower())
        if not ag_data:
            print(f"Agent {persona_key} not found in dynamic rounds")
            continue
            
        persona_name = ag_data.get("name", "Agent")
        try:
            # We must assign a unique agent_uid, e.g., hash the name
            import hashlib
            uid_hash = int(hashlib.md5(persona_name.encode()).hexdigest(), 16) % 10000 + 2000
            
            res = await agora_client.start_convo_agent(
                channel_name=req.channel_name,
                agent_uid=uid_hash,
                persona_name=persona_name,
                system_prompt=ag_data.get("system_prompt", f"You are {persona_name}. Conduct a professional interview."),
                voice_id=ag_data.get("voice_id", "nova"),
                llm_url=llm_url
            )
            agent_id = res.get('agent_id') or str(uid_hash)
            agent_ids[persona_key] = agent_id
            await session_store.update_agent_id(req.session_id, persona_key, agent_id)
        except Exception as e:
            print(f'Error starting agent {persona_name}: {e}')
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
