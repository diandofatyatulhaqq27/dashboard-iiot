from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
# 🔒 Memasukkan model Project untuk kebutuhan query JOIN pengaman data
from app.models import Gateway, Project 
from app.routers.auth import get_current_user
from typing import Optional, List, Any

router = APIRouter(prefix="/api/gateways", tags=["Gateways"])

class GatewaySchema(BaseModel):
    gateway_id: Optional[int] = None  # auto-increment, tidak perlu dikirim saat create
    hmi_code: Optional[str] = None    # Hardware Terminal ID (misal: HMI-01)
    name: str
    project_id: Optional[int] = None
    status: Optional[str] = "offline" # 🔒 Default disetel offline sesuai kesepakatan frontend
    config: Optional[List[Any]] = []

    class Config:
        from_attributes = True

# ==============================================================================
# 1. POST: Daftarkan Gateway Baru
# ==============================================================================
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_gateway(
    gateway: GatewaySchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    if role not in ["admin", "rasindo_operator"]:
        raise HTTPException(status_code=403, detail="Akses ditolak!")

    db_gateway = Gateway(
        hmi_code=gateway.hmi_code,
        name=gateway.name,
        project_id=gateway.project_id,
        status=gateway.status,
    )
    try:
        db.add(db_gateway)
        db.commit()
        db.refresh(db_gateway)
        return {"status": "success", "data": db_gateway}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan: {str(e)}")

# ==============================================================================
# 2. GET ALL (🔒 Menggunakan JOIN Tidak Langsung via Project untuk Client Tenant)
# ==============================================================================
@router.get("/")
def get_gateways(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        role = current_user.get("role")
        user_company_id = current_user.get("company_id")

        # 🔒 Jika user adalah client, cari gateway lewat project yang dimiliki company mereka
        if role in ["client_operator", "client_user"]:
            gateways = (
                db.query(Gateway)
                .join(Project, Gateway.project_id == Project.project_id)
                .filter(Project.company_id == user_company_id)
                .all()
            )
            return {"status": "success", "data": gateways}

        # Jika admin atau rasindo_operator, tampilkan semua gateway di seluruh project
        gateways = db.query(Gateway).all()
        return {"status": "success", "data": gateways}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# 3. GET SINGLE
# ==============================================================================
@router.get("/{gateway_id}")
def get_gateway(
    gateway_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    gateway = db.query(Gateway).filter(Gateway.gateway_id == gateway_id).first()
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway tidak ditemukan")
    return {"status": "success", "data": gateway}

# ==============================================================================
# 4. PUT: Update Gateway
# ==============================================================================
@router.put("/{gateway_id}")
def update_gateway(
    gateway_id: int,
    payload: GatewaySchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    if role not in ["admin", "rasindo_operator"]:
        raise HTTPException(status_code=403, detail="Akses ditolak!")

    gateway = db.query(Gateway).filter(Gateway.gateway_id == gateway_id).first()
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway tidak ditemukan")

    try:
        gateway.hmi_code = payload.hmi_code
        gateway.name = payload.name
        gateway.project_id = payload.project_id
        gateway.status = payload.status
        gateway.config = payload.config
        db.commit()
        return {"status": "success", "message": "Gateway berhasil diperbarui"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# 5. DELETE
# ==============================================================================
@router.delete("/{gateway_id}")
def delete_gateway(
    gateway_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    if role not in ["admin", "rasindo_operator"]:
        raise HTTPException(status_code=403, detail="Akses ditolak!")

    gateway = db.query(Gateway).filter(Gateway.gateway_id == gateway_id).first()
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway tidak ditemukan")

    try:
        db.delete(gateway)
        db.commit()
        return {"status": "success", "message": "Gateway berhasil dihapus"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))