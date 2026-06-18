from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.models import Gateway, TelemetryLog, Alarm  # 🌟 Hapus Device dari sini


class IngestionService:
    @staticmethod
    def process(db: Session, gateway: Gateway, data: dict):
        gateway_id = gateway.gateway_id

        # 1. Update heartbeat & status gateway
        gateway.last_ping = func.now()
        if gateway.status != "online":
            gateway.status = "online"
            print(f"✅ Gateway {gateway_id} ({gateway.hmi_code}) kembali ONLINE")

        # 2. Simpan payload mentah ke telemetry_logs
        new_log = TelemetryLog(
            gateway_id=gateway_id,
            payload=data
        )
        db.add(new_log)

        # 3. Iterasi data payload MQTT dari PLC/HMI
        for key, value in data.items():
            try:
                val = int(float(value))
            except (ValueError, TypeError):
                continue

            if val not in [0, 1]:
                continue

            # 🔍 HANYA CEK Alarm yang SUDAH DI-INPUT MANUAL oleh user berdasarkan mqtt_key
            alarm = db.query(Alarm).filter(
                Alarm.gateway_id == gateway_id,
                Alarm.mqtt_key == key
            ).first()

            # 🛑 JIKA ALARM TIDAK DITEMUKAN (artinya user belum input manual), SKIP / ABAIKAN!
            if not alarm:
                continue

            # 🔄 JIKA ALARM ADA (User sudah input manual), BARU UPDATE STATUSNYA
            if val == 1:
                alarm.status = "ACTIVE"
                alarm.created_at = func.now()  # Update waktu kejadian terakhir jika diperlukan
            elif val == 0:
                alarm.status = "RESOLVED"  # atau "OFF" sesuai dengan penamaan statusmu

        db.commit() 