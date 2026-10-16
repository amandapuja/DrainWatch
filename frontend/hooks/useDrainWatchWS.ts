import { useEffect, useRef, useState, useCallback } from "react";

export interface SensorData {
  sensor_id: string;
  location?: string;
  distance_cm: number;
  water_level_cm: number;
  max_capacity_cm?: number;
  flow_rate_m3h?: number;
  temperature_c?: number;
  ph?: number;
  turbidity_ntu?: number;
  status: "normal" | "warning" | "critical";
  timestamp?: number;
}

export interface CVFeedData {
  camera_id: string;
  frame?: string; // Base64 JPEG
  metadata: {
    fps: number;
    blockage_percentage: number;
    detections_count: Record<string, number>;
    alert: boolean;
  };
}

export interface UseDrainWatchWSOptions {
  backendHost?: string; // misal "localhost:8000"
  onAlert?: (msg: string) => void;
}

export function useDrainWatchWS({ backendHost = "localhost:8000", onAlert }: UseDrainWatchWSOptions = {}) {
  const [sensors, setSensors] = useState<Record<string, SensorData>>({});
  const [cvFeed, setCvFeed] = useState<CVFeedData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  const telemetryWsRef = useRef<WebSocket | null>(null);
  const videoWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSockets = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const telemetryUrl = `${protocol}//${backendHost}/ws/telemetry`;
    const videoUrl = `${protocol}//${backendHost}/ws/video_feed`;

    // 1. Kanal Telemetri Sensor
    const tWs = new WebSocket(telemetryUrl);
    telemetryWsRef.current = tWs;

    tWs.onopen = () => {
      console.log("[DrainWatch WS] Terhubung ke Kanal Telemetri.");
      setIsConnected(true);
    };

    tWs.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "INITIAL_SNAPSHOT") {
          setSensors(payload.sensors || {});
        } else if (payload.type === "SENSOR_UPDATE") {
          setSensors((prev) => ({
            ...prev,
            [payload.sensor_id]: payload.data,
          }));

          // Deteksi bahaya seketika
          if (payload.data.status === "critical") {
            const alertMsg = `⚠️ BAHAYA: Air di ${payload.sensor_id} mencapai ${payload.data.water_level_cm} cm!`;
            setSystemAlert(alertMsg);
            if (onAlert) onAlert(alertMsg);
          }
        }
      } catch (err) {
        console.error("Gagal parse payload telemetri:", err);
      }
    };

    tWs.onclose = () => {
      console.warn("[DrainWatch WS] Kanal Telemetri terputus. Mengatur rekoneksi...");
      setIsConnected(false);
      scheduleReconnect();
    };

    // 2. Kanal Streaming Video YOLOv8
    const vWs = new WebSocket(videoUrl);
    videoWsRef.current = vWs;

    vWs.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "CV_FRAME") {
          setCvFeed({
            camera_id: payload.camera_id,
            frame: payload.frame,
            metadata: payload.metadata,
          });
        }
      } catch (err) {
        console.error("Gagal parse video frame:", err);
      }
    };

    vWs.onclose = () => {
      console.warn("[DrainWatch WS] Kanal Video terputus.");
    };
  }, [backendHost, onAlert]);

  const scheduleReconnect = () => {
    if (!reconnectTimeoutRef.current) {
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connectWebSockets();
      }, 3000);
    }
  };

  useEffect(() => {
    connectWebSockets();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      telemetryWsRef.current?.close();
      videoWsRef.current?.close();
    };
  }, [connectWebSockets]);

  return {
    sensors,
    cvFeed,
    isConnected,
    systemAlert,
    clearAlert: () => setSystemAlert(null),
  };
}
