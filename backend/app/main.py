from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .config import settings
from .routers import auth
from .routers import boards, columns, tasks
from fastapi import WebSocket, WebSocketDisconnect
from .websocket_manager import manager

app = FastAPI(title="Mini Trello (Real-time Task Board)")

Base.metadata.create_all(bind=engine)

allowed = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")] if settings.ALLOWED_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(boards.router)
app.include_router(columns.router)
app.include_router(tasks.router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.websocket("/ws/boards/{board_id}")
async def ws_board(board_id: str, websocket: WebSocket):
    await manager.connect(board_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(board_id, websocket)
    except Exception:
        await manager.disconnect(board_id, websocket)