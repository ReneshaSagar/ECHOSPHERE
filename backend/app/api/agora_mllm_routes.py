from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json

router = APIRouter()

class StartMLLMRequest(BaseModel):
    session_id: str
    candidate_uid: int

class StartDynamicMLLMRequest(BaseModel):
    session_id: str
    candidate_uid: int
    instructions: str
    greeting_message: Optional[str] = None
    voice: Optional[str] = "Charon"
    agent_uid: Optional[int] = 9999
    channel_name: Optional[str] = None

class StopMLLMRequest(BaseModel):
    session_id: str
    agent_id: Optional[str] = None
    agent_ids: Optional[List[str]] = None

# Multi-agent session store: session_id -> { "agents": { agent_id: session_obj }, "channel": str }
mllm_test_sessions: Dict[str, Dict[str, Any]] = {}

@router.post("/start-mllm")
async def start_mllm_test(req: StartMLLMRequest):
    """
    Start an Agora MLLM agent session using the official JSON payload for Gemini Live.
    """
    session_id = req.session_id
    candidate_uid = req.candidate_uid
    channel_name = f"test_mllm_{session_id}"
    
    from app.core.config import settings
    from app.core.agora_client import agora_client, build_rtc_token
    
    gemini_key = settings.GEMINI_API_KEY
    
    candidate_token = build_rtc_token(channel_name, candidate_uid)
    agent_uid = 9999
    agent_token = build_rtc_token(channel_name, agent_uid)
    
    system_instructions = (
        "You are a technical interviewer conducting a structured, conversational interview. "
        "Speak naturally and concisely. "
        "Ask relevant follow-up questions. "
        "Maintain conversational context throughout the interview."
    )
    
    from agora_agent import Agent, Agora
    from agora_agent.core.domain import Area
    from agora_agent.agentkit.vendors import GeminiLive
    
    print(f"\n[AGORA MLLM] STARTING AGENT (Gemini Live) via SDK")
    
    try:
        client = Agora(
            area=Area.US,
            app_id=settings.AGORA_APP_ID,
            app_certificate=settings.AGORA_APP_CERTIFICATE,
            customer_id=settings.AGORA_CUSTOMER_ID,
            customer_secret=settings.AGORA_CUSTOMER_SECRET
        )
        
        agent = Agent(client=client).with_mllm(
            GeminiLive(
                api_key=gemini_key,
                model='gemini-3.1-flash-live-preview', 
                voice='Charon',
                instructions=system_instructions,
                greeting_message="Hi, I'm your technical interviewer. Can you hear me?",
                transcribe_agent=True,
                transcribe_user=True,
                input_modalities=['audio'],
                output_modalities=['audio'],
                http_options={'api_version': 'v1beta'}
            )
        )
        
        agent_uid_str = str(agent_uid)
        candidate_uid_str = str(candidate_uid)
        
        session_obj = agent.create_session(
            channel=channel_name,
            agent_uid=agent_uid_str,
            remote_uids=[candidate_uid_str],
            token=agent_token
        )
        
        response = session_obj.start()
        agent_id = session_obj.id
        
        if session_id not in mllm_test_sessions:
            mllm_test_sessions[session_id] = {"agents": {}, "channel": channel_name}
        mllm_test_sessions[session_id]["agents"][agent_id] = session_obj
        
        return {
            "status": "started",
            "agent_id": agent_id,
            "channel_name": channel_name,
            "candidate_token": candidate_token,
            "raw_response": "SDK started successfully"
        }
    except Exception as e:
        print(f"[AGORA MLLM] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop-mllm")
async def stop_mllm_test(req: StopMLLMRequest):
    """
    Stops specified agent(s) or ALL active agents for a session (Anti-Zombie Guarantee).
    """
    session = mllm_test_sessions.get(req.session_id)
    if not session:
        return {"status": "not_found"}
    
    try:
        agents_dict = session.get("agents", {})
        stopped_ids = []
        
        target_ids = req.agent_ids or ([req.agent_id] if req.agent_id else list(agents_dict.keys()))
        
        for aid in target_ids:
            if aid in agents_dict:
                try:
                    agents_dict[aid].stop()
                    stopped_ids.append(aid)
                    print(f"[AGORA MLLM] STOPPED AGENT: {aid}")
                except Exception as stop_err:
                    print(f"[AGORA MLLM] Warning stopping agent {aid}: {stop_err}")
                agents_dict.pop(aid, None)
        
        if not agents_dict:
            mllm_test_sessions.pop(req.session_id, None)
            
        return {"status": "stopped", "stopped_agents": stopped_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/start-dynamic-mllm')
async def start_dynamic_mllm(req: StartDynamicMLLMRequest):
    session_id = req.session_id
    candidate_uid = req.candidate_uid
    target_agent_uid = req.agent_uid if req.agent_uid else 9999
    target_voice = req.voice if req.voice else "Charon"
    channel_name = req.channel_name if req.channel_name else f'interview_{session_id}'
    
    from app.core.config import settings
    from app.core.agora_client import build_rtc_token
    
    gemini_key = settings.GEMINI_API_KEY
    
    candidate_token = build_rtc_token(channel_name, candidate_uid)
    agent_token = build_rtc_token(channel_name, target_agent_uid)
    
    from agora_agent import Agent, Agora, Area
    from agora_agent.agentkit.vendors import GeminiLive
    
    print(f'\n[AGORA MLLM] STARTING DYNAMIC AGENT (Voice: {target_voice}, UID: {target_agent_uid}, Channel: {channel_name})')
    
    try:
        client = Agora(
            area=Area.US,
            app_id=settings.AGORA_APP_ID,
            app_certificate=settings.AGORA_APP_CERTIFICATE,
            customer_id=settings.AGORA_CUSTOMER_ID,
            customer_secret=settings.AGORA_CUSTOMER_SECRET
        )
        
        agent = Agent(client=client).with_mllm(
            GeminiLive(
                api_key=gemini_key,
                model='gemini-3.1-flash-live-preview', 
                voice=target_voice,
                instructions=req.instructions,
                greeting_message=req.greeting_message.strip() if (req.greeting_message and req.greeting_message.strip()) else None,
                transcribe_agent=True,
                transcribe_user=True,
                input_modalities=['audio'],
                output_modalities=['audio'],
                http_options={'api_version': 'v1beta'}
            )
        )
        
        agent_uid_str = str(target_agent_uid)
        candidate_uid_str = str(candidate_uid)
        
        # Subscribe to both the candidate and peer interviewer for collaborative panel interaction
        peer_uid = "9992" if target_agent_uid == 9991 else ("9991" if target_agent_uid == 9992 else None)
        remote_uids = [candidate_uid_str]
        if peer_uid:
            remote_uids.append(peer_uid)
        
        session_obj = agent.create_session(
            channel=channel_name,
            agent_uid=agent_uid_str,
            remote_uids=remote_uids,
            token=agent_token
        )
        
        response = session_obj.start()
        agent_id = session_obj.id
        
        if session_id not in mllm_test_sessions:
            mllm_test_sessions[session_id] = {"agents": {}, "channel": channel_name}
        mllm_test_sessions[session_id]["agents"][agent_id] = session_obj
        
        print(f'[AGORA MLLM] Dynamic Agent started successfully: {agent_id}')
        
        return {
            'status': 'started',
            'agent_id': agent_id,
            'agent_uid': target_agent_uid,
            'channel_name': channel_name,
            'candidate_token': candidate_token,
            'raw_response': 'SDK started successfully'
        }
    except Exception as e:
        print(f'[AGORA MLLM] ERROR: {str(e)}')
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
