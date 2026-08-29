
import requests

url = "http://localhost:8000/api/sessions/create"
data = {
    "job_title": "Senior Frontend Engineer",
    "jd_text": "Looking for an expert in React, Next.js, and Tailwind CSS. 5+ years experience.",
    "resume_text": "I am a frontend engineer with 5 years experience in React."
}

try:
    response = requests.post(url, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Failed to connect: {e}")

