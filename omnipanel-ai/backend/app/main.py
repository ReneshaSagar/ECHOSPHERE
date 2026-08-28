from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
import time
from app.core.config import settings
from app.api import agora_routes, interview_routes, report_routes, llm_routes
from app.api import upload_routes
from app.core.session_store import session_store


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
            try:
                self.active_connections[session_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            dead = []
            for ws in list(self.active_connections[session_id]):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                try:
                    self.active_connections[session_id].remove(ws)
                except ValueError:
                    pass


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("OmniPanel AI backend starting...")
    yield
    print("OmniPanel AI backend shutting down...")


app = FastAPI(
    title="OmniPanel AI",
    description="Autonomous Multi-Persona Voice Interview Platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agora_routes.router, prefix="/api/agora", tags=["Agora"])
app.include_router(interview_routes.router, prefix="/api", tags=["Interview"])
app.include_router(report_routes.router, prefix="/api", tags=["Report"])
app.include_router(llm_routes.router, prefix="/api", tags=["LLM Proxy"])
app.include_router(upload_routes.router, prefix="/api/upload", tags=["Upload"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "OmniPanel AI", "version": "2.0.0"}


@app.websocket("/ws/telemetry/{session_id}")
async def telemetry_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    ping_task = None

    async def send_pings():
        while True:
            await asyncio.sleep(25)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    try:
        ping_task = asyncio.create_task(send_pings())

        while True:
            data = await websocket.receive_json()
            session = await session_store.get_session(session_id)
            if session:
                event_type = data.get("type")
                if event_type == "cheating_alert":
                    session.cheating_alerts.append({
                        "timestamp": time.time() - session.start_time,
                        "type": data.get("alert_type", "unknown"),
                        "detail": data.get("detail", ""),
                    })
                elif event_type == "hesitation_alert":
                    session.hesitations.append({
                        "timestamp": time.time() - session.start_time,
                        "duration_ms": int(data.get("duration_ms", 1000)),
                    })
                elif event_type == "advance_round":
                    new_idx = await session_store.advance_round(session_id)
                    await manager.broadcast(session_id, {
                        "type": "round_advanced",
                        "round_index": new_idx,
                    })
                elif event_type == "pong":
                    pass  # heartbeat acknowledged

            # Broadcast back to all connections
            await manager.broadcast(session_id, {
                "type": "telemetry",
                "session_id": session_id,
                "event": data,
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error in telemetry handler: {e}")
    finally:
        if ping_task:
            ping_task.cancel()
        manager.disconnect(session_id, websocket)


def get_connection_manager() -> ConnectionManager:
    return manager
