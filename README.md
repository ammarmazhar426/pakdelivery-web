# PakDelivery Pro — Web App

## Quick Start

### Option 1 — One Click
Double click `start.bat`

### Option 2 — Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Then open: **http://localhost:3000**

## Stack
- Backend: FastAPI (Python)
- Frontend: React + Tailwind
- Database: orders.json (same as desktop app)
- WhatsApp: UltraMsg API

## Deploy (Hostinger VPS)
```bash
# Backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
npm run build
# Upload dist/ folder to Hostinger
```
