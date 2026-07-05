from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth_dependencies import require_authenticated_request
from ..database import SessionLocal

router = APIRouter(prefix="/api/settings", tags=["settings"], dependencies=[Depends(require_authenticated_request)])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=schemas.SettingRead)
def read_settings(db: Session = Depends(get_db)):
    return crud.get_settings(db)


@router.put("", response_model=schemas.SettingRead)
def update_settings(payload: schemas.SettingUpdate, db: Session = Depends(get_db)):
    return crud.update_settings(db, payload)
