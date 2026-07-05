import csv
from io import StringIO
from datetime import date

from pydantic import ValidationError

from . import schemas


class CsvImportError(ValueError):
    pass


HEADER_ALIASES = {
    "date": "date",
    "transaction_date": "date",
    "account": "account_name",
    "account_name": "account_name",
    "party": "account_name",
    "description": "detail",
    "detail": "detail",
    "details": "detail",
    "type": "transaction_type",
    "transaction_type": "transaction_type",
    "cash_in": "cash_in_afn",
    "cash_in_afn": "cash_in_afn",
    "afn_in": "cash_in_afn",
    "cash_out": "cash_out_afn",
    "cash_out_afn": "cash_out_afn",
    "afn_out": "cash_out_afn",
    "usd_in": "usd_in",
    "usd_out": "usd_out",
    "exchange_rate": "exchange_rate",
    "rate": "exchange_rate",
    "payment_method": "payment_method",
    "payment": "payment_method",
    "category": "category",
    "note": "note",
    "notes": "note",
}


def _header(value: str | None) -> str:
    normalized = (value or "").strip().lower().replace("-", "_").replace(" ", "_")
    return HEADER_ALIASES.get(normalized, normalized)


def _text(row: dict[str, str], key: str, default: str = "") -> str:
    return (row.get(key) or default).strip()


def _number(row: dict[str, str], key: str, row_number: int) -> float:
    raw = _text(row, key)
    if not raw:
        return 0.0
    try:
        return round(float(raw.replace(",", "")), 2)
    except ValueError as error:
        raise CsvImportError(f"Row {row_number}: {key} must be a number") from error


def parse_cashbook_csv(content: str) -> list[schemas.TransactionCreate]:
    if not content or not content.strip():
        raise CsvImportError("CSV file is empty")

    reader = csv.DictReader(StringIO(content.lstrip("\ufeff")))
    if not reader.fieldnames:
        raise CsvImportError("CSV header row is missing")

    normalized_headers = [_header(name) for name in reader.fieldnames]
    if len(set(normalized_headers)) != len(normalized_headers):
        raise CsvImportError("CSV contains duplicate column names")
    reader.fieldnames = normalized_headers

    required = {"date", "account_name", "detail"}
    missing = sorted(required.difference(normalized_headers))
    if missing:
        raise CsvImportError(f"Missing required columns: {', '.join(missing)}")

    parsed = []
    for row_number, row in enumerate(reader, start=2):
        if not any((value or "").strip() for value in row.values()):
            continue

        raw_date = _text(row, "date")
        try:
            transaction_date = date.fromisoformat(raw_date)
        except ValueError as error:
            raise CsvImportError(f"Row {row_number}: date must be a valid date in YYYY-MM-DD format") from error

        cash_in_afn = _number(row, "cash_in_afn", row_number)
        cash_out_afn = _number(row, "cash_out_afn", row_number)
        usd_in = _number(row, "usd_in", row_number)
        usd_out = _number(row, "usd_out", row_number)
        exchange_rate = _number(row, "exchange_rate", row_number)
        has_cash_in = cash_in_afn > 0 or usd_in > 0
        has_cash_out = cash_out_afn > 0 or usd_out > 0
        if has_cash_in and has_cash_out:
            raise CsvImportError(f"Row {row_number}: both cash in and cash out amounts are present")

        transaction_type = _text(row, "transaction_type").lower().replace(" ", "_")
        if transaction_type in {"in", "income", "cashin"}:
            transaction_type = "cash_in"
        elif transaction_type in {"out", "expense", "cashout"}:
            transaction_type = "cash_out"
        if not transaction_type:
            transaction_type = "cash_in" if has_cash_in else "cash_out" if has_cash_out else ""
        if transaction_type not in {"cash_in", "cash_out"}:
            raise CsvImportError(f"Row {row_number}: transaction_type must be cash_in or cash_out")
        if transaction_type == "cash_in" and has_cash_out:
            raise CsvImportError(f"Row {row_number}: cash_in rows cannot contain cash_out amounts")
        if transaction_type == "cash_out" and has_cash_in:
            raise CsvImportError(f"Row {row_number}: cash_out rows cannot contain cash_in amounts")

        payload = {
            "date": transaction_date,
            "account_name": _text(row, "account_name"),
            "detail": _text(row, "detail"),
            "transaction_type": transaction_type,
            "cash_in_afn": cash_in_afn,
            "cash_out_afn": cash_out_afn,
            "usd_in": usd_in,
            "usd_out": usd_out,
            "exchange_rate": exchange_rate,
            "payment_method": _text(row, "payment_method", "cash").lower().replace(" ", "_"),
            "category": _text(row, "category", "other").lower().replace(" ", "_"),
            "note": _text(row, "note"),
        }
        try:
            transaction = schemas.TransactionCreate(**payload)
        except ValidationError as error:
            message = error.errors()[0].get("msg", "invalid value")
            raise CsvImportError(f"Row {row_number}: {message}") from error
        if not transaction.account_name:
            raise CsvImportError(f"Row {row_number}: account_name is required")
        if not transaction.detail:
            raise CsvImportError(f"Row {row_number}: detail is required")
        try:
            from .crud import _validate_transaction

            _validate_transaction(transaction)
        except ValueError as error:
            raise CsvImportError(f"Row {row_number}: {error}") from error
        parsed.append(transaction)

    if not parsed:
        raise CsvImportError("CSV file contains no transaction rows")
    return parsed
