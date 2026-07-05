import csv
import io
import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from .. import crud
from ..auth_dependencies import require_authenticated_request
from ..database import SessionLocal

router = APIRouter(tags=["reports"], dependencies=[Depends(require_authenticated_request)])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def report_summary(rows):
    cash_in = round(sum(float(row.cash_in_afn or 0) for row in rows), 2)
    cash_out = round(sum(float(row.cash_out_afn or 0) for row in rows), 2)
    usd_in = round(sum(float(row.usd_in or 0) for row in rows), 2)
    usd_out = round(sum(float(row.usd_out or 0) for row in rows), 2)
    return {
        "cash_in_afn": cash_in,
        "cash_out_afn": cash_out,
        "afn_balance": round(cash_in - cash_out, 2),
        "usd_in": usd_in,
        "usd_out": usd_out,
        "usd_balance": round(usd_in - usd_out, 2),
        "transaction_count": len(rows),
    }


@router.get("/api/summary")
def all_summary(db: Session = Depends(get_db)):
    return crud.summary(db)


@router.get("/api/summary/daily")
def daily_summary(db: Session = Depends(get_db)):
    rows = crud.filtered_transactions(db, start_date=date.today(), end_date=date.today())
    return report_summary(rows)


@router.get("/api/summary/monthly")
def monthly_summary(db: Session = Depends(get_db)):
    today = date.today()
    rows = crud.filtered_transactions(db, start_date=today.replace(day=1), end_date=today)
    return report_summary(rows)


@router.get("/api/summary/account/{account_id}")
def account_summary(account_id: int, db: Session = Depends(get_db)):
    ledger = crud.account_ledger(db, account_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="Account not found")
    return ledger


@router.get("/api/reports/cashbook")
def cashbook_report(db: Session = Depends(get_db)):
    rows = crud.list_transactions(db)
    return {"summary": report_summary(rows), "transactions": rows}


@router.get("/api/reports/ledger/{account_id}")
def ledger_report(account_id: int, db: Session = Depends(get_db)):
    ledger = crud.account_ledger(db, account_id)
    if not ledger:
        raise HTTPException(status_code=404, detail="Account not found")
    return ledger


@router.get("/api/reports/profit-loss")
def profit_loss(db: Session = Depends(get_db)):
    rows = crud.list_transactions(db)
    return report_summary(rows)


@router.get("/api/reports/expenses")
def expense_report(db: Session = Depends(get_db)):
    rows = crud.filtered_transactions(db, type="cash_out")
    return {"summary": report_summary(rows), "transactions": rows}


@router.get("/api/reports/date-range")
def date_range_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
):
    rows = crud.filtered_transactions(db, start_date=start_date, end_date=end_date)
    return {"summary": report_summary(rows), "transactions": rows}


def csv_response(rows, filename):
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow([
        "Transaction No", "Date", "Name", "Detail", "Type", "Category",
        "Cash In AFN", "Cash Out AFN", "USD In", "USD Out", "Exchange Rate",
        "Payment Method", "Note",
    ])
    for row in rows:
        writer.writerow([
            row.transaction_no, row.date, row.account_name, row.detail,
            row.transaction_type, row.category, row.cash_in_afn, row.cash_out_afn,
            row.usd_in, row.usd_out, row.exchange_rate, row.payment_method, row.note,
        ])
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/export/transactions/json")
def export_transactions_json(db: Session = Depends(get_db)):
    return JSONResponse(jsonable_encoder(crud.list_transactions(db)))


@router.get("/api/export/transactions/csv")
def export_transactions_csv(db: Session = Depends(get_db)):
    return csv_response(crud.list_transactions(db), "transactions.csv")


@router.get("/api/export/accounts/json")
def export_accounts_json(db: Session = Depends(get_db)):
    return JSONResponse(jsonable_encoder(crud.list_accounts(db)))


@router.get("/api/export/ledger/{account_id}/csv")
def export_ledger_csv(account_id: int, db: Session = Depends(get_db)):
    account = crud.get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    rows = [row for row in crud.list_transactions(db) if row.account_id == account_id]
    return csv_response(rows, f"ledger-{account_id}.csv")
