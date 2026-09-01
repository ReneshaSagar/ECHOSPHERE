from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
import time
from app.core.config import settings
from app.api import agora_routes, interview_routes, report_routes, llm_routes
from app.core.session_store import session_store

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            dead = []
            for ws in self.active_connections[session_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[session_id].remove(ws)

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print('OmniPanel AI backend starting...')
    yield
    print('OmniPanel AI backend shutting down...')

app = FastAPI(
    title='OmniPanel AI',
    description='Autonomous Multi-Persona Voice Interview Platform',
    version='1.0.0',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(agora_routes.router, prefix='/api/agora', tags=['Agora'])
app.include_router(interview_routes.router, prefix='/api', tags=['Interview'])
app.include_router(report_routes.router, prefix='/api', tags=['Report'])
app.include_router(llm_routes.router, prefix='/api', tags=['LLM Proxy'])
from app.api import agora_test_routes, agora_mllm_routes
app.include_router(agora_test_routes.router, prefix='/api/agora-test', tags=['Agora Test Lab'])
app.include_router(agora_mllm_routes.router, prefix='/api/agora-mllm', tags=['Agora MLLM Lab'])

@app.get('/health')
async def health_check():
    return {'status': 'ok', 'service': 'OmniPanel AI', 'version': '1.0.0'}

@app.websocket('/ws/telemetry/{session_id}')
async def telemetry_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Persist incoming proctoring and state events to session store
            session = await session_store.get_session(session_id)
            if session:
                event_type = data.get("type")
                if event_type == "cheating_alert":
                    session.cheating_alerts.append({
                        "timestamp": time.time() - session.start_time,
                        "type": data.get("alert_type", "unknown"),
                        "detail": data.get("detail", "No details")
                    })
                elif event_type == "hesitation_alert":
                    session.hesitations.append({
                        "timestamp": time.time() - session.start_time,
                        "duration_ms": int(data.get("duration_ms", 1000))
                    })
                elif event_type == "change_round":
                    session.current_round = int(data.get("round_index", 1))
                    print(f"[WebSocket] Room {session_id} switched to Round {session.current_round}")
            
            # Broadcast telemetry event to all connections in room
            await manager.broadcast(session_id, {
                'type': 'telemetry',
                'session_id': session_id,
                'event': data,
            })
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)

# Export manager for use in routes
def get_connection_manager() -> ConnectionManager:
    return manager
