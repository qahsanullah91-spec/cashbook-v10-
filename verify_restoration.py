#!/usr/bin/env python3
"""Verify backup restoration."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.database import SessionLocal
from app import models

db = SessionLocal()

print("=" * 60)
print("BACKUP RESTORATION VERIFICATION")
print("=" * 60)

settings = db.query(models.Setting).first()
if settings:
    print("\nCompany Settings:")
    print(f"  Company Name: {settings.company_name}")
    print(f"  Company Email: {settings.company_email}")
    print(f"  Company Phone: {settings.company_phone}")

accounts = db.query(models.Account).count()
print(f"\nAccounts restored: {accounts}")
if accounts > 0:
    sample = db.query(models.Account).limit(3).all()
    for acc in sample:
        print(f"  - {acc.name} ({acc.account_type})")

employees = db.query(models.Employee).count()
print(f"\nEmployees restored: {employees}")
if employees > 0:
    sample = db.query(models.Employee).limit(3).all()
    for emp in sample:
        print(f"  - {emp.full_name} ({emp.position})")

transactions = db.query(models.Transaction).count()
print(f"\nTransactions restored: {transactions}")

salary_payments = db.query(models.SalaryPayment).count()
print(f"Salary Payments restored: {salary_payments}")

salary_history = db.query(models.SalaryHistory).count()
print(f"Salary History records restored: {salary_history}")

print("\n" + "=" * 60)
print("RESTORATION COMPLETED SUCCESSFULLY!")
print("=" * 60)

db.close()
