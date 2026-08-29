
import requests
headers = {
    "Authorization": "Bearer qsty-sk-jMUUawhwT2moRKZCaGHxpvulFKJTohN7CkE/WWODaec0lLQCv2KukFtZP+Vf68iVP80eo548+4gUru38Q5bnt1bM4q6L1tL4Ol7bw60ESQQ=",
    "Content-Type": "application/json"
}
data = {
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
}
response = requests.post("https://router.requesty.ai/v1/chat/completions", headers=headers, json=data)
print(response.status_code)
print(response.text)

