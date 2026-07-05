import os
import ssl

from sqlalchemy import create_engine, inspect
from sqlalchemy import text
from sqlalchemy.orm import declarative_base, sessionmaker


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+pg8000://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+pg8000://", 1)
    
    # pg8000 does not accept standard libpq query params like sslmode, channel_binding, etc.
    # We strip query params for pg8000 and pass SSL context via connect_args.
    if url.startswith("postgresql+pg8000://") and "?" in url:
        url = url.split("?")[0]
        
    return url


def resolve_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL", "").strip()
    is_vercel = os.getenv("VERCEL") == "1"
    is_production = os.getenv("VERCEL_ENV") == "production"

    if not raw_url:
        if is_vercel:
            raise RuntimeError("DATABASE_URL is required on Vercel. Configure the Neon/Postgres connection string in the project environment.")
        raw_url = "sqlite:///./cashbook.db"

    database_url = normalize_database_url(raw_url)
    if is_production and database_url.startswith("sqlite"):
        raise RuntimeError("Production Vercel DATABASE_URL must point to Neon/Postgres, not SQLite.")

    return database_url


DATABASE_URL = resolve_database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_PG8000 = DATABASE_URL.startswith("postgresql+pg8000")

engine_options = {"pool_pre_ping": True}
if IS_SQLITE:
    engine_options["connect_args"] = {"check_same_thread": False}
elif IS_PG8000:
    engine_options["connect_args"] = {"ssl_context": ssl.create_default_context()}

engine = create_engine(DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_sqlite_schema():
    """Add columns introduced after the first local database version.

    SQLite create_all does not alter existing tables, so this keeps older local
    cashbook.db files usable without a destructive reset.
    """
    if not IS_SQLITE:
        return

    with engine.begin() as conn:
        tables = {row[0] for row in conn.execute(text("select name from sqlite_master where type='table'"))}

        def columns(table):
            if table not in tables:
                return set()
            return {row[1] for row in conn.execute(text(f"pragma table_info({table})"))}

        def add(table, column_sql):
            name = column_sql.split()[0]
            if table in tables and name not in columns(table):
                conn.execute(text(f"alter table {table} add column {column_sql}"))

        for column_sql in [
            "account_type VARCHAR(30) DEFAULT 'other'",
            "phone VARCHAR(100) DEFAULT ''",
            "address TEXT DEFAULT ''",
            "note TEXT DEFAULT ''",
            "updated_at DATETIME",
        ]:
            add("accounts", column_sql)

        for column_sql in [
            "transaction_no VARCHAR(40) DEFAULT ''",
            "transaction_type VARCHAR(20) DEFAULT 'cash_in'",
            "converted_afn FLOAT DEFAULT 0",
            "payment_method VARCHAR(30) DEFAULT 'cash'",
            "category VARCHAR(40) DEFAULT 'other'",
        ]:
            add("transactions", column_sql)

        transaction_cols = columns("transactions")
        if "transactions" in tables:
            if "type" in transaction_cols:
                conn.execute(text("update transactions set transaction_type = type where transaction_type is null or transaction_type = ''"))
            conn.execute(text("update transactions set converted_afn = coalesce(nullif(cash_in_afn, 0), cash_out_afn, 0) where converted_afn is null or converted_afn = 0"))
            conn.execute(text("update transactions set transaction_no = 'TX-' || replace(date, '-', '') || '-' || printf('%04d', id) where transaction_no is null or transaction_no = ''"))
            conn.execute(text("update transactions set updated_at = coalesce(updated_at, created_at, CURRENT_TIMESTAMP)"))

        for column_sql in [
            "company_phone VARCHAR(100) DEFAULT ''",
            "company_email VARCHAR(180) DEFAULT ''",
            "company_website VARCHAR(180) DEFAULT ''",
            "company_tax_number VARCHAR(120) DEFAULT ''",
            "company_logo TEXT DEFAULT ''",
            "company_address TEXT DEFAULT ''",
            "company_license VARCHAR(100) DEFAULT ''",
            "default_currency VARCHAR(10) DEFAULT 'AFN'",
            "language VARCHAR(20) DEFAULT 'English'",
            "date_display_format VARCHAR(20) DEFAULT 'dual'",
            "print_footer_text TEXT DEFAULT 'Prepared by BAWAR STAR PLASTIC INDUSTRY'",
            "auto_logout_minutes INTEGER DEFAULT 30",
        ]:
            add("settings", column_sql)

        for column_sql in [
            "created_at DATETIME",
            "updated_at DATETIME",
            "must_change_password BOOLEAN DEFAULT 0",
            "password_changed_at DATETIME",
        ]:
            add("users", column_sql)

        if "users" in tables:
            user_cols = columns("users")
            if "created_at" in user_cols:
                conn.execute(text("update users set created_at = coalesce(created_at, created_date, CURRENT_TIMESTAMP)"))
            if "updated_at" in user_cols:
                conn.execute(text("update users set updated_at = coalesce(updated_at, created_at, created_date, CURRENT_TIMESTAMP)"))

        if "accounts" in tables:
            conn.execute(text("update accounts set updated_at = coalesce(updated_at, created_at, CURRENT_TIMESTAMP)"))
        if "settings" in tables:
            conn.execute(text("update settings set updated_at = coalesce(updated_at, created_at, CURRENT_TIMESTAMP)"))


def ensure_user_schema():
    """Keep deployed user tables aligned with the current auth model."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    timestamp_type = "DATETIME" if IS_SQLITE else "TIMESTAMP"
    boolean_type = "BOOLEAN DEFAULT 0" if IS_SQLITE else "BOOLEAN DEFAULT false"
    additions = [
        ("created_at", timestamp_type),
        ("updated_at", timestamp_type),
        ("must_change_password", boolean_type),
        ("password_changed_at", timestamp_type),
    ]

    with engine.begin() as conn:
        for name, sql_type in additions:
            if name not in user_columns:
                conn.execute(text(f"alter table users add column {name} {sql_type}"))
                user_columns.add(name)

        created_source = "created_date" if "created_date" in user_columns else "CURRENT_TIMESTAMP"
        if "created_at" in user_columns:
            conn.execute(text(f"update users set created_at = coalesce(created_at, {created_source}, CURRENT_TIMESTAMP)"))
        if "updated_at" in user_columns:
            conn.execute(text(f"update users set updated_at = coalesce(updated_at, created_at, {created_source}, CURRENT_TIMESTAMP)"))


def ensure_payroll_schema():
    """Add payroll columns to existing local/deployed tables."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "transactions" in tables:
            transaction_columns = {column["name"] for column in inspector.get_columns("transactions")}
            for name, sql_type in [
                ("employee_id", "INTEGER"),
                ("salary_month", "DATE"),
                ("payroll_kind", "VARCHAR(20)"),
            ]:
                if name not in transaction_columns:
                    conn.execute(text(f"alter table transactions add column {name} {sql_type}"))

        if "employees" in tables:
            employee_columns = {column["name"] for column in inspector.get_columns("employees")}
            if "avatar_url" not in employee_columns:
                conn.execute(text("alter table employees add column avatar_url TEXT DEFAULT ''"))

        if "salary_payments" in tables:
            salary_payment_columns = {column["name"] for column in inspector.get_columns("salary_payments")}
            for name in ["previous_carry_forward_balance", "total_payable_salary", "carry_forward_balance"]:
                if name not in salary_payment_columns:
                    conn.execute(text(f"alter table salary_payments add column {name} FLOAT DEFAULT 0"))
