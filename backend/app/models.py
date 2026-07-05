from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    account_type = Column(String(30), default="other", nullable=False, index=True)
    phone = Column(String(100), default="", nullable=False)
    address = Column(Text, default="", nullable=False)
    opening_balance_afn = Column(Float, default=0.0, nullable=False)
    opening_balance_usd = Column(Float, default=0.0, nullable=False)
    note = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    employee = relationship("Employee", back_populates="account", uselist=False)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(40), unique=True, nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    father_name = Column(String(255), default="", nullable=False)
    phone = Column(String(100), default="", nullable=False)
    position = Column(String(180), nullable=False)
    department = Column(String(180), default="", nullable=False)
    joining_date = Column(Date, nullable=False)
    monthly_salary = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="AFN", nullable=False)
    avatar_url = Column(Text, default="", nullable=False)
    status = Column(String(20), default="active", nullable=False, index=True)
    notes = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    account = relationship("Account", back_populates="employee")
    transactions = relationship("Transaction", back_populates="employee")
    salary_payments = relationship("SalaryPayment", back_populates="employee", cascade="all, delete-orphan")
    salary_history = relationship("SalaryHistory", back_populates="employee", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_no = Column(String(40), unique=True, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)
    salary_month = Column(Date, nullable=True, index=True)
    payroll_kind = Column(String(20), nullable=True, index=True)
    account_name = Column(String(255), nullable=False, index=True)
    detail = Column(Text, nullable=False)
    transaction_type = Column(String(20), nullable=False, index=True)
    cash_in_afn = Column(Float, default=0.0, nullable=False)
    cash_out_afn = Column(Float, default=0.0, nullable=False)
    usd_in = Column(Float, default=0.0, nullable=False)
    usd_out = Column(Float, default=0.0, nullable=False)
    exchange_rate = Column(Float, default=0.0, nullable=False)
    converted_afn = Column(Float, default=0.0, nullable=False)
    payment_method = Column(String(30), default="cash", nullable=False, index=True)
    category = Column(String(40), default="other", nullable=False, index=True)
    note = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    account = relationship("Account", back_populates="transactions")
    employee = relationship("Employee", back_populates="transactions")
    salary_payment = relationship("SalaryPayment", back_populates="cashbook_entry", uselist=False)


class SalaryPayment(Base):
    __tablename__ = "salary_payments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    amount = Column(Float, default=0.0, nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    payment_method = Column(String(30), default="cash", nullable=False, index=True)
    notes = Column(Text, default="", nullable=False)
    previous_carry_forward_balance = Column(Float, default=0.0, nullable=False)
    total_payable_salary = Column(Float, default=0.0, nullable=False)
    carry_forward_balance = Column(Float, default=0.0, nullable=False)
    cashbook_entry_id = Column(Integer, ForeignKey("transactions.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    employee = relationship("Employee", back_populates="salary_payments")
    cashbook_entry = relationship("Transaction", back_populates="salary_payment")


class SalaryHistory(Base):
    __tablename__ = "salary_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    old_salary = Column(Float, nullable=False)
    new_salary = Column(Float, nullable=False)
    old_currency = Column(String(10), default="AFN", nullable=False)
    new_currency = Column(String(10), default="AFN", nullable=False)
    effective_date = Column(Date, nullable=False, index=True)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    changed_by = Column(String(255), nullable=False)
    reason = Column(String(255), nullable=False)
    notes = Column(Text, default="", nullable=False)

    employee = relationship("Employee", back_populates="salary_history")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), default="BAWAR STAR PLASTIC INDUSTRY", nullable=False)
    company_phone = Column(String(100), default="", nullable=False)
    company_email = Column(String(180), default="", nullable=False)
    company_website = Column(String(180), default="", nullable=False)
    company_tax_number = Column(String(120), default="", nullable=False)
    company_logo = Column(Text, default="", nullable=False)
    company_address = Column(Text, default="", nullable=False)
    company_license = Column(String(100), default="", nullable=False)
    default_exchange_rate = Column(Float, default=64.3, nullable=False)
    default_currency = Column(String(10), default="AFN", nullable=False)
    theme = Column(String(20), default="dark", nullable=False)
    language = Column(String(20), default="English", nullable=False)
    date_display_format = Column(String(20), default="dual", nullable=False)
    print_footer_text = Column(Text, default="Prepared by BAWAR STAR PLASTIC INDUSTRY", nullable=False)
    auto_logout_minutes = Column(Integer, default=30, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BackupLog(Base):
    __tablename__ = "backup_logs"

    id = Column(Integer, primary_key=True, index=True)
    backup_name = Column(String(255), nullable=False)
    backup_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    backup_type = Column(String(30), default="export", nullable=False)
    file_path = Column(Text, default="", nullable=False)
    note = Column(Text, default="", nullable=False)


class BackupSnapshot(Base):
    __tablename__ = "backup_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    backup_name = Column(String(255), unique=True, nullable=False)
    backup_type = Column(String(30), default="manual", nullable=False, index=True)
    payload = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    username = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), default="Administrator", nullable=False, index=True)
    avatar_path = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    failed_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    must_change_password = Column(Boolean, default=False, nullable=False)
    password_changed_at = Column(DateTime, nullable=True)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(80), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    username = Column(String(120), default="", nullable=False)
    action = Column(String(80), nullable=False)
    status = Column(String(30), nullable=False)
    detail = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
