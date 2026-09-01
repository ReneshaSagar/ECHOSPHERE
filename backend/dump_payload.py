from agora_agent import Agent, Agora
from agora_agent.core.domain import Area
from agora_agent.agentkit.vendors import GeminiLive
import json

client = Agora(area=Area.US, app_id='app', app_certificate='cert')
agent = Agent(client=client).with_mllm(
    GeminiLive(
        api_key='key', 
        model='gemini-2.0-flash-exp', 
        voice='Charon', 
        instructions='hello'
    )
)
payload = agent.to_payload(channel='channel', agent_uid=9999, remote_uids=[12345])
print(json.dumps(payload, indent=2))
