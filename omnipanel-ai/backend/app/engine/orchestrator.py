import json
from pydantic import BaseModel, Field
from typing import List
from app.core.config import settings, openai_client, MODEL_LARGE

class AgentConfig(BaseModel):
    agent_id: str = Field(..., description="Unique ID for the agent, e.g., 'agent_1'")
    name: str = Field(..., description="Name of the interviewer")
    role: str = Field(..., description="Job title or role of the interviewer")
    voice_id: str = Field(..., description="Voice profile to use (e.g., 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')")
    color: str = Field(..., description="Hex color for the agent UI")
    specialties: List[str] = Field(..., description="Topics this agent focuses on")
    system_prompt: str = Field(..., description="Persona instructions for the LLM")

class RoundConfig(BaseModel):
    round_index: int = Field(..., description="1-based index of the round")
    round_type: str = Field(..., description="E.g., 'Technical', 'Behavioral', 'System Design'")
    focus_areas: List[str] = Field(..., description="Key areas to evaluate in this round")
    agents: List[AgentConfig] = Field(..., description="The panel of agents for this round (can be 1 to 4 agents)")

class PillarConfig(BaseModel):
    label: str
    description: str
    key_signals: List[str]

class RubricConfig(BaseModel):
    architecture: PillarConfig
    product_sense: PillarConfig
    scalability: PillarConfig
    clarity: PillarConfig
    ownership: PillarConfig

from typing import List, Optional

class InterviewBlueprint(BaseModel):
    is_valid_input: bool = Field(..., description="Set to false if the JD or Resume is literal gibberish, completely irrelevant, or nonsensical.")
    rejection_reason: Optional[str] = Field(None, description="If is_valid_input is false, explain why (e.g. 'The Job Description is gibberish').")
    rubric: Optional[RubricConfig] = Field(None, description="Evaluation rubric tailored to JD")
    opening_question: Optional[str] = Field(None, description="First question to ask the candidate")
    rounds: Optional[List[RoundConfig]] = Field(None, description="Dynamically generated interview rounds based on JD")

class Orchestrator:
    async def generate_blueprint(self, job_title: str, jd_text: str, resume_text: str) -> dict:
        """
        Dynamically designs the entire interview architecture (rounds, personas, rubric)
        based on the Job Description and the Candidate's Resume.
        """
        prompt = f"""You are the Master Orchestrator for an AI-driven interview platform.
Your task is to design a complete interview loop for a candidate based on the Job Description and their Resume.

Job Title: {job_title}
Job Description: {jd_text[:2000]}
Candidate Resume: {resume_text[:2000]}

Instructions:
1. FIRST, check if the Job Description and Resume actually make sense. If they are literal gibberish (e.g., "asdf asdf") or completely nonsensical, set `is_valid_input` to false, provide a `rejection_reason`, and omit the rest.
2. If valid, set `is_valid_input` to true, and generate a custom 5-pillar rubric based on the core requirements of the JD.
3. Formulate a strong, open-ended opening question.
4. Design the interview 'rounds'. You can create 1 to 3 rounds depending on the seniority of the role.
   - For each round, create a panel of 'agents'. You can have 1 to 3 agents per round.
   - Assign them distinct, realistic personas (e.g., a detail-oriented Data Engineer, a big-picture PM, a culture-focused HR Lead).
   - Ensure 'agent_id' is unique across the entire blueprint (e.g., 'agent_1', 'agent_2').
"""

        try:
            # Using GPT-4o for complex JSON structured output
            response = await openai_client.chat.completions.create(
                model=MODEL_LARGE,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                response_format={"type": "json_schema", "json_schema": {"name": "blueprint", "schema": InterviewBlueprint.model_json_schema()}}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"[Orchestrator] Error generating blueprint: {e}")
            raise

orchestrator = Orchestrator()
