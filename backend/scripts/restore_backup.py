#!/usr/bin/env python
import argparse
import os
import sys
import json
from datetime import datetime, date
from pathlib import Path

# Add backend and vendor directories to sys.path
BACKEND_DIR = Path(__file__).resolve().parents[1]
VENDOR_DIR = BACKEND_DIR / ".vendor"
if VENDOR_DIR.exists():
    sys.path.insert(0, str(VENDOR_DIR))
sys.path.insert(0, str(BACKEND_DIR))

# Load local environment variables if available
try:
    import dotenv
    dotenv.load_dotenv(dotenv_path=BACKEND_DIR.parent / ".env.local")
except ImportError:
    pass

from sqlalchemy import create_engine, select, func, text
from sqlalchemy.orm import sessionmaker
from app import models
from app.database import Base

def parse_date(val):
    if not val:
        return None
    if isinstance(val, (datetime, date)):
        return val
    try:
        return datetime.fromisoformat(val).date()
    except ValueError:
        try:
            return datetime.strptime(val, "%Y-%m-%d").date()
        except ValueError:
            return None

def parse_datetime(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(val)
    except ValueError:
        return None

def align_schema(engine):
    from sqlalchemy import inspect
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    
    with engine.begin() as conn:
        for model in [models.Setting, models.Account, models.Employee, models.Transaction, models.SalaryHistory, models.SalaryPayment, models.User]:
            table_name = model.__tablename__
            if table_name not in existing_tables:
                continue
            
            db_cols = {col["name"].lower() for col in inspector.get_columns(table_name)}
            
            for column in model.__table__.columns:
                col_name = column.name
                if col_name.lower() in db_cols:
                    continue
                
                sql_type = str(column.type)
                default_clause = ""
                if column.default is not None:
                    if hasattr(column.default, "arg") and not callable(column.default.arg):
                        default_val = column.default.arg
                        if isinstance(default_val, str):
                            default_clause = f" DEFAULT '{default_val}'"
                        elif isinstance(default_val, bool):
                            default_clause = " DEFAULT " + ("true" if default_val else "false") if engine.dialect.name == "postgresql" else " DEFAULT " + ("1" if default_val else "0")
                        else:
                            default_clause = f" DEFAULT {default_val}"
                
                alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {sql_type}{default_clause}"
                print(f"Aligning schema: {alter_query}")
                conn.execute(text(alter_query))

def main():
    parser = argparse.ArgumentParser(description="Seed and recover the cash book database from JSON backup.")
    parser.add_argument(
        "--backup-file",
        default="C:/Users/HomePC/Downloads/bawar-star-backup-2026-07-01.json",
        help="Path to the JSON backup file."
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", "sqlite:///./cashbook.db"),
        help="Target Database Connection URL."
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip confirmation prompt."
    )
    args = parser.parse_args()

    backup_path = Path(args.backup_file).resolve()
    if not backup_path.exists():
        print(f"Error: Backup file not found at {backup_path}")
        sys.exit(1)

    print(f"Reading backup from: {backup_path}")
    with open(backup_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Relational Integrity Checks (Foreign Key Enforcement in Python)
    print("Validating relational integrity inside the backup data...")
    accounts_data = data.get("accounts", [])
    employees_data = data.get("employees", [])
    transactions_data = data.get("transactions", [])
    payments_data = data.get("salary_payments", [])
    history_data = data.get("salary_history", [])
    settings_data = data.get("settings", {})

    acc_ids = {a["id"] for a in accounts_data}
    emp_ids = {e["id"] for e in employees_data}
    tx_ids = {t["id"] for t in transactions_data}

    # Validate employees -> accounts
    for emp in employees_data:
        if emp["account_id"] not in acc_ids:
            raise ValueError(f"Constraint Violation: Employee ID {emp['id']} references missing Account ID {emp['account_id']}.")

    # Validate transactions -> accounts / employees
    for tx in transactions_data:
        if tx.get("account_id") and tx["account_id"] not in acc_ids:
            raise ValueError(f"Constraint Violation: Transaction ID {tx['id']} references missing Account ID {tx['account_id']}.")
        if tx.get("employee_id") and tx["employee_id"] not in emp_ids:
            raise ValueError(f"Constraint Violation: Transaction ID {tx['id']} references missing Employee ID {tx['employee_id']}.")

    # Validate salary history -> employees
    for hist in history_data:
        if hist["employee_id"] not in emp_ids:
            raise ValueError(f"Constraint Violation: Salary History ID {hist.get('id')} references missing Employee ID {hist['employee_id']}.")

    # Validate salary payments -> employees / transactions
    for pay in payments_data:
        if pay["employee_id"] not in emp_ids:
            raise ValueError(f"Constraint Violation: Salary Payment ID {pay.get('id')} references missing Employee ID {pay['employee_id']}.")
        if pay.get("cashbook_entry_id") and pay["cashbook_entry_id"] not in tx_ids:
            raise ValueError(f"Constraint Violation: Salary Payment ID {pay.get('id')} references missing Transaction ID {pay['cashbook_entry_id']}.")

    print("Relational integrity validation passed. No missing relational keys found.")

    from app.database import normalize_database_url
    db_url = normalize_database_url(args.database_url)

    print(f"Target Database: {db_url}")
    if not args.yes:
        confirm = input("WARNING: This will CLEAR existing settings, accounts, employees, transactions, and salary payments in the target database. Proceed? (y/N): ")
        if confirm.lower() not in ("y", "yes"):
            print("Operation cancelled.")
            sys.exit(0)

    # 2. Database connection & initialization
    import ssl
    engine_opts = {"pool_pre_ping": True}
    if db_url.startswith("postgresql+pg8000"):
        engine_opts["connect_args"] = {"ssl_context": ssl.create_default_context()}
    engine = create_engine(db_url, **engine_opts)
    Base.metadata.create_all(engine)
    align_schema(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Clear existing data in reverse dependency order
        print("Clearing existing data...")
        session.query(models.SalaryPayment).delete()
        session.query(models.SalaryHistory).delete()
        session.query(models.Transaction).delete()
        session.query(models.Employee).delete()
        session.query(models.Account).delete()
        session.query(models.Setting).delete()
        session.flush()

        # A. Settings Layer
        print("Seeding settings...")
        logo = settings_data.get("company_logo", "")
        # Keep logo exactly as Base64, company name, default exchange rate, base currency
        setting_row = models.Setting(
            id=settings_data.get("id", 1),
            company_name=settings_data.get("company_name", "BAWAR STAR PLASTIC INDUSTRY"),
            company_phone=settings_data.get("company_phone", ""),
            company_email=settings_data.get("company_email", ""),
            company_website="BAWARSTAR.COM",  # Keep support links pointing to BAWARSTAR.COM
            company_tax_number=settings_data.get("company_tax_number", ""),
            company_logo=logo,
            company_address=settings_data.get("company_address", ""),
            company_license=settings_data.get("company_license", ""),
            default_exchange_rate=float(settings_data.get("default_exchange_rate", 64.3)),
            default_currency="AFN",  # Central currency engine: AFN
            theme=settings_data.get("theme", "dark"),
            language=settings_data.get("language", "English"),
            date_display_format=settings_data.get("date_display_format", "dual"),
            print_footer_text=settings_data.get("print_footer_text", "Prepared by BAWAR STAR PLASTIC INDUSTRY"),
            auto_logout_minutes=int(settings_data.get("auto_logout_minutes", 30)),
            created_at=parse_datetime(settings_data.get("created_at")) or datetime.utcnow(),
            updated_at=parse_datetime(settings_data.get("updated_at")) or datetime.utcnow(),
        )
        session.add(setting_row)

        # B. Accounts Layer
        print(f"Seeding {len(accounts_data)} accounts...")
        for acc in accounts_data:
            session.add(models.Account(
                id=acc["id"],
                name=acc["name"],
                account_type=acc.get("account_type", "other"),
                phone=acc.get("phone", ""),
                address=acc.get("address", ""),
                opening_balance_afn=float(acc.get("opening_balance_afn", 0.0)),
                opening_balance_usd=float(acc.get("opening_balance_usd", 0.0)),
                note=acc.get("note", ""),
                created_at=parse_datetime(acc.get("created_at")) or datetime.utcnow(),
                updated_at=parse_datetime(acc.get("updated_at")) or datetime.utcnow(),
            ))

        # C. Employees Layer
        print(f"Seeding {len(employees_data)} employees...")
        for emp in employees_data:
            session.add(models.Employee(
                id=emp["id"],
                employee_code=emp["employee_code"],
                account_id=emp["account_id"],
                full_name=emp["full_name"],
                father_name=emp.get("father_name", ""),
                phone=emp.get("phone", ""),
                position=emp["position"],
                department=emp.get("department", ""),
                joining_date=parse_date(emp["joining_date"]),
                monthly_salary=float(emp.get("monthly_salary", 0.0)),
                currency=emp.get("currency", "AFN"),
                avatar_url=emp.get("avatar_url", ""),
                status=emp.get("status", "active"),
                notes=emp.get("notes", ""),
                created_at=parse_datetime(emp.get("created_at")) or datetime.utcnow(),
                updated_at=parse_datetime(emp.get("updated_at")) or datetime.utcnow(),
            ))

        # D. Transactions Layer
        print(f"Seeding {len(transactions_data)} transactions...")
        for tx in transactions_data:
            session.add(models.Transaction(
                id=tx["id"],
                transaction_no=tx.get("transaction_no", f"TX-{tx['id']}"),
                date=parse_date(tx["date"]),
                account_id=tx.get("account_id"),
                employee_id=tx.get("employee_id"),
                salary_month=parse_date(tx.get("salary_month")),
                payroll_kind=tx.get("payroll_kind"),
                account_name=tx["account_name"],
                detail=tx["detail"],
                transaction_type=tx["transaction_type"],
                cash_in_afn=float(tx.get("cash_in_afn", 0.0)),
                cash_out_afn=float(tx.get("cash_out_afn", 0.0)),
                usd_in=float(tx.get("usd_in", 0.0)),
                usd_out=float(tx.get("usd_out", 0.0)),
                exchange_rate=float(tx.get("exchange_rate", 64.3)),
                converted_afn=float(tx.get("converted_afn", 0.0)),
                payment_method=tx.get("payment_method", "cash"),
                category=tx.get("category", "other"),
                note=tx.get("note", ""),
                created_at=parse_datetime(tx.get("created_at")) or datetime.utcnow(),
                updated_at=parse_datetime(tx.get("updated_at")) or datetime.utcnow(),
            ))

        # E. Salary History Layer
        print(f"Seeding {len(history_data)} salary history entries...")
        for hist in history_data:
            session.add(models.SalaryHistory(
                id=hist["id"],
                employee_id=hist["employee_id"],
                old_salary=float(hist["old_salary"]),
                new_salary=float(hist["new_salary"]),
                old_currency=hist.get("old_currency", "AFN"),
                new_currency=hist.get("new_currency", "AFN"),
                effective_date=parse_date(hist["effective_date"]),
                changed_at=parse_datetime(hist.get("changed_at")) or datetime.utcnow(),
                changed_by=hist.get("changed_by", "Administrator"),
                reason=hist.get("reason", "Imported"),
                notes=hist.get("notes", ""),
            ))

        # F. Salary Payments Layer
        print(f"Seeding {len(payments_data)} salary payments...")
        for pay in payments_data:
            session.add(models.SalaryPayment(
                id=pay["id"],
                employee_id=pay["employee_id"],
                month=int(pay["month"]),
                year=int(pay["year"]),
                amount=float(pay["amount"]),
                payment_date=parse_date(pay["payment_date"]),
                payment_method=pay.get("payment_method", "cash"),
                notes=pay.get("notes", ""),
                cashbook_entry_id=pay.get("cashbook_entry_id"),
                created_at=parse_datetime(pay.get("created_at")) or datetime.utcnow(),
                updated_at=parse_datetime(pay.get("updated_at")) or datetime.utcnow(),
            ))

        session.commit()
        print("Database transaction committed successfully!")

        # 3. Sequence synchronization for PostgreSQL
        if engine.dialect.name == "postgresql":
            print("Syncing PostgreSQL primary key sequences...")
            with engine.begin() as conn:
                for table_name in ["settings", "accounts", "employees", "transactions", "salary_history", "salary_payments"]:
                    conn.execute(text(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{table_name}', 'id'),
                            coalesce((SELECT max(id) FROM {table_name}), 1),
                            true
                        )
                    """))
            print("Sequences synchronized.")

    except Exception as e:
        session.rollback()
        print(f"Error during restore, database rolled back: {e}")
        sys.exit(2)
    finally:
        session.close()

    print("Restoration Completed Successfully!")

if __name__ == "__main__":
    main()
