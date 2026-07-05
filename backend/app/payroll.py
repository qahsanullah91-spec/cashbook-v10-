from calendar import monthrange
from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas


def _text(value) -> str:
    return str(value or "").strip()


def _money(value) -> float:
    return round(float(value or 0), 2)


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _month_start_from_parts(month: int, year: int) -> date:
    return date(year, month, 1)


def _month_label(month: int, year: int) -> str:
    return date(year, month, 1).strftime("%B %Y")


def _next_month(value: date) -> date:
    return date(value.year + (1 if value.month == 12 else 0), 1 if value.month == 12 else value.month + 1, 1)


def _month_end(value: date) -> date:
    return date(value.year, value.month, monthrange(value.year, value.month)[1])


def effective_salary(db: Session, employee: models.Employee, target_date: date) -> dict:
    history = db.query(models.SalaryHistory).filter(
        models.SalaryHistory.employee_id == employee.id,
    ).order_by(models.SalaryHistory.effective_date.asc(), models.SalaryHistory.id.asc()).all()
    if not history:
        return {"salary": _money(employee.monthly_salary), "currency": employee.currency or "AFN"}
    eligible = [change for change in history if change.effective_date <= target_date]
    if eligible:
        active = eligible[-1]
        return {"salary": _money(active.new_salary), "currency": active.new_currency or "AFN"}
    first = history[0]
    return {"salary": _money(first.old_salary), "currency": first.old_currency or "AFN"}


def _employee_salary_start_month(employee: models.Employee, target_month: date) -> date:
    if not employee.joining_date:
        return target_month
    return _month_start(employee.joining_date)


def _earned_salary_through(db: Session, employee: models.Employee, through_month: date) -> float:
    total = 0.0
    current = _employee_salary_start_month(employee, through_month)
    while current <= through_month:
        active = effective_salary(db, employee, _month_end(current))
        total += active["salary"]
        current = _next_month(current)
    return _money(total)


def _next_employee_code(db: Session) -> str:
    highest = 0
    for (code,) in db.query(models.Employee.employee_code).all():
        try:
            highest = max(highest, int(str(code).rsplit("-", 1)[-1]))
        except (TypeError, ValueError):
            continue
    return f"EMP-{highest + 1:04d}"


