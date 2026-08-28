import asyncio
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import time

@dataclass
class TranscriptEntry:
    speaker: str
    text: str
    timestamp: float
    utterance_id: str
    vagueness_score: Optional[float] = None

@dataclass
class SessionState:
    session_id: str
    job_title: str
    jd_text: str
    resume_text: str
    rubric: dict
    transcript: List[TranscriptEntry] = field(default_factory=list)
    agent_ids: Dict[str, str] = field(default_factory=dict)
    turn_history: List[dict] = field(default_factory=list)
    current_persona: Optional[str] = None
    start_time: float = field(default_factory=time.time)
    status: str = 'active'
    current_round: int = 1  # 1 = Screen/Proctor, 2 = Technical, 3 = HR
    cheating_alerts: List[dict] = field(default_factory=list)
    dynamic_personas: Dict[str, dict] = field(default_factory=dict)
    hesitations: List[dict] = field(default_factory=list)
    room_scan_done: bool = False

class SessionStore:
    def __init__(self):
        self._sessions: Dict[str, SessionState] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    async def create_session(self, session_id: str, job_title: str, jd_text: str, resume_text: str, rubric: dict) -> SessionState:
        async with self._global_lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = SessionState(
                    session_id=session_id,
                    job_title=job_title,
                    jd_text=jd_text,
                    resume_text=resume_text,
                    rubric=rubric
                )
                self._locks[session_id] = asyncio.Lock()
            return self._sessions[session_id]

    async def get_session(self, session_id: str) -> Optional[SessionState]:
        return self._sessions.get(session_id)

    async def add_transcript_entry(self, session_id: str, entry: TranscriptEntry):
        lock = self._locks.get(session_id)
        if not lock:
            return
        async with lock:
            session = self._sessions[session_id]
            session.transcript.append(entry)
            session.turn_history.append({'speaker': entry.speaker, 'text': entry.text})

    async def update_agent_id(self, session_id: str, persona: str, agent_id: str):
        lock = self._locks.get(session_id)
        if not lock:
            return
        async with lock:
            session = self._sessions[session_id]
            session.agent_ids[persona] = agent_id

    async def set_current_persona(self, session_id: str, persona: str):
        lock = self._locks.get(session_id)
        if not lock:
            return
        async with lock:
            session = self._sessions[session_id]
            session.current_persona = persona

    async def get_transcript(self, session_id: str) -> List[TranscriptEntry]:
        lock = self._locks.get(session_id)
        if not lock:
            return []
        async with lock:
            return list(self._sessions[session_id].transcript)

    async def delete_session(self, session_id: str):
        async with self._global_lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
            if session_id in self._locks:
                del self._locks[session_id]

session_store = SessionStore()
