import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models import User, PasswordReset 
from typing import List, Optional, Literal # 🌟 SUNTIKKAN: Literal untuk mengunci opsi role
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/api/users", tags=["Users Management"])

# ========================================================
# PYDANTIC SCHEMAS: Validasi Data
# ========================================================
class UserResponseSchema(BaseModel):
    id: int
    name: str  
    email: EmailStr
    role: str
    company_id: int
    is_approved: bool

    class Config:
        from_attributes = True

class UserUpdateSchema(BaseModel):
    name: str
    # 🌟 LOCK ROLE: Hanya izinkan 4 kasta role ini masuk ke database
    role: Literal["admin", "rasindo_operator", "rasindo_user", "client_operator", "client_user"]
    company_id: int
    is_approved: bool

class UserSubmitNewPasswordSchema(BaseModel):
    token: str
    new_password: str

# ========================================================
# 1. ENDPOINT GET (Sinkronisasi Tabel Master)
# ========================================================
@router.get("/")
def get_users(company_id: Optional[int] = None, db: Session = Depends(get_db)):
    try:
        if company_id:
            users_db = db.query(User).filter(User.company_id == company_id).all()
        else:
            users_db = db.query(User).all()
        
        formatted_users = []
        for u in users_db:
            formatted_users.append({
                "id": u.id,
                "name": u.name if hasattr(u, 'name') else getattr(u, 'username', 'Unknown'),
                "email": u.email,
                "role": u.role,
                "company_id": u.company_id,
                "is_approved": u.is_approved
            })

        return {
            "status": "success",
            "data": formatted_users
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eror DB: {str(e)}")

# ========================================================
# 2. ENDPOINT PUT (Update Profil & Status Approval)
# ========================================================
@router.put("/{user_id}")
def update_user(user_id: int, payload: UserUpdateSchema, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan!")
    
    try:
        if hasattr(db_user, 'name'):
            db_user.name = payload.name
        elif hasattr(db_user, 'username'):
            db_user.username = payload.name
            
        db_user.role = payload.role
        db_user.company_id = payload.company_id
        db_user.is_approved = payload.is_approved
        
        db.commit()
        return {"status": "success", "message": "Berhasil diperbarui!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ========================================================
# 3. ENDPOINT POST (ADMIN): Generate Token & Link Pemulihan
# ========================================================
@router.post("/generate-reset-token/{user_id}")
def generate_reset_token(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Operator tidak ditemukan di database")

    secure_token = str(uuid.uuid4())
    expiration_time = datetime.now(timezone.utc) + timedelta(minutes=15)

    new_reset = PasswordReset(
        email=user.email,
        token=secure_token,
        expires_at=expiration_time,
        is_used=False
    )
    
    try:
        db.add(new_reset)
        db.commit()
        
        target_link = f"http://localhost:3000/reset-password?token={secure_token}"
        return {"status": "success", "reset_link": target_link}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal generate token log: {str(e)}")

# ========================================================
# 4. ENDPOINT POST (USER): Validasi Token & Eksekusi Password Baru
# ========================================================
@router.post("/execute-reset-password")
def execute_reset_password(payload: UserSubmitNewPasswordSchema, db: Session = Depends(get_db)):
    reset_record = db.query(PasswordReset).filter(
        PasswordReset.token == payload.token,
        PasswordReset.is_used == False
    ).first()

    if not reset_record:
        raise HTTPException(status_code=400, detail="Tautan tidak sah atau sudah kedaluwarsa!")

    now = datetime.now(timezone.utc)
    if reset_record.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=400, detail="Durasi link 15 menit sudah habis! Minta link baru ke Admin.")

    user = db.query(User).filter(User.email == reset_record.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Akun terikat token ini sudah dihapus.")

    try:
        user.password = pwd_context.hash(payload.new_password)
        reset_record.is_used = True
        
        db.commit()
        return {"status": "success", "message": "Password baru berhasil dipasang! Silakan login kembali."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal mutasi database: {str(e)}")