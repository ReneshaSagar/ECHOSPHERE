"""
Agora Client: RTC/RTM Token Generation + Conversational AI REST Gateway
"""
import hmac
import hashlib
import base64
import time
import struct
import random
import httpx
from typing import Optional
from app.core.config import settings

# ─────────────────────────────────────────
# RTC Token Builder (Token v2 / HMAC-SHA256)
# ─────────────────────────────────────────

VERSION = '007'
ROLE_PUBLISHER = 1
ROLE_SUBSCRIBER = 2

PRIVILEGE_JOIN_CHANNEL = 1
PRIVILEGE_PUBLISH_AUDIO_STREAM = 2
PRIVILEGE_PUBLISH_VIDEO_STREAM = 3
PRIVILEGE_PUBLISH_DATA_STREAM = 4

def _pack_uint16(x: int) -> bytes:
    return struct.pack('<H', x)

def _pack_uint32(x: int) -> bytes:
    return struct.pack('<I', x)

def _pack_int32(x: int) -> bytes:
    return struct.pack('<i', x)

def _pack_string(s: str) -> bytes:
    bs = s.encode('utf-8')
    return _pack_uint16(len(bs)) + bs

def _pack_map_uint32(m: dict) -> bytes:
    result = _pack_uint16(len(m))
    for k, v in sorted(m.items()):
        result += _pack_uint16(k) + _pack_uint32(v)
    return result

def build_rtc_token(
    channel_name: str,
    uid: int,
    role: int = ROLE_PUBLISHER,
    expire_seconds: int = 3600
) -> str:
    """Generate an Agora RTC Token v2."""
    app_id = settings.AGORA_APP_ID
    app_cert = settings.AGORA_APP_CERTIFICATE
    now = int(time.time())
    expire_ts = now + expire_seconds
    salt = random.randint(1, 0xFFFFFFFF)
    
    privileges = {
        PRIVILEGE_JOIN_CHANNEL: expire_ts,
        PRIVILEGE_PUBLISH_AUDIO_STREAM: expire_ts,
        PRIVILEGE_PUBLISH_VIDEO_STREAM: expire_ts,
        PRIVILEGE_PUBLISH_DATA_STREAM: expire_ts,
    }
    
    msg = (
        _pack_uint32(salt)
        + _pack_uint32(now)
        + _pack_uint32(expire_ts)
        + _pack_map_uint32(privileges)
    )
    
    signing_key = hmac.new(
        app_cert.encode('utf-8'),
        (app_id + channel_name + str(uid)).encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    signature = hmac.new(signing_key, msg, hashlib.sha256).digest()
    
    token_body = _pack_string(app_id) + _pack_string(channel_name) + _pack_uint32(uid) + msg + _pack_string(signature.hex())
    version_str = VERSION + base64.b64encode(token_body).decode('utf-8')
    return version_str

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
        voice_id: str = 'nova',
        tts_provider: str = 'openai',
        llm_url: str = 'https://api.openai.com/v1/chat/completions',
    ) -> dict:
        """Start an Agora Conversational AI agent in the channel."""
        payload = {
            'name': f'omnipanel_{persona_name}',
            'properties': {
                'channel': channel_name,
                'agora_uid': str(agent_uid),
                'ai_vad': {
                    'enable': True,
                    'interrupt_on_speech': True,
                },
                'llm': {
                    'url': llm_url,
                    'api_key': settings.OPENAI_API_KEY,
                    'system_messages': [
                        {'role': 'system', 'content': system_prompt}
                    ],
                    'model': 'gpt-4o',
                    'temperature': 0.7,
                    'max_tokens': 300,
                },
                'tts': {
                    'vendor': tts_provider,
                    'params': {
                        'model': 'tts-1',
                        'voice': voice_id,
                        'speed': 1.0,
                    },
                },
                'vad': {
                    'silence_duration_ms': 600,
                    'speech_duration_ms': 200,
                },
            },
        }
        response = await self._client.post(
            f'{AGORA_CONVO_AI_BASE}/agents/start',
            json=payload,
            headers=self._headers,
        )
        response.raise_for_status()
        return response.json()

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
