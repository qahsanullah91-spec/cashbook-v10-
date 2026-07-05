import os
import sys

# Ensure project root is in sys.path so 'backend' can be resolved by Vercel
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app

__all__ = ["app"]

