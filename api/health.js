// Vercel Serverless Function: /api/health
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'online',
    platform: 'Vercel Serverless',
    service: 'DrainWatch Smart Drainage Intelligence',
    version: '2.5.0',
    location: 'Bojongsoang & Bandung Raya (DAS Citarum)',
    features: {
      open_meteo_live: true,
      webcam_webrtc_yolo: true,
      iot_telemetry: true,
      lstm_flood_predict: true
    },
    timestamp: new Date().toISOString()
  });
}
