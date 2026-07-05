# 🍽️ Nourish — AI Food Recognition & Calorie Estimator

## How to Run This Project

---

## 📋 Prerequisites

Make sure you have the following installed:

| Tool | Version | Check Command |
|------|---------|---------------|
| Python | 3.10+ | `python --version` |
| Node.js | 16+ | `node --version` |
| Yarn | 1.22+ | `yarn --version` |
| MongoDB | 6.0+ | Running locally on port 27017 |

---

## ⚙️ Environment Setup

The project has two `.env` files that must be configured:

### 1. Backend `.env` — `app/backend/.env`
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="food_ai_db"
CORS_ORIGINS="*"
JWT_SECRET="your-secret-key-here"
GEMINI_API_KEY="your-google-gemini-api-key"
ADMIN_EMAIL="admin@foodai.com"
ADMIN_PASSWORD="Admin123!"
SMTP_FROM="your-email@gmail.com"
SMTP_PASSWORD="your-gmail-app-password"
```

### 2. Root `.env` (Frontend) — `.env`
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="food_ai_db"
CORS_ORIGINS="*"
REACT_APP_BACKEND_URL=http://localhost:8001
ENABLE_HEALTH_CHECK=false
```

---

## 🚀 Running the Project

You need **two terminal windows** open — one for the backend and one for the frontend.

---

### 🔷 Terminal 1 — Backend (FastAPI)

```powershell
# Navigate to the backend directory
cd app\backend

# Install Python dependencies (first time only)
pip install -r ..\..\requirements.txt

# Start the backend server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

✅ Backend will be available at: **http://localhost:8001**
✅ API documentation (Swagger UI): **http://localhost:8001/docs**
✅ API docs (ReDoc): **http://localhost:8001/redoc**

---

### 🔷 Terminal 2 — Frontend (React + CRACO)

```powershell
# Navigate to the project root
cd c:\Users\kirtan barot\Desktop\Food-Recognize

# Install Node.js dependencies (first time only)
yarn install

# Start the frontend dev server
yarn start
```

✅ Frontend will be available at: **http://localhost:3000**

---

## 🗄️ MongoDB Setup

Make sure MongoDB is running locally before starting the app:

```powershell
# Start MongoDB (if installed as a Windows service)
net start MongoDB

# OR start manually if mongod is in PATH
mongod --dbpath "C:\data\db"
```

---

## 🛠️ Debugging Common Issues

### ❌ `ModuleNotFoundError: No module named 'PIL'`
```powershell
pip install pillow
```

### ❌ `ModuleNotFoundError: No module named 'google.genai'`
```powershell
pip install google-genai
```

### ❌ `ModuleNotFoundError: No module named 'reportlab'`
```powershell
pip install reportlab
```

### ❌ `ServerSelectionTimeoutError` (MongoDB not running)
- Start MongoDB service: `net start MongoDB`
- Or install MongoDB Community Edition from https://www.mongodb.com/try/download/community

### ❌ `GEMINI_API_KEY` error
- Get a free Gemini API key from: https://aistudio.google.com/apikey
- Add it to `app/backend/.env`

### ❌ Frontend `yarn start` fails (node_modules missing)
```powershell
yarn install
yarn start
```

### ❌ Port 8001 already in use
```powershell
# Find and kill the process using port 8001
netstat -ano | findstr :8001
taskkill /PID <PID> /F
```

---

## 📁 Project Structure

```
Food-Recognize/
├── app/
│   └── backend/
│       ├── server.py          # FastAPI backend (main server)
│       ├── .env               # Backend environment variables
│       └── frontend/
│           └── src/           # React frontend source files
│               ├── pages/     # All page components
│               ├── Components/# Reusable UI components
│               ├── context/   # Auth context & App router
│               └── lib/       # API client (axios)
├── src/
│   └── index.js              # React entry point
├── public/                   # Static assets
├── package.json              # Frontend dependencies
├── craco.config.js           # Webpack alias config
├── requirements.txt          # Python dependencies
├── .env                      # Frontend environment variables
└── HOW_TO_RUN.md            # This file
```

---

## 🔑 Default Admin Login

After the server starts, a default admin account is auto-created:

| Field | Value |
|-------|-------|
| Email | `admin@foodai.com` |
| Password | `Admin123!` |

---

## 🌐 API Endpoints Overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/` | Health check |
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login |
| `POST /api/predict` | AI food image recognition |
| `GET /api/dashboard` | Dashboard stats |
| `GET /api/history` | Meal history |
| `GET /api/recommendations` | AI nutrition recommendations |
| `GET /api/report/pdf` | Download PDF report |
| `GET /api/report/csv` | Download CSV report |
| `GET /api/admin/stats` | Admin analytics (admin only) |

---

## 🐳 Docker (Optional)

To run using Docker:

```powershell
# Build and run with Docker
docker build -t food-recognize .
docker run -p 8001:8001 food-recognize
```

---

## 📞 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TailwindCSS, Recharts, Framer Motion |
| **Backend** | FastAPI, Uvicorn, Python 3.12 |
| **Database** | MongoDB (Motor async driver) |
| **AI** | Google Gemini 2.5 Flash (Vision + Text) |
| **Auth** | JWT + bcrypt |
| **PDF/CSV** | ReportLab, Python CSV |