def create_employee(db: Session, payload: schemas.EmployeeCreate) -> models.Employee:
    name = _text(payload.full_name)
    existing = db.query(models.Employee).filter(func.lower(models.Employee.full_name) == name.lower()).first()
    if existing:
        raise ValueError("An employee with this name already exists")

    account = db.query(models.Account).filter(func.lower(models.Account.name) == name.lower()).first()
    if account and account.employee:
        raise ValueError("This account is already linked to an employee")
    if not account:
        account = models.Account(name=name, account_type="worker", phone=_text(payload.phone))
        db.add(account)
        db.flush()
    else:
        account.account_type = "worker"
        account.phone = _text(payload.phone) or account.phone

    employee = models.Employee(
        employee_code=_next_employee_code(db),
        account_id=account.id,
        full_name=name,
        father_name=_text(payload.father_name),
        phone=_text(payload.phone),
        position=_text(payload.position),
        department=_text(payload.department),
        joining_date=payload.joining_date,
        monthly_salary=_money(payload.monthly_salary),
        currency=payload.currency,
        avatar_url=_text(payload.avatar_url),
        status=payload.status,
        notes=_text(payload.notes),
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


def list_employees(db: Session) -> list[models.Employee]:
    return db.query(models.Employee).order_by(models.Employee.full_name.asc()).all()


def get_employee(db: Session, employee_id: int) -> models.Employee | None:
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()


def update_employee(db: Session, employee: models.Employee, payload: schemas.EmployeeUpdate) -> models.Employee:
    data = payload.model_dump(exclude_unset=True)
    text_fields = ["full_name", "father_name", "phone", "position", "department", "avatar_url", "status", "notes"]
    for field in text_fields:
        if field in data and data[field] is not None:
            setattr(employee, field, _text(data[field]))
    if "joining_date" in data and data["joining_date"] is not None:
        employee.joining_date = data["joining_date"]
    if "monthly_salary" in data and data["monthly_salary"] is not None:
        employee.monthly_salary = _money(data["monthly_salary"])
    if "currency" in data and data["currency"] is not None:
        employee.currency = data["currency"]
    employee.updated_at = datetime.utcnow()
    if employee.account:
        employee.account.name = employee.full_name
        employee.account.phone = employee.phone or employee.account.phone
        employee.account.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    return employee


def delete_employee(db: Session, employee: models.Employee) -> None:
    payments = list(employee.salary_payments)
    for payment in payments:
        delete_salary_payment(db, payment)

    db.refresh(employee)
    for transaction in list(employee.transactions):
        transaction.employee_id = None
        transaction.payroll_kind = None
        transaction.salary_month = None

    db.delete(employee)
    db.commit()


def employee_salary_summary(db: Session, employee_id: int, month: date) -> dict:
    employee = get_employee(db, employee_id)
    if not employee:
        raise ValueError("Employee not found")
    salary_month = _month_start(month)
    rows = db.query(models.Transaction).filter(
        models.Transaction.employee_id == employee.id,
        models.Transaction.transaction_type == "cash_out",
        models.Transaction.category == "salary",
        models.Transaction.salary_month == salary_month,
    ).all()
    month_end = date(salary_month.year, salary_month.month, monthrange(salary_month.year, salary_month.month)[1])
    active_salary = effective_salary(db, employee, month_end)
    amount_for = lambda row: _money(row.usd_out if active_salary["currency"] == "USD" else row.cash_out_afn)
    paid = sum(amount_for(row) for row in rows if (row.payroll_kind or "salary") == "salary")
    advance = sum(amount_for(row) for row in rows if row.payroll_kind == "advance")
    report_rows, _payments = _salary_rows_for_month(db, salary_month.month, salary_month.year)
    report_row = next((row for row in report_rows if row["employee_id"] == employee.id), None)
    monthly_salary = report_row["monthly_salary"] if report_row else active_salary["salary"]
    previous_carry = report_row["previous_carry_forward_balance"] if report_row else 0
    total_payable = report_row["total_payable_salary"] if report_row else monthly_salary
    remaining = report_row["remaining_salary"] if report_row else _money(total_payable - paid - advance)
    return {
        "employee_id": employee.id,
        "employee_name": employee.full_name,
        "salary_month": salary_month,
        "monthly_salary": monthly_salary,
        "paid_amount": _money(paid),
        "advance_taken": _money(advance),
        "previous_carry_forward_balance": _money(previous_carry),
        "total_payable_salary": _money(total_payable),
        "remaining_salary": _money(remaining),
        "carry_forward_balance": _money(remaining),
        "currency": active_salary["currency"],
    }


def _linked_cashbook_ids(db: Session) -> set[int]:
    rows = db.query(models.SalaryPayment.cashbook_entry_id).filter(
        models.SalaryPayment.cashbook_entry_id.isnot(None)
    ).all()
    return {row[0] for row in rows if row[0]}


def _salary_rows_for_month(db: Session, month: int, year: int) -> tuple[list[dict], list[models.SalaryPayment]]:
    salary_month = _month_start_from_parts(month, year)
    salary_month_end = _month_end(salary_month)
    employees = db.query(models.Employee).order_by(models.Employee.full_name.asc()).all()
    payments = db.query(models.SalaryPayment).filter(
        models.SalaryPayment.month == month,
        models.SalaryPayment.year == year,
    ).all()
    payments_through_month = db.query(models.SalaryPayment).filter(
        (models.SalaryPayment.year < year)
        | ((models.SalaryPayment.year == year) & (models.SalaryPayment.month <= month))
    ).all()
    linked_ids = _linked_cashbook_ids(db)
    legacy_transactions = db.query(models.Transaction).filter(
        models.Transaction.transaction_type == "cash_out",
        models.Transaction.category == "salary",
        models.Transaction.salary_month == salary_month,
    ).all()
    legacy_transactions = [tx for tx in legacy_transactions if tx.id not in linked_ids]
    legacy_transactions_through_month = db.query(models.Transaction).filter(
        models.Transaction.transaction_type == "cash_out",
        models.Transaction.category == "salary",
        models.Transaction.salary_month <= salary_month,
    ).all()
    legacy_transactions_through_month = [tx for tx in legacy_transactions_through_month if tx.id not in linked_ids]

    by_employee: dict[int, dict] = {}
    paid_through_employee: dict[int, float] = {}
    for payment in payments:
        bucket = by_employee.setdefault(payment.employee_id, {"paid": 0.0, "last": None})
        bucket["paid"] += _money(payment.amount)
        if not bucket["last"] or payment.payment_date > bucket["last"]:
            bucket["last"] = payment.payment_date

    for payment in payments_through_month:
        paid_through_employee[payment.employee_id] = _money(paid_through_employee.get(payment.employee_id, 0.0) + payment.amount)

    for transaction in legacy_transactions:
        if not transaction.employee_id:
            continue
        bucket = by_employee.setdefault(transaction.employee_id, {"paid": 0.0, "last": None})
        bucket["paid"] += _money(transaction.cash_out_afn)
        if not bucket["last"] or transaction.date > bucket["last"]:
            bucket["last"] = transaction.date

    for transaction in legacy_transactions_through_month:
        if not transaction.employee_id:
            continue
        paid_through_employee[transaction.employee_id] = _money(paid_through_employee.get(transaction.employee_id, 0.0) + transaction.cash_out_afn)

    rows = []
    for employee in employees:
        active_salary = effective_salary(db, employee, salary_month_end)
        totals = by_employee.get(employee.id, {"paid": 0.0, "last": None})
        paid = _money(totals["paid"])
        monthly_salary = active_salary["salary"]
        previous_month = date(year - 1, 12, 1) if month == 1 else date(year, month - 1, 1)
        previous_paid = _money(paid_through_employee.get(employee.id, 0.0) - paid)
        previous_carry = _money(_earned_salary_through(db, employee, previous_month) - previous_paid) if previous_month >= _employee_salary_start_month(employee, previous_month) else 0.0
        total_payable = _money(monthly_salary + previous_carry)
        remaining = _money(total_payable - paid)
        closing_balance = remaining
        if paid <= 0:
            status = "Unpaid" if closing_balance > 0 else "Paid"
        elif closing_balance < 0:
            status = "Advance"
        elif closing_balance == 0:
            status = "Paid"
        else:
            status = "Partial Paid"
        rows.append({
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "employee_name": employee.full_name,
            "department": employee.department or "",
            "position": employee.position or "",
            "monthly_salary": monthly_salary,
            "previous_carry_forward_balance": previous_carry,
            "total_payable_salary": total_payable,
            "paid_salary": paid,
            "remaining_salary": remaining,
            "carry_forward_balance": closing_balance,
            "payment_status": status,
            "last_payment_date": totals["last"],
            "currency": active_salary["currency"],
        })
    return rows, payments


def salary_report(db: Session, month: int, year: int) -> dict:
    rows, payments = _salary_rows_for_month(db, month, year)
    summary = {
        "total_employees": len(rows),
        "total_monthly_salary": _money(sum(row["monthly_salary"] for row in rows)),
        "total_payable_salary": _money(sum(row["total_payable_salary"] for row in rows)),
        "total_paid_this_month": _money(sum(row["paid_salary"] for row in rows)),
        "total_remaining_salary": _money(sum(row["remaining_salary"] for row in rows)),
        "fully_paid_employees": sum(1 for row in rows if row["payment_status"] == "Paid"),
        "unpaid_employees": sum(1 for row in rows if row["payment_status"] == "Unpaid"),
        "partial_paid_employees": sum(1 for row in rows if row["payment_status"] == "Partial Paid"),
    }
    return {"month": month, "year": year, "rows": rows, "summary": summary, "payments": payments}


def _remaining_for_employee(db: Session, employee_id: int, month: int, year: int, exclude_payment_id: int | None = None) -> float:
    employee = get_employee(db, employee_id)
    if not employee:
        raise ValueError("Employee not found")
    rows, _payments = _salary_rows_for_month(db, month, year)
    row = next((item for item in rows if item["employee_id"] == employee_id), None)
    paid = row["paid_salary"] if row else 0.0
    if exclude_payment_id:
        existing = db.query(models.SalaryPayment).filter(models.SalaryPayment.id == exclude_payment_id).first()
        if existing:
            paid = max(0, paid - _money(existing.amount))
    return _money(max(_money(employee.monthly_salary) - paid, 0))


def _payment_carry_context(
    db: Session,
    employee: models.Employee,
    month: int,
    year: int,
    amount: float,
    replaced_amount: float = 0.0,
) -> dict:
    rows, _payments = _salary_rows_for_month(db, month, year)
    row = next((item for item in rows if item["employee_id"] == employee.id), None)
    if not row:
        target_date = _month_end(_month_start_from_parts(month, year))
        active = effective_salary(db, employee, target_date)
        row = {
            "previous_carry_forward_balance": 0.0,
            "total_payable_salary": active["salary"],
            "remaining_salary": active["salary"],
        }
    closing = _money(row["remaining_salary"] + replaced_amount - amount)
    return {
        "previous_carry_forward_balance": _money(row["previous_carry_forward_balance"]),
        "total_payable_salary": _money(row["total_payable_salary"]),
        "carry_forward_balance": closing,
    }


def _cashbook_payload(employee: models.Employee, payload, month: int, year: int, currency: str, exchange_rate: float) -> schemas.TransactionCreate:
    amount = _money(payload.amount)
    label = _month_label(month, year)
    note = _text(payload.notes) or f"Salary payment for {label}"
    return schemas.TransactionCreate(
        date=payload.payment_date,
        account_id=employee.account_id,
        employee_id=employee.id,
        salary_month=_month_start_from_parts(month, year),
        payroll_kind="salary",
        account_name=employee.full_name,
        detail=f"Salary payment for {employee.full_name} - {label}",
        transaction_type="cash_out",
        cash_in_afn=0,
        cash_out_afn=amount if currency == "AFN" else 0,
        usd_in=0,
        usd_out=amount if currency == "USD" else 0,
        exchange_rate=exchange_rate if currency == "USD" else 0,
        converted_afn=_money(amount * exchange_rate) if currency == "USD" else amount,
        payment_method=payload.payment_method,
        category="salary",
        note=note,
    )


def create_salary_payment(db: Session, payload: schemas.SalaryPaymentCreate) -> models.SalaryPayment:
    employee = get_employee(db, payload.employee_id)
    if not employee:
        raise ValueError("Employee not found")
    amount = _money(payload.amount)
    if amount <= 0:
        raise ValueError("Amount must be greater than 0")
    from . import crud

    target_date = date(payload.year, payload.month, monthrange(payload.year, payload.month)[1])
    active = effective_salary(db, employee, target_date)
    settings = crud.get_settings(db)
    carry_context = _payment_carry_context(db, employee, payload.month, payload.year, amount)
    transaction = crud.create_transaction(
        db,
        _cashbook_payload(
            employee,
            payload,
            payload.month,
            payload.year,
            active["currency"],
            _money(settings.default_exchange_rate),
        ),
    )
    payment = models.SalaryPayment(
        employee_id=employee.id,
        month=payload.month,
        year=payload.year,
        amount=amount,
        payment_date=payload.payment_date,
        payment_method=payload.payment_method,
        notes=_text(payload.notes),
        previous_carry_forward_balance=carry_context["previous_carry_forward_balance"],
        total_payable_salary=carry_context["total_payable_salary"],
        carry_forward_balance=carry_context["carry_forward_balance"],
        cashbook_entry_id=transaction.id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def get_salary_payment(db: Session, payment_id: int) -> models.SalaryPayment | None:
    return db.query(models.SalaryPayment).filter(models.SalaryPayment.id == payment_id).first()


def update_salary_payment(db: Session, payment: models.SalaryPayment, payload: schemas.SalaryPaymentUpdate) -> models.SalaryPayment:
    employee = get_employee(db, payment.employee_id)
    if not employee:
        raise ValueError("Employee not found")
    data = payload.model_dump(exclude_unset=True)
    previous_amount = _money(payment.amount)
    next_amount = _money(data.get("amount", payment.amount))
    if next_amount <= 0:
        raise ValueError("Amount must be greater than 0")
    payment.amount = next_amount
    if "payment_date" in data:
        payment.payment_date = data["payment_date"]
    if "payment_method" in data:
        payment.payment_method = data["payment_method"]
    if "notes" in data:
        payment.notes = _text(data["notes"])
    carry_context = _payment_carry_context(
        db,
        employee,
        payment.month,
        payment.year,
        next_amount,
        replaced_amount=previous_amount,
    )
    payment.previous_carry_forward_balance = carry_context["previous_carry_forward_balance"]
    payment.total_payable_salary = carry_context["total_payable_salary"]
    payment.carry_forward_balance = carry_context["carry_forward_balance"]
    payment.updated_at = datetime.utcnow()

    if payment.cashbook_entry_id:
        from . import crud

        transaction = crud.get_transaction(db, payment.cashbook_entry_id)
        if transaction:
            target_date = date(payment.year, payment.month, monthrange(payment.year, payment.month)[1])
            active = effective_salary(db, employee, target_date)
            exchange_rate = _money(crud.get_settings(db).default_exchange_rate)
            crud.update_transaction(
                db,
                transaction,
                schemas.TransactionUpdate(
                    date=payment.payment_date,
                    account_id=employee.account_id,
                    employee_id=employee.id,
                    salary_month=_month_start_from_parts(payment.month, payment.year),
                    payroll_kind="salary",
                    account_name=employee.full_name,
                    detail=f"Salary payment for {employee.full_name} - {_month_label(payment.month, payment.year)}",
                    transaction_type="cash_out",
                    cash_out_afn=next_amount if active["currency"] == "AFN" else 0,
                    usd_out=next_amount if active["currency"] == "USD" else 0,
                    exchange_rate=exchange_rate if active["currency"] == "USD" else 0,
                    converted_afn=_money(next_amount * exchange_rate) if active["currency"] == "USD" else next_amount,
                    payment_method=payment.payment_method,
                    category="salary",
                    note=payment.notes or f"Salary payment for {_month_label(payment.month, payment.year)}",
                ),
            )
    db.commit()
    db.refresh(payment)
    return payment


def delete_salary_payment(db: Session, payment: models.SalaryPayment) -> None:
    from . import crud

    transaction = crud.get_transaction(db, payment.cashbook_entry_id) if payment.cashbook_entry_id else None
    db.delete(payment)
    if transaction:
        db.delete(transaction)
    db.commit()


def create_salary_history(
    db: Session,
    employee: models.Employee,
    payload: schemas.SalaryHistoryCreate,
    changed_by: str,
) -> models.SalaryHistory:
    reason = _text(payload.reason)
    if not reason:
        raise ValueError("Reason for salary change is required")
    if payload.new_salary < 0:
        raise ValueError("Salary cannot be negative")
    current = effective_salary(db, employee, payload.effective_date)
    change = models.SalaryHistory(
        employee_id=employee.id,
        old_salary=current["salary"],
        new_salary=_money(payload.new_salary),
        old_currency=current["currency"],
        new_currency=payload.new_currency,
        effective_date=payload.effective_date,
        changed_by=_text(changed_by) or "Administrator",
        reason=reason,
        notes=_text(payload.notes),
    )
    db.add(change)
    db.flush()

    latest = db.query(models.SalaryHistory).filter(
        models.SalaryHistory.employee_id == employee.id,
    ).order_by(models.SalaryHistory.effective_date.desc(), models.SalaryHistory.id.desc()).first()
    if latest:
        employee.monthly_salary = _money(latest.new_salary)
        employee.currency = latest.new_currency
    db.commit()
    db.refresh(change)
    return change


def salary_history_for_employee(db: Session, employee_id: int) -> list[models.SalaryHistory]:
    return db.query(models.SalaryHistory).filter(
        models.SalaryHistory.employee_id == employee_id,
    ).order_by(models.SalaryHistory.effective_date.desc(), models.SalaryHistory.id.desc()).all()


def salary_change_report(db: Session) -> list[dict]:
    rows = db.query(models.SalaryHistory, models.Employee).join(
        models.Employee, models.Employee.id == models.SalaryHistory.employee_id,
    ).order_by(models.SalaryHistory.effective_date.desc(), models.SalaryHistory.id.desc()).all()
    return [{
        "id": change.id,
        "employee_id": change.employee_id,
        "employee_name": employee.full_name,
        "employee_code": employee.employee_code,
        "old_salary": change.old_salary,
        "new_salary": change.new_salary,
        "old_currency": change.old_currency,
        "new_currency": change.new_currency,
        "effective_date": change.effective_date,
        "changed_at": change.changed_at,
        "changed_by": change.changed_by,
        "reason": change.reason,
        "notes": change.notes,
    } for change, employee in rows]
