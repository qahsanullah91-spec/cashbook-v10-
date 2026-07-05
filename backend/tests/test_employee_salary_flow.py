import unittest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import crud, schemas
from app.database import Base
from app.payroll import create_employee, create_salary_history, create_salary_payment, delete_employee, delete_salary_payment, employee_salary_summary, salary_report


class EmployeeSalaryFlowTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def test_cash_out_reduces_employee_monthly_salary_balance(self):
        employee = create_employee(
            self.db,
            schemas.EmployeeCreate(
                full_name="Salary Test Employee",
                position="Operator",
                joining_date=date(2026, 6, 1),
                monthly_salary=30000,
                currency="AFN",
            ),
        )

        transaction = crud.create_transaction(
            self.db,
            schemas.TransactionCreate(
                date=date(2026, 6, 15),
                account_id=employee.account_id,
                account_name=employee.full_name,
                detail="Salary payment for Salary Test Employee - June 2026",
                transaction_type="cash_out",
                cash_out_afn=10000,
                exchange_rate=64.3,
                category="salary",
                payment_method="cash",
                employee_id=employee.id,
                salary_month=date(2026, 6, 1),
                payroll_kind="salary",
            ),
        )

        summary = employee_salary_summary(self.db, employee.id, date(2026, 6, 1))

        self.assertEqual("worker", employee.account.account_type)
        self.assertEqual(employee.id, transaction.employee_id)
        self.assertEqual(30000, summary["monthly_salary"])
        self.assertEqual(10000, summary["paid_amount"])
        self.assertEqual(20000, summary["remaining_salary"])
        self.assertEqual("AFN", summary["currency"])

    def test_salary_advance_is_separate_and_reduces_remaining_balance(self):
        employee = create_employee(
            self.db,
            schemas.EmployeeCreate(
                full_name="Advance Test Employee",
                position="Manager",
                joining_date=date(2026, 6, 1),
                monthly_salary=50000,
                currency="AFN",
            ),
        )
        for amount, kind in [(20000, "salary"), (5000, "advance")]:
            crud.create_transaction(
                self.db,
                schemas.TransactionCreate(
                    date=date(2026, 6, 15),
                    account_id=employee.account_id,
                    account_name=employee.full_name,
                    detail=f"{kind} payment",
                    transaction_type="cash_out",
                    cash_out_afn=amount,
                    exchange_rate=64.3,
                    category="salary",
                    payment_method="cash",
                    employee_id=employee.id,
                    salary_month=date(2026, 6, 1),
                    payroll_kind=kind,
                ),
            )

        summary = employee_salary_summary(self.db, employee.id, date(2026, 6, 1))
        self.assertEqual(20000, summary["paid_amount"])
        self.assertEqual(5000, summary["advance_taken"])
        self.assertEqual(25000, summary["remaining_salary"])

    def test_backup_and_clear_all_include_employee_salary_data(self):
        create_employee(
            self.db,
            schemas.EmployeeCreate(
                full_name="Backup Salary Employee",
                position="Operator",
                joining_date=date(2026, 6, 1),
                monthly_salary=30000,
                currency="AFN",
            ),
        )

        backup = crud.backup_payload(self.db)
        self.assertEqual("Backup Salary Employee", backup["employees"][0].full_name)

        crud.clear_all(self.db)
        self.assertEqual([], self.db.query(crud.models.Employee).all())

    def test_salary_payment_creates_linked_cashbook_entry_and_report_totals(self):
        employee = create_employee(
            self.db,
            schemas.EmployeeCreate(
                full_name="Report Salary Employee",
                position="Operator",
                department="Factory",
                joining_date=date(2026, 6, 1),
                monthly_salary=7500,
                currency="AFN",
            ),
        )

        payment = create_salary_payment(
            self.db,
            schemas.SalaryPaymentCreate(
                employee_id=employee.id,
                month=6,
                year=2026,
                amount=3000,
                payment_date=date(2026, 6, 16),
                payment_method="cash",
                notes="June salary",
            ),
        )
        transaction = crud.get_transaction(self.db, payment.cashbook_entry_id)
        report = salary_report(self.db, 6, 2026)
        row = report["rows"][0]

        self.assertIsNotNone(transaction)
        self.assertEqual("cash_out", transaction.transaction_type)
        self.assertEqual("salary", transaction.category)
        self.assertEqual(employee.id, transaction.employee_id)
        self.assertEqual(3000, row["paid_salary"])
        self.assertEqual(4500, row["remaining_salary"])
        self.assertEqual("Partial Paid", row["payment_status"])
        self.assertEqual(3000, report["summary"]["total_paid_this_month"])

        delete_salary_payment(self.db, payment)
        self.assertIsNone(crud.get_transaction(self.db, payment.cashbook_entry_id))

    def test_salary_change_keeps_old_month_and_updates_current_remaining(self):
        employee = create_employee(
            self.db,
            schemas.EmployeeCreate(
                full_name="Salary History Employee",
                position="Manager",
                joining_date=date(2026, 5, 1),
                monthly_salary=30000,
                currency="AFN",
            ),
        )
        create_salary_payment(
            self.db,
            schemas.SalaryPaymentCreate(
                employee_id=employee.id,
                month=6,
                year=2026,
                amount=10000,
                payment_date=date(2026, 6, 10),
                payment_method="cash",
            ),
        )
        create_salary_history(
            self.db,
            employee,
            schemas.SalaryHistoryCreate(
                new_salary=35000,
                new_currency="AFN",
                effective_date=date(2026, 6, 14),
                reason="Promotion",
            ),
            "Administrator",
        )

        may_row = salary_report(self.db, 5, 2026)["rows"][0]
        june_row = salary_report(self.db, 6, 2026)["rows"][0]
        self.assertEqual(30000, may_row["monthly_salary"])
        self.assertEqual(35000, june_row["monthly_salary"])
        self.assertEqual(10000, june_row["paid_salary"])
        self.assertEqual(30000, june_row["previous_carry_forward_balance"])
        self.assertEqual(65000, june_row["total_payable_salary"])
        self.assertEqual(55000, june_row["remaining_salary"])

    def test_salary_overpayment_creates_negative_carry_forward_for_next_month(self):
        employee = create_employee(
            self.db,
            schemas.EmployeeCreate(
                full_name="Advance Carry Employee",
                position="Operator",
                joining_date=date(2026, 6, 1),
                monthly_salary=12000,
                currency="AFN",
            ),
        )

        payment = create_salary_payment(
            self.db,
            schemas.SalaryPaymentCreate(
                employee_id=employee.id,
                month=6,
                year=2026,
                amount=15000,
                payment_date=date(2026, 6, 30),
                payment_method="cash",
            ),
        )
        june_row = salary_report(self.db, 6, 2026)["rows"][0]
        july_row = salary_report(self.db, 7, 2026)["rows"][0]

        self.assertEqual(15000, payment.amount)
        self.assertEqual(0, payment.previous_carry_forward_balance)
        self.assertEqual(12000, payment.total_payable_salary)
        self.assertEqual(-3000, payment.carry_forward_balance)
        self.assertEqual(-3000, june_row["carry_forward_balance"])
        self.assertEqual("Advance", june_row["payment_status"])
        self.assertEqual(-3000, july_row["previous_carry_forward_balance"])
        self.assertEqual(9000, july_row["total_payable_salary"])
        self.assertEqual(9000, july_row["remaining_salary"])

    def test_delete_employee_removes_salary_links_without_deleting_legacy_transactions(self):
        employee = create_employee(
            self.db,
            schemas.EmployeeCreate(
                full_name="Delete Salary Employee",
                position="Operator",
                joining_date=date(2026, 6, 1),
                monthly_salary=12000,
                currency="AFN",
            ),
        )
        payment = create_salary_payment(
            self.db,
            schemas.SalaryPaymentCreate(
                employee_id=employee.id,
                month=6,
                year=2026,
                amount=4000,
                payment_date=date(2026, 6, 12),
                payment_method="cash",
            ),
        )
        linked_cashbook_id = payment.cashbook_entry_id
        legacy_transaction = crud.create_transaction(
            self.db,
            schemas.TransactionCreate(
                date=date(2026, 6, 14),
                account_id=employee.account_id,
                account_name=employee.full_name,
                detail="Legacy salary cash out",
                transaction_type="cash_out",
                cash_out_afn=1000,
                exchange_rate=64.3,
                category="salary",
                payment_method="cash",
                employee_id=employee.id,
                salary_month=date(2026, 6, 1),
                payroll_kind="salary",
            ),
        )

        delete_employee(self.db, employee)
        self.assertIsNone(crud.get_transaction(self.db, linked_cashbook_id))
        self.assertIsNotNone(crud.get_transaction(self.db, legacy_transaction.id))
        self.assertIsNone(crud.get_transaction(self.db, legacy_transaction.id).employee_id)
        self.assertEqual([], salary_report(self.db, 6, 2026)["rows"])


if __name__ == "__main__":
    unittest.main()
