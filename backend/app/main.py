import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.schemas import SensorTelemetry, CVTelemetry, PumpControlRequest
from app.websocket_manager import ws_manager
from app.mqtt_client import MQTTManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("DrainWatch.Core")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))

# State Penyimpanan Terkini (In-Memory Cache)
SYSTEM_STATE = {
    "sensors": {},        # sensor_id -> latest telemetry dict
    "cv_feeds": {},       # camera_id -> latest CV detection & metadata
    "pump_status": {},    # sensor_id -> "OFF" / "ON"
    "auto_pump_enabled": True
}

# Threshold Ketinggian Air (cm)
THRESHOLD_WARNING = 50.0
THRESHOLD_CRITICAL = 80.0

async def handle_mqtt_message(topic: str, data: dict):
    """
    Handler saat pesan sensor diterima dari MQTT Broker.
    Memproses status risiko, auto-pump trigger, dan broadcast via WebSocket.
    """
    try:
        sensor_id = data.get("sensor_id", "UNKNOWN")
        water_level = float(data.get("water_level_cm", 0.0))

        # Evaluasi Ambang Batas Risiko
        if water_level >= THRESHOLD_CRITICAL:
            status = "critical"
        elif water_level >= THRESHOLD_WARNING:
            status = "warning"
        else:
            status = "normal"

        data["status"] = status
        SYSTEM_STATE["sensors"][sensor_id] = data

        # Pemicu Pompa Otomatis jika Kritis
        if status == "critical" and SYSTEM_STATE["auto_pump_enabled"]:
            if SYSTEM_STATE["pump_status"].get(sensor_id) != "ON":
                logger.warning(f"🚨 BAHAYA GENANGAN! Memicu Pompa Darurat untuk Sensor: {sensor_id}")
                mqtt_mgr.publish_command(f"drainwatch/sensor/{sensor_id}/pump", {"state": "ON"})
                SYSTEM_STATE["pump_status"][sensor_id] = "ON"

        # Broadcast update ke seluruh Dashboard yang terhubung via WebSocket
        payload = {
            "type": "SENSOR_UPDATE",
            "sensor_id": sensor_id,
            "data": data,
            "system_summary": {
                "critical_count": sum(1 for s in SYSTEM_STATE["sensors"].values() if s.get("status") == "critical"),
                "warning_count": sum(1 for s in SYSTEM_STATE["sensors"].values() if s.get("status") == "warning"),
                "normal_count": sum(1 for s in SYSTEM_STATE["sensors"].values() if s.get("status") == "normal"),
            }
        }
        await ws_manager.broadcast_json("telemetry", payload)

    except Exception as e:
        logger.error(f"Error handling telemetry data: {e}")

