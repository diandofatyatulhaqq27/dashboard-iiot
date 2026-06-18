from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import UserSession # Sesuaikan nama class model di models.py

router = APIRouter(prefix="/api/sessions", tags=["User Sessions"])

class SessionSchema(BaseModel):
    user_id: int
    session_token: str
    expires_at: str

@router.post("/")
def create_session(session: SessionSchema, db: Session = Depends(get_db)):
    db_session = UserSession(user_id=session.user_id, session_token=session.session_token, expires_at=session.expires_at)
    try:
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return {"status": "success", "data": db_session}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{token}")
def delete_session(token: str, db: Session = Depends(get_db)):
    db_session = db.query(UserSession).filter(UserSession.session_token == token).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session tidak valid")
    db.delete(db_session)
    db.commit()
    return {"status": "success", "message": "Session berhasil dihapus (Logout)"}