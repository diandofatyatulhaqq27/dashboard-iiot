from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Company
from passlib.context import CryptContext
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    invitation_code: str = Field(..., alias="invitationCode") 

    class Config:
        populate_by_name = True 

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

# ========================================================
# 🌟 LOGIKA UTAMA DEPENDENCY: get_current_user (Fixed Multi-Channel Authentication)
# ========================================================
def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Fungsi ini mengamankan endpoint dengan membaca identitas user.
    Mendukung pengecekan via Header 'X-User-Id' ataupun Bearer Token.
    """
    target_id = None

    # 1. Cek jika Next.js mengirimkan identitas langsung via X-User-Id header
    if x_user_id:
        target_id = x_user_id
    
    # 2. Cek jika Next.js mengirimkan data via Authorization Header (Bearer <id>)
    elif authorization and authorization.startswith("Bearer "):
        token_value = authorization.split(" ")[1]
        # Jika token murni berisi string ID user (karena belum implementasi JWT penuh)
        if token_value.isdigit():
            target_id = token_value

    # Jika semua jalur kosong, kunci akses ditolak mentah-mentah
    if not target_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Sesi login tidak terdeteksi. Silakan login kembali."
        )
    
    try:
        user = db.query(User).filter(User.id == int(target_id)).first()
    except ValueError:
        raise HTTPException(status_code=401, detail="Format token/identitas sesi tidak valid.")

    if not user:
        raise HTTPException(status_code=401, detail="Sesi user tidak terdaftar atau tidak valid.")
        
    # Mengembalikan dict data identitas lengkap user untuk dibaca oleh router lain (seperti projects.py)
    return {
        "id": user.id,
        "name": user.name,
        "role": user.role,       # admin, rasindo_operator, rasindo_user, atau client_user
        "company_id": user.company_id
    }

# ========================================================
# 1. ENDPOINT REGISTER (FIXED DEFAULT ROLE)
# ========================================================
@router.post("/register")
def register(user: RegisterSchema, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.invitation_code.ilike(user.invitation_code)).first()
    if not company:
        raise HTTPException(status_code=400, detail="Invitation Code tidak valid!")
        
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar di sistem!")

    hashed_password = pwd_context.hash(user.password)

    db_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password, 
        role="client_user", # 🌟 FIX: Ubah default kasta dari 'user' menjadi 'client_user'
        company_id=company.id,
        is_approved=False
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return {"status": "success", "message": "User berhasil didaftarkan! Tunggu persetujuan Admin."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan user: {str(e)}")

# ========================================================
# 2. ENDPOINT LOGIN
# ========================================================
@router.post("/login")
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Email atau Password salah.")
    
    if not pwd_context.verify(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Email atau Password salah.")
        
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Akun Anda belum aktif. Silakan hubungi Admin.")
        
    return {
        "status": "success",
        "access_token": str(user.id),  # ← tambahkan ini
        "user": {
            "id": user.id,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id
        }
    }