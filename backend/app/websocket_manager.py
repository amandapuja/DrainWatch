import asyncio
import json
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("DrainWatch.WS")

class WebSocketManager:
    """
    Manajer WebSocket multi-channel untuk DrainWatch:
    - Channel 'telemetry': Mengirim data sensor IoT & status risiko
    - Channel 'video_feed': Mengirim stream frame YOLOv8 (JPEG base64/binary)
    """
    def __init__(self):
        # Menyimpan koneksi berdasarkan channel: {"telemetry": {ws1, ws2}, "video_feed": {ws3}}
        self.active_channels: Dict[str, Set[WebSocket]] = {
            "telemetry": set(),
            "video_feed": set(),
            "alerts": set(),
        }
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, channel: str = "telemetry"):
        await websocket.accept()
        async with self.lock:
            if channel not in self.active_channels:
                self.active_channels[channel] = set()
            self.active_channels[channel].add(websocket)
        logger.info(f"Client terhubung ke channel [{channel}]. Total: {len(self.active_channels[channel])}")

    async def disconnect(self, websocket: WebSocket, channel: str = "telemetry"):
        async with self.lock:
            if channel in self.active_channels and websocket in self.active_channels[channel]:
                self.active_channels[channel].remove(websocket)
                logger.info(f"Client terputus dari channel [{channel}]. Sisa: {len(self.active_channels[channel])}")

    async def broadcast_json(self, channel: str, message: Dict[str, Any]):
        """Mengirim pesan JSON ke semua subscriber di channel tertentu"""
        if channel not in self.active_channels or not self.active_channels[channel]:
            return

        dead_sockets = set()
        text_payload = json.dumps(message)
        
        # Broadcast ke seluruh clients di channel
        for ws in list(self.active_channels[channel]):
            try:
                await ws.send_text(text_payload)
            except (WebSocketDisconnect, RuntimeError, Exception) as e:
                logger.warning(f"Gagal mengirim ke client WS: {e}")
                dead_sockets.add(ws)

        if dead_sockets:
            async with self.lock:
                for dead_ws in dead_sockets:
                    if dead_ws in self.active_channels[channel]:
                        self.active_channels[channel].remove(dead_ws)

    async def broadcast_bytes(self, channel: str, data: bytes):
        """Mengirim raw binary frame (misal JPEG mjpeg) ke client"""
        if channel not in self.active_channels or not self.active_channels[channel]:
            return

        dead_sockets = set()
        for ws in list(self.active_channels[channel]):
            try:
                await ws.send_bytes(data)
            except Exception:
                dead_sockets.add(ws)

        if dead_sockets:
            async with self.lock:
                for dead_ws in dead_sockets:
                    if dead_ws in self.active_channels[channel]:
                        self.active_channels[channel].remove(dead_ws)

# Singleton Instance
ws_manager = WebSocketManager()
