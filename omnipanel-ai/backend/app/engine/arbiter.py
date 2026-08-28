import asyncio
import json
from typing import Optional
from openai import AsyncOpenAI
from app.engine.personas import PERSONAS, PERSONA_LIST, Persona
from app.core.session_store import session_store
from app.core.config import settings, openai_client, MODEL_SMALL

class TurnArbiter:
    COOLDOWN_TURNS = 1  # same persona can't speak twice in a row

    async def decide_next_turn(
        self,
        session_id: str,
        candidate_utterance: str,
        turn_history: list,
    ) -> dict:
        """
        Analyze the candidate utterance and decide:
        1. Which persona speaks next
        2. What dynamic follow-up question to ask
        Returns: {next_persona, follow_up_question, confidence, reasoning, detected_issues}
        """
        session = await session_store.get_session(session_id)
        
        # 1. Fetch dynamic panel details based on current round
        round_index = session.current_round if session else 2
        round_type = "technical" if round_index == 2 else "hr"
        
        dynamic_list = []
        if session and hasattr(session, "dynamic_personas") and session.dynamic_personas:
            dynamic_list = session.dynamic_personas.get(round_type, [])
            
        # Fallback names
        names = {
            "alex": "Alex (Staff Architect)" if round_index == 2 else "Emily (Talent Partner)",
            "maya": "Maya (Senior PM)" if round_index == 2 else "Marcus (Culture Advocate)",
            "david": "David (Eng Director)" if round_index == 2 else "Robert (Hiring Manager)"
        }
        
        if dynamic_list:
            for p in dynamic_list:
                uid = p.get("agent_uid", 2001)
                key = "alex" if uid == 2001 else "maya" if uid == 2002 else "david"
                names[key] = f"{p.get('name')} ({p.get('role')}) - specializes in: {', '.join(p.get('specialties', []))}"

        # Build routing context
        history_text = self._format_history(turn_history[-10:])
        
        routing_prompt = f'''You are the Turn Arbiter for an AI interview panel.
Current Round: {"Technical Interview" if round_index == 2 else "HR / Behavioral Interview"}

Panel members:
- alex: {names['alex']}
- maya: {names['maya']}
- david: {names['david']}

Candidate just said:
"{candidate_utterance}"

Recent conversation:
{history_text}

Analyze the candidate response and decide:
1. Who is best suited to speak next based on their specialties and system prompts?
2. What follow-up question should they ask? Focus on challenging blind spots or asking behavioral details.
3. Keep the dynamic question under 80 words.

Return ONLY valid JSON:
{{
  "next_persona": "alex" | "maya" | "david",
  "follow_up_question": "<dynamic question under 80 words>",
  "confidence": 0.0-1.0,
  "reasoning": "<one sentence>",
  "detected_issues": ["<issue1>", "<issue2>"]
}}'''
        
        last_persona = session.current_persona if session else None
        
        # Call LLM for routing decision
        response = await openai_client.chat.completions.create(
            model=MODEL_SMALL,
            messages=[{'role': 'user', 'content': routing_prompt}],
            temperature=0.3,
            response_format={'type': 'json_object'},
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Enforce cooldown: if same persona as last, pick the next most appropriate
        if result.get('next_persona') == last_persona:
            result = await self._resolve_cooldown(result, candidate_utterance, last_persona)
        
        return result

    def _format_history(self, history: list) -> str:
        lines = []
        for entry in history:
            speaker = entry.get('speaker', 'Unknown')
            text = entry.get('text', '')
            lines.append(f'{speaker}: {text}')
        return '\\n'.join(lines) if lines else 'No history yet.'

    async def _resolve_cooldown(self, original: dict, utterance: str, last_persona: str) -> dict:
        # Pick alternate persona based on keyword scoring
        scores = {'alex': 0, 'maya': 0, 'david': 0}
        utterance_lower = utterance.lower()
        
        for name, persona in PERSONAS.items():
            if name == last_persona:
                continue
            for trigger in persona.follow_up_triggers:
                if trigger in utterance_lower:
                    scores[name] += 1
        
        scores.pop(last_persona, None)
        best = max(scores, key=scores.get) if scores else 'david'
        original['next_persona'] = best
        original['reasoning'] += f' (Cooldown: switched from {last_persona} to {best})'
        return original

turn_arbiter = TurnArbiter()