# Inisialisasi MQTT Manager
mqtt_mgr = MQTTManager(
    broker_host="localhost",
    broker_port=1883,
    on_message_callback=handle_mqtt_message
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Jalankan MQTT Loop
    loop = asyncio.get_running_loop()
    mqtt_mgr.start(loop)
    logger.info("🌊 DrainWatch Backend Server Aktif.")
    yield
    # Shutdown: Bersihkan resource
    mqtt_mgr.stop()
    logger.info("DrainWatch Backend Server Dimatikan.")

app = FastAPI(
    title="DrainWatch Core API & Real-Time Engine",
    description="Sistem Pemantauan Drainase Perkotaan Real-Time (FastAPI + WebSocket + MQTT + YOLOv8)",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware agar Frontend Next.js / React bisa terhubung tanpa kendala CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# WEBSOCKET ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    Kanal WebSocket untuk data telemetri sensor & notifikasi peringatan.
    Frontend berlangganan ke kanal ini untuk update grafik & status pompa.
    """
    await ws_manager.connect(websocket, channel="telemetry")
    try:
        # Kirim snapshot state awal begitu client tersambung
        initial_snapshot = {
            "type": "INITIAL_SNAPSHOT",
            "sensors": SYSTEM_STATE["sensors"],
            "cv_feeds": SYSTEM_STATE["cv_feeds"],
            "pump_status": SYSTEM_STATE["pump_status"]
        }
        await websocket.send_json(initial_snapshot)

        # Loop mendengarkan pesan dari frontend (misal ping / user action)
        while True:
            client_msg = await websocket.receive_text()
            logger.debug(f"Pesan dari client WS: {client_msg}")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, channel="telemetry")
    except Exception as e:
        logger.error(f"Error di WS telemetry: {e}")
        await ws_manager.disconnect(websocket, channel="telemetry")

@app.websocket("/ws/video_feed")
async def websocket_video_feed_endpoint(websocket: WebSocket):
    """
    Kanal WebSocket untuk streaming frame video hasil deteksi YOLOv8 ke frontend.
    """
    await ws_manager.connect(websocket, channel="video_feed")
    try:
        while True:
            # Tetap jaga koneksi aktif
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, channel="video_feed")
    except Exception:
        await ws_manager.disconnect(websocket, channel="video_feed")

@app.websocket("/ws/cv_ingest")
async def websocket_cv_ingest_endpoint(websocket: WebSocket):
    """
    Endpoint khusus untuk modul Python Computer Vision (YOLOv8 worker).
    Menerima frame teranotasi dan metadata deteksi secara real-time dari CCTV worker.
    """
    await websocket.accept()
    logger.info("Modul Computer Vision YOLOv8 terhubung ke Ingest Stream.")
    try:
        while True:
            data = await websocket.receive_json()
            cam_id = data.get("camera_id", "CAM-01")
            
            # Simpan state CV terbaru
            SYSTEM_STATE["cv_feeds"][cam_id] = {
                "fps": data.get("fps"),
                "blockage_percentage": data.get("blockage_percentage"),
                "detections_count": data.get("detections_count"),
                "alert": data.get("alert")
            }

            # Forward langsung ke semua client di channel video_feed
            await ws_manager.broadcast_json("video_feed", {
                "type": "CV_FRAME",
                "camera_id": cam_id,
                "frame": data.get("frame_base64"),
                "metadata": {
                    "fps": data.get("fps"),
                    "blockage_percentage": data.get("blockage_percentage"),
                    "detections_count": data.get("detections_count"),
                    "alert": data.get("alert")
                }
            })
    except WebSocketDisconnect:
        logger.warning("Modul Computer Vision terputus dari Ingest Stream.")
    except Exception as e:
        logger.error(f"Error pada CV Ingest stream: {e}")

# ─────────────────────────────────────────────────────────────
# REST API ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "online",
        "active_clients_telemetry": len(ws_manager.active_channels.get("telemetry", set())),
        "active_clients_video": len(ws_manager.active_channels.get("video_feed", set())),
        "tracked_sensors": len(SYSTEM_STATE["sensors"])
    }

@app.get("/api/v1/sensors")
async def get_sensors():
    return SYSTEM_STATE["sensors"]

@app.post("/api/v1/sensors/telemetry")
async def ingest_http_telemetry(payload: SensorTelemetry):
    """Endpoint alternatif jika sensor IoT menggunakan HTTP POST (misal via GSM/SIM800L)"""
    await handle_mqtt_message(f"drainwatch/sensor/{payload.sensor_id}/telemetry", payload.model_dump())
    return {"status": "success", "message": "Telemetry received and broadcasted"}

@app.post("/api/v1/pump/control")
async def control_pump(req: PumpControlRequest):
    """Kontrol manual pompa drainase via REST API"""
    if req.state not in ["ON", "OFF"]:
        raise HTTPException(status_code=400, detail="State harus 'ON' atau 'OFF'")
    
    SYSTEM_STATE["pump_status"][req.sensor_id] = req.state
    mqtt_mgr.publish_command(f"drainwatch/sensor/{req.sensor_id}/pump", {"state": req.state})
    
    # Broadcast status pompa ke WebSocket
    await ws_manager.broadcast_json("telemetry", {
        "type": "PUMP_STATE_CHANGE",
        "sensor_id": req.sensor_id,
        "state": req.state
    })
    return {"status": "success", "sensor_id": req.sensor_id, "pump_state": req.state}

# ─────────────────────────────────────────────────────────────
# FRONTEND STATIC FILES & DASHBOARD HOSTING
# ─────────────────────────────────────────────────────────────

@app.get("/")
async def serve_dashboard():
    index_path = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "online", "message": "DrainWatch Real-Time Core API"}

css_dir = os.path.join(BASE_DIR, "css")
if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css_static")

js_dir = os.path.join(BASE_DIR, "js")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js_static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

