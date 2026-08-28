"""
Agora Routes: RTC/RTM token generation + dynamic Conversational AI agent management.
Personas come entirely from the session's round_plan - NO hardcoded names.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.agora_client import build_rtc_token, build_rtm_token, agora_client
from app.core.session_store import session_store
from app.core.config import settings

router = APIRouter()


class TokenRequest(BaseModel):
    channel_name: str
    uid: int
    role: str = "publisher"


class AgentStartRequest(BaseModel):
    session_id: str
    channel_name: str
    round_index: Optional[int] = None  # if None, use session's current_round_index


class AgentStopRequest(BaseModel):
    session_id: str


class AgentInstructRequest(BaseModel):
    new_prompt: str


@router.post("/token")
async def get_agora_tokens(req: TokenRequest):
    rtc_token = build_rtc_token(req.channel_name, req.uid)
    rtm_token = build_rtm_token(str(req.uid))
    return {
        "rtc_token": rtc_token,
        "rtm_token": rtm_token,
        "uid": req.uid,
        "channel_name": req.channel_name,
    }


@router.post("/agents/start")
async def start_agents(req: AgentStartRequest):
    """
    Start Agora Conversational AI agents for the specified round.
    Personas are loaded from the session's round_plan dynamically.
    """
    session = await session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Determine which round to use
    round_idx = req.round_index if req.round_index is not None else session.current_round_index
    if not session.round_plan or round_idx >= len(session.round_plan):
        raise HTTPException(status_code=400, detail="No round plan or invalid round index")

    current_round = session.round_plan[round_idx]
    personas = current_round.get("personas", [])

    if not personas:
        return {"agent_ids": {}, "message": "No personas for this round (e.g. OA round)"}

    # Determine LLM endpoint
    llm_url = "https://api.openai.com/v1/chat/completions"
    if settings.PUBLIC_BACKEND_URL:
        llm_url = f"{settings.PUBLIC_BACKEND_URL.rstrip('/')}/api/llm/{req.session_id}/chat/completions"
        print(f"[Agora] Using internal LLM proxy: {llm_url}")

    agent_ids = {}
    for persona in personas:
        persona_name = persona.get("name", "Agent")
        try:
            res = await agora_client.start_convo_agent(
                channel_name=req.channel_name,
                agent_uid=persona.get("agent_uid", 3000),
                persona_name=persona_name,
                system_prompt=persona.get("system_prompt", f"You are {persona_name}. Conduct a professional interview."),
                voice_id=persona.get("voice_id", "nova"),
                llm_url=llm_url,
            )
            agent_id = res.get("agent_id") or str(persona.get("agent_uid"))
            agent_ids[persona_name] = agent_id
            await session_store.update_agent_id(req.session_id, persona_name, agent_id)
            print(f"[Agora] Started agent: {persona_name} → {agent_id}")
        except Exception as e:
            print(f"[Agora] Error starting agent {persona_name}: {e}")

    return {"agent_ids": agent_ids, "round_index": round_idx, "round_type": current_round.get("type")}


@router.delete("/agents/{agent_id}")
async def stop_agent(agent_id: str):
    try:
        res = await agora_client.stop_convo_agent(agent_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agents/{agent_id}/instruct")
async def instruct_agent(agent_id: str, req: AgentInstructRequest):
    try:
        res = await agora_client.update_agent_instruction(agent_id, req.new_prompt)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
