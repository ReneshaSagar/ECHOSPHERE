"""
Turn Arbiter: Dynamically decides which persona speaks next.
Zero hardcoded persona names — reads everything from session's round_plan.
"""
import asyncio
import json
from openai import AsyncOpenAI
from app.core.session_store import session_store
from app.core.config import settings

_llm = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_API_BASE,
)


class TurnArbiter:
    COOLDOWN_TURNS = 1  # same persona cannot speak twice in a row

    async def decide_next_turn(
        self,
        session_id: str,
        candidate_utterance: str,
        turn_history: list,
    ) -> dict:
        """
        Analyze the candidate utterance and decide:
        1. Which persona speaks next (by name, from current round's personas)
        2. What dynamic follow-up question to ask
        Returns: {next_persona, follow_up_question, confidence, reasoning, detected_issues}
        """
        session = await session_store.get_session(session_id)
        if not session:
            return {
                "next_persona": "",
                "follow_up_question": "Can you elaborate on that?",
                "confidence": 0.5,
                "reasoning": "Session not found",
                "detected_issues": [],
            }

        # Get current round's personas
        personas = session_store.get_current_personas(session)
        if not personas:
            return {
                "next_persona": "",
                "follow_up_question": "Tell me more about your experience.",
                "confidence": 0.5,
                "reasoning": "No personas for current round",
                "detected_issues": [],
            }

        current_round = session.round_plan[session.current_round_index] if session.round_plan else {}
        round_label = current_round.get("label", "Interview")

        # Build dynamic panel description
        panel_desc = "\n".join([
            f'- {p["name"]} ({p["role"]}): specializes in {", ".join(p.get("specialties", []))}'
            for p in personas
        ])
        persona_names_json = json.dumps([p["name"] for p in personas])

        # Build history
        history_text = self._format_history(turn_history[-8:])

        last_persona = session.current_persona or ""

        routing_prompt = f"""You are the Turn Arbiter for an AI interview panel.
Current Round: {round_label}

Panel members:
{panel_desc}

Candidate just said:
"{candidate_utterance}"

Recent conversation:
{history_text}

Last speaker: {last_persona}

Rules:
- Avoid selecting the same persona as last speaker (cooldown rule)
- Select the persona BEST suited to challenge a blind spot in this response
- Ask ONE focused follow-up question under 80 words
- Challenge vague, buzzword-heavy, or incomplete answers

Return ONLY valid JSON with exactly these keys:
{{
  "next_persona": "<must be one of: {persona_names_json}>",
  "follow_up_question": "<direct question under 80 words>",
  "confidence": 0.0,
  "reasoning": "<one sentence>",
  "detected_issues": ["<issue1>", "<issue2>"]
}}"""

        try:
            response = await _llm.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": routing_prompt}],
                temperature=0.35,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)

            # Validate persona name
            valid_names = [p["name"] for p in personas]
            if result.get("next_persona") not in valid_names:
                # pick any persona that isn't last speaker
                alternates = [n for n in valid_names if n != last_persona]
                result["next_persona"] = alternates[0] if alternates else valid_names[0]

            # Enforce cooldown
            if result.get("next_persona") == last_persona and len(valid_names) > 1:
                alternates = [n for n in valid_names if n != last_persona]
                result["next_persona"] = alternates[0]
                result["reasoning"] = result.get("reasoning", "") + " (cooldown applied)"

            return result

        except Exception as e:
            print(f"[Arbiter] LLM call failed: {e}")
            # Fallback: round-robin through personas
            valid_names = [p["name"] for p in personas]
            alternates = [n for n in valid_names if n != last_persona]
            next_name = alternates[0] if alternates else valid_names[0]
            return {
                "next_persona": next_name,
                "follow_up_question": "Could you provide a specific example from your experience?",
                "confidence": 0.5,
                "reasoning": "LLM fallback",
                "detected_issues": [],
            }

    def _format_history(self, history: list) -> str:
        lines = []
        for entry in history:
            speaker = entry.get("speaker", "Unknown")
            text = entry.get("text", "")[:150]
            lines.append(f"{speaker}: {text}")
        return "\n".join(lines) if lines else "No history yet."


turn_arbiter = TurnArbiter()
