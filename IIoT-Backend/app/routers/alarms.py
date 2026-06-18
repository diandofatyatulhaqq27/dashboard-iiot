from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql import func  # 🌟 SEKARANG SUDAH DI-IMPORT AGAR TIDAK ERROR "func is not defined"
from app.database import get_db
from app.models import Alarm

router = APIRouter(prefix="/api/alarms", tags=["Alarms"])

# 1. Skema data yang dikirim dari Frontend Next.js
class AlarmCreateSchema(BaseModel):
    gateway_id: int
    mqtt_key: str
    message: str

# 2. Endpoint POST (Hanya mendaftarkan konfigurasi Master Alarm baru) 🌟
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_or_update_alarm(payload: AlarmCreateSchema, db: Session = Depends(get_db)):
    try:
        # Cek apakah kombinasi gateway_id + mqtt_key sudah pernah didaftarkan
        existing_alarm = db.query(Alarm).filter(
            Alarm.gateway_id == payload.gateway_id,
            Alarm.mqtt_key == payload.mqtt_key
        ).first()

        if existing_alarm:
            # 🔄 JIKA SUDAH ADA: Update deskripsi pesan saja, jangan sentuh status MQTT-nya
            existing_alarm.message = payload.message.strip()
            db.commit()
            db.refresh(existing_alarm)
            return {"status": "success", "message": "Konfigurasi deskripsi alarm berhasil diperbarui", "data": existing_alarm}
        
        else:
            # 🆕 JIKA BELUM ADA: Buat master alarm baru dengan kondisi awal mati / aman (RESOLVED / 0)
            new_alarm = Alarm(
                gateway_id=payload.gateway_id,
                mqtt_key=payload.mqtt_key.strip(),
                message=payload.message.strip(),
                severity="NORMAL",
                status="RESOLVED"  # 🌟 Awal buat diset RESOLVED/OFF agar status di UI menunggu trigger MQTT nyata
            )
            db.add(new_alarm)
            db.commit()
            db.refresh(new_alarm)
            return {"status": "success", "message": "Master konfigurasi alarm berhasil didaftarkan", "data": new_alarm}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Gagal memproses data alarm ke database: {str(e)}"
        )

# 3. Endpoint GET untuk menarik data konfigurasi ke tabel UI Next.js 📊
@router.get("/recent")
def get_recent_alarms(limit: int = 50, db: Session = Depends(get_db)):
    try:
        # Menampilkan seluruh master alarm yang di-input manual oleh user
        recent_alarms = db.query(Alarm)\
            .order_by(Alarm.created_at.desc())\
            .limit(limit)\
            .all()
            
        return {"status": "success", "data": recent_alarms}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Gagal memuat log alarm dari database: {str(e)}"
        )

@router.delete("/{alarm_id}")
def delete_master_alarm(alarm_id: int, db: Session = Depends(get_db)):
    try:
        db_alarm = db.query(Alarm).filter(Alarm.id == alarm_id).first()
        if not db_alarm:
            raise HTTPException(status_code=404, detail="Master alarm tidak ditemukan.")
            
        db.delete(db_alarm)
        db.commit()
        return {"status": "success", "message": "Master konfigurasi alarm berhasil dihapus."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))