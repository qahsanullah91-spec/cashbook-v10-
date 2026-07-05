@echo off
set "PYTHONPATH=%~dp0.vendor;%PYTHONPATH%"
python -m uvicorn %*
