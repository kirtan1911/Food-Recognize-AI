# AI Food Recognition & Calorie Estimation System — TODO & Run Guide

## ✅ Project Status: COMPLETE

All 20 features have been implemented and are fully functional.

---

## 🚀 How to Run the Project

### Prerequisites

Make sure you have the following installed:
- **Python 3.11+**
- **Node.js 18+** and **Yarn 1.x** (`npm install -g yarn`)
- **MongoDB** (running locally on port 27017, or use MongoDB Atlas)
- **Git**

---

### Step 1: Clone / Navigate to the Project

```bash
cd "c:\Users\kirtan barot\Desktop\Food-Recognize"
```

---

### Step 2: Start MongoDB

If MongoDB is installed locally, start it:

```bash
# On Windows (if installed as a service, it may already be running)
net start MongoDB

# Or start manually
mongod --dbpath "C:\data\db"
```

---

### Step 3: Start the Backend (FastAPI)

Open a **new terminal** and run:

```bash
# Navigate to the backend directory
cd "c:\Users\kirtan barot\Desktop\Food-Recognize\app\backend"

# Install Python dependencies (first time only)
pip install -r ..\..\requirements.txt
pip install google-generativeai pillow reportlab

# Start the FastAPI backend on port 8001
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The backend will be available at: **http://localhost:8001**

API docs (Swagger UI): **http://localhost:8001/docs**

---

### Step 4: Start the Frontend (React)

Open a **separate terminal** and run:

```bash
# Navigate to the project root (where package.json is)
cd "c:\Users\kirtan barot\Desktop\Food-Recognize"

# Install Node.js dependencies (first time only)
yarn install

# Start the React development server
yarn start
```

The frontend will be available at: **http://localhost:3000**

---

### Step 5: Open the App

1. Open your browser and go to: **http://localhost:3000**
2. You will see the Landing page.
3. Click **"Get started"** to register a new account, or use the admin credentials below.

---

## 🔑 Default Admin Credentials

| Field    | Value                     |
|----------|---------------------------|
| Email    | `admin@foodai.com`        |
| Password | `Admin123!`               |
| Role     | Admin (access Admin Panel) |

**Test User** (register fresh or use):
- Email: `test@foodai.com`
- Password: `Test123!`

---

## 🌐 Environment Variables

### Root `.env` (Frontend + DB config reference)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=food_ai_db
CORS_ORIGINS=*
REACT_APP_BACKEND_URL=http://localhost:8001
```

