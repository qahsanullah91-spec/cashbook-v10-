#!/usr/bin/env python3
"""
Restore cashbook backup from JSON file to the database.
This script reads a backup JSON file and restores it using the backup import API.
"""

import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.database import SessionLocal, Base, engine
from app import crud, models
from app.schemas import SettingUpdate, AccountCreate, EmployeeCreate


def restore_backup_from_file(backup_file: str, replace_all: bool = True) -> dict:
    """
    Restore backup data from a JSON file.
    
    Args:
        backup_file: Path to the backup JSON file
        replace_all: If True, replace all existing data; if False, merge with existing data
    
    Returns:
        Dictionary with import statistics
    """
    # Read the backup file
    backup_path = Path(backup_file)
    if not backup_path.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_file}")
    
    print(f"Reading backup file: {backup_file}")
    with open(backup_path, 'r', encoding='utf-8') as f:
        backup_data = json.load(f)
    
    # Create database session
    db = SessionLocal()
    
    try:
        print(f"Restoring backup (replace_all={replace_all})...")
        result = crud.import_backup(db, backup_data, replace_all=replace_all)
        print("Backup restoration completed successfully!")
        
        # Ensure default admin user exists
        _ensure_default_admin(db)
        
        return result
    except Exception as e:
        print(f"Error during backup restoration: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def _ensure_default_admin(db):
    """Ensure a default admin user exists."""
    admin_exists = db.query(models.User).filter(
        models.User.username == "admin"
    ).first()
    
    if admin_exists:
        return
    
    from app.routes.auth import hash_password, TEMPORARY_DEFAULT_PASSWORD
    
    admin = models.User(
        username="admin",
        full_name="Administrator",
        password_hash=hash_password(TEMPORARY_DEFAULT_PASSWORD),
        role="Administrator",
        is_active=True,
        must_change_password=True,
    )
    db.add(admin)
    db.commit()
    print(f"Created default admin user. Initial password: {TEMPORARY_DEFAULT_PASSWORD}")


def main():
    """Main entry point."""
    # Initialize database tables if they don't exist
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    
    # Path to the backup file
    backup_file = Path(__file__).parent / "backup.json"
    
    # Check for command-line argument
    if len(sys.argv) > 1:
        backup_file = Path(sys.argv[1])
    
    # Determine if we should replace all data
    replace_all = True
    if len(sys.argv) > 2:
        replace_all = sys.argv[2].lower() in ('true', '1', 'yes', 'replace')
    
    try:
        result = restore_backup_from_file(str(backup_file), replace_all=replace_all)
        print("\n✓ Backup restored successfully!")
        print(f"Results: {result}")
        return 0
    except Exception as e:
        print(f"\n✗ Backup restoration failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
