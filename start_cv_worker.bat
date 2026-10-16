@echo off
title DrainWatch — YOLOv8 AI Computer Vision Worker
echo ========================================================
echo   DRAINWATCH — YOLOv8 REAL-TIME COMPUTER VISION WORKER
echo ========================================================
echo Menjalankan inferensi YOLOv8 pada Webcam/CCTV...
echo Frame dan metadata akan dikirim secara live ke Backend.
echo ========================================================

cd /d "%~dp0\cv_engine"
python stream_worker.py 0 CAM-SUDIRMAN-01
pause
