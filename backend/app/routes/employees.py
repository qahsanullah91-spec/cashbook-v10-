from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import payroll, schemas
from ..auth_dependencies import require_administrator_request, require_authenticated_request
from ..database import SessionLocal

router = APIRouter(prefix="/api/employees", tags=["employees"], dependencies=[Depends(require_authenticated_request)])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[schemas.EmployeeRead])
def read_employees(db: Session = Depends(get_db)):
    result = []
    for employee in payroll.list_employees(db):
        active = payroll.effective_salary(db, employee, date.today())
        data = schemas.EmployeeRead.model_validate(employee).model_dump()
        data["monthly_salary"] = active["salary"]
        data["currency"] = active["currency"]
        result.append(data)
    return result


@router.post("", response_model=schemas.EmployeeRead, status_code=201)
def add_employee(payload: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    try:
        return payroll.create_employee(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/salary-report", response_model=schemas.SalaryReportResponse)
def read_salary_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    return payroll.salary_report(db, month, year)


@router.get("/salary-summary", response_model=schemas.SalarySummaryTotals)
def read_salary_summary_totals(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    return payroll.salary_report(db, month, year)["summary"]


@router.post("/salary-payments", response_model=schemas.SalaryPaymentRead, status_code=201)
def add_salary_payment(payload: schemas.SalaryPaymentCreate, db: Session = Depends(get_db)):
    try:
        return payroll.create_salary_payment(db, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.put("/salary-payments/{payment_id}", response_model=schemas.SalaryPaymentRead)
def edit_salary_payment(payment_id: int, payload: schemas.SalaryPaymentUpdate, db: Session = Depends(get_db)):
    payment = payroll.get_salary_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Salary payment not found")
    try:
        return payroll.update_salary_payment(db, payment, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/salary-payments/{payment_id}")
def remove_salary_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = payroll.get_salary_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Salary payment not found")
    payroll.delete_salary_payment(db, payment)
    return {"ok": True}


@router.get("/salary-changes", response_model=list[schemas.SalaryChangeReportRow])
def read_salary_change_report(db: Session = Depends(get_db)):
    return payroll.salary_change_report(db)


@router.put("/{employee_id}", response_model=schemas.EmployeeRead)
def edit_employee(
    employee_id: int,
    payload: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    administrator=Depends(require_administrator_request),
):
    employee = payroll.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    try:
        return payroll.update_employee(db, employee, payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.delete("/{employee_id}")
def remove_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    administrator=Depends(require_administrator_request),
):
    employee = payroll.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    payroll.delete_employee(db, employee)
    return {"ok": True, "deleted_employee_id": employee_id}


@router.get("/{employee_id}/salary-history", response_model=list[schemas.SalaryHistoryRead])
def read_employee_salary_history(employee_id: int, db: Session = Depends(get_db)):
    employee = payroll.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return payroll.salary_history_for_employee(db, employee_id)


@router.post("/{employee_id}/salary-history", response_model=schemas.SalaryHistoryRead, status_code=201)
def change_employee_salary(
    employee_id: int,
    payload: schemas.SalaryHistoryCreate,
    db: Session = Depends(get_db),
    administrator=Depends(require_administrator_request),
):
    employee = payroll.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    try:
        return payroll.create_salary_history(
            db,
            employee,
            payload,
            administrator.full_name or administrator.username,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/{employee_id}/salary-summary")
def read_salary_summary(
    employee_id: int,
    month: date = Query(...),
    db: Session = Depends(get_db),
):
    try:
        return payroll.employee_salary_summary(db, employee_id, month)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
