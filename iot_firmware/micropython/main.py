# ==============================================================================
# DRAINWATCH — ESP32 MicroPython Sensor Node
# Hardware: ESP32 + HC-SR04 Sensor
# Library: umqtt.simple
# ==============================================================================

import time
import ujson
import machine
import network
from umqtt.simple import MQTTClient

# Konfigurasi Pin
PIN_TRIG = machine.Pin(5, machine.Pin.OUT)
PIN_ECHO = machine.Pin(18, machine.Pin.IN)
PIN_RELAY = machine.Pin(23, machine.Pin.OUT)
PIN_RELAY.value(1) # Matikan pompa (Relay Active-Low)

# Konfigurasi Saluran
TOTAL_DEPTH_CM = 120.0
SENSOR_ID = "S-01"
MQTT_BROKER = "192.168.1.100"
TOPIC_TELEMETRY = b"drainwatch/sensor/S-01/telemetry"
TOPIC_COMMAND = b"drainwatch/sensor/S-01/pump"

def connect_wifi(ssid, password):
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Menghubungkan ke Wi-Fi...")
        wlan.connect(ssid, password)
        while not wlan.isconnected():
            time.sleep(0.5)
    print("Wi-Fi Terhubung:", wlan.ifconfig()[0])

def read_distance_cm():
    PIN_TRIG.value(0)
    time.sleep_us(2)
    PIN_TRIG.value(1)
    time.sleep_us(10)
    PIN_TRIG.value(0)

    # Ukur durasi sinyal balik ECHO
    duration = machine.time_pulse_us(PIN_ECHO, 1, 30000)
    if duration <= 0:
        return TOTAL_DEPTH_CM
    # Jarak dalam cm
    return (duration * 0.0343) / 2

def on_mqtt_msg(topic, msg):
    print("Command diterima:", topic, msg)
    try:
        data = ujson.loads(msg)
        if data.get("state") == "ON":
            PIN_RELAY.value(0) # Nyalakan pompa
        elif data.get("state") == "OFF":
            PIN_RELAY.value(1) # Matikan pompa
    except:
        pass

def main():
    connect_wifi("DRAINWATCH_AP", "drainwatch2026")
    client = MQTTClient("ESP32_" + SENSOR_ID, MQTT_BROKER)
    client.set_callback(on_mqtt_msg)
    client.connect()
    client.subscribe(TOPIC_COMMAND)
    print("MQTT Connected & Subscribed to:", TOPIC_COMMAND)

    while True:
        try:
            client.check_msg()
            
            # Pengukuran
            dist = read_distance_cm()
            water_level = max(0.0, min(TOTAL_DEPTH_CM, TOTAL_DEPTH_CM - dist))
            status = "critical" if water_level >= 80 else ("warning" if water_level >= 50 else "normal")

            payload = ujson.dumps({
                "sensor_id": SENSOR_ID,
                "water_level_cm": round(water_level, 1),
                "distance_cm": round(dist, 1),
                "status": status,
                "timestamp": time.time()
            })

            client.publish(TOPIC_TELEMETRY, payload)
            print("TX:", payload)
            time.sleep(2)
        except Exception as e:
            print("Error:", e)
            time.sleep(5)

if __name__ == "__main__":
    main()
