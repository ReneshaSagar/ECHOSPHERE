import asyncio
import json
from typing import Optional
from openai import AsyncOpenAI
from app.core.session_store import session_store
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class TurnArbiter:
    async def decide_next_turn(
        self,
        session_id: str,
        candidate_utterance: str,
        turn_history: list,
    ) -> dict:
        """
        Analyze the candidate utterance and decide the panel's next move.
        This handles normal continuation, handoffs, and mid-interview interruptions.
        """
        session = await session_store.get_session(session_id)
        if not session:
            raise ValueError("Session not found")

        # 1. Fetch dynamic panel details for the current round
        round_index = session.current_round - 1 # 0-indexed for array
        dynamic_rounds = getattr(session, "dynamic_rounds", [])
        
        current_agents = []
        if round_index < len(dynamic_rounds):
            current_agents = dynamic_rounds[round_index].get("agents", [])

        if not current_agents:
            # Fallback if no dynamic agents found
            current_agents = [
                {"agent_id": "system", "name": "System", "role": "Moderator", "specialties": [], "system_prompt": "You are a fallback moderator."}
            ]

        # Build agent descriptions for the prompt
        panel_desc = []
        agent_ids = []
        for a in current_agents:
            agent_ids.append(a['agent_id'])
            panel_desc.append(f"- ID: {a['agent_id']} | Name: {a['name']} ({a['role']}) | Focus: {', '.join(a.get('specialties', []))}")

        panel_text = "\n".join(panel_desc)
        primary_speaker = getattr(session, "current_persona", agent_ids[0])

        # Build routing context
        history_text = self._format_history(turn_history[-10:])
        
        routing_prompt = f'''You are the Orchestrator for an AI-driven interview panel.
Your job is to manage the flow of conversation among the interviewers based on the candidate's responses.

Current Panel Members:
{panel_text}

Currently holding the "Speaker Token" (Primary Speaker): {primary_speaker}

Recent conversation:
{history_text}

Candidate just said:
"{candidate_utterance}"

Decision Matrix:
1. CONTINUE: The primary speaker asks the next logical follow-up.
2. INTERRUPT: A DIFFERENT agent notices a critical flaw or highly relevant pivot related to their specialty. They seize the floor. 
   - If they interrupt, their question MUST start with an apology to the primary speaker (e.g., "Sorry to interrupt, [Primary Name], but I need to ask...") and end by handing it back.
3. HANDOFF: The primary speaker has exhausted their topic and explicitly hands the floor to another agent.

Return ONLY valid JSON:
{{
  "next_persona_id": "<must be one of: {', '.join(agent_ids)}>",
  "action_type": "continue" | "interrupt" | "handoff",
  "follow_up_question": "<The exact dialogue the chosen agent will speak. Max 80 words.>",
  "reasoning": "<Internal reasoning for this orchestration decision>"
}}'''
        
        response = await client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[{'role': 'user', 'content': routing_prompt}],
            temperature=0.4,
            response_format={'type': 'json_object'},
        )
        
        result = json.loads(response.choices[0].message.content)
        return result

    def _format_history(self, history: list) -> str:
        lines = []
        for entry in history:
            speaker = entry.get('speaker', 'Unknown')
            text = entry.get('text', '')
            lines.append(f'{speaker}: {text}')
        return '\\n'.join(lines) if lines else 'No history yet.'

turn_arbiter = TurnArbiter()
