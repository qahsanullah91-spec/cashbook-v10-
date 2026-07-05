from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..auth_dependencies import require_authenticated_request
from ..database import SessionLocal

router = APIRouter(prefix="/api/transactions", tags=["transactions"], dependencies=[Depends(require_authenticated_request)])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[schemas.TransactionRead])
def read_transactions(db: Session = Depends(get_db)):
    return crud.list_transactions(db)


@router.get("/summary", response_model=schemas.SummaryResponse)
def read_summary(db: Session = Depends(get_db)):
    return crud.summary(db)


@router.get("/filter", response_model=list[schemas.TransactionRead])
def filter_transactions(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    type: str | None = Query(default=None),
    account: str | None = Query(default=None),
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    payment_method: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.filtered_transactions(
        db,
        start_date=start_date,
        end_date=end_date,
        type=type,
        account=account,
        search=search,
        category=category,
        payment_method=payment_method,
    )


@router.get("/today", response_model=list[schemas.TransactionRead])
def today_transactions(db: Session = Depends(get_db)):
    today = date.today()
    return crud.filtered_transactions(db, start_date=today, end_date=today)


@router.get("/monthly", response_model=list[schemas.TransactionRead])
def monthly_transactions(db: Session = Depends(get_db)):
    today = date.today()
    start = today.replace(day=1)
    return crud.filtered_transactions(db, start_date=start, end_date=today)


@router.get("/yearly", response_model=list[schemas.TransactionRead])
def yearly_transactions(db: Session = Depends(get_db)):
    today = date.today()
    start = today.replace(month=1, day=1)
    return crud.filtered_transactions(db, start_date=start, end_date=today)


@router.get("/{transaction_id}", response_model=schemas.TransactionRead)
def read_transaction(transaction_id: int, db: Session = Depends(get_db)):
    tx = crud.get_transaction(db, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.post("", response_model=schemas.TransactionRead, status_code=201)
def create_transaction(payload: schemas.TransactionCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_transaction(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.put("/{transaction_id}", response_model=schemas.TransactionRead)
def update_transaction(transaction_id: int, payload: schemas.TransactionUpdate, db: Session = Depends(get_db)):
    tx = crud.get_transaction(db, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    try:
        return crud.update_transaction(db, tx, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    tx = crud.get_transaction(db, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    crud.delete_transaction(db, tx)
    return {"ok": True}
