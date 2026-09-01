from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json

router = APIRouter()

class StartMLLMRequest(BaseModel):
    session_id: str
    candidate_uid: int

mllm_test_sessions = {}

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
    
    # Check if Gemini key is available
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    
    # 1. Generate RTC tokens
    candidate_token = build_rtc_token(channel_name, candidate_uid)
    agent_uid = 9999
    agent_token = build_rtc_token(channel_name, agent_uid)
    
    system_instructions = (
        "You are Alex, a senior software engineer conducting a friendly technical interview. "
        "You are a real conversational interviewer. "
        "Speak naturally and concisely. "
        "Start by introducing yourself. "
        "Ask the candidate about their software engineering experience. "
        "Listen carefully to their answers. "
        "Ask relevant follow-up questions. "
        "Do not evaluate or score the candidate yet. "
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
                greeting_message="Hi, I'm Alex. I'm your technical interviewer. Can you hear me?",
                transcribe_agent=True,
                transcribe_user=True,
                input_modalities=['audio'],
                output_modalities=['audio'],
                http_options={'api_version': 'v1beta'}
            )
        )
        
        # Log the internal config structure sent by AgentKit
        if hasattr(agent, 'mllm') and agent.mllm:
            try:
                config_dump = agent.mllm.model_dump()
                if 'api_key' in config_dump:
                    config_dump['api_key'] = '***REDACTED***'
                print(f"\n[AGORA MLLM] GENERATED CONFIG: {json.dumps(config_dump, indent=2)}")
            except Exception:
                print("\n[AGORA MLLM] MLLM Config:", agent.mllm)
        
        # Start the agent using the SDK
        agent_uid_str = str(agent_uid)
        candidate_uid_str = str(candidate_uid)
        
        # We need the task or start object
        session_obj = agent.create_session(
            channel=channel_name,
            agent_uid=agent_uid_str,
            remote_uids=[candidate_uid_str],
            token=agent_token
        )
        
        response = session_obj.start()
        
        agent_id = session_obj.id
        
        mllm_test_sessions[session_id] = {
            "agent_session": session_obj,
            "agent_id": agent_id,
            "channel": channel_name,
            "status": "running"
        }
        
        return {
            "status": "started",
            "agent_id": agent_id,
            "channel_name": channel_name,
            "candidate_token": candidate_token,
            "raw_response": "SDK started successfully"
        }
    except Exception as e:
        print(f"[AGORA MLLM] ERROR: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"[AGORA MLLM] RESPONSE BODY: {e.response.text}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop-mllm")
async def stop_mllm_test(req: StartMLLMRequest):
    session = mllm_test_sessions.get(req.session_id)
    if not session:
        return {"status": "not_found"}
    try:
        if "agent_session" in session:
            session["agent_session"].stop()
        mllm_test_sessions.pop(req.session_id, None)
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
