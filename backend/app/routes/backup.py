from __future__ import annotations

import json
import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from .. import crud, models
from ..auth_dependencies import require_administrator_request
from ..csv_import import CsvImportError
from ..database import SessionLocal
from ..schemas import CsvImportRequest

router = APIRouter(prefix="/api/backup", tags=["backup"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/export", dependencies=[Depends(require_administrator_request)])
def export_backup(db: Session = Depends(get_db)):
    payload = crud.backup_payload(db)
    return JSONResponse(jsonable_encoder(payload))


@router.post("/import", dependencies=[Depends(require_administrator_request)])
def import_backup(payload: dict, replace_all: bool = False, db: Session = Depends(get_db)):
    try:
        return crud.import_backup(db, payload, replace_all=replace_all)
    except (KeyError, TypeError, ValueError, ValidationError) as error:
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Backup restore failed: {error}") from error


@router.post("/import-csv", dependencies=[Depends(require_administrator_request)])
def import_csv(payload: CsvImportRequest, db: Session = Depends(get_db)):
    if len(payload.content.encode("utf-8")) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="CSV file must be 5 MB or smaller")
    try:
        return crud.import_cashbook_csv(db, payload.content, payload.filename)
    except CsvImportError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/clear-all", dependencies=[Depends(require_administrator_request)])
def clear_all(db: Session = Depends(get_db)):
    return crud.clear_all(db)


def create_snapshot(db: Session, backup_type: str) -> models.BackupSnapshot:
    payload = jsonable_encoder(crud.backup_payload(db))
    snapshot = models.BackupSnapshot(
        backup_name=f"cashbook-{backup_type}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
        backup_type=backup_type,
        payload=json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
    )
    db.add(snapshot)
    cutoff = datetime.utcnow() - timedelta(days=30)
    db.query(models.BackupSnapshot).filter(models.BackupSnapshot.created_at < cutoff).delete()
    db.commit()
    db.refresh(snapshot)
    return snapshot


@router.post("/snapshot", dependencies=[Depends(require_administrator_request)])
def manual_snapshot(db: Session = Depends(get_db)):
    snapshot = create_snapshot(db, "manual")
    return {"ok": True, "backup_name": snapshot.backup_name, "created_at": snapshot.created_at}


@router.get("/daily")
def daily_snapshot(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    cron_secret = os.getenv("CRON_SECRET")
    if not cron_secret or authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Invalid cron authorization")
    snapshot = create_snapshot(db, "daily")
    return {"ok": True, "backup_name": snapshot.backup_name, "created_at": snapshot.created_at}


@router.get("/export-system")
def export_system_backup(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    cron_secret = os.getenv("CRON_SECRET")
    if not cron_secret or authorization != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Invalid cron authorization")
    payload = crud.backup_payload(db)
    return JSONResponse(jsonable_encoder(payload))


@router.get("/snapshots", dependencies=[Depends(require_administrator_request)])
def list_snapshots(db: Session = Depends(get_db)):
    rows = db.query(models.BackupSnapshot).order_by(models.BackupSnapshot.created_at.desc()).limit(30).all()
    return [
        {"id": row.id, "backup_name": row.backup_name, "backup_type": row.backup_type, "created_at": row.created_at}
        for row in rows
    ]


@router.post("/snapshots/{snapshot_id}/restore", dependencies=[Depends(require_administrator_request)])
def restore_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    snapshot = db.query(models.BackupSnapshot).filter(models.BackupSnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Backup snapshot not found")
    try:
        return crud.import_backup(db, json.loads(snapshot.payload), replace_all=True)
    except (KeyError, TypeError, ValueError, ValidationError) as error:
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Backup restore failed: {error}") from error
