/* ==============================================================================
   DRAINWATCH — ESP32 IOT SENSOR NODE FIRMWARE
   Hardware: ESP32 DevKit V1 + HC-SR04 Ultrasonic Sensor + Relay (Pump Actuator)
   Protocol: MQTT over Wi-Fi
   ============================================================================== */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ----------------- KONFIGURASI JARINGAN & MQTT -----------------
const char* WIFI_SSID       = "DRAINWATCH_AP";
const char* WIFI_PASSWORD   = "drainwatch2026";

const char* MQTT_BROKER     = "192.168.1.100"; // IP Server / Broker Mosquitto
const int   MQTT_PORT       = 1883;
const char* MQTT_USER       = "";              // Kosongkan jika tanpa auth
const char* MQTT_PASS       = "";

// Identitas Node Sensor
const char* SENSOR_ID       = "S-01";
const char* SENSOR_LOCATION = "Jl. Sudirman KM.2";

// Topik MQTT
String TOPIC_TELEMETRY      = String("drainwatch/sensor/") + SENSOR_ID + "/telemetry";
String TOPIC_COMMAND        = String("drainwatch/sensor/") + SENSOR_ID + "/pump";
String TOPIC_ALERT          = String("drainwatch/sensor/") + SENSOR_ID + "/alert";

// ----------------- KONFIGURASI PIN HARDWARE -------------------
#define PIN_TRIG            5    // Pin Trigger HC-SR04
#define PIN_ECHO            18   // Pin Echo HC-SR04
#define PIN_RELAY_PUMP      23   // Pin Relay untuk Pompa Air (Active LOW)
#define PIN_STATUS_LED      2    // On-board LED

// Parameter Fisik Saluran Drainase (dalam Centimeter)
const float TOTAL_DRAIN_DEPTH_CM = 120.0; // Kedalaman total gorong-gorong dari sensor ke dasar
const float WARNING_LEVEL_CM     = 50.0;  // Ambang batas waspada
const float CRITICAL_LEVEL_CM    = 80.0;  // Ambang batas bahaya / banjir

// Interval Pengiriman Data (milidetik)
const unsigned long TELEMETRY_INTERVAL_MS = 2000;
unsigned long lastTelemetryTime = 0;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ----------------- FUNGSI BACA ULTRASONIK DENGAN FILTER MEDIAN -----------------
float readUltrasonicDistance() {
  const int SAMPLES = 5;
  float readings[SAMPLES];

  for (int i = 0; i < SAMPLES; i++) {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    // Timeout 30000 microdetik (~5 meter)
    long duration = pulseIn(PIN_ECHO, HIGH, 30000);
    if (duration == 0) {
      readings[i] = TOTAL_DRAIN_DEPTH_CM; // Jika timeout, asumsikan dasar saluran
    } else {
      // Kecepatan suara: 343 m/s = 0.0343 cm/microdetik. Jarak = (duration * 0.0343) / 2
      readings[i] = (duration * 0.0343) / 2.0;
    }
    delay(20);
  }

  // Pengurutan Bubble Sort sederhana untuk mengambil Nilai Median (menolak noise pantulan air)
  for (int i = 0; i < SAMPLES - 1; i++) {
    for (int j = 0; j < SAMPLES - i - 1; j++) {
      if (readings[j] > readings[j + 1]) {
        float temp = readings[j];
        readings[j] = readings[j + 1];
        readings[j + 1] = temp;
      }
    }
  }

  return readings[SAMPLES / 2]; // Ambil nilai tengah (median)
}

// ----------------- CALLBACK MQTT UNTUK PERINTAH POMPA -----------------
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("[MQTT CMD] Topik: ");
  Serial.print(topic);
  Serial.print(" | Pesan: ");
  Serial.println(message);

  // Parse JSON Command: {"state": "ON"} atau {"state": "OFF"}
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (!error) {
    const char* state = doc["state"];
    if (strcmp(state, "ON") == 0) {
      digitalWrite(PIN_RELAY_PUMP, LOW); // Relay Active LOW: Pompa Menyala
      Serial.println("🚨 Pompa Drainase diaktifkan!");
    } else if (strcmp(state, "OFF") == 0) {
      digitalWrite(PIN_RELAY_PUMP, HIGH); // Pompa Mati
      Serial.println("Pompa Drainase dimatikan.");
    }
  }
}

