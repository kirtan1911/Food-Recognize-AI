# 🥗 AI Food Recognition & Calorie Estimation System

An AI-powered web application that recognizes food from images and provides detailed nutrition and calorie information, helping users track their meals, health goals, and overall wellness.

---

## ✨ Features

- 🔐 User Registration, Login & Forgot Password (OTP via Email)
- 📸 Image Upload + AI Food Recognition (Google Gemini)
- 🎥 Webcam Capture Support
- 🍱 Multi-Food Recognition in a Single Image
- 🥑 Detailed Nutrition Info (Protein, Carbs, Fat, Fiber, Sugar, Sodium)
- 📅 Meal Saving & History Tracking
- 🎯 Daily Calorie Goal Tracking
- ⚖️ BMI Calculator & Weight Tracker
- 💧 Water Intake Tracker
- 🏃 Exercise Tracker with Net Calorie Calculation
- 🥗 Healthy Meal Score
- 🤖 AI-Powered Diet Recommendations
- 📊 Interactive Dashboard, Charts & Analytics
- 📄 PDF & CSV Report Downloads
- ⭐ Favorite Meals
- 🔍 Manual Food Search
- ⏰ Meal Reminders
- 🏆 Achievements & Badges
- 📈 Compare Reports (Current vs Previous Period)
- 🛠️ Admin Analytics Panel

---

## 🛠️ Tech Stack

| Layer     | Technology                                          |
|-----------|------------------------------------------------------|
| Frontend  | React 19, TailwindCSS, shadcn/ui, Recharts, React Router v7 |
| Backend   | FastAPI (Python), Uvicorn                            |
| Database  | MongoDB (Motor async driver)                         |
| AI Vision | Google Gemini 2.5 Flash                              |
| Auth      | JWT (Cookie + Bearer Header)                         |
| Email     | SMTP via Gmail (App Password)                        |
| Reports   | ReportLab (PDF), CSV                                 |
| Build     | CRACO (CRA + custom Webpack aliases)                 |

---

## 📁 Project Structure

```
Food-Recognize/
├── backend/
│   ├── app/
│   │   ├── .env
│   │   └── server.py
│   ├── requirements.txt
│   ├── RequirementSample.txt
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── Components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── craco.config.js
│   └── tailwind.config.js
│
├── docs/
│   ├── HOW_TO_RUN.md
│   └── TODO.md
│
├── test_report/
│   └── iteration_1.json
│
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and **Yarn 1.x**
- **MongoDB** (local or Atlas)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/kirtan1911/Food-Recognize-AI.git
cd Food-Recognize-AI
```

### 2. Start MongoDB

```bash
mongod --dbpath "C:\data\db"
```

### 3. Set Up the Backend

```bash
cd backend
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.server:app --host 0.0.0.0 --port 8001 --reload
```

Backend runs at: `http://localhost:8001`
API Docs (Swagger UI): `http://localhost:8001/docs`

### 4. Set Up the Frontend

```bash
cd frontend
yarn install
yarn start
```

Frontend runs at: `http://localhost:3000`

---

## 🔑 Environment Variables

### `backend/app/.env`

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=food_ai_db
CORS_ORIGINS=*
JWT_SECRET=<your-secret>
GEMINI_API_KEY=<your-gemini-api-key>
ADMIN_EMAIL=admin@foodai.com
ADMIN_PASSWORD=<your-admin-password>
SMTP_FROM=<your-email>
SMTP_PASSWORD=<your-gmail-app-password>
```

### `frontend/.env`

```
REACT_APP_BACKEND_URL=http://localhost:8001
```

> ⚠️ Never commit `.env` files to version control. Use `.env.example` for sharing variable names without secrets.

---

## 🔗 App Navigation

| Page              | Route              |
|-------------------|--------------------|
| Landing           | `/`                |
| Login             | `/login`           |
| Register          | `/register`        |
| Forgot Password   | `/forgot-password` |
| Dashboard         | `/dashboard`       |
| Scan Food         | `/scan`            |
| Meal History      | `/history`         |
| Analytics         | `/analytics`       |
| Reports           | `/reports`         |
| Health Hub        | `/health-hub`      |
| Food Search       | `/food-search`     |
| Favorites         | `/favorites`       |
| Achievements      | `/achievements`    |
| Compare Reports   | `/compare-reports` |
| Profile           | `/profile`         |
| Admin Panel       | `/admin` (admin only) |

---

## 📚 Documentation

- [How to Run](docs/HOW_TO_RUN.md)
- [Project TODOs](docs/TODO.md)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](https://github.com/kirtan1911/Food-Recognize-AI/issues).

---

## 📄 License

This project is currently unlicensed. Add a license file if you plan to open-source it.

---

## 👤 Author

**Kirtan Barot**
GitHub: [@kirtan1911](https://github.com/kirtan1911)
