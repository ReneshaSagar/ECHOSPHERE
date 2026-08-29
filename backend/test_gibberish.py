
import asyncio
from app.engine.orchestrator import orchestrator

async def main():
    job_title = "asdf"
    jd_text = "asdf asdf asdf"
    resume_text = "qwer qwer qwer"
    
    try:
        blueprint = await orchestrator.generate_blueprint(job_title, jd_text, resume_text)
        print("Successfully generated blueprint:")
        print(blueprint.keys())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

