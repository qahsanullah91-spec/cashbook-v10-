import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.csv_import import CsvImportError, parse_cashbook_csv
from app.crud import import_cashbook_csv


class CashbookCsvImportTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        models.Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def test_parses_quoted_values_and_infers_cash_in_type(self):
        rows = parse_cashbook_csv(
            "\ufeffDate,Account,Description,Cash In AFN,Payment Method,Category,Note\n"
            '2026-06-14,"Ahmad Trading","Opening, payment",1250.50,Cash,Other,"Imported row"\n'
        )

        self.assertEqual(1, len(rows))
        self.assertEqual("Ahmad Trading", rows[0].account_name)
        self.assertEqual("Opening, payment", rows[0].detail)
        self.assertEqual("cash_in", rows[0].transaction_type)
        self.assertEqual(1250.50, rows[0].cash_in_afn)
        self.assertEqual("cash", rows[0].payment_method)

    def test_parses_usd_cash_out_with_exchange_rate(self):
        rows = parse_cashbook_csv(
            "date,account_name,detail,transaction_type,usd_out,exchange_rate\n"
            "2026-06-13,Supplier One,Material purchase,cash_out,100,70\n"
        )

        self.assertEqual("cash_out", rows[0].transaction_type)
        self.assertEqual(100, rows[0].usd_out)
        self.assertEqual(70, rows[0].exchange_rate)

    def test_reports_row_number_for_invalid_data(self):
        with self.assertRaisesRegex(CsvImportError, "Row 2.*valid date"):
            parse_cashbook_csv(
                "date,account_name,detail,cash_in_afn\n"
                "not-a-date,Customer,Payment,100\n"
            )

    def test_rejects_rows_with_both_cash_in_and_cash_out(self):
        with self.assertRaisesRegex(CsvImportError, "Row 2.*both cash in and cash out"):
            parse_cashbook_csv(
                "date,account_name,detail,cash_in_afn,cash_out_afn\n"
                "2026-06-14,Customer,Payment,100,50\n"
            )

    def test_rejects_type_that_disagrees_with_amount_columns(self):
        with self.assertRaisesRegex(CsvImportError, "Row 2.*cash_out amounts"):
            parse_cashbook_csv(
                "date,account_name,detail,transaction_type,cash_out_afn\n"
                "2026-06-14,Customer,Payment,cash_in,100\n"
            )

    def test_import_creates_accounts_and_skips_exact_duplicates(self):
        content = (
            "date,account_name,detail,cash_in_afn\n"
            "2026-06-14,New Customer,Payment,100\n"
        )

        first = import_cashbook_csv(self.db, content, "first.csv")
        second = import_cashbook_csv(self.db, content, "second.csv")

        self.assertEqual(1, first["imported_transactions"])
        self.assertEqual(1, first["created_accounts"])
        self.assertEqual(0, second["imported_transactions"])
        self.assertEqual(1, second["skipped_duplicates"])
        self.assertEqual(1, self.db.query(models.Transaction).count())
        self.assertEqual(1, self.db.query(models.Account).count())


if __name__ == "__main__":
    unittest.main()
