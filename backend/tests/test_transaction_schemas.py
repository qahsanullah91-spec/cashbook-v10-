import unittest
from datetime import date

from app.schemas import TransactionUpdate


class TransactionSchemaTests(unittest.TestCase):
    def test_update_accepts_iso_date_string(self):
        payload = TransactionUpdate(date="2026-06-14")

        self.assertEqual(date(2026, 6, 14), payload.date)


if __name__ == "__main__":
    unittest.main()
