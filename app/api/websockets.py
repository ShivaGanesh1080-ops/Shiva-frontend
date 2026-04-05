from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        # This keeps track of all the different kitchen screens currently open
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, shop_slug: str):
        await websocket.accept()
        if shop_slug not in self.active_connections:
            self.active_connections[shop_slug] = []
        self.active_connections[shop_slug].append(websocket)

    def disconnect(self, websocket: WebSocket, shop_slug: str):
        if shop_slug in self.active_connections and websocket in self.active_connections[shop_slug]:
            self.active_connections[shop_slug].remove(websocket)

    async def broadcast(self, shop_slug: str, message: dict):
        # When an order is placed, this instantly sends it to the specific shop's kitchen
        if shop_slug in self.active_connections:
            for connection in self.active_connections[shop_slug]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()