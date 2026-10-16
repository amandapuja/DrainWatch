import React, { useState, useEffect, useRef } from "react";
import { useDrainWatchWS, SensorData } from "../hooks/useDrainWatchWS";

export const DrainWatchDashboard: React.FC = () => {
  const [selectedSensorId, setSelectedSensorId] = useState<string>("S-01");
  const [isPumpActive, setIsPumpActive] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play synthetic siren alarm on critical event
  const playAlertSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy
    }
  };

  const { sensors, cvFeed, isConnected, systemAlert, clearAlert } = useDrainWatchWS({
    backendHost: "localhost:8000",
    onAlert: () => playAlertSound(),
  });

  const activeSensor: SensorData = sensors[selectedSensorId] || {
    sensor_id: selectedSensorId,
    location: "Lokasi Memuat...",
    distance_cm: 0,
    water_level_cm: 0,
    max_capacity_cm: 120,
    flow_rate_m3h: 0,
    temperature_c: 28,
    ph: 7.0,
    turbidity_ntu: 30,
    status: "normal",
  };

  // Toggle Pompa via Backend REST API
  const handleTogglePump = async () => {
    const nextState = isPumpActive ? "OFF" : "ON";
    try {
      const res = await fetch("http://localhost:8000/api/v1/pump/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensor_id: selectedSensorId, state: nextState }),
      });
      if (res.ok) {
        setIsPumpActive(!isPumpActive);
      }
    } catch (e) {
      console.error("Gagal mengirim perintah pompa:", e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "text-red-400 bg-red-950/40 border-red-500/50";
      case "warning":
        return "text-amber-400 bg-amber-950/40 border-amber-500/50";
      default:
        return "text-emerald-400 bg-emerald-950/40 border-emerald-500/50";
    }
  };

  const waterLevelPct = Math.min(
    100,
    Math.round(((activeSensor.water_level_cm || 0) / (activeSensor.max_capacity_cm || 120)) * 100)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      {/* HEADER BAR */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌊</span>
            <h1 className="text-xl md:text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              DrainWatch Live Telemetry & AI Vision
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Urban Drainage Monitoring System • IoT & YOLOv8 Deep Pipeline
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isConnected
                ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/30"
                : "bg-red-950/50 text-red-400 border-red-500/30"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-ping" : "bg-red-500"
              }`}
            />
            {isConnected ? "WEBSOCKET LIVE" : "CONNECTING..."}
          </div>
        </div>
      </header>

      {/* SYSTEM ALERT BANNER */}
      {systemAlert && (
        <div className="mt-4 p-4 rounded-xl bg-red-900/30 border border-red-500/50 flex items-center justify-between text-red-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">🚨</span>
            <div>
              <p className="font-bold text-sm">Peringatan Kritis Terdeteksi</p>
              <p className="text-xs text-red-300">{systemAlert}</p>
            </div>
          </div>
          <button
            onClick={clearAlert}
            className="px-3 py-1 text-xs bg-red-800/60 hover:bg-red-700 rounded-lg text-white font-medium"
          >
            Tutup
          </button>
        </div>
      )}

      {/* MAIN GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* PANEL KIRI: YOLOv8 LIVE STREAM (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-200">
                  CCTV AI Vision (YOLOv8 Real-Time)
                </h2>
              </div>
              <span className="text-xs bg-slate-800 text-cyan-300 px-2.5 py-1 rounded font-mono">
                {cvFeed?.metadata?.fps ? `${cvFeed.metadata.fps} FPS` : "STANDBY"}
              </span>
            </div>

            {/* Video Frame Display */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {cvFeed?.frame ? (
                <img
                  src={`data:image/jpeg;base64,${cvFeed.frame}`}
                  alt="YOLOv8 Live Stream"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
                  <p className="text-xs">Menunggu sinyal frame dari CV Worker...</p>
                  <p className="text-[11px] text-slate-600">
                    Jalankan: <code>python cv_engine/stream_worker.py</code>
                  </p>
                </div>
              )}

              {/* HUD Badge Overlays */}
              {cvFeed?.metadata && (
                <div className="absolute top-3 left-3 flex gap-2">
                  <div
                    className={`px-2.5 py-1 rounded-md text-xs font-bold border backdrop-blur-md ${
                      cvFeed.metadata.alert
                        ? "bg-red-950/80 text-red-300 border-red-500/80 animate-pulse"
                        : "bg-slate-900/80 text-cyan-300 border-slate-700"
                    }`}
                  >
                    Blockage: {cvFeed.metadata.blockage_percentage}%
                  </div>
                </div>
              )}
            </div>

            {/* AI Breakdown Stats */}
            <div className="grid grid-cols-4 gap-3 mt-4 text-center">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase">Plastic Waste</p>
                <p className="text-base font-bold text-fuchsia-400 mt-0.5">
                  {cvFeed?.metadata?.detections_count?.plastic || 0}
                </p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase">Organic Debris</p>
                <p className="text-base font-bold text-emerald-400 mt-0.5">
                  {cvFeed?.metadata?.detections_count?.debris || 0}
                </p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase">Sedimentation</p>
                <p className="text-base font-bold text-amber-400 mt-0.5">
                  {cvFeed?.metadata?.detections_count?.sediment || 0}
                </p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase">Severe Block</p>
                <p className="text-base font-bold text-red-400 mt-0.5">
                  {cvFeed?.metadata?.detections_count?.blockage || 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL KANAN: IOT TELEMETRY & WATER LEVEL (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
            {/* Sensor Picker */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-200">
                  Node Telemetri ESP32
                </h2>
                <p className="text-xs text-slate-400">{activeSensor.location || "Saluran Utama"}</p>
              </div>
              <select
                aria-label="Pilih Node Sensor"
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-400"
              >
                {Object.keys(sensors).length > 0 ? (
                  Object.keys(sensors).map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))
                ) : (
                  <option value="S-01">S-01 (Default)</option>
                )}
              </select>
            </div>

            {/* WATER LEVEL PROGRESS & STATUS */}
            <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 mb-5">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Level Air Ultrasonik
                  </span>
                  <div className="text-3xl font-black text-slate-100 flex items-baseline gap-1 mt-0.5">
                    {activeSensor.water_level_cm || 0}
                    <span className="text-sm font-normal text-slate-400">cm</span>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getStatusColor(
                    activeSensor.status
                  )}`}
                >
                  {activeSensor.status}
                </div>
              </div>

              {/* Progress Bar SCADA */}
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mt-3 relative">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    activeSensor.status === "critical"
                      ? "bg-red-500"
                      : activeSensor.status === "warning"
                      ? "bg-amber-400"
                      : "bg-cyan-400"
                  }`}
                  style={{ width: `${waterLevelPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>0 cm</span>
                <span>Waspada (50 cm)</span>
                <span>Bahaya (80 cm)</span>
                <span>Max ({activeSensor.max_capacity_cm || 120} cm)</span>
              </div>
            </div>

            {/* SENSOR STATS GRID */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Debit Aliran</span>
                <p className="text-lg font-bold text-cyan-300 mt-1">
                  {activeSensor.flow_rate_m3h || 0} <span className="text-xs text-slate-400">m³/jam</span>
                </p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Jarak Sensor</span>
                <p className="text-lg font-bold text-slate-200 mt-1">
                  {activeSensor.distance_cm || 0} <span className="text-xs text-slate-400">cm</span>
                </p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Suhu Air</span>
                <p className="text-lg font-bold text-slate-200 mt-1">
                  {activeSensor.temperature_c || 28}°C
                </p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Kekeruhan (Turbidity)</span>
                <p className="text-lg font-bold text-slate-200 mt-1">
                  {activeSensor.turbidity_ntu || 35} <span className="text-xs text-slate-400">NTU</span>
                </p>
              </div>
            </div>

            {/* ACTUATOR CONTROL: DRAINAGE PUMP */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-200 uppercase">Pompa Drainase Otomatis</p>
                <p className="text-[11px] text-slate-400">Memicu relay ESP32 via MQTT</p>
              </div>
              <button
                onClick={handleTogglePump}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                  isPumpActive
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-red-500/20"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20"
                }`}
              >
                {isPumpActive ? "MATIKAN POMPA" : "AKTIFKAN POMPA"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
export default DrainWatchDashboard;
