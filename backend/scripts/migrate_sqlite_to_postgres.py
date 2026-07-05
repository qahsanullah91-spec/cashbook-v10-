import argparse
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
VENDOR_DIR = BACKEND_DIR / ".vendor"
if VENDOR_DIR.exists():
    sys.path.insert(0, str(VENDOR_DIR))
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import create_engine, func, select


def normalize_postgres_url(url: str) -> str:
    from app.database import normalize_database_url
    return normalize_database_url(url)


def main() -> None:
    parser = argparse.ArgumentParser(description="Copy the local SQLite cash book into PostgreSQL.")
    parser.add_argument(
        "--source",
        default=str(BACKEND_DIR / "cashbook.db"),
        help="Path to the source SQLite database.",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete existing cloud business data before importing.",
    )
    args = parser.parse_args()

    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise SystemExit("DATABASE_URL is required.")
    if database_url.startswith("sqlite"):
        raise SystemExit("DATABASE_URL must point to PostgreSQL.")

    source_path = Path(args.source).resolve()
    if not source_path.exists():
        raise SystemExit(f"Source database not found: {source_path}")

    os.environ["DATABASE_URL"] = normalize_postgres_url(database_url)

    from app.database import Base
    from app import models

    import ssl
    target_db_url = normalize_postgres_url(database_url)
    target_opts = {"pool_pre_ping": True}
    if target_db_url.startswith("postgresql+pg8000"):
        target_opts["connect_args"] = {"ssl_context": ssl.create_default_context()}

    source_engine = create_engine(f"sqlite:///{source_path.as_posix()}")
    target_engine = create_engine(target_db_url, **target_opts)
    Base.metadata.create_all(target_engine)

    ordered_tables = [
        models.Setting.__table__,
        models.Account.__table__,
        models.User.__table__,
        models.Transaction.__table__,
        models.BackupLog.__table__,
        models.AuditLog.__table__,
        models.BackupSnapshot.__table__,
    ]

    with source_engine.connect() as source, target_engine.begin() as target:
        existing_transactions = target.execute(select(func.count()).select_from(models.Transaction.__table__)).scalar_one()
        existing_accounts = target.execute(select(func.count()).select_from(models.Account.__table__)).scalar_one()
        if (existing_transactions or existing_accounts) and not args.replace:
            raise SystemExit("Cloud database already contains business data. Re-run with --replace only after backup.")

        if args.replace:
            for table in reversed(ordered_tables):
                target.execute(table.delete())

        imported = {}
        for table in ordered_tables:
            rows = [dict(row) for row in source.execute(select(table)).mappings()]
            if rows:
                target.execute(table.insert(), rows)
            imported[table.name] = len(rows)

        # Old browser sessions stay local. Every cloud user must sign in again.
        target.execute(models.UserSession.__table__.delete())

        if target_engine.dialect.name == "postgresql":
            for table in ordered_tables:
                if "id" not in table.c:
                    continue
                target.execute(
                    select(func.setval(
                        func.pg_get_serial_sequence(table.name, "id"),
                        func.coalesce(select(func.max(table.c.id)).scalar_subquery(), 1),
                        True,
                    ))
                )

    print(f"Migration completed from {source_path}")
    for table_name, count in imported.items():
        print(f"{table_name}: {count}")
    print("user_sessions: 0 (intentionally excluded)")


if __name__ == "__main__":
    main()
