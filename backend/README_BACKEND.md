# Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`

Interactive docs: `http://127.0.0.1:8000/docs`

SQLite tables are created automatically in `cashbook.db`.
