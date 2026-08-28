"""
Evaluator: Real-time vagueness scoring, pillar analysis, final report generation.
Uses Requesty-compatible OpenAI client with dynamic pillar names from session rubric.
"""
import json
import time
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.session_store import session_store, TranscriptEntry

_llm = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_API_BASE,
)

BUZZWORDS = [
    "synergy", "leverage", "paradigm", "disruptive", "holistic", "agile",
    "blockchain", "ai-powered", "machine learning", "deep learning",
    "big data", "cloud-native", "microservices", "DevOps", "transformation",
    "innovative", "cutting-edge", "best-in-class", "world-class", "scalable",
    "robust", "seamless", "frictionless", "game-changer", "ecosystem",
]


class RubricEvaluator:
    async def analyze_utterance(self, utterance: str, session_id: str, utterance_id: str) -> dict:
        """Analyze a candidate utterance for vagueness, buzzwords, and pillar coverage."""
        utterance_lower = utterance.lower()
        found_buzzwords = [bw for bw in BUZZWORDS if bw.lower() in utterance_lower]

        session = await session_store.get_session(session_id)
        rubric_pillars = list(session.rubric.keys()) if session and session.rubric else ["technical_depth", "communication", "ownership", "cultural_fit"]

        history_snippet = ""
        if session and session.transcript:
            last_entries = session.transcript[-5:]
            history_snippet = " | ".join([f"{e.speaker}: {e.text[:80]}" for e in last_entries])

        pillar_defaults = json.dumps({p: 5 for p in rubric_pillars})

        analysis_prompt = f'''Analyze this interview candidate response for quality and depth:
"{utterance}"

Context (recent exchanges): {history_snippet}

Rate the response on these evaluation pillars: {rubric_pillars}

Return ONLY valid JSON:
{{
  "vagueness_score": <0-100, where 100 is completely vague/empty>,
  "pillar_scores": {pillar_defaults},
  "has_contradiction": false,
  "contradiction_detail": "",
  "key_evidence_quote": "<10-20 word direct quote>",
  "difficulty_level": <1-4>
}}'''

        try:
            response = await _llm.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": analysis_prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            analysis = json.loads(response.choices[0].message.content)
        except Exception as e:
            word_count = len(utterance.split())
            analysis = {
                "vagueness_score": max(0, 80 - word_count),
                "pillar_scores": {p: 5 for p in rubric_pillars},
                "has_contradiction": False,
                "contradiction_detail": "",
                "key_evidence_quote": utterance[:50],
                "difficulty_level": 2,
            }

        analysis["buzzwords_found"] = found_buzzwords
        analysis["utterance_id"] = utterance_id
        analysis["timestamp"] = time.time()
        return analysis

    async def generate_final_report(self, session_id: str) -> dict:
        """Generate the complete post-interview evaluation report."""
        session = await session_store.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        candidate_entries = [
            e for e in session.transcript
            if e.speaker == "candidate" and e.vagueness_score is not None
        ]

        avg_vagueness = (
            sum(e.vagueness_score for e in candidate_entries) / len(candidate_entries)
            if candidate_entries else 50
        )
        total_words = sum(len(e.text.split()) for e in candidate_entries)
        avg_words = total_words / len(candidate_entries) if candidate_entries else 0

        hesitation_events = session.hesitations
        total_hesitations = len(hesitation_events)
        avg_hesitation_ms = (
            sum(h["duration_ms"] for h in hesitation_events) / total_hesitations
            if total_hesitations else 0
        )

        cheating_events = session.cheating_alerts
        total_cheating_alerts = len(cheating_events)
        is_suspicious = total_cheating_alerts > 4
        suspected_ai = avg_words > 120 and avg_vagueness > 60

        evidence_quotes = [
            {"quote": e.text[:200], "timestamp": e.timestamp, "utterance_id": e.utterance_id, "speaker": e.speaker}
            for e in session.transcript[:20]
        ]

        transcript_text = "\n".join(
            [f"{e.speaker.upper()} [{e.timestamp:.1f}s]: {e.text}" for e in session.transcript[-30:]]
        )

        rubric_keys = list(session.rubric.keys()) if session.rubric else []
        pillar_template = json.dumps({k: {"score": 7, "summary": "...", "evidence": "..."} for k in rubric_keys})

        ats_score = getattr(session, "ats_score", 0.0)
        interview_avg = (100 - avg_vagueness) * 0.1  # rough conversion

        report_prompt = f'''You are OmniPanel AI. Generate a comprehensive interview evaluation report.

Job Title: {session.job_title}
ATS Resume Score: {ats_score:.1f}/100
Total Proctoring Alerts: {total_cheating_alerts}
Total Hesitations: {total_hesitations} (avg {avg_hesitation_ms/1000:.1f}s)
Evaluation Pillars: {rubric_keys}

Interview Transcript (last 30 exchanges):
{transcript_text}

Generate a JSON report:
{{
  "overall_recommendation": "STRONG HIRE" | "LEAN HIRE" | "NO HIRE",
  "recommendation_reasoning": "<2-3 sentences>",
  "pillar_scores": {pillar_template},
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "improvement_areas": ["<area1>", "<area2>"],
  "communication_metrics": {{
    "avg_response_length_words": {round(avg_words)},
    "buzzword_density_percent": 0.0,
    "avg_vagueness_score": {round(avg_vagueness)}
  }},
  "recruiter_mom": {{
    "summary": "<Recruiter-facing MoM: performance, proctoring flags, recommendation>",
    "key_moments": ["<moment1>", "<moment2>"],
    "decision_markers": ["<marker1>", "<marker2>"]
  }},
  "candidate_mom": {{
    "summary": "<Candidate-facing constructive feedback>",
    "action_items": ["<action1>", "<action2>", "<action3>"]
  }}
}}'''

        try:
            response = await _llm.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": report_prompt}],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            report_data = json.loads(response.choices[0].message.content)
        except Exception:
            verdict = "LEAN HIRE" if not is_suspicious else "NO HIRE"
            report_data = {
                "overall_recommendation": verdict,
                "recommendation_reasoning": "Automated evaluation completed. Manual review recommended.",
                "pillar_scores": {k: {"score": 6, "summary": "Evaluated", "evidence": ""} for k in rubric_keys},
                "strengths": ["Completed all interview rounds", "Responded to all questions"],
                "improvement_areas": ["Provide more concrete examples", "Reduce response vagueness"],
                "communication_metrics": {"avg_response_length_words": round(avg_words), "buzzword_density_percent": 10.0, "avg_vagueness_score": round(avg_vagueness)},
                "recruiter_mom": {"summary": "Candidate completed the assessment.", "key_moments": [], "decision_markers": []},
                "candidate_mom": {"summary": "Good effort. Focus on concrete examples.", "action_items": ["Use STAR method", "Prepare specific examples"]},
            }

        # Composite score: 30% ATS + 70% interview performance
        interview_perf = max(0, min(100, (100 - avg_vagueness)))
        final_composite = round((ats_score * 0.30) + (interview_perf * 0.70), 1)

        report_data.update({
            "session_id": session_id,
            "job_title": session.job_title,
            "evidence_quotes": evidence_quotes,
            "avg_vagueness_score": avg_vagueness,
            "total_exchanges": len(session.transcript),
            "interview_duration_seconds": time.time() - session.start_time,
            "ats_score": ats_score,
            "final_composite_score": final_composite,
            "proctoring": {
                "total_alerts": total_cheating_alerts,
                "is_suspicious": is_suspicious,
                "alerts_log": cheating_events,
                "screen_recorded": True,
            },
            "hesitation_metrics": {
                "total_count": total_hesitations,
                "avg_duration_ms": round(avg_hesitation_ms),
                "log": hesitation_events,
            },
            "suspected_ai_answers": suspected_ai,
        })

        return report_data


evaluator = RubricEvaluator()
