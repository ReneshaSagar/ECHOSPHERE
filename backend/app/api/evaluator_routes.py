from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from typing import List, Dict, Any
import google.generativeai as genai
from app.core.config import settings

router = APIRouter()

class EvaluationRequest(BaseModel):
    job_description: str
    resume: str
    rubric: Dict[str, Any]
    transcript: List[Dict[str, str]]

@router.post("/evaluate")
async def evaluate_interview(req: EvaluationRequest):
    """
    Evaluate the candidate based on the interview transcript, JD, Resume, and Rubric.
    """
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        system_prompt = """You are an expert AI Technical Interview Evaluator.
Your job is to deeply analyze an interview transcript and evaluate the candidate's performance against the provided Job Description and Rubric.

You MUST return ONLY valid JSON matching this exact structure:

{
  "overall_recommendation": "Strong Hire | Hire | Leaning Hire | Leaning No Hire | No Hire",
  "overall_summary": "A concise 2-3 sentence summary of the candidate's performance.",
  "strengths": ["Key strength 1", "Key strength 2"],
  "weaknesses": ["Key weakness 1", "Key weakness 2"],
  "rubric_evaluations": [
    {
      "pillar": "Name of the rubric pillar",
      "score": 4, 
      "feedback": "Detailed feedback on why they received this score for this pillar.",
      "evidence": ["Exact quote from the candidate in the transcript demonstrating this."]
    }
  ]
}

Instructions:
1. Ensure the 'score' is an integer between 1 and 5.
2. Provide concrete 'evidence' quotes directly from the transcript to justify your scores.
3. Be objective, fair, and highly critical just like a real Senior Engineering Manager.
"""

        # Format the transcript for the LLM
        formatted_transcript = "\n".join([f"{t['speaker']}: {t['text']}" for t in req.transcript])
        
        user_prompt = f"""
--- JOB DESCRIPTION ---
{req.job_description}

--- CANDIDATE RESUME ---
{req.resume}

--- EVALUATION RUBRIC ---
{json.dumps(req.rubric, indent=2)}

--- INTERVIEW TRANSCRIPT ---
{formatted_transcript}

Analyze the transcript and generate the JSON Scorecard.
"""

        # Use gemini-3.5-flash for the evaluation
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            system_instruction=system_prompt,
            generation_config={"response_mime_type": "application/json"}
        )

        response = await model.generate_content_async(user_prompt)
        content = response.text
        scorecard = json.loads(content)
        
        return scorecard
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
