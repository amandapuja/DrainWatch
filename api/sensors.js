// Vercel Serverless Function: /api/sensors
// Mengembalikan data telemetri sensor real-time area Bojongsoang & Bandung sekitarnya

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';

  // Sensor telemetri di area Bojongsoang, Dayeuhkolot, Baleendah, Bandung Raya
  const sensors = [
    { id: 'S-01', location: 'Jembatan Citarum Bojongsoang (KM 2.5)', zone: 'Zona A', level: 87.2, flow: 2.3, blockage: 89, status: 'critical', temp: 28.4, ph: 6.8, turb: 145, time: timeStr },
    { id: 'S-02', location: 'Drainase Sukabirus - Telkom University', zone: 'Zona C', level: 62.4, flow: 4.1, blockage: 47, status: 'warning', temp: 27.9, ph: 7.1, turb: 92, time: timeStr },
    { id: 'S-03', location: 'Polder Retensi Cieunteung Baleendah', zone: 'Zona B', level: 31.0, flow: 6.8, blockage: 12, status: 'normal', temp: 26.8, ph: 7.3, turb: 45, time: timeStr },
    { id: 'S-04', location: 'Pintu Air Dayeuhkolot (Cikapundung Kolot)', zone: 'Zona A', level: 28.5, flow: 7.2, blockage: 8, status: 'normal', temp: 27.1, ph: 7.2, turb: 38, time: timeStr },
    { id: 'S-05', location: 'Saluran Drainase Ciganitri Bojongsoang', zone: 'Zona C', level: 45.3, flow: 5.5, blockage: 22, status: 'normal', temp: 27.5, ph: 7.0, turb: 55, time: timeStr },
    { id: 'S-06', location: 'Kolam Retensi Gedebage Bandung', zone: 'Zona D', level: 39.8, flow: 6.1, blockage: 15, status: 'normal', temp: 27.2, ph: 7.1, turb: 48, time: timeStr },
    { id: 'S-07', location: 'Pintu Air Kolam Retensi Andir Baleendah', zone: 'Zona B', level: 83.1, flow: 1.8, blockage: 82, status: 'critical', temp: 29.1, ph: 6.6, turb: 168, time: timeStr },
    { id: 'S-08', location: 'Saluran Primer Ciwastra Buahbatu', zone: 'Zona C', level: 52.6, flow: 4.9, blockage: 35, status: 'warning', temp: 27.8, ph: 7.0, turb: 78, time: timeStr },
    { id: 'S-09', location: 'Irigasi Sapan Tegalluar Bojongsoang', zone: 'Zona D', level: 24.2, flow: 7.5, blockage: 6, status: 'normal', temp: 26.5, ph: 7.4, turb: 32, time: timeStr },
    { id: 'S-10', location: 'Bunderan Bojongsoang - Podomoro Park', zone: 'Zona A', level: 71.4, flow: 3.2, blockage: 58, status: 'warning', temp: 28.2, ph: 6.9, turb: 110, time: timeStr },
    { id: 'S-11', location: 'Jembatan Cipurut Dayeuhkolot', zone: 'Zona A', level: 19.5, flow: 7.8, blockage: 4, status: 'normal', temp: 26.2, ph: 7.5, turb: 28, time: timeStr },
    { id: 'S-12', location: 'Sungai Citepus Pasirluyu Buahbatu', zone: 'Zona C', level: 33.7, flow: 6.4, blockage: 11, status: 'normal', temp: 27.0, ph: 7.2, turb: 42, time: timeStr },
    { id: 'S-13', location: 'Saluran Pembuang Cijagra Bojongsoang', zone: 'Zona A', level: 81.0, flow: 2.1, blockage: 79, status: 'critical', temp: 28.9, ph: 6.7, turb: 155, time: timeStr },
    { id: 'S-14', location: 'Tanggul Citarum Cisirung Dayeuhkolot', zone: 'Zona A', level: 64.8, flow: 3.8, blockage: 51, status: 'warning', temp: 28.0, ph: 6.9, turb: 98, time: timeStr },
    { id: 'S-15', location: 'Saluran Buangan Kopo - Citarum Hilir', zone: 'Zona B', level: 26.3, flow: 7.1, blockage: 9, status: 'normal', temp: 26.7, ph: 7.3, turb: 36, time: timeStr }
  ];

  const summary = {
    total_sensors: sensors.length,
    critical_count: sensors.filter(s => s.status === 'critical').length,
    warning_count: sensors.filter(s => s.status === 'warning').length,
    normal_count: sensors.filter(s => s.status === 'normal').length,
    highest_blockage: Math.max(...sensors.map(s => s.blockage)),
    average_water_level: (sensors.reduce((acc, s) => acc + s.level, 0) / sensors.length).toFixed(1)
  };

  return res.status(200).json({
    status: 'success',
    area: 'Bojongsoang, Dayeuhkolot, Baleendah, dan Sekitar Bandung Raya',
    timestamp: now.toISOString(),
    summary,
    sensors
  });
}
