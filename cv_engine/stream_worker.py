import cv2
import asyncio
import json
import time
import logging
import websockets
import numpy as np
from typing import Any, Union
from detector import DrainageDetector

logging.basicConfig(level=logging.INFO, format="%(asctime)s [CV_WORKER] %(message)s")
logger = logging.getLogger("DrainWatch.CVWorker")

class StreamWorker:
    def __init__(
        self,
        video_source: Any = 0, # 0 untuk webcam, atau "rtsp://..." atau path file video
        backend_ws_url: str = "ws://localhost:8000/ws/cv_ingest",
        camera_id: str = "CAM-SUDIRMAN-01",
        target_fps: int = 15
    ):
        self.video_source = video_source
        self.backend_ws_url = backend_ws_url
        self.camera_id = camera_id
        self.target_fps = target_fps
        self.detector = DrainageDetector(model_path="yolov8n.pt", conf_thresh=0.45)
        self.running = False

    async def run(self):
        self.running = True
        logger.info(f"Membuka sumber video: {self.video_source}")
        cap = cv2.VideoCapture(self.video_source)

        # Set resolusi optimal untuk streaming real-time
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        use_synthetic = False
        if not cap.isOpened():
            logger.warning(f"Sumber video {self.video_source} tidak dapat dibuka. Beralih ke Mode Simulasi Visual Gorong-Gorong AI...")
            use_synthetic = True

        frame_interval = 1.0 / self.target_fps
        sim_tick = 0

        while self.running:
            try:
                logger.info(f"Mencoba menyambung ke Backend WebSocket: {self.backend_ws_url} ...")
                async with websockets.connect(self.backend_ws_url, max_size=10 * 1024 * 1024) as ws:
                    logger.info("Berhasil terhubung ke WebSocket Backend! Memulai streaming deteksi...")
                    
                    last_time = time.time()
                    fps = 0.0

                    while self.running:
                        start_tick = time.time()
                        
                        if use_synthetic:
                            sim_tick += 1
                            # Buat synthetic drainage frame 640x480
                            frame = np.zeros((480, 640, 3), dtype=np.uint8)
                            # Warna air keruh saluran (BGR)
                            frame[200:480, :] = (45, 60, 50)
                            # Dinding gorong-gorong beton
                            frame[0:200, :] = (30, 35, 40)
                            cv2.line(frame, (0, 200), (640, 200), (80, 90, 100), 2)
                            
                            # Objek sampah botol plastik bergerak
                            px = int((sim_tick * 6) % 600) + 20
                            py = int(260 + 30 * np.sin(sim_tick * 0.1))
                            cv2.rectangle(frame, (px, py), (px + 45, py + 25), (200, 200, 255), -1)
                            cv2.putText(frame, "BOTTLE", (px, py - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                            
                            # Debris kayu
                            dx = int((sim_tick * 4 + 200) % 600) + 20
                            dy = int(320 + 20 * np.cos(sim_tick * 0.08))
                            cv2.rectangle(frame, (dx, dy), (dx + 70, dy + 20), (30, 80, 140), -1)
                        else:
                            ret, frame = cap.read()
                            if not ret:
                                if isinstance(self.video_source, str) and not self.video_source.startswith("rtsp"):
                                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                                    continue
                                else:
                                    logger.warning("Gagal membaca frame kamera. Mencoba lagi...")
                                    await asyncio.sleep(0.5)
                                    continue

                        # Inferensi YOLOv8 & Anotasi Frame
                        annotated_frame, metadata = self.detector.process_frame(frame)
                        
                        # Hitung FPS aktual
                        curr_time = time.time()
                        fps = round(1.0 / max(0.001, (curr_time - last_time)), 1)
                        last_time = curr_time

                        # Encode frame ke Base64 JPEG
                        base64_frame = self.detector.encode_frame_to_base64(annotated_frame, quality=65)

                        # Siapkan Payload Real-Time
                        payload = {
                            "camera_id": self.camera_id,
                            "timestamp": time.time(),
                            "fps": fps,
                            "blockage_percentage": metadata["blockage_percentage"],
                            "detections_count": metadata["detections_count"],
                            "alert": metadata["alert"],
                            "frame_base64": base64_frame
                        }

                        # Kirim frame & telemetri CV ke Backend via WebSocket
                        await ws.send(json.dumps(payload))

                        # Batasi frame rate agar hemat bandwidth dan CPU
                        elapsed = time.time() - start_tick
                        sleep_time = max(0.001, frame_interval - elapsed)
                        await asyncio.sleep(sleep_time)

            except (websockets.exceptions.ConnectionClosedError, ConnectionRefusedError) as e:
                logger.warning(f"Koneksi backend terputus ({e}). Mencoba rekoneksi dalam 3 detik...")
                await asyncio.sleep(3.0)
            except Exception as e:
                logger.error(f"Unexpected error pada CV Stream: {e}")
                await asyncio.sleep(2.0)

        cap.release()
        logger.info("Stream worker dihentikan.")

if __name__ == "__main__":
    import sys
    # Argumen opsional: python stream_worker.py [source] [cam_id]
    src = sys.argv[1] if len(sys.argv) > 1 else 0
    # Coba ubah ke integer jika input adalah '0', '1'
    if isinstance(src, str) and src.isdigit():
        src = int(src)
    
    worker = StreamWorker(video_source=src, camera_id="CAM-SUDIRMAN-01", target_fps=15)
    try:
        asyncio.run(worker.run())
    except KeyboardInterrupt:
        print("\nWorker dimatikan oleh pengguna.")
