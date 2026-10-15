# DRAINWATCH — Sistem Pemantauan Drainase Cerdas

> **INOVASI SISTEM PEMANTAUAN DRAINASE CERDAS BERBASIS COMPUTER VISION, INTERNET OF THINGS (IoT), DAN PEMODELAN PREDIKTIF UNTUK DETEKSI PENYUMBATAN SERTA MITIGASI RISIKO GENANGAN DALAM MENDUKUNG KETAHANAN INFRASTRUKTUR PERKOTAAN BERKELANJUTAN**

---

## 🌊 Ringkasan Proyek

**DrainWatch** adalah platform pemantauan drainase perkotaan generasi baru yang mengintegrasikan teknologi **Computer Vision (YOLOv8)**, jaringan telemetri sensor **Internet of Things (IoT)**, dan **Pemodelan Prediktif (LSTM & Machine Learning)** ke dalam satu dashboard interaktif dan real-time.

Sistem ini dirancang untuk mendeteksi penumpukan sampah/sedimen secara dini, memprediksi potensi luapan genangan hingga 72 jam ke depan, serta memicu respons mitigasi otomatis (seperti pompa drainase pintar dan notifikasi reaksi cepat) demi menjaga ketahanan infrastruktur kota pintar (*Smart City Resilience*).

---

## ✨ Fitur Utama

### 1. 👁️ Deteksi Visual Cerdas Berbasis YOLOv8
* **Inferensi Real-Time 30 FPS**: Pemantauan langsung kondisi fisik gorong-gorong dan pintu air dengan canvas rendering fluida.
* **Deteksi Multi-Kelas**:
  * 🔴 Penyumbatan Parah (*Severe Blockage*)
  * 🟣 Sampah Plastik (*Plastic Waste*)
  * 🟢 Debris Organik (*Organic Debris & Branches*)
  * 🟡 Sedimentasi Lumpur (*Silt & Sediment Layer*)
* **Dukungan Kamera Fleksibel**:
  * Multi-channel CCTV switcher: Jl. Sudirman KM.2, Jl. MH Thamrin, Jl. Gatot Subroto, dan Jl. Kuningan Raya.
  * **Integrasi Webcam Lokal**: Menggunakan webcam perangkat secara langsung untuk demonstrasi inferensi AI.
  * **Upload Media**: Pengujian inferensi deteksi pada foto/video eksternal.
  * Slider ambang batas kepercayaan (*Confidence Threshold*) dan filter kelas deteksi.

### 2. 📡 Jaringan Telemetri Sensor IoT
* **6 Parameter Real-Time**:
  * Level Air Ultrasonik (cm)
  * Debit Aliran Air ($m^3$/jam)
  * Suhu Air (°C)
  * Derajat Keasaman (pH)
  * Turbiditas Air (NTU)
  * Curah Hujan BMKG (mm/jam)
* **Topologi Jaringan Sensor**: Visualisasi interaktif node sensor (*S-01* hingga *S-15*) dengan protokol komunikasi LoRaWAN & MQTT.

### 3. 📈 Streaming Time-Series & SCADA Charts
* **Level Air Real-Time**: Grafik garis kontinyu (*rolling window*) untuk Zona A, Zona B, dan Zona C dengan batas bahaya 90 cm.
* **Donut Chart Status Jaringan**: Rekapitulasi dinamis rasio sensor berstatus Normal, Waspada, dan Kritis.
* **Debit Aliran**: Diagram batang animated per sensor.
* **Prediksi Genangan 72 Jam**: Horizon prediksi temporal dinamis (24 jam, 48 jam, 72 jam).

### 4. 🎛️ Simulation Control & Skenario Lapangan
* **Pengatur Kecepatan**: Jeda (Pause), 1x Normal, 2x Cepat, dan 5x Turbo.
* **Pemicu Skenario Bencana**:
  * 🌧️ **Simulasi Badai Hujan Tropis**: Curah hujan melonjak ke 85 mm/jam, memicu peringatan darurat dan naiknya kurva prediksi air.
  * 🚜 **Simulasi Pembersihan Sedimen**: Mengeruk 85% sumbatan sampah dan memulihkan kapasitas saluran air.
  * 🚰 **Pompa Otomatis (Auto-Pump)**: Mengaktifkan pompa pembuang air berkapasitas tinggi.
* **Audio Synthesizer (Web Audio API)**: Sirine darurat, radar beep, dan nada konfirmasi tanpa file audio eksternal.

### 5. 🗺️ Peta Risiko Spasial GIS & Log Audit
* **Peta Spasial Kota**: Visualisasi zona risiko banjir Jakarta Pusat/Selatan dengan marker sensor interaktif.
* **Modal Inspeksi Spasial**: Klik marker sensor untuk melihat telemetri terperinci dan pintasan langsung ke feed CCTV.
* **Terminal Log Audit Real-Time**: Catatan aktivitas digital yang mencatat setiap event inferensi YOLO, paket LoRaWAN, dan status pompa.

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi |
|---|---|
| **Frontend Core** | HTML5 Semantic, Vanilla JavaScript (ES6+), Modern CSS3 |
| **Desain & UI** | Dark Futuristic Glassmorphism, Google Fonts (*Outfit*, *JetBrains Mono*, *Inter*) |
| **Computer Vision Engine** | Arsitektur YOLOv8n-DrainNet (Canvas 2D Real-time Tracking, WebRTC Webcam API) |
| **Audio Alert** | Web Audio API Oscillator & Synthesizer |
| **Grafik & Data** | Pure HTML5 Canvas 2D Data Visualizer (Zero external dependencies) |
| **Protokol IoT Disimulasikan** | LoRaWAN / MQTT Packet Stream |

---

## 🚀 Cara Menjalankan di Lokal

Aplikasi ini bersifat **zero-dependency** (tidak membutuhkan instalasi paket `npm` atau framework berat), sehingga sangat ringan dan cepat dijalankan.

### Menggunakan Python (Direkomendasikan)
```bash
# Masuk ke direktori proyek
cd DrainWatch

# Jalankan server lokal
python -m http.server 8000
```
Buka browser di: **`http://localhost:8000`**

### Atau Menggunakan Node.js
```bash
npx serve .
```

---

## 📁 Struktur Direktori
```text
DrainWatch/
├── css/
│   └── style.css       # Tema dark futuristic, glassmorphism, HUD, responsive layout
├── js/
│   └── main.js         # Mesin simulasi real-time, YOLO tracking canvas, audio engine, IoT gauges
├── index.html          # Halaman antarmuka terpadu (SPA 7 section)
├── .gitignore          # File pengecualian git
└── README.md           # Dokumentasi resmi proyek
```

---

## 👥 Pengembang & Hak Cipta
* **Proyek**: DrainWatch Urban Resilience Platform
* **Lisensi**: MIT License
* © 2026 DrainWatch — Inovasi Infrastruktur Perkotaan Berkelanjutan
