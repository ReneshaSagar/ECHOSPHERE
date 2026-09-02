from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from typing import List, Dict, Any
import google.generativeai as genai
from app.core.config import settings

router = APIRouter()

class OrchestratorRequest(BaseModel):
    job_description: str
    resume: str

@router.post("/blueprint")
async def generate_blueprint(req: OrchestratorRequest):
    """
    Takes JD and Resume. Returns the Interview Blueprint JSON.
    """
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        system_prompt = """You are an expert AI Interview Orchestrator. 
Your job is to analyze a Job Description and a Candidate Resume, and design a technical interview blueprint.
You MUST return ONLY valid JSON matching this exact structure:

{
  "interview_rounds": [
    {
      "round_name": "Technical Interview",
      "purpose": "Evaluate technical skills and experience match",
      "interviewer": {
        "name": "Alex",
        "role": "Senior Software Engineer",
        "instructions": "<highly specific instructions for the LLM voice agent>",
        "greeting_message": "<the exact opening line Alex will speak>"
      },
      "topics": ["topic 1", "topic 2"]
    }
  ],
  "rubric": {
    "Problem Solving": "What to look for",
    "Technical Depth": "What to look for"
  }
}

The instructions for Alex MUST explicitly tell him to:
- speak naturally and concisely
- ask one question at a time and listen carefully
- ask relevant follow-up questions based on the candidate's answers
- avoid unnecessarily repeating questions
- stay within the scope of the provided JD and Resume
- use the candidate's resume and JD context naturally in conversation
- never reveal the evaluation rubric
- never give the candidate the answers
- maintain a professional interviewer personality

Keep the instructions highly contextual to the specific JD and Resume provided."""

        user_prompt = f"Job Description:\n{req.job_description}\n\nCandidate Resume:\n{req.resume}\n\nGenerate the JSON Interview Blueprint."

        # Use gemini-3.5-flash for fast text generation
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            system_instruction=system_prompt,
            generation_config={"response_mime_type": "application/json"}
        )

        response = await model.generate_content_async(user_prompt)
        content = response.text
        blueprint = json.loads(content)
        
        return blueprint
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
