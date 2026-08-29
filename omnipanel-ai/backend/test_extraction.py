
import asyncio
from app.engine.orchestrator import orchestrator

async def main():
    job_title = "Senior Backend Engineer"
    jd_text = "We need someone with strong Python, FastAPI, and system design skills."
    resume_text = "Experienced in Python, Node.js, and Postgres. Built scalable microservices."
    
    try:
        blueprint = await orchestrator.generate_blueprint(job_title, jd_text, resume_text)
        print("Successfully generated blueprint:")
        print(blueprint.keys())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

