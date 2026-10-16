import asyncio
import json
import logging
from typing import Optional, Callable
import paho.mqtt.client as mqtt

logger = logging.getLogger("DrainWatch.MQTT")

class MQTTManager:
    def __init__(
        self,
        broker_host: str = "localhost",
        broker_port: int = 1883,
        username: Optional[str] = None,
        password: Optional[str] = None,
        on_message_callback: Optional[Callable] = None,
    ):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.username = username
        self.password = password
        self.on_message_callback = on_message_callback
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        
        # Paho MQTT 2.0+ Callback API Version
        try:
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="DrainWatch_Backend_Core")
        except AttributeError:
            self.client = mqtt.Client(client_id="DrainWatch_Backend_Core")

        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            logger.info(f"Berhasil terhubung ke MQTT Broker: {self.broker_host}:{self.broker_port}")
            # Subscribe ke seluruh telemetri sensor node
            client.subscribe("drainwatch/sensor/+/telemetry", qos=1)
            client.subscribe("drainwatch/sensor/+/alert", qos=1)
            logger.info("Berlangganan (Subscribed) ke topik: drainwatch/sensor/+/telemetry")
        else:
            logger.error(f"Gagal koneksi ke MQTT broker, return code: {rc}")

    def _on_disconnect(self, client, userdata, flags, rc=None, properties=None):
        logger.warning(f"Koneksi MQTT terputus. Return code: {rc}. Mencoba menyambung kembali...")

    def _on_message(self, client, userdata, msg):
        try:
            payload_str = msg.payload.decode("utf-8")
            topic = msg.topic
            data = json.loads(payload_str)
            logger.debug(f"Pesan MQTT diterima di [{topic}]: {data}")

            # Teruskan ke asyncio event loop agar di-handle async oleh WebSocket Manager
            if self.loop and self.on_message_callback and self.loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    self.on_message_callback(topic, data),
                    self.loop
                )
        except Exception as e:
            logger.error(f"Error memproses pesan MQTT: {e}")

    def start(self, loop: asyncio.AbstractEventLoop):
        """Memulai loop MQTT pada background thread yang terintegrasi dengan asyncio"""
        self.loop = loop
        try:
            self.client.connect_async(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
            logger.info("MQTT Client Background Loop dimulai.")
        except Exception as e:
            logger.warning(f"Peringatan: Gagal menyambung ke MQTT Broker ({self.broker_host}:{self.broker_port}): {e}")
            logger.warning("Pastikan Mosquitto MQTT broker aktif. Backend tetap berjalan untuk WebSocket & REST API.")

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("MQTT Client Background Loop dihentikan.")

    def publish_command(self, topic: str, payload: dict):
        """Publish kontrol (misal: aktifkan pompa drainase)"""
        try:
            self.client.publish(topic, json.dumps(payload), qos=1)
            logger.info(f"Perintah dikirim ke MQTT [{topic}]: {payload}")
        except Exception as e:
            logger.error(f"Gagal publish command ke MQTT: {e}")
