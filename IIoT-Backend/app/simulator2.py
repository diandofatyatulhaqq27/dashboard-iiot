import paho.mqtt.client as mqtt
import json
import time
import random

client = mqtt.Client()
client.connect("localhost", 1883)

print("Memulai simulasi sensor KD-12B...")

try:
    while True:
        data = {
            "sensor_id": 2, # HARUS SESUAI dengan ID di tabel sensors
            "device": "KD-12B_Unit_02",
            "value": round(random.uniform(0, 20.5), 2),
            "unit": "LEL"
        }
        
        client.publish("iiot/sensor/gas", json.dumps(data))
        print(f"Mengirim data ke database via MQTT: {data}")
        
        time.sleep(5) 
except KeyboardInterrupt:
    print("Simulasi dihentikan.")