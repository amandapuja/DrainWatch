@echo off
title DrainWatch — Real-Time Core Backend
echo ========================================================
echo   DRAINWATCH — REAL-TIME BACKEND ENGINE & DASHBOARD
echo ========================================================
echo Membuka server FastAPI di http://127.0.0.1:8000 ...
echo Dashboard Web: http://127.0.0.1:8000
echo WebSocket Telemetri: ws://127.0.0.1:8000/ws/telemetry
echo WebSocket Video Feed: ws://127.0.0.1:8000/ws/video_feed
echo Dokumentasi Swagger: http://127.0.0.1:8000/docs
echo ========================================================

cd /d "%~dp0\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
