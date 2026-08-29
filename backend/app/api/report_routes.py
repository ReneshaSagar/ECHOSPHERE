from fastapi import APIRouter, HTTPException
from app.core.session_store import session_store
from app.engine.evaluator import evaluator
from app.core.agora_client import agora_client

router = APIRouter()

@router.get('/sessions/{session_id}/report')
async def get_session_report(session_id: str):
    try:
        report = await evaluator.generate_final_report(session_id)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/sessions/{session_id}/end')
async def end_session(session_id: str):
    session = await session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.status = 'ended'
    
    # Stop all agents
    for persona, agent_id in session.agent_ids.items():
        try:
            await agora_client.stop_convo_agent(agent_id)
        except Exception:
            pass # ignore errors on cleanup
            
    return {'message': 'Session ended', 'session_id': session_id}
