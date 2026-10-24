# DRAINWATCH — Sistem Pemantauan Drainase Cerdas (Bojongsoang & Bandung Raya)

> **INOVASI SISTEM PEMANTAUAN DRAINASE CERDAS BERBASIS COMPUTER VISION, INTERNET OF THINGS (IoT) TELEMETRI REAL-TIME, DAN PEMODELAN PREDIKTIF UNTUK DETEKSI PENYUMBATAN SERTA MITIGASI RISIKO BANJIR LUAPAN SUNGAI CITARUM (BOJONGSOANG & BANDUNG RAYA)**

---

## 🌊 Ringkasan Proyek

**DrainWatch** adalah platform pemantauan drainase dan mitigasi banjir perkotaan generasi baru yang dirancang khusus untuk kawasan rawan genangan **Kecamatan Bojongsoang, Dayeuhkolot, Baleendah, serta wilayah Bandung Raya**. 

Sistem ini mengintegrasikan:
1. **Computer Vision (YOLOv8 & Image Processing)** dengan **akses kamera langsung** (Webcam Laptop & Kamera HP Depan/Belakang) untuk menganalisis penyumbatan sampah dan level air secara real-time.
2. **Data Cuaca Real-Time (Open-Meteo Meteorological API)** langsung dari stasiun meteorologi Bojongsoang (-6.9745, 107.6303).
3. **Telemetri IoT Sensor Jaringan Citarum Hilir** (15 node sensor aktif di Bojongsoang, Cieunteung, Andir, Gedebage, Sukabirus Telkom University).
4. **Deployable Ready on Vercel** dengan arsitektur Serverless Functions (`/api/*`) dan static frontend ultra-cepat.

---

## ✨ Fitur Unggulan

### 1. 👁️ Computer Vision & Akses Kamera Langsung (WebRTC)
* **Akses Kamera Perangkat (Webcam & Kamera HP)**:
  * Menggunakan API `navigator.mediaDevices.getUserMedia` dengan dukungan resolusi tinggi.
  * **Switcher Kamera Depan / Belakang**: Pengawas dapat beralih antara Kamera Depan (*User/Operator*) dan Kamera Belakang (*Arah Saluran Air / Drainase*).
* **Multi-Mode Computer Vision Visualizer**:
  * 🎯 **YOLO AI**: Bounding box dinamis 30 FPS untuk mendeteksi Sampah Plastik, Ranting Debris, Lapisan Sedimen Lumpur, dan Penyumbatan Parah.
  * ⚡ **Sobel Edge Detection**: Algoritma ekstraksi kontur gradien untuk memetakan tepian struktur fisik gorong-gorong dan permukaan air.
  * 🔥 **Heatmap Termal Debris**: False-color radial gradient density map untuk mengidentifikasi konsentrasi titik sumbatan tertinggi.
  * 📏 **Waterline Grid Ruler**: Penggaris digital otomatis (*waterline gauge*) dengan estimasi ketinggian permukaan air (cm) dan batas aman (<50cm), waspada (50-80cm), bahaya (>80cm).
* **Interactivity & Realtime Tracking**: Frame differencing berkecepatan tinggi yang dapat mendeteksi pergerakan objek nyata di depan kamera secara interaktif.
* **Snapshot AI Eksportir**: Ambil tangkapan layar hasil analisis Computer Vision lengkap dengan watermark koordinat Bojongsoang dan timestamp resmi.

### 2. 🌦️ Integrasi Data Cuaca Real-Time (Bojongsoang & Bandung)
* **Bukan Data Dummy**: Mengambil data meteorologi terkini langsung dari Open-Meteo API untuk koordinat presisi Bojongsoang:
  * Curah Hujan Realtime ($mm/jam$)
  * Suhu Udara (°C) & Kelembapan Relatif (%)
  * Tekanan Udara Permukaan ($hPa$) & Kecepatan Angin
* **Sinkronisasi Otomatis**: Memperbarui status risiko drainase dan kurva proyeksi hidrologi saat hujan deras terdeteksi di Bojongsoang.

