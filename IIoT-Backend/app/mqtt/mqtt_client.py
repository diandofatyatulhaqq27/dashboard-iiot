import os
import paho.mqtt.client as mqtt
from app.mqtt.message_handler import MessageHandler


class MQTTClient:
    def __init__(self):
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print("✅ Backend FastAPI Berhasil Terhubung ke Broker MQTT Docker!")
            # Subscribe ke semua topic data/* karena vendor & product bersifat dinamis
            # Format: data/{vendor}/{product}/{terminal_id}
            client.subscribe("data/#")
            client.subscribe("iiot/sensor/gas")
        else:
            print(f"❌ Gagal koneksi ke MQTT, error code: {rc}")

    def on_message(self, client, userdata, message):
        try:
            payload_str = message.payload.decode("utf-8")
            print(f"📩 Data Masuk via MQTT [{message.topic}]: {payload_str}")
            MessageHandler.handle(message.topic, payload_str)
        except Exception as e:
            print(f"⚠️ Gagal memproses data MQTT internal FastAPI: {e}")

    def connect_and_start(self):
        host = os.getenv("MQTT_HOST", "127.0.0.1")
        port = int(os.getenv("MQTT_PORT", 1883))
        self.client.connect(host, port, 60)
        self.client.loop_start()
        print(f"🚀 MQTT Worker aktif di background (Connecting to {host}:{port})...")

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()
        print("🛑 MQTT Worker dihentikan dengan aman")