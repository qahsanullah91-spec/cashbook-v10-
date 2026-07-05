from pathlib import Path
import runpy
import sys


BACKEND_DIR = Path(__file__).resolve().parent.parent
VENDOR_DIR = BACKEND_DIR / ".vendor"

sys.modules.pop("uvicorn", None)
sys.path = [
    str(VENDOR_DIR),
    str(BACKEND_DIR),
    *[
        path for path in sys.path
        if path not in ("", str(BACKEND_DIR), str(VENDOR_DIR))
    ],
]

runpy.run_module("uvicorn", run_name="__main__", alter_sys=True)
