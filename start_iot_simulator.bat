@echo off
title DrainWatch — IoT Sensor Telemetry Simulator
echo ========================================================
echo   DRAINWATCH — IoT SENSOR TELEMETRY SIMULATOR
echo ========================================================
echo Mengirimkan data sensor live secara dinamis ke Backend...
echo ========================================================

cd /d "%~dp0"
python simulator_iot.py
pause
