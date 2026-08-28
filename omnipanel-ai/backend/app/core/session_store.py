"""
Session Store: In-memory state for interview sessions with full dynamic persona support.
"""
import asyncio
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import time


@dataclass
class TranscriptEntry:
    speaker: str          # persona name (any string) or 'candidate'
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
    rubric: dict                          # dynamic pillars from LLM

    # Round configuration (fully dynamic from LLM)
    round_plan: List[dict] = field(default_factory=list)
    # Each entry: {type, label, personas: [{name, role, voice_id, color, agent_uid, specialties, system_prompt}], platform_url}
    current_round_index: int = 0

    # Active runtime state
    transcript: List[TranscriptEntry] = field(default_factory=list)
    agent_ids: Dict[str, str] = field(default_factory=dict)   # persona_name -> agora agent_id
    turn_history: List[dict] = field(default_factory=list)
    current_persona: Optional[str] = None   # name of the persona currently speaking
    start_time: float = field(default_factory=time.time)
    status: str = "active"

    # Resume + ATS
    ats_score: float = 0.0
    resume_pdf_text: str = ""

    # Proctoring
    cheating_alerts: List[dict] = field(default_factory=list)
    hesitations: List[dict] = field(default_factory=list)
    room_scan_done: bool = False

    # Dynamic state store (opening question, next question, etc.)
    session_meta: Dict[str, str] = field(default_factory=dict)


class SessionStore:
    def __init__(self):
        self._sessions: Dict[str, SessionState] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    async def create_session(
        self,
        session_id: str,
        job_title: str,
        jd_text: str,
        resume_text: str,
        rubric: dict,
        round_plan: List[dict] = None,
        ats_score: float = 0.0,
    ) -> SessionState:
        async with self._global_lock:
            state = SessionState(
                session_id=session_id,
                job_title=job_title,
                jd_text=jd_text,
                resume_text=resume_text,
                rubric=rubric,
                round_plan=round_plan or [],
                ats_score=ats_score,
            )
            self._sessions[session_id] = state
            self._locks[session_id] = asyncio.Lock()
            return state

    async def get_session(self, session_id: str) -> Optional[SessionState]:
        return self._sessions.get(session_id)

    async def add_transcript_entry(self, session_id: str, entry: TranscriptEntry):
        lock = self._locks.get(session_id)
        if not lock:
            return
        async with lock:
            session = self._sessions[session_id]
            session.transcript.append(entry)
            session.turn_history.append({"speaker": entry.speaker, "text": entry.text})

    async def update_agent_id(self, session_id: str, persona_name: str, agent_id: str):
        lock = self._locks.get(session_id)
        if not lock:
            return
        async with lock:
            self._sessions[session_id].agent_ids[persona_name] = agent_id

    async def set_current_persona(self, session_id: str, persona: str):
        lock = self._locks.get(session_id)
        if not lock:
            return
        async with lock:
            self._sessions[session_id].current_persona = persona

    async def advance_round(self, session_id: str) -> int:
        """Move to next round; returns new round_index or -1 if at end."""
        lock = self._locks.get(session_id)
        if not lock:
            return -1
        async with lock:
            session = self._sessions[session_id]
            if session.current_round_index < len(session.round_plan) - 1:
                session.current_round_index += 1
                return session.current_round_index
            return -1  # already at last round

    async def get_transcript(self, session_id: str) -> List[TranscriptEntry]:
        lock = self._locks.get(session_id)
        if not lock:
            return []
        async with lock:
            return list(self._sessions[session_id].transcript)

    async def delete_session(self, session_id: str):
        async with self._global_lock:
            self._sessions.pop(session_id, None)
            self._locks.pop(session_id, None)

    def get_current_personas(self, session: SessionState) -> List[dict]:
        """Return the persona list for the session's active round."""
        if not session.round_plan:
            return []
        idx = min(session.current_round_index, len(session.round_plan) - 1)
        return session.round_plan[idx].get("personas", [])


session_store = SessionStore()
