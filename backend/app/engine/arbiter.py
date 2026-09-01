import asyncio
import json
from typing import Optional
from openai import AsyncOpenAI
from app.core.session_store import session_store
from app.core.config import settings, openai_client, MODEL_SMALL

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

        # Fast Deterministic Handoff check
        utterance_lower = candidate_utterance.lower()
        other_agents = [a for a in current_agents if a['agent_id'] != primary_speaker]
        
        # Check if candidate explicitly addressed someone else by name
        for agent in other_agents:
            if agent['name'].lower() in utterance_lower:
                return {
                    "next_persona_id": agent['agent_id'],
                    "action_type": "handoff",
                    "reasoning": "Candidate explicitly mentioned another agent by name."
                }

        # If it's a short response, keep the floor with the current speaker to save LLM tokens
        if len(candidate_utterance.split()) < 10:
            return {
                "next_persona_id": primary_speaker,
                "action_type": "continue",
                "reasoning": "Short response, maintaining current floor owner."
            }

        # Otherwise, ask a fast, lightweight LLM to decide routing ONLY
        routing_prompt = f'''You are the Orchestrator for an AI-driven interview panel.
Your job is ONLY to manage the flow of conversation among the interviewers. DO NOT generate dialogue.

Current Panel Members:
{panel_text}

Currently holding the "Speaker Token": {primary_speaker}

Candidate just said:
"{candidate_utterance}"

Decision Matrix:
1. CONTINUE: The primary speaker should ask the next follow-up.
2. INTERRUPT/HANDOFF: The candidate's response heavily pivots into another agent's specialty, or explicitly asks a question meant for another agent.

Return ONLY valid JSON:
{{
  "next_persona_id": "<must be one of: {', '.join(agent_ids)}>",
  "action_type": "continue" | "interrupt" | "handoff",
  "reasoning": "<brief internal reasoning>"
}}'''
        
        try:
            response = await openai_client.chat.completions.create(
                model=MODEL_SMALL,
                messages=[{'role': 'user', 'content': routing_prompt}],
                temperature=0.1,
                response_format={'type': 'json_object'},
            )
            result = json.loads(response.choices[0].message.content)
            # Ensure valid ID
            if result.get("next_persona_id") not in agent_ids:
                result["next_persona_id"] = primary_speaker
            return result
        except Exception as e:
            print(f"[Arbiter] LLM routing failed, defaulting to primary: {e}")
            return {
                "next_persona_id": primary_speaker,
                "action_type": "continue",
                "reasoning": "Fallback routing."
            }

    def _format_history(self, history: list) -> str:
        lines = []
        for entry in history:
            speaker = entry.get('speaker', 'Unknown')
            text = entry.get('text', '')
            lines.append(f'{speaker}: {text}')
        return '\\n'.join(lines) if lines else 'No history yet.'

turn_arbiter = TurnArbiter()
