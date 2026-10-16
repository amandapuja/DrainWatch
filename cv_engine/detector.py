import cv2
import numpy as np
import base64
import time
from typing import Tuple, Dict, Any, List
from ultralytics import YOLO

class DrainageDetector:
    def __init__(self, model_path: str = "yolov8n.pt", conf_thresh: float = 0.5):
        """
        Inisialisasi Detektor YOLOv8 untuk DrainWatch.
        Dapat menggunakan model kustom (sampah/genangan) atau pretrained yolov8n.pt.
        """
        print(f"[YOLOv8] Memuat model deteksi: {model_path} ...")
        self.model = YOLO(model_path)
        self.conf_thresh = conf_thresh
        
        # Mapping warna kelas deteksi (BGR)
        self.class_colors = {
            "plastic": (255, 0, 180),    # Magenta
            "debris": (0, 220, 100),     # Hijau neon
            "sediment": (0, 165, 255),   # Oranye
            "blockage": (0, 0, 255),     # Merah
            "water": (255, 200, 0),      # Cyan
            "default": (0, 255, 255)     # Kuning
        }

    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Melakukan inferensi pada frame, menambahkan visual HUD/bounding box,
        dan menghitung metrik blockage (persentase penyumbatan saluran).
        """
        h, w, _ = frame.shape
        channel_area = h * w
        total_debris_area = 0.0

        # Inference YOLOv8
        results = self.model(frame, conf=self.conf_thresh, verbose=False)[0]
        
        detections_list: List[Dict[str, Any]] = []
        counts: Dict[str, int] = {
            "plastic": 0,
            "debris": 0,
            "sediment": 0,
            "blockage": 0
        }

        annotated_frame = frame.copy()

        # Parse Bounding Boxes
        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            raw_cls_name = self.model.names.get(cls_id, "object").lower()

            # Normalisasi nama kelas ke domain DrainWatch
            if any(k in raw_cls_name for k in ["bottle", "cup", "can", "bag", "plastic"]):
                category = "plastic"
            elif any(k in raw_cls_name for k in ["branch", "tree", "plant", "wood", "debris"]):
                category = "debris"
            elif any(k in raw_cls_name for k in ["sediment", "mud", "sand"]):
                category = "sediment"
            else:
                category = "debris" if "block" not in raw_cls_name else "blockage"

            counts[category] = counts.get(category, 0) + 1
            bbox_area = max(0, (x2 - x1) * (y2 - y1))
            total_debris_area += bbox_area

            detections_list.append({
                "class_name": category,
                "confidence": round(conf, 2),
                "bbox": [x1, y1, x2, y2]
            })

            # Gambar Bounding Box Modern & Label
            color = self.class_colors.get(category, self.class_colors["default"])
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            label_text = f"{category.upper()} {conf:.2f}"
            (text_w, text_h), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated_frame, (x1, y1 - text_h - 6), (x1 + text_w + 4, y1), color, -1)
            cv2.putText(annotated_frame, label_text, (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

        # Hitung Persentase Penutupan Saluran Air (Blockage Index)
        # Saluran efektif diasumsikan 70% dari area frame kamera CCTV
        effective_drain_area = channel_area * 0.75
        blockage_pct = min(100.0, round((total_debris_area / effective_drain_area) * 100.0, 1))

        # Status Peringatan Blockage
        alert = blockage_pct >= 60.0 or counts["blockage"] > 0

        # Render Header HUD Overlay pada Frame
        self._draw_hud(annotated_frame, blockage_pct, alert, sum(counts.values()))

        metadata = {
            "blockage_percentage": blockage_pct,
            "detections_count": counts,
            "detections": detections_list,
            "alert": alert
        }

        return annotated_frame, metadata

    def _draw_hud(self, frame: np.ndarray, blockage_pct: float, alert: bool, total_objects: int):
        """Menggambar banner status SCADA/HUD pada frame video"""
        h, w, _ = frame.shape
        # Top HUD Bar semi-transparan
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 42), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

        # Status Badge
        status_color = (0, 0, 255) if alert else ((0, 165, 255) if blockage_pct > 30 else (0, 255, 120))
        status_text = "CRITICAL BLOCKAGE" if alert else ("WARNING" if blockage_pct > 30 else "OPTIMAL FLOW")
        
        cv2.circle(frame, (20, 21), 6, status_color, -1)
        cv2.putText(frame, f"DRAINWATCH AI: {status_text}", (35, 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)

        # Blockage Index & Object counter
        stats_text = f"Blockage: {blockage_pct}% | Objects: {total_objects}"
        cv2.putText(frame, stats_text, (w - 320, 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1, cv2.LINE_AA)

    @staticmethod
    def encode_frame_to_base64(frame: np.ndarray, quality: int = 70) -> str:
        """Mengonversi OpenCV numpy array ke Base64 JPEG string untuk WebSocket streaming"""
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        success, buffer = cv2.imencode('.jpg', frame, encode_param)
        if not success:
            return ""
        return base64.b64encode(buffer).decode('utf-8')
