from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    """
    Manages WebSocket connections per shop.
    When a new order comes in, broadcast to all workers of that shop.
    """
    def __init__(self):
        # shop_id -> list of connected websockets
        self.active: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, shop_id: int):
        await websocket.accept()
        if shop_id not in self.active:
            self.active[shop_id] = []
        self.active[shop_id].append(websocket)

    def disconnect(self, websocket: WebSocket, shop_id: int):
        if shop_id in self.active:
            self.active[shop_id] = [w for w in self.active[shop_id] if w != websocket]

    async def broadcast(self, shop_id: int, message: dict):
        if shop_id not in self.active:
            return
        dead = []
        for ws in self.active[shop_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, shop_id)

manager = ConnectionManager()
