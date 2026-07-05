from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth_dependencies import require_authenticated_request
from ..database import SessionLocal

router = APIRouter(prefix="/api/accounts", tags=["accounts"], dependencies=[Depends(require_authenticated_request)])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[schemas.AccountRead])
def read_accounts(db: Session = Depends(get_db)):
    return crud.list_accounts(db)


@router.get("/search", response_model=list[schemas.AccountRead])
def search_accounts(name: str = "", db: Session = Depends(get_db)):
    return [account for account in crud.list_accounts(db) if name.lower() in account.name.lower()]


@router.get("/{account_id}", response_model=schemas.AccountRead)
def read_account(account_id: int, db: Session = Depends(get_db)):
    account = crud.get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.post("", response_model=schemas.AccountRead, status_code=201)
def create_account(payload: schemas.AccountCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_account(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.put("/{account_id}", response_model=schemas.AccountRead)
def update_account(account_id: int, payload: schemas.AccountUpdate, db: Session = Depends(get_db)):
    account = crud.get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.update_account(db, account, payload)


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    account = crud.get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    crud.delete_account(db, account)
    return {"ok": True}


@router.get("/{account_id}/ledger")
def read_ledger(account_id: int, db: Session = Depends(get_db)):
    ledger = crud.account_ledger(db, account_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="Account not found")
    return ledger


@router.get("/{account_id}/balance")
def read_balance(account_id: int, db: Session = Depends(get_db)):
    ledger = crud.account_ledger(db, account_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="Account not found")
    return {
        "account_id": account_id,
        "afn_balance": ledger["final_balance_afn"],
        "usd_balance": ledger["final_balance_usd"],
    }