### `app/backend/.env` (Backend config)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=food_ai_db
CORS_ORIGINS=*
JWT_SECRET=<your-secret>
GEMINI_API_KEY=<your-gemini-api-key>
ADMIN_EMAIL=admin@foodai.com
ADMIN_PASSWORD=Admin123!
SMTP_FROM=kirtanbarot1911@gmail.com
SMTP_PASSWORD=<your-gmail-app-password>
```

> **Note:** `SMTP_PASSWORD` must be a Gmail App Password (not your regular Gmail password).
> To generate one: Google Account → Security → 2-Step Verification → App Passwords.

---

## ✅ Implemented Features

| # | Feature | Status |
|---|---------|--------|
| 1 | User Registration | ✅ |
| 2 | User Login | ✅ |
| 3 | Forgot Password (OTP via Email) | ✅ |
| 4 | Image Upload + Food Recognition (Gemini AI) | ✅ |
| 5 | Webcam Capture | ✅ |
| 6 | Multi-Food Recognition | ✅ |
| 7 | Nutrition Information (Protein, Carbs, Fat, Fiber, Sugar, Sodium) | ✅ |
| 8 | Meal Saving & History | ✅ |
| 9 | Daily Calorie Goal | ✅ |
| 10 | BMI Calculator | ✅ |
| 11 | Weight Tracker | ✅ |
| 12 | Water Intake Tracker | ✅ |
| 13 | Exercise Tracker + Net Calories | ✅ |
| 14 | Healthy Meal Score | ✅ |
| 15 | AI Recommendations (Gemini) | ✅ |
| 16 | Dashboard (full analytics) | ✅ |
| 17 | Charts & Analytics (interactive) | ✅ |
| 18 | PDF Report Download | ✅ |
| 19 | CSV Report Download | ✅ |
| 20 | Favorite Meals | ✅ |
| 21 | Manual Food Search | ✅ |
| 22 | Meal Reminders | ✅ |
| 23 | Achievements & Badges | ✅ |
| 24 | History Filtering (date/type/search) | ✅ |
| 25 | Compare Reports (This vs Last Period) | ✅ |
| 26 | Admin Analytics Panel | ✅ |

---

## 🔗 Navigation

| Page | URL |
|------|-----|
| Landing | `/` |
| Login | `/login` |
| Register | `/register` |
| Forgot Password | `/forgot-password` |
| Dashboard | `/dashboard` |
| Scan Food | `/scan` |
| Meal History | `/history` |
| Analytics & Charts | `/analytics` |
| Reports (PDF/CSV) | `/reports` |
| Health Hub (BMI/Weight/Water/Exercise) | `/health-hub` |
| Food Search | `/food-search` |
| Favorites | `/favorites` |
| Achievements | `/achievements` |
| Compare Reports | `/compare-reports` |
| Profile | `/profile` |
| Admin Panel | `/admin` (admin only) |

---

## 🛠️ Backend API Endpoints

All endpoints are prefixed with `/api`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Send OTP email |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/reset-password` | Reset password |
| GET/PUT | `/api/profile` | Get/Update profile |
| POST | `/api/predict` | AI food recognition |
| GET/POST | `/api/history` | Meal history |
| DELETE | `/api/history/{id}` | Delete meal |
| POST | `/api/history/{id}/favorite` | Toggle favorite |
| GET | `/api/favorites` | Get favorite meals |
| POST | `/api/favorites/{id}/log` | Log favorite as meal |
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/recommendations` | AI recommendations |
| GET | `/api/achievements` | Achievements |
| POST | `/api/bmi` | Calculate BMI |
| GET | `/api/bmi/history` | BMI history |
| POST/GET | `/api/weight` | Weight tracker |
| POST/GET | `/api/water` | Water logs |
| GET | `/api/water/today` | Today's water |
| PUT | `/api/water/goal` | Set water goal |
| POST/GET | `/api/exercise` | Exercise logs |
| GET/PUT | `/api/reminders` | Meal reminders |
| GET | `/api/foods` | Search food database |
| POST | `/api/foods/log` | Log manual food |
| GET | `/api/report/pdf` | Download PDF report |
| GET | `/api/report/csv` | Download CSV report |
| GET | `/api/report/compare` | Compare periods |
| GET | `/api/admin/stats` | Admin analytics |

---

## 🐛 Bug Fixes Applied

The following bugs were fixed during this upgrade:

1. **`Login.jsx`** — Unescaped `"` and `'` entities in JSX text → replaced with `&ldquo;`, `&rdquo;`, `&apos;`
2. **`Dashboard.jsx`** — Unescaped `'` in "Here's" text → replaced with `&apos;`
3. **`ForgotPassword.jsx`** — Unescaped `"` entities in quote text → replaced with `&ldquo;`/`&rdquo;`
4. **`AuthContext.jsx`** — Empty catch block `{}` → added `/* ignore */` comment to suppress lint error
5. **Root `.env`** — `DB_NAME` was `test_database` but backend uses `food_ai_db` → fixed to `food_ai_db`

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TailwindCSS, shadcn/ui, Recharts, React Router v7 |
| Backend | FastAPI (Python), Uvicorn |
| Database | MongoDB (Motor async driver) |
| AI Vision | Google Gemini 2.5 Flash |
| Auth | JWT (cookie + Bearer header) |
| Email | SMTP via Gmail (App Password) |
| Reports | ReportLab (PDF), CSV |
| Build | CRACO (CRA + custom webpack aliases) |

---

## 🔧 Troubleshooting

### Backend won't start — "ModuleNotFoundError"
```bash
pip install google-generativeai pillow reportlab python-multipart
```

### Frontend shows blank page
- Check that `REACT_APP_BACKEND_URL=http://localhost:8001` is set in root `.env`
- Make sure the backend is running on port 8001

### OTP email not received
- Set `SMTP_PASSWORD` in `app/backend/.env` to your Gmail App Password
- Check spam/junk folder
- The OTP is also logged to the backend console for development

### MongoDB connection error
- Ensure MongoDB is running: `mongod --dbpath "C:\data\db"`
- Verify `MONGO_URL=mongodb://localhost:27017` in both `.env` files

### "Invalid credentials" on login
- Try registering a new account
- Admin account is auto-created on startup: `admin@foodai.com` / `Admin123!`

run this project and if any error then debugging the project and create a RandomName.md file and write terminal command how to run this project in terminal 