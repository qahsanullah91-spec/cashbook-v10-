@echo off
cd /d "%~dp0"

echo Starting SKY Cash Book Backend...
start "SKY Cash Book Backend" cmd /k "cd /d ""%~dp0backend"" && set ""PYTHONPATH=%~dp0backend"" && python -m uvicorn app.main:app --reload --port 8010"

timeout /t 5 /nobreak

echo Starting SKY Cash Book Frontend...
start "SKY Cash Book Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