// ----------------- KONEKSI WI-FI & MQTT DENGAN AUTO-RECONNECT -----------------
void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Menyambung ke Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Terhubung! IP ESP32: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nGagal koneksi Wi-Fi. Berjalan mode offline sementara.");
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Menghubungkan ke MQTT Broker...");
    String clientId = "ESP32_DrainWatch_" + String(SENSOR_ID);
    
    bool connected = false;
    if (strlen(MQTT_USER) > 0) {
      connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    } else {
      connected = mqttClient.connect(clientId.c_str());
    }

    if (connected) {
      Serial.println(" Terhubung!");
      // Subscribe ke topik kontrol pompa
      mqttClient.subscribe(TOPIC_COMMAND.c_str());
      Serial.println("Subscribed ke: " + TOPIC_COMMAND);
      digitalWrite(PIN_STATUS_LED, HIGH);
    } else {
      Serial.print(" Gagal, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" Coba lagi dalam 4 detik...");
      digitalWrite(PIN_STATUS_LED, LOW);
      delay(4000);
    }
  }
}

// ----------------- SETUP UTAMA -----------------
void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);

  // Default pompa OFF (Active LOW relay -> set HIGH)
  digitalWrite(PIN_RELAY_PUMP, HIGH);
  digitalWrite(PIN_STATUS_LED, LOW);

  setupWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
}

// ----------------- LOOP UTAMA -----------------
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
  }

  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Pengiriman Telemetri Berkala
  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;

    // 1. Baca Jarak Sensor ke Muka Air
    float distanceCm = readUltrasonicDistance();

    // 2. Hitung Tinggi Air = Kedalaman Total - Jarak Sensor
    float waterLevelCm = TOTAL_DRAIN_DEPTH_CM - distanceCm;
    if (waterLevelCm < 0) waterLevelCm = 0.0;
    if (waterLevelCm > TOTAL_DRAIN_DEPTH_CM) waterLevelCm = TOTAL_DRAIN_DEPTH_CM;

    // 3. Tentukan Status
    String status = "normal";
    if (waterLevelCm >= CRITICAL_LEVEL_CM) {
      status = "critical";
    } else if (waterLevelCm >= WARNING_LEVEL_CM) {
      status = "warning";
    }

    // 4. Susun Payload JSON
    StaticJsonDocument<300> doc;
    doc["sensor_id"]       = SENSOR_ID;
    doc["location"]        = SENSOR_LOCATION;
    doc["distance_cm"]     = round(distanceCm * 10) / 10.0;
    doc["water_level_cm"]  = round(waterLevelCm * 10) / 10.0;
    doc["max_capacity_cm"] = TOTAL_DRAIN_DEPTH_CM;
    doc["flow_rate_m3h"]   = round((2.0 + (waterLevelCm / 20.0)) * 10) / 10.0; // Simulasi kalkulasi debit
    doc["temperature_c"]   = 28.2;
    doc["ph"]              = 7.1;
    doc["turbidity_ntu"]   = (status == "critical") ? 140 : 45;
    doc["status"]          = status;
    doc["uptime_sec"]      = millis() / 1000;

    char jsonBuffer[384];
    serializeJson(doc, jsonBuffer);

    // 5. Publish ke Broker MQTT
    if (mqttClient.publish(TOPIC_TELEMETRY.c_str(), jsonBuffer)) {
      Serial.print("[MQTT TX] ");
      Serial.println(jsonBuffer);
    } else {
      Serial.println("[MQTT TX ERROR] Gagal mengirim paket telemetri.");
    }
  }
}
