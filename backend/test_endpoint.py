
import asyncio
from app.engine.orchestrator import orchestrator

async def main():
    job_title = "Senior Frontend Engineer"
    jd_text = "Looking for an expert in React, Next.js, and Tailwind CSS. 5+ years experience."
    resume_link = "https://example.com"
    
    # 1. Simulate extraction
    import httpx
    final_resume_text = ""
    jina_url = f"https://r.jina.ai/{resume_link}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(jina_url)
            if resp.status_code == 200:
                final_resume_text = resp.text
            else:
                final_resume_text = f"Candidate provided external link: {resume_link} (Failed to scrape)"
    except Exception as e:
        final_resume_text = f"Candidate provided external link: {resume_link} (Error: {e})"
        
    print(f"Extracted Text length: {len(final_resume_text)}")

    # 2. Simulate blueprint generation
    try:
        blueprint = await orchestrator.generate_blueprint(job_title, jd_text, final_resume_text)
        print("Blueprint generated!")
        print(f"Valid Input: {blueprint.get('is_valid_input')}")
        if blueprint.get("is_valid_input") is False:
            print("REJECTED:", blueprint.get("rejection_reason"))
        else:
            print("RUBRIC:", blueprint.get("rubric").keys())
    except Exception as e:
        print(f"Orchestrator error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

