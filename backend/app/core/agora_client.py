"""
Agora Client: RTC/RTM Token Generation + Conversational AI REST Gateway
"""
import hmac
import hashlib
import json
import base64
import time
import struct
import random
import httpx
from typing import Optional
from app.core.config import settings

# ─────────────────────────────────────────
# RTC Token Builder (agora-token-builder)
# ─────────────────────────────────────────
from agora_token_builder import RtcTokenBuilder

def build_rtc_token(
    channel_name: str,
    uid: int,
    role: int = 1,  # Role_Publisher = 1
    expire_seconds: int = 3600
) -> str:
    """Generate an official Agora RTC Token using the RtcTokenBuilder SDK."""
    app_id = settings.AGORA_APP_ID
    app_cert = settings.AGORA_APP_CERTIFICATE
    expire_ts = int(time.time()) + expire_seconds
    
    return RtcTokenBuilder.buildTokenWithUid(
        app_id,
        app_cert,
        channel_name,
        int(uid),
        role,
        expire_ts
    )

def build_rtm_token(user_id: str, expire_seconds: int = 3600) -> str:
    """Generate Agora RTM Token using JWT-style signing."""
    import jwt
    now = int(time.time())
    payload = {
        'iss': settings.AGORA_APP_ID,
        'sub': user_id,
        'iat': now,
        'exp': now + expire_seconds,
    }
    # Use app certificate as secret for RTM signing
    token = jwt.encode(payload, settings.AGORA_APP_CERTIFICATE, algorithm='HS256')
    return token

# ─────────────────────────────────────────
# Agora Conversational AI REST Client
# ─────────────────────────────────────────

AGORA_CONVO_AI_BASE = 'https://api.agora.io/api/conversational-ai/v1'

