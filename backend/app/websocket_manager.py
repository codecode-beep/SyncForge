from typing import Dict, Set
from fastapi import WebSocket
import asyncio

class BoardWSManager:
    def __init__(self):
        self._lock = asyncio.Lock()
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, board_id: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.connections.setdefault(board_id, set()).add(ws)

    async def disconnect(self, board_id: str, ws: WebSocket):
        async with self._lock:
            if board_id in self.connections and ws in self.connections[board_id]:
                self.connections[board_id].remove(ws)
                if not self.connections[board_id]:
                    del self.connections[board_id]

    async def broadcast(self, board_id: str, message: dict):
        async with self._lock:
            targets = list(self.connections.get(board_id, set()))
        dead = []
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(board_id, ws)

manager = BoardWSManager()