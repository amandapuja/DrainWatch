"""
DrainWatch — Simulator Telemetri IoT ESP32 (Local Testing Utility)
Mengirimkan data dinamis secara periodik ke Backend FastAPI.
Dapat digunakan untuk menguji pergerakan live gauge dan alert tanpa perangkat keras ESP32.
"""

import time
import math
import random
import requests

BACKEND_URL = "http://127.0.0.1:8000/api/v1/sensors/telemetry"

SENSORS = [
    {"id": "S-01", "name": "Jl. Sudirman KM.2", "base_level": 70.0, "noise": 15.0},
    {"id": "S-02", "name": "Jl. MH Thamrin", "base_level": 45.0, "noise": 8.0},
    {"id": "S-07", "name": "Jl. Gatot Subroto", "base_level": 60.0, "noise": 22.0},
    {"id": "S-13", "name": "Jl. Gatot Sub. KM.6", "base_level": 75.0, "noise": 10.0},
]

def main():
    print("=" * 60)
    print("  🌊 DRAINWATCH — SIMULATOR SENSOR IoT (LOCAL)")
    print(f"  Target Ingest: {BACKEND_URL}")
    print("  Tekan Ctrl+C untuk menghentikan simulator")
    print("=" * 60)

    tick = 0
    TOTAL_DEPTH = 120.0

    while True:
        tick += 1
        for s in SENSORS:
            # Pola gelombang dinamis sinus + random noise
            wave = math.sin((tick * 0.15) + (int(s["id"][-1]) * 1.5)) * s["noise"]
            jitter = (random.random() - 0.5) * 2.0
            water_level = max(5.0, min(TOTAL_DEPTH, s["base_level"] + wave + jitter))
            water_level = round(water_level, 1)

            distance = round(TOTAL_DEPTH - water_level, 1)
            flow_rate = round(max(0.5, 8.0 - (water_level / 15.0) + (random.random() * 0.4)), 1)
            temp = round(27.5 + (random.random() * 1.5), 1)
            ph = round(6.8 + (random.random() * 0.6), 1)
            turb = int(40 + (water_level * 1.2) + (random.random() * 10))

            payload = {
                "sensor_id": s["id"],
                "distance_cm": distance,
                "water_level_cm": water_level,
                "flow_rate_m3h": flow_rate,
                "temperature_c": temp,
                "ph": ph,
                "turbidity_ntu": turb,
            }

            try:
                res = requests.post(BACKEND_URL, json=payload, timeout=2.0)
                if res.status_code == 200:
                    status_indicator = "🚨 BAHAYA" if water_level >= 80 else ("⚠️ WASPADA" if water_level >= 50 else "✅ NORMAL")
                    print(f"[{time.strftime('%H:%M:%S')}] {s['id']} ({s['name']}): Level = {water_level} cm | {status_indicator}")
            except Exception as e:
                print(f"[ERROR] Gagal terhubung ke Backend: {e}")
                print("Pastikan Backend FastAPI sudah berjalan di port 8000.")
                time.sleep(3)
                break

        time.sleep(2)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSimulator IoT dihentikan.")
