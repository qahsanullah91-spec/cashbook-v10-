import unittest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import crud, models
from app.database import Base


class BackupRestoreCompatibilityTests(unittest.TestCase):
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

    def test_imports_legacy_backup_field_names_without_server_error(self):
        payload = {
            "backup": {
                "settings": {
                    "companyName": "Legacy Bawar",
                    "dateFormat": "English",
                    "exchangeRate": "64.30",
                },
                "accounts": [
                    {
                        "accountName": "Legacy Customer",
                        "type": "Client",
                        "openingBalance": "1,000 AFN",
                    }
                ],
                "employees": [
                    {
                        "id": "emp-old-1",
                        "employeeName": "Legacy Worker",
                        "role": "Machine Operator",
                        "joiningDate": "2026-06-01T09:00:00",
                        "salary": "7,500 AFN",
                        "active": True,
                        "avatar": "https://example.test/avatar.png",
                    }
                ],
                "records": [
                    {
                        "id": "tx-cash-in",
                        "date": "2026-06-14T12:00:00",
                        "accountName": "Legacy Customer",
                        "description": "Opening payment",
                        "type": "Cash In",
                        "amount": "1,200 AFN",
                        "method": "Cash",
                    },
                    {
                        "id": "tx-salary",
                        "date": "06/16/2026",
                        "employeeId": "emp-old-1",
                        "accountName": "Legacy Worker",
                        "description": "Old salary payment",
                        "type": "Payment",
                        "amount": "3,000 AFN",
                        "category": "Employee Salary",
                        "method": "Transfer",
                    },
                ],
                "salaryPayments": [
                    {
                        "employeeId": "emp-old-1",
                        "cashbookEntryId": "tx-salary",
                        "amount": "3,000 AFN",
                        "paymentDate": "2026/06/16",
                        "method": "Bank",
                    }
                ],
            }
        }

        result = crud.import_backup(self.db, payload, replace_all=True)

        self.assertEqual(1, result["imported_accounts"])
        self.assertEqual(1, result["imported_employees"])
        self.assertEqual(2, result["imported_transactions"])
        self.assertEqual(1, result["imported_salary_payments"])
        self.assertEqual(2, self.db.query(models.Transaction).count())

        settings = crud.get_settings(self.db)
        employee = self.db.query(models.Employee).filter_by(full_name="Legacy Worker").one()
        salary_payment = self.db.query(models.SalaryPayment).one()

        self.assertEqual("Legacy Bawar", settings.company_name)
        self.assertEqual("gregorian", settings.date_display_format)
        self.assertEqual("Machine Operator", employee.position)
        self.assertEqual(7500, employee.monthly_salary)
        self.assertEqual("https://example.test/avatar.png", employee.avatar_url)
        self.assertEqual(3000, salary_payment.amount)
        self.assertEqual(date(2026, 6, 16), salary_payment.payment_date)
        self.assertEqual("bank", salary_payment.payment_method)

    def test_invalid_backup_root_does_not_clear_existing_data(self):
        crud.create_account(
            self.db,
            crud.schemas.AccountCreate(name="Keep Me", account_type="customer"),
        )

        with self.assertRaisesRegex(ValueError, "JSON object"):
            crud.import_backup(self.db, ["not", "an", "object"], replace_all=True)

        self.assertEqual(1, self.db.query(models.Account).count())


if __name__ == "__main__":
    unittest.main()