class AgoraConvoAIClient:
    def __init__(self):
        credentials = base64.b64encode(
            f'{settings.AGORA_CUSTOMER_ID}:{settings.AGORA_CUSTOMER_SECRET}'.encode()
        ).decode()
        self._headers = {
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json',
        }
        self._client = httpx.AsyncClient(timeout=30.0)

    async def start_convo_agent(
        self,
        channel_name: str,
        agent_uid: int,
        persona_name: str,
        system_prompt: str,
        rtc_token: str,
        session_id: str,
        voice_id: str = 'nova',
        tts_provider: str = 'openai',
        llm_url: str = 'https://api.openai.com/v1/chat/completions',
        candidate_uid: int = 1,
    ) -> dict:
        """Start an Agora Conversational AI agent in the channel."""
        # Clean name to only contain allowed characters, add random/session string for uniqueness to avoid 409
        import uuid
        safe_name = "".join(c for c in persona_name if c.isalnum())
        unique_agent_name = f"op_{safe_name}_{uuid.uuid4().hex[:8]}"
        
        payload = {
            'name': unique_agent_name,
            'properties': {
                'channel': channel_name,
                'agent_rtc_uid': str(agent_uid),
                'enable_string_uid': True,
                'remote_rtc_uids': [str(candidate_uid)],
                'token': rtc_token,
                'ai_vad': {
                    'enable': True,
                    'interrupt_on_speech': True,
                    'silence_duration_ms': 500,
                },
                'llm': {
                    'url': llm_url,
                    'api_key': settings.OPENAI_API_KEY,
                    'system_messages': [
                        {'role': 'system', 'content': system_prompt}
                    ],
                    'greeting': "Hello! This is the Agora test interviewer. Can you hear me?"
                },
                'tts': {
                    'vendor': 'microsoft',
                    'params': {
                        'voice_name': 'en-US-JennyNeural',
                        'speed': 1.0,
                    },
                },
                'asr': {
                    'language': 'en-US',
                    'vendor': 'agora'
                }
            },
        }
        
        # Agora v2 Conversational AI endpoint
        base_url = f'https://api.agora.io/api/conversational-ai-agent/v2/projects/{settings.AGORA_APP_ID}'
        
        print(f"\n[AGORA] ==========================================")
        print(f"[AGORA] Starting agent: {persona_name}")
        print(f"[AGORA] session_id: {session_id}")
        print(f"[AGORA] channel: {channel_name}")
        print(f"[AGORA] agent_id (name): {unique_agent_name}")
        print(f"[AGORA] agent_uid (RTC): {agent_uid}")
        print(f"[AGORA] candidate_uid: {candidate_uid}")
        print(f"[AGORA] remote_rtc_uids: {payload['properties']['remote_rtc_uids']}")
        print(f"[AGORA] llm_url: {llm_url}")

        # Serialize and log exactly what goes over the wire
        serialized_payload = json.dumps(payload, indent=2)
        print(f"\n[AGORA] EXACT SERIALIZED JSON SENT TO AGORA:")
        print(serialized_payload)
        
        try:
            res = await self._client.post(base_url + '/join', json=payload, headers=self._headers)
            res.raise_for_status()
            res_data = res.json()
            print(f"[AGORA] START RESPONSE {res.status_code}")
            print(f"[AGORA] RESPONSE BODY: {res_data}")
            return res_data
        except Exception as e:
            print(f"[AGORA] ERROR STARTING AGENT {persona_name}: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"[AGORA] ERROR RESPONSE BODY: {e.response.text}")
            raise

    async def start_mllm_agent(
        self,
        channel_name: str,
        agent_uid: int,
        persona_name: str,
        rtc_token: str,
        session_id: str,
        candidate_uid: int,
    ) -> dict:
        import uuid
        safe_name = "".join(c for c in persona_name if c.isalnum())
        unique_agent_name = f"op_mllm_{safe_name}_{uuid.uuid4().hex[:8]}"
        
        system_prompt = "You are Alex, a senior software engineer conducting a friendly technical interview.\n\nYou are a real conversational interviewer.\n\nSpeak naturally and concisely.\n\nStart by introducing yourself.\n\nAsk the candidate about their software engineering experience.\n\nListen carefully to their answers.\n\nAsk relevant follow-up questions.\n\nDo not evaluate or score the candidate yet.\n\nMaintain conversational context throughout the interview."
        
        payload = {
            'name': unique_agent_name,
            'properties': {
                'channel': channel_name,
                'agent_rtc_uid': str(agent_uid),
                'enable_string_uid': True,
                'remote_rtc_uids': [str(candidate_uid)],
                'token': rtc_token,
                'ai_vad': {
                    'enable': True,
                    'interrupt_on_speech': True,
                    'silence_duration_ms': 500,
                },
                'mllm': {
                    'vendor': 'openai',
                    'params': {
                        'model': 'gpt-4o-realtime-preview',
                        'api_key': settings.OPENAI_API_KEY,
                        'prompt': system_prompt
                    }
                }
            }
        }
        
        base_url = f'https://api.agora.io/api/conversational-ai-agent/v2/projects/{settings.AGORA_APP_ID}'
        
        serialized_payload = json.dumps(payload, indent=2)
        print(f"\n[AGORA MLLM] EXACT SERIALIZED JSON SENT TO AGORA:")
        print(serialized_payload)
        
        try:
            res = await self._client.post(base_url + '/join', json=payload, headers=self._headers)
            res.raise_for_status()
            res_data = res.json()
            return res_data
        except Exception as e:
            print(f"[AGORA MLLM] ERROR STARTING MLLM AGENT: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"[AGORA MLLM] ERROR RESPONSE BODY: {e.response.text}")
            raise

    async def stop_convo_agent(self, agent_id: str) -> dict:
        """Stop a running Conversational AI agent."""
        response = await self._client.delete(
            f'{AGORA_CONVO_AI_BASE}/agents/{agent_id}',
            headers=self._headers,
        )
        response.raise_for_status()
        return response.json()

    async def update_agent_instruction(
        self, agent_id: str, new_system_prompt: str
    ) -> dict:
        """Dynamically update the system prompt of a running agent."""
        payload = {
            'properties': {
                'llm': {
                    'system_messages': [
                        {'role': 'system', 'content': new_system_prompt}
                    ]
                }
            }
        }
        response = await self._client.patch(
            f'{AGORA_CONVO_AI_BASE}/agents/{agent_id}',
            json=payload,
            headers=self._headers,
        )
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self._client.aclose()

# Singleton
agora_client = AgoraConvoAIClient()
