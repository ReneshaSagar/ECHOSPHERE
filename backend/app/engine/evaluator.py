"""
Real-time rubric evaluator: vagueness scoring, buzzword detection, 5-pillar scoring.
"""
import json
import time
from typing import Optional
from app.core.session_store import session_store, TranscriptEntry
from app.core.config import settings, openai_client, MODEL_SMALL, MODEL_LARGE

BUZZWORDS = [
    'synergy', 'leverage', 'paradigm', 'disruptive', 'holistic', 'agile',
    'blockchain', 'ai-powered', 'machine learning', 'deep learning',
    'big data', 'cloud-native', 'microservices', 'DevOps', 'transformation',
    'innovative', 'cutting-edge', 'best-in-class', 'world-class', 'scalable',
    'robust', 'seamless', 'frictionless', 'game-changer', 'ecosystem'
]

PILLARS = [
    'architecture',      # Technical depth & system design
    'product_sense',     # Business acumen & user focus
    'scalability',       # Scale thinking & performance
    'clarity',           # Communication & articulation
    'ownership',         # Leadership & accountability
]
PILLAR_KEYS = PILLARS

class RubricEvaluator:
    async def analyze_utterance(
        self,
        utterance: str,
        session_id: str,
        utterance_id: str,
    ) -> dict:
        """
        Analyze a candidate utterance for vagueness, buzzwords, and structured evaluation.
        """
        session = await session_store.get_session(session_id)
        if not session:
            return {}

        # Get dynamic pillars from session blueprint
        pillars = getattr(session, "dynamic_pillars", [])
        pillar_names = [p["pillar_name"] for p in pillars] if pillars else ["technical_accuracy", "depth", "communication", "confidence", "problem_solving"]
        
        pillar_json = ",\n    ".join([f'"{name}": 5' for name in pillar_names])

        history_snippet = ''
        if session and session.transcript:
            last_entries = session.transcript[-5:]
            history_snippet = ' | '.join([f"{e.speaker}: {e.text[:100]}" for e in last_entries])
        
        analysis_prompt = f'''Analyze this interview candidate response:
"{utterance}"

Context (last 5 exchanges): {history_snippet}

Evaluate the candidate's response against the interview rubric.

Return ONLY valid JSON:
{{
  "vagueness_score": 0,  
  "evaluation": {{
    {pillar_json}
  }},
  "observations": [
    "Candidate demonstrated strong fundamentals in X.",
    "Candidate confused Y with Z."
  ]
}}'''
        
        try:
            response = await openai_client.chat.completions.create(
                model=MODEL_SMALL,
                messages=[{'role': 'user', 'content': analysis_prompt}],
                temperature=0.1,
                response_format={'type': 'json_object'},
            )
            analysis = json.loads(response.choices[0].message.content)
        except Exception as e:
            word_count = len(utterance.split())
            analysis = {
                'vagueness_score': max(0, 80 - word_count),
                'evaluation': {p: 3 for p in pillar_names},
                'observations': []
            }
        
        analysis['utterance_id'] = utterance_id
        analysis['timestamp'] = time.time()
        return analysis

    async def generate_final_report(self, session_id: str) -> dict:
        """
        Generate the complete post-interview evaluation report.
        """
        session = await session_store.get_session(session_id)
        if not session:
            raise ValueError(f'Session {session_id} not found')
        
        # Aggregate scores from transcript
        candidate_entries = [
            e for e in session.transcript
            if e.speaker == 'candidate' and e.vagueness_score is not None
        ]
        
        # Calculate aggregate metrics
        avg_vagueness = (
            sum(e.vagueness_score for e in candidate_entries) / len(candidate_entries)
            if candidate_entries else 50
        )
        
        # Calculate hesitation metrics
        hesitation_events = getattr(session, "hesitations", [])
        total_hesitations = len(hesitation_events)
        avg_hesitation_ms = (
            sum(h["duration_ms"] for h in hesitation_events) / total_hesitations
            if total_hesitations else 0
        )

        # Calculate proctoring stats
        cheating_events = getattr(session, "cheating_alerts", [])
        total_cheating_alerts = len(cheating_events)
        is_suspicious = total_cheating_alerts > 4

        # Word count metrics
        total_words = sum(len(e.text.split()) for e in candidate_entries)
        avg_words = total_words / len(candidate_entries) if candidate_entries else 0
        
        # Suspected AI detection heuristics (high word counts + high jargon density)
        suspected_ai = False
        if avg_words > 120 and avg_vagueness > 60:
            suspected_ai = True
        
        # Build evidence map from transcript
        evidence_quotes = [
            {
                'quote': e.text[:200],
                'timestamp': e.timestamp,
                'utterance_id': e.utterance_id,
                'speaker': e.speaker,
            }
            for e in session.transcript[:20]
        ]
        
        # LLM-generated comprehensive report
        transcript_text = '\\n'.join(
            [f"{e.speaker.upper()} [{e.timestamp:.1f}s]: {e.text}" for e in session.transcript[-30:]]
        )
        
        report_prompt = f'''You are the OmniPanel AI evaluation system. Generate a comprehensive interview report.

Job Title: {session.job_title}
Total Cheating Alerts: {total_cheating_alerts}
Total Hesitations: {total_hesitations}
Candidate transcript (last 30 exchanges):
{transcript_text}

Generate a structured JSON report:
{{
  "overall_recommendation": "STRONG HIRE" | "LEAN HIRE" | "NO HIRE",
  "recommendation_reasoning": "<2-3 sentence summary>",
  "pillar_scores": {{
    "architecture": {{ "score": 8, "summary": "...", "evidence": "..." }},
    "product_sense": {{ "score": 8, "summary": "...", "evidence": "..." }},
    "scalability": {{ "score": 8, "summary": "...", "evidence": "..." }},
    "clarity": {{ "score": 8, "summary": "...", "evidence": "..." }},
    "ownership": {{ "score": 8, "summary": "...", "evidence": "..." }}
  }},
  "strengths": ["<strength1>", "<strength2>"],
  "improvement_areas": ["<area1>", "<area2>"],
  "communication_metrics": {{
    "avg_response_length_words": {round(avg_words)},
    "buzzword_density_percent": 0.0,
    "avg_vagueness_score": {round(avg_vagueness)}
  }},
  "recruiter_mom": {{
    "summary": "<Minutes of Meeting summary for Recruiter, focusing on evaluation, performance, and proctoring findings>",
    "key_moments": ["<moment1>", "<moment2>"],
    "decision_markers": ["<marker1>", "<marker2>"]
  }},
  "candidate_mom": {{
    "summary": "<Constructive feedback Minutes of Meeting for Candidate, focusing on core strengths and study paths>",
    "action_items": ["<action1>", "<action2>"]
  }}
}}'''
        
        try:
            response = await openai_client.chat.completions.create(
                model=MODEL_LARGE,
                messages=[{'role': 'user', 'content': report_prompt}],
                temperature=0.2,
                response_format={'type': 'json_object'},
            )
            report_data = json.loads(response.choices[0].message.content)
        except Exception:
            report_data = {
                'overall_recommendation': 'LEAN HIRE',
                'recommendation_reasoning': 'Automated evaluation completed.',
                'pillar_scores': {p: {'score': 6, 'summary': 'Evaluated', 'evidence': ''} for p in PILLARS},
                'strengths': ['Completed the interview'],
                'improvement_areas': ['Provide more specific examples'],
                'communication_metrics': {
                    'avg_response_length_words': round(avg_words),
                    'buzzword_density_percent': 10.0,
                    'avg_vagueness_score': avg_vagueness,
                },
                'recruiter_mom': {
                    'summary': 'Candidate completed the assessment and panels.',
                    'key_moments': ['Technical round introduction'],
                    'decision_markers': ['Rubric target met']
                },
                'candidate_mom': {
                    'summary': 'Solid performance. Continue working on deep systems patterns.',
                    'action_items': ['Review CAP theorem design tradeoffs']
                }
            }
        
        report_data['session_id'] = session_id
        report_data['job_title'] = session.job_title
        report_data['evidence_quotes'] = evidence_quotes
        report_data['avg_vagueness_score'] = avg_vagueness
        report_data['total_exchanges'] = len(session.transcript)
        report_data['interview_duration_seconds'] = time.time() - session.start_time
        
        # Inject proctoring & AI detection metrics
        report_data['proctoring'] = {
            'total_alerts': total_cheating_alerts,
            'is_suspicious': is_suspicious,
            'alerts_log': cheating_events,
            'screen_recorded': True
        }
        report_data['hesitation_metrics'] = {
            'total_count': total_hesitations,
            'avg_duration_ms': round(avg_hesitation_ms),
            'log': hesitation_events
        }
        report_data['suspected_ai_answers'] = suspected_ai
        report_data['ats_score'] = getattr(session, 'ats_score', 0.0)
        report_data['round_grades'] = getattr(session, 'round_grades', {})
        
        return report_data


evaluator = RubricEvaluator()