### 3. 📡 Telemetri Sensor Lapangan Citarum & Bandung Raya
* **15 Node Sensor Aktif**:
  * Jembatan Citarum Bojongsoang KM 2.5 (`S-01`)
  * Drainase Sukabirus - Telkom University (`S-02`)
  * Polder Retensi Cieunteung Baleendah (`S-03`)
  * Pintu Air Dayeuhkolot / Cikapundung Kolot (`S-04`)
  * Saluran Drainase Ciganitri Bojongsoang (`S-05`)
  * Kolam Retensi Gedebage Bandung (`S-06`)
  * Pintu Air Kolam Retensi Andir Baleendah (`S-07`)
  * Saluran Primer Ciwastra Buahbatu (`S-08`)
  * Irigasi Sapan Tegalluar Bojongsoang (`S-09`)
  * Bunderan Bojongsoang - Podomoro Park (`S-10`)
  * Jembatan Cipurut Dayeuhkolot (`S-11`)
  * Sungai Citepus Pasirluyu Buahbatu (`S-12`)
  * Saluran Pembuang Cijagra Bojongsoang (`S-13`)
  * Tanggul Citarum Cisirung Dayeuhkolot (`S-14`)
  * Saluran Buangan Kopo - Citarum Hilir (`S-15`)

### 4. 🗺️ Peta Geospasial GIS Citarum & Bandung
* Jalur Sungai Citarum, Danau Cieunteung, Kolam Retensi Andir, dan saluran drainase utama Bojongsoang.
* Kontak Darurat Cepat Terintegrasi:
  * BPBD Kabupaten Bandung: `(022) 8587-2525`
  * Balai Besar Wilayah Sungai (BBWS) Citarum: `(022) 7562-040`
  * Posko Siaga Bencana Bojongsoang: `(022) 8587-1111`

---

## ⚡ Deployment ke Vercel

Proyek ini telah dikonfigurasi penuh agar dapat di-deploy ke **Vercel** hanya dalam 1 klik dengan dukungan **Vercel Serverless Functions** (`/api/*`).

### Cara 1: Menggunakan Vercel CLI (Cepat)
```bash
# Pastikan Vercel CLI terpasang
npm install -g vercel

# Masuk ke direktori DrainWatch
cd c:\Users\ros\DrainWatch

# Jalankan deploy
vercel --prod
```

### Cara 2: Import via GitHub ke Vercel Dashboard
1. Push repositori ini ke GitHub / GitLab:
   ```bash
   git add .
   git commit -m "feat: real-time Bojongsoang telemetry, camera computer vision & vercel deployment"
   git push origin main
   ```
2. Buka dashboard [Vercel](https://vercel.com).
3. Klik **"Add New Project"** dan impor repositori DrainWatch.
4. Framework Preset: Pilih **"Other"**.
5. Klik **"Deploy"**. Vercel akan otomatis mengenali `vercel.json` dan folder `api/`.

### Fitur Vercel Serverless yang Disediakan:
* **`/api/weather`**: Mengambil telemetri cuaca live Bojongsoang dari Open-Meteo dengan caching HTTP header 120 detik.
* **`/api/sensors`**: Mengirimkan data telemetri real-time 15 sensor drainase Bojongsoang & Bandung.
* **`/api/health`**: Pemeriksaan status ketersediaan sistem serverless.
* **Keamanan & Izin Kamera**: `vercel.json` telah menyertakan header `Permissions-Policy: camera=*, microphone=*` serta sertifikat SSL HTTPS otomatis demi kelancaran akses webcam di mobile/desktop.

---

## 💻 Menjalankan di Lokal (Local Development)

```bash
# Masuk ke direktori
cd DrainWatch

# Menjalankan server lokal via Node.js
npx serve .

# Atau menggunakan Python 3
python -m http.server 3000
```
Buka browser di **`http://localhost:3000`** atau port yang ditampilkan.

---

## 📁 Struktur Berkas

```text
DrainWatch/
├── api/                    # Vercel Serverless Functions
│   ├── weather.js          # Live Open-Meteo weather endpoint (Bojongsoang)
│   ├── sensors.js          # Live IoT telemetry endpoint
│   └── health.js           # Service healthcheck
├── css/
│   └── style.css           # Styling Dark Futuristic Glassmorphism & HUD
├── js/
│   └── main.js             # Real-time Computer Vision engine & telemetry logic
├── index.html              # Dashboard utama DrainWatch Bojongsoang
├── vercel.json             # Konfigurasi routing, headers, dan serverless Vercel
├── package.json            # Manifest proyek & script runner
└── README.md               # Dokumentasi lengkap
```

---

<p align="center">
  <b>DrainWatch AI</b> — Menjaga Kawasan Bojongsoang &amp; Bandung Raya Bebas Genangan Banjir.
</p>
