@echo off
echo ====================================
echo   PakDelivery Pro - Web App
echo ====================================

echo.
echo [1/2] Starting Backend (FastAPI)...
cd backend
start "PakDelivery Backend" cmd /k "pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

echo.
echo [2/2] Starting Frontend (React)...
cd ../frontend
start "PakDelivery Frontend" cmd /k "npm install && npm run dev"

echo.
echo ====================================
echo  App chal raha hai!
echo  Browser mein kholo: http://localhost:3000
echo ====================================
pause
