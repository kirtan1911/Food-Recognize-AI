from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import json
import base64
import secrets
import csv
import io
import asyncio
import smtplib
import random
import string
from datetime import datetime, timezone, timedelta, date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Literal

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from google import genai
from google.genai import types as genai_types

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("foodai")

# ---------- App / DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

app = FastAPI(title="AI Food Recognition & Calorie Estimator")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
GEMINI_API_KEY = os.environ['GEMINI_API_KEY']
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

SMTP_FROM = os.environ.get('SMTP_FROM', 'kirtanbarot1911@gmail.com')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileIn(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    fitness_goal: Optional[Literal["lose", "maintain", "gain"]] = None
    daily_calorie_target: Optional[int] = None
    daily_water_goal_ml: Optional[int] = None

class ForgotIn(BaseModel):
    email: EmailStr

class VerifyOTPIn(BaseModel):
    email: EmailStr
    otp: str

class ResetIn(BaseModel):
    email: EmailStr
    otp: str
    new_password: str = Field(min_length=6)

class HistoryIn(BaseModel):
    food_name: str
    confidence: float
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    serving_size: str = ""
    healthy_score: int = 0
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    image_b64: Optional[str] = None
    items: Optional[List[dict]] = None

class BMIIn(BaseModel):
    height_cm: float
    weight_kg: float

class WeightIn(BaseModel):
    weight_kg: float
    note: Optional[str] = ""

class WaterIn(BaseModel):
    amount_ml: int

class WaterGoalIn(BaseModel):
    daily_goal_ml: int

class ExerciseIn(BaseModel):
    exercise_name: str
    duration_min: int
    calories_burned: float
    notes: Optional[str] = ""

class ReminderIn(BaseModel):
    breakfast: Optional[str] = None   # "HH:MM" or None
    lunch: Optional[str] = None
    dinner: Optional[str] = None
    snack: Optional[str] = None
    enabled: bool = True

class FoodSearchIn(BaseModel):
    query: str
    calories: float
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    serving_size: str = ""
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] = "snack"

# ---------- Helpers ----------
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def make_token(uid: str, email: str, ttl_minutes: int = 60 * 24 * 7) -> str:
    payload = {
        "sub": uid,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def serialize_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "age": u.get("age"),
        "gender": u.get("gender"),
        "height_cm": u.get("height_cm"),
        "weight_kg": u.get("weight_kg"),
        "fitness_goal": u.get("fitness_goal"),
        "daily_calorie_target": u.get("daily_calorie_target", 2000),
        "daily_water_goal_ml": u.get("daily_water_goal_ml", 2000),
        "role": u.get("role", "user"),
    }

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return user

def set_auth_cookie(resp: Response, token: str):
    resp.set_cookie(
        "access_token", token,
        httponly=True, secure=False, samesite="lax",
        max_age=60 * 60 * 24 * 7, path="/"
    )

def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(to_email: str, otp: str, name: str = "User") -> bool:
    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD not set — OTP email not sent. OTP: %s", otp)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Nourish Password Reset OTP"
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        html = f"""
        <html><body style="font-family: 'Helvetica Neue', sans-serif; background: #f9f7f2; padding: 40px 0;">
          <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 24px; padding: 40px; border: 1px solid #e8e6e0;">
            <div style="text-align:center; margin-bottom: 32px;">
              <div style="display:inline-flex; align-items:center; gap:8px;">
                <div style="width:36px; height:36px; background:#2C4C3B; border-radius:10px; display:inline-block;"></div>
                <span style="font-size:22px; font-weight:700; color:#1a2e22;">Nourish</span>
              </div>
            </div>
            <h2 style="color:#1a2e22; margin:0 0 8px;">Password Reset OTP</h2>
            <p style="color:#6b7c74; margin:0 0 28px;">Hi {name}, use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
            <div style="background:#f0f7f2; border-radius:16px; padding:24px; text-align:center; margin-bottom:28px;">
              <span style="font-size:40px; font-weight:800; letter-spacing:12px; color:#2C4C3B;">{otp}</span>
            </div>
            <p style="color:#9ba8a1; font-size:13px; margin:0;">If you did not request this, ignore this email. Your account is safe.</p>
          </div>
        </body></html>
        """
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SMTP_FROM, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error("Email send failed: %s", e)
        return False

# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_pw(body.password),
        "name": body.name,
        "role": "user",
        "daily_calorie_target": 2000,
        "daily_water_goal_ml": 2000,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = make_token(str(res.inserted_id), email)
    set_auth_cookie(response, token)
    return {"user": serialize_user(doc), "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(str(user["_id"]), email)
    set_auth_cookie(response, token)
    return {"user": serialize_user(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return serialize_user(user)

# ---------- Forgot Password (OTP-based) ----------
@api.post("/auth/forgot-password")
async def forgot(body: ForgotIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if user:
        otp = generate_otp(6)
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        # Invalidate previous OTPs for this email
        await db.otps.update_many({"email": email, "used": False}, {"$set": {"used": True}})
        await db.otps.insert_one({
            "email": email,
            "otp": otp,
            "expires_at": expires,
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        sent = await asyncio.to_thread(send_otp_email, email, otp, user.get("name", "User"))
        if not sent:
            logger.info(f"[DEV OTP] Email: {email} OTP: {otp}")
    return {"ok": True, "message": "If that email is registered, an OTP has been sent."}

@api.post("/auth/verify-otp")
async def verify_otp(body: VerifyOTPIn):
    email = body.email.lower()
    rec = await db.otps.find_one({"email": email, "otp": body.otp, "used": False})
    if not rec:
        raise HTTPException(400, "Invalid OTP")
    if ensure_utc(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "OTP has expired. Please request a new one.")
    return {"ok": True, "message": "OTP verified"}

@api.post("/auth/reset-password")
async def reset(body: ResetIn):
    email = body.email.lower()
    rec = await db.otps.find_one({"email": email, "otp": body.otp, "used": False})
    if not rec:
        raise HTTPException(400, "Invalid OTP")
    if ensure_utc(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "OTP has expired")
    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": hash_pw(body.new_password)}}
    )
    await db.otps.update_one({"_id": rec["_id"]}, {"$set": {"used": True}})
    return {"ok": True, "message": "Password reset successfully"}

# ---------- Profile ----------
@api.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    return serialize_user(user)

@api.put("/profile")
async def update_profile(body: ProfileIn, user=Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    u = await db.users.find_one({"_id": user["_id"]})
    return serialize_user(u)

# ---------- Food Prediction (Google Gemini Vision) ----------
PREDICT_SYSTEM = """You are a nutrition vision expert. The user uploads a food photo.
Identify the primary food item (and any visible side items). Estimate nutrition for the visible portion.
Reply STRICTLY with valid JSON only (no markdown, no commentary), matching this schema:
{
  "food_name": string,
  "confidence": number between 0 and 1,
  "items": [{"name": string, "calories": number, "protein": number, "carbs": number, "fat": number}],
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "serving_size": string,
  "healthy_score": integer 0-100,
  "health_rating": string (one of: "Excellent", "Good", "Fair", "Poor"),
  "health_explanation": string (1-2 sentences why this score),
  "bounding_box": {"x": number, "y": number, "w": number, "h": number}
}
If no food is visible, return {"food_name":"unknown","confidence":0,...zeros...}.
Units: calories=kcal, macros=grams, sodium=mg. Bounding box values in 0..1 relative coordinates."""

def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    s = text.find("{")
    e = text.rfind("}")
    if s == -1 or e == -1:
        raise ValueError("No JSON object found")
    return json.loads(text[s:e + 1])

@api.post("/predict")
async def predict(file: UploadFile = File(...), user=Depends(get_current_user)):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/jpg"}:
        raise HTTPException(400, "Unsupported image format. Use JPG/PNG/WEBP.")
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(400, "Image exceeds 10MB")

    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img.thumbnail((1280, 1280))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        jpeg_bytes = buf.getvalue()
    except Exception:
        raise HTTPException(400, "Invalid image")

    b64 = base64.b64encode(jpeg_bytes).decode()

    started = datetime.now(timezone.utc)
    try:
        image_part = genai_types.Part.from_bytes(
            data=jpeg_bytes,
            mime_type="image/jpeg"
        )
        response = await asyncio.to_thread(
            gemini_client.models.generate_content,
            model="gemini-2.5-flash",
            contents=["Analyze this food image and return the JSON only.", image_part],
            config=genai_types.GenerateContentConfig(
                system_instruction=PREDICT_SYSTEM
            )
        )
        reply = response.text
    except Exception as e:
        logger.exception("LLM error")
        raise HTTPException(502, f"AI service error: {e}")

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()

    try:
        data = _extract_json(reply if isinstance(reply, str) else str(reply))
    except Exception:
        raise HTTPException(502, "AI returned invalid JSON")

    data["prediction_time"] = round(elapsed, 2)
    data["image_b64"] = b64
    return data

# ---------- History ----------
@api.post("/history")
async def add_history(body: HistoryIn, user=Depends(get_current_user)):
    doc = body.model_dump()
    doc["user_id"] = str(user["_id"])
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["is_favorite"] = False
    await db.history.insert_one(doc)
    doc.pop("_id", None)

    # Auto-check achievements
    await _check_achievements(str(user["_id"]))

    return doc

@api.get("/history")
async def list_history(
    user=Depends(get_current_user),
    limit: int = 500,
    meal_type: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = {"user_id": str(user["_id"])}
    if meal_type and meal_type != "all":
        query["meal_type"] = meal_type
    if search:
        query["food_name"] = {"$regex": search, "$options": "i"}
    if date_from:
        query.setdefault("created_at", {})["$gte"] = date_from
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to + "T23:59:59Z"
    cursor = db.history.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)

@api.delete("/history/{hid}")
async def del_history(hid: str, user=Depends(get_current_user)):
    res = await db.history.delete_one({"id": hid, "user_id": str(user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api.post("/history/{hid}/favorite")
async def toggle_favorite(hid: str, user=Depends(get_current_user)):
    item = await db.history.find_one({"id": hid, "user_id": str(user["_id"])})
    if not item:
        raise HTTPException(404, "Not found")
    new_val = not item.get("is_favorite", False)
    await db.history.update_one({"id": hid}, {"$set": {"is_favorite": new_val}})
    return {"ok": True, "is_favorite": new_val}

@api.get("/favorites")
async def get_favorites(user=Depends(get_current_user)):
    cursor = db.history.find(
        {"user_id": str(user["_id"]), "is_favorite": True}, {"_id": 0}
    ).sort("created_at", -1)
    return await cursor.to_list(200)

@api.post("/favorites/{hid}/log")
async def log_favorite(hid: str, meal_type: str = "snack", user=Depends(get_current_user)):
    item = await db.history.find_one({"id": hid, "user_id": str(user["_id"]), "is_favorite": True})
    if not item:
        raise HTTPException(404, "Favorite not found")
    new_doc = {k: v for k, v in item.items() if k not in ["_id", "id", "created_at"]}
    new_doc["id"] = str(uuid.uuid4())
    new_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    new_doc["meal_type"] = meal_type
    new_doc["is_favorite"] = False
    await db.history.insert_one(new_doc)
    new_doc.pop("_id", None)
    return new_doc

# ---------- BMI ----------
@api.post("/bmi")
async def add_bmi(body: BMIIn, user=Depends(get_current_user)):
    h_m = body.height_cm / 100
    bmi = round(body.weight_kg / (h_m * h_m), 1)
    if bmi < 18.5:
        category = "Underweight"
    elif bmi < 25:
        category = "Normal weight"
    elif bmi < 30:
        category = "Overweight"
    else:
        category = "Obese"
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": str(user["_id"]),
        "height_cm": body.height_cm,
        "weight_kg": body.weight_kg,
        "bmi": bmi,
        "category": category,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bmi_records.insert_one(doc)
    doc.pop("_id", None)
    # Update user profile weight
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"weight_kg": body.weight_kg, "height_cm": body.height_cm}})
    return doc

@api.get("/bmi/history")
async def get_bmi_history(user=Depends(get_current_user)):
    cursor = db.bmi_records.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).limit(50)
    return await cursor.to_list(50)

# ---------- Weight Tracker ----------
@api.post("/weight")
async def add_weight(body: WeightIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": str(user["_id"]),
        "weight_kg": body.weight_kg,
        "note": body.note or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.weight_records.insert_one(doc)
    doc.pop("_id", None)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"weight_kg": body.weight_kg}})
    return doc

@api.get("/weight")
async def get_weight(user=Depends(get_current_user)):
    cursor = db.weight_records.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).limit(90)
    return await cursor.to_list(90)

@api.delete("/weight/{wid}")
async def del_weight(wid: str, user=Depends(get_current_user)):
    res = await db.weight_records.delete_one({"id": wid, "user_id": str(user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

# ---------- Water Intake ----------
@api.post("/water")
async def add_water(body: WaterIn, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": str(user["_id"]),
        "amount_ml": body.amount_ml,
        "date": today,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.water_logs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/water/today")
async def water_today(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    logs = await db.water_logs.find(
        {"user_id": str(user["_id"]), "date": today}, {"_id": 0}
    ).to_list(100)
    total = sum(l["amount_ml"] for l in logs)
    goal = user.get("daily_water_goal_ml", 2000)
    return {"logs": logs, "total_ml": total, "goal_ml": goal, "remaining_ml": max(0, goal - total)}

@api.get("/water/history")
async def water_history(user=Depends(get_current_user), days: int = 30):
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()
    logs = await db.water_logs.find(
        {"user_id": str(user["_id"]), "date": {"$gte": cutoff}}, {"_id": 0}
    ).to_list(1000)
    # Group by date
    by_date = {}
    for l in logs:
        d = l["date"]
        by_date[d] = by_date.get(d, 0) + l["amount_ml"]
    result = [{"date": d, "total_ml": v} for d, v in sorted(by_date.items())]
    return result

@api.put("/water/goal")
async def set_water_goal(body: WaterGoalIn, user=Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"daily_water_goal_ml": body.daily_goal_ml}})
    return {"ok": True, "daily_goal_ml": body.daily_goal_ml}

@api.delete("/water/{wid}")
async def del_water(wid: str, user=Depends(get_current_user)):
    res = await db.water_logs.delete_one({"id": wid, "user_id": str(user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

# ---------- Exercise Tracker ----------
@api.post("/exercise")
async def add_exercise(body: ExerciseIn, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": str(user["_id"]),
        "exercise_name": body.exercise_name,
        "duration_min": body.duration_min,
        "calories_burned": body.calories_burned,
        "notes": body.notes or "",
        "date": today,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.exercise_logs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/exercise")
async def get_exercise(user=Depends(get_current_user), days: int = 30):
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()
    cursor = db.exercise_logs.find(
        {"user_id": str(user["_id"]), "date": {"$gte": cutoff}}, {"_id": 0}
    ).sort("created_at", -1)
    return await cursor.to_list(500)

@api.delete("/exercise/{eid}")
async def del_exercise(eid: str, user=Depends(get_current_user)):
    res = await db.exercise_logs.delete_one({"id": eid, "user_id": str(user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

# ---------- Meal Reminders ----------
@api.get("/reminders")
async def get_reminders(user=Depends(get_current_user)):
    doc = await db.reminders.find_one({"user_id": str(user["_id"])}, {"_id": 0})
    if not doc:
        return {"breakfast": None, "lunch": None, "dinner": None, "snack": None, "enabled": False}
    return doc

@api.put("/reminders")
async def set_reminders(body: ReminderIn, user=Depends(get_current_user)):
    doc = body.model_dump()
    doc["user_id"] = str(user["_id"])
    await db.reminders.update_one({"user_id": str(user["_id"])}, {"$set": doc}, upsert=True)
    return {"ok": True}

# ---------- Achievements ----------
ACHIEVEMENT_DEFS = [
    {"id": "first_meal", "name": "First Bite", "description": "Log your first meal", "icon": "🍽️", "threshold": 1, "field": "meal_count"},
    {"id": "meals_10", "name": "Getting Started", "description": "Log 10 meals", "icon": "🌱", "threshold": 10, "field": "meal_count"},
    {"id": "meals_50", "name": "Dedicated Tracker", "description": "Log 50 meals", "icon": "🏅", "threshold": 50, "field": "meal_count"},
    {"id": "meals_100", "name": "Century Logger", "description": "Log 100 meals", "icon": "💯", "threshold": 100, "field": "meal_count"},
    {"id": "healthy_week", "name": "Healthy Week", "description": "Avg healthy score ≥ 70 for 7+ meals", "icon": "🥗", "threshold": 70, "field": "avg_healthy_score"},
    {"id": "goal_achieved", "name": "Goal Crusher", "description": "Stay within calorie goal for a day", "icon": "🎯", "threshold": 1, "field": "goal_days"},
    {"id": "water_goal", "name": "Hydration Hero", "description": "Reach water goal for 3 days", "icon": "💧", "threshold": 3, "field": "water_goal_days"},
    {"id": "exercise_week", "name": "Active Week", "description": "Log exercise 5+ times in a week", "icon": "🏃", "threshold": 5, "field": "weekly_exercises"},
    {"id": "streak_7", "name": "Week Streak", "description": "Log meals every day for 7 days", "icon": "🔥", "threshold": 7, "field": "streak_days"},
]

async def _compute_stats(user_id: str) -> dict:
    uid = user_id
    items = await db.history.find({"user_id": uid}, {"_id": 0}).to_list(5000)
    meal_count = len(items)
    avg_healthy = sum(i.get("healthy_score", 0) for i in items) / max(1, meal_count)

    # streak days
    days_logged = set(i["created_at"][:10] for i in items)
    streak = 0
    d = datetime.now(timezone.utc).date()
    for _ in range(365):
        if d.isoformat() in days_logged:
            streak += 1
            d -= timedelta(days=1)
        else:
            break

    # goal days (simplified: at least 1 day within target)
    user = await db.users.find_one({"_id": ObjectId(uid)})
    target = user.get("daily_calorie_target", 2000) if user else 2000
    by_day = {}
    for i in items:
        d_str = i["created_at"][:10]
        by_day[d_str] = by_day.get(d_str, 0) + i.get("calories", 0)
    goal_days = sum(1 for v in by_day.values() if v <= target)

    # water goal days
    today = datetime.now(timezone.utc).date()
    water_goal = user.get("daily_water_goal_ml", 2000) if user else 2000
    water_days = 0
    for i in range(30):
        d_str = (today - timedelta(days=i)).isoformat()
        logs = await db.water_logs.find({"user_id": uid, "date": d_str}, {"_id": 0}).to_list(100)
        if sum(l["amount_ml"] for l in logs) >= water_goal:
            water_days += 1

    # weekly exercises
    week_ago = (today - timedelta(days=7)).isoformat()
    exercises_this_week = await db.exercise_logs.count_documents({"user_id": uid, "date": {"$gte": week_ago}})

    return {
        "meal_count": meal_count,
        "avg_healthy_score": round(avg_healthy, 1),
        "goal_days": goal_days,
        "water_goal_days": water_days,
        "weekly_exercises": exercises_this_week,
        "streak_days": streak,
    }

async def _check_achievements(user_id: str):
    stats = await _compute_stats(user_id)
    for ach in ACHIEVEMENT_DEFS:
        field = ach["field"]
        threshold = ach["threshold"]
        val = stats.get(field, 0)
        if val >= threshold:
            existing = await db.achievements.find_one({"user_id": user_id, "achievement_id": ach["id"]})
            if not existing:
                await db.achievements.insert_one({
                    "user_id": user_id,
                    "achievement_id": ach["id"],
                    "earned_at": datetime.now(timezone.utc).isoformat(),
                })

@api.get("/achievements")
async def get_achievements(user=Depends(get_current_user)):
    uid = str(user["_id"])
    stats = await _compute_stats(uid)
    earned_docs = await db.achievements.find({"user_id": uid}, {"_id": 0}).to_list(100)
    earned_ids = {d["achievement_id"] for d in earned_docs}
    earned_map = {d["achievement_id"]: d for d in earned_docs}

    result = []
    for ach in ACHIEVEMENT_DEFS:
        field = ach["field"]
        current_val = stats.get(field, 0)
        threshold = ach["threshold"]
        is_earned = ach["id"] in earned_ids
        if not is_earned and current_val >= threshold:
            # auto-earn
            await db.achievements.insert_one({
                "user_id": uid,
                "achievement_id": ach["id"],
                "earned_at": datetime.now(timezone.utc).isoformat(),
            })
            is_earned = True
            earned_map[ach["id"]] = {"earned_at": datetime.now(timezone.utc).isoformat()}

        result.append({
            **ach,
            "earned": is_earned,
            "earned_at": earned_map.get(ach["id"], {}).get("earned_at"),
            "current_value": current_val,
            "progress_pct": min(100, round((current_val / threshold) * 100)),
        })
    return {"achievements": result, "stats": stats}

# ---------- AI Recommendations ----------
RECO_SYSTEM = """You are a nutrition expert AI. Analyze the user's recent meal history and provide personalized recommendations.
Return STRICTLY valid JSON only:
{
  "foods_to_increase": [{"food": string, "reason": string}],
  "foods_to_reduce": [{"food": string, "reason": string}],
  "deficiencies": [{"nutrient": string, "suggestion": string}],
  "alternatives": [{"instead_of": string, "try": string, "benefit": string}],
  "daily_tips": [string],
  "overall_score": integer 0-100,
  "summary": string (2-3 sentences overall assessment)
}"""

@api.get("/recommendations")
async def get_recommendations(user=Depends(get_current_user)):
    uid = str(user["_id"])
    # Check cached reco (valid for 6h)
    cached = await db.recommendations.find_one({"user_id": uid}, {"_id": 0})
    if cached:
        cached_at = datetime.fromisoformat(cached.get("generated_at", "2000-01-01T00:00:00+00:00"))
        if (datetime.now(timezone.utc) - cached_at).total_seconds() < 6 * 3600:
            return cached

    # Get last 30 meals
    items = await db.history.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(30)
    if not items:
        return {
            "foods_to_increase": [],
            "foods_to_reduce": [],
            "deficiencies": [{"nutrient": "Data", "suggestion": "Log more meals to get personalized recommendations"}],
            "alternatives": [],
            "daily_tips": ["Start by logging your first meal using the Scan feature!"],
            "overall_score": 0,
            "summary": "Log at least a few meals to receive personalized AI recommendations.",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # Summarize for AI
    meal_summary = []
    for i in items[:15]:
        meal_summary.append(f"- {i.get('food_name', 'Unknown')}: {i.get('calories', 0)} kcal, P:{i.get('protein', 0)}g, C:{i.get('carbs', 0)}g, F:{i.get('fat', 0)}g, Fiber:{i.get('fiber', 0)}g, Score:{i.get('healthy_score', 0)}")

    avg_cal = sum(i.get("calories", 0) for i in items) / len(items)
    avg_protein = sum(i.get("protein", 0) for i in items) / len(items)
    avg_carbs = sum(i.get("carbs", 0) for i in items) / len(items)
    avg_fat = sum(i.get("fat", 0) for i in items) / len(items)
    avg_fiber = sum(i.get("fiber", 0) for i in items) / len(items)

    prompt = f"""User meal history (last {len(items)} meals):
{chr(10).join(meal_summary)}

Averages per meal: {avg_cal:.0f} kcal, Protein: {avg_protein:.1f}g, Carbs: {avg_carbs:.1f}g, Fat: {avg_fat:.1f}g, Fiber: {avg_fiber:.1f}g
Daily calorie target: {user.get('daily_calorie_target', 2000)} kcal
Fitness goal: {user.get('fitness_goal', 'not set')}

Provide personalized nutrition recommendations."""

    try:
        response = await asyncio.to_thread(
            gemini_client.models.generate_content,
            model="gemini-2.5-flash",
            contents=[prompt],
            config=genai_types.GenerateContentConfig(
                system_instruction=RECO_SYSTEM
            )
        )
        data = _extract_json(response.text)
    except Exception as e:
        logger.error("Recommendations AI error: %s", e)
        data = {
            "foods_to_increase": [{"food": "Vegetables", "reason": "Increase fiber and micronutrient intake"}],
            "foods_to_reduce": [],
            "deficiencies": [],
            "alternatives": [],
            "daily_tips": ["Stay hydrated throughout the day", "Aim for balanced macros in each meal"],
            "overall_score": 60,
            "summary": "Keep tracking your meals consistently for more accurate recommendations.",
        }

    data["generated_at"] = datetime.now(timezone.utc).isoformat()
    data["user_id"] = uid
    await db.recommendations.update_one({"user_id": uid}, {"$set": data}, upsert=True)
    data.pop("_id", None)
    return data

# ---------- Dashboard ----------
def _day_key(iso: str) -> str:
    return iso[:10]

@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    start_week = today - timedelta(days=6)
    uid = str(user["_id"])
    items = await db.history.find({"user_id": uid}, {"_id": 0}).to_list(5000)

    target = user.get("daily_calorie_target", 2000) or 2000
    today_items = [i for i in items if _day_key(i["created_at"]) == today.isoformat()]
    daily_cal = sum(i.get("calories", 0) for i in today_items)
    protein = sum(i.get("protein", 0) for i in today_items)
    carbs = sum(i.get("carbs", 0) for i in today_items)
    fat = sum(i.get("fat", 0) for i in today_items)
    fiber = sum(i.get("fiber", 0) for i in today_items)

    # Weekly
    week_map = {(start_week + timedelta(days=d)).isoformat(): 0 for d in range(7)}
    for i in items:
        d = _day_key(i["created_at"])
        if d in week_map:
            week_map[d] += i.get("calories", 0)
    weekly = [{"date": d, "calories": round(v, 1)} for d, v in week_map.items()]

    # Monthly (last 30 days)
    start_month = today - timedelta(days=29)
    month_map = {(start_month + timedelta(days=d)).isoformat(): 0 for d in range(30)}
    for i in items:
        d = _day_key(i["created_at"])
        if d in month_map:
            month_map[d] += i.get("calories", 0)
    monthly = [{"date": d, "calories": round(v, 1)} for d, v in month_map.items()]

    # Yearly (last 12 months grouped by month)
    yearly = {}
    for i in items:
        month_key = i["created_at"][:7]
        yearly[month_key] = yearly.get(month_key, 0) + i.get("calories", 0)
    yearly_list = [{"month": k, "calories": round(v, 1)} for k, v in sorted(yearly.items())][-12:]

    by_meal = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for i in today_items:
        mt = i.get("meal_type", "snack")
        by_meal[mt] = by_meal.get(mt, 0) + i.get("calories", 0)

    # Weekly total
    weekly_total = sum(v for v in week_map.values())

    # Monthly total
    monthly_total = sum(v for v in month_map.values())

    # Avg healthy score
    scores = [i.get("healthy_score", 0) for i in items if i.get("healthy_score", 0) > 0]
    avg_healthy = round(sum(scores) / len(scores), 1) if scores else 0

    # Water today
    water_logs = await db.water_logs.find(
        {"user_id": uid, "date": today.isoformat()}, {"_id": 0}
    ).to_list(100)
    water_today = sum(l["amount_ml"] for l in water_logs)
    water_goal = user.get("daily_water_goal_ml", 2000)

    # Latest BMI
    bmi_rec = await db.bmi_records.find_one({"user_id": uid}, {"_id": 0}, sort=[("created_at", -1)])

    # Exercise today
    exercise_today = await db.exercise_logs.find(
        {"user_id": uid, "date": today.isoformat()}, {"_id": 0}
    ).to_list(50)
    exercise_calories_burned = sum(e.get("calories_burned", 0) for e in exercise_today)

    # Net calories
    net_calories = round(daily_cal - exercise_calories_burned, 1)

    # Latest weight
    weight_rec = await db.weight_records.find_one({"user_id": uid}, {"_id": 0}, sort=[("created_at", -1)])

    # Achievements count
    earned_count = await db.achievements.count_documents({"user_id": uid})

    return {
        "daily_calorie_target": target,
        "daily_calories": round(daily_cal, 1),
        "remaining_calories": round(target - daily_cal, 1),
        "net_calories": net_calories,
        "protein": round(protein, 1),
        "carbs": round(carbs, 1),
        "fat": round(fat, 1),
        "fiber": round(fiber, 1),
        "recognition_count": len(items),
        "today_meal_count": len(today_items),
        "weekly_total": round(weekly_total, 1),
        "monthly_total": round(monthly_total, 1),
        "avg_healthy_score": avg_healthy,
        "weekly": weekly,
        "monthly": monthly,
        "yearly": yearly_list,
        "by_meal": by_meal,
        "today_items": today_items[:10],
        "water_today_ml": water_today,
        "water_goal_ml": water_goal,
        "exercise_calories_burned": round(exercise_calories_burned, 1),
        "exercise_today": exercise_today,
        "bmi": bmi_rec,
        "latest_weight": weight_rec,
        "achievements_earned": earned_count,
        "achievements_total": len(ACHIEVEMENT_DEFS),
    }

# ---------- Common Foods / Search ----------
COMMON_FOODS = [
    {"name": "Apple", "calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3, "fiber": 4.4, "sugar": 19, "sodium": 2, "serving_size": "1 medium (182g)"},
    {"name": "Banana", "calories": 105, "protein": 1.3, "carbs": 27, "fat": 0.4, "fiber": 3.1, "sugar": 14, "sodium": 1, "serving_size": "1 medium (118g)"},
    {"name": "Grilled Chicken Breast", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "sugar": 0, "sodium": 74, "serving_size": "100g"},
    {"name": "Brown Rice (1 cup)", "calories": 216, "protein": 5, "carbs": 45, "fat": 1.8, "fiber": 3.5, "sugar": 0, "sodium": 10, "serving_size": "1 cup cooked (195g)"},
    {"name": "Avocado Toast", "calories": 290, "protein": 9, "carbs": 30, "fat": 16, "fiber": 9, "sugar": 2, "sodium": 310, "serving_size": "1 slice"},
    {"name": "Caesar Salad", "calories": 470, "protein": 23, "carbs": 17, "fat": 35, "fiber": 3, "sugar": 4, "sodium": 830, "serving_size": "1 serving"},
    {"name": "Margherita Pizza Slice", "calories": 285, "protein": 12, "carbs": 36, "fat": 10, "fiber": 2, "sugar": 4, "sodium": 640, "serving_size": "1 slice"},
    {"name": "Salmon Fillet", "calories": 208, "protein": 22, "carbs": 0, "fat": 13, "fiber": 0, "sugar": 0, "sodium": 59, "serving_size": "100g"},
    {"name": "Greek Yogurt", "calories": 100, "protein": 17, "carbs": 6, "fat": 0.7, "fiber": 0, "sugar": 6, "sodium": 65, "serving_size": "170g"},
    {"name": "Oatmeal Bowl", "calories": 158, "protein": 6, "carbs": 27, "fat": 3.2, "fiber": 4, "sugar": 1, "sodium": 105, "serving_size": "1 cup cooked"},
    {"name": "Scrambled Eggs", "calories": 220, "protein": 15, "carbs": 2, "fat": 17, "fiber": 0, "sugar": 1, "sodium": 340, "serving_size": "2 large eggs"},
    {"name": "Whole Wheat Bread", "calories": 80, "protein": 4, "carbs": 15, "fat": 1, "fiber": 2, "sugar": 1, "sodium": 132, "serving_size": "1 slice (28g)"},
    {"name": "Orange", "calories": 62, "protein": 1.2, "carbs": 15, "fat": 0.2, "fiber": 3.1, "sugar": 12, "sodium": 0, "serving_size": "1 medium"},
    {"name": "Lentil Soup", "calories": 230, "protein": 18, "carbs": 40, "fat": 0.7, "fiber": 16, "sugar": 4, "sodium": 400, "serving_size": "1 cup"},
    {"name": "Almond Butter", "calories": 190, "protein": 7, "carbs": 6, "fat": 17, "fiber": 3, "sugar": 2, "sodium": 0, "serving_size": "2 tbsp"},
    {"name": "Sweet Potato", "calories": 103, "protein": 2.3, "carbs": 24, "fat": 0.1, "fiber": 3.8, "sugar": 7, "sodium": 41, "serving_size": "1 medium"},
    {"name": "Broccoli (steamed)", "calories": 55, "protein": 3.7, "carbs": 11, "fat": 0.6, "fiber": 5.1, "sugar": 3, "sodium": 64, "serving_size": "1 cup (156g)"},
    {"name": "Protein Shake", "calories": 150, "protein": 25, "carbs": 8, "fat": 3, "fiber": 1, "sugar": 5, "sodium": 150, "serving_size": "1 scoop"},
    {"name": "Mixed Nuts", "calories": 170, "protein": 5, "carbs": 6, "fat": 15, "fiber": 2, "sugar": 1, "sodium": 0, "serving_size": "1 oz (28g)"},
    {"name": "Quinoa Bowl", "calories": 222, "protein": 8, "carbs": 39, "fat": 3.5, "fiber": 5, "sugar": 0, "sodium": 13, "serving_size": "1 cup cooked"},
]

@api.get("/foods")
async def foods(q: Optional[str] = None):
    if q:
        q_lower = q.lower()
        return [f for f in COMMON_FOODS if q_lower in f["name"].lower()]
    return COMMON_FOODS

@api.post("/foods/log")
async def log_food_search(body: FoodSearchIn, user=Depends(get_current_user)):
    doc = {
        "food_name": body.query,
        "confidence": 1.0,
        "calories": body.calories,
        "protein": body.protein,
        "carbs": body.carbs,
        "fat": body.fat,
        "fiber": body.fiber,
        "sugar": body.sugar,
        "sodium": body.sodium,
        "serving_size": body.serving_size,
        "healthy_score": 0,
        "meal_type": body.meal_type,
        "image_b64": None,
        "items": [],
        "user_id": str(user["_id"]),
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_favorite": False,
        "source": "manual_search",
    }
    await db.history.insert_one(doc)
    doc.pop("_id", None)
    await _check_achievements(str(user["_id"]))
    return doc

# ---------- Reports ----------
def _filter_range(items, period: str):
    today = datetime.now(timezone.utc).date()
    if period == "daily":
        start = today
    elif period == "weekly":
        start = today - timedelta(days=6)
    elif period == "monthly":
        start = today - timedelta(days=29)
    else:  # yearly
        start = today - timedelta(days=364)
    return [i for i in items if _day_key(i["created_at"]) >= start.isoformat()]

@api.get("/report/csv")
async def report_csv(period: str = Query("weekly"), user=Depends(get_current_user)):
    items = await db.history.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(5000)
    items = _filter_range(items, period)
    items.sort(key=lambda x: x["created_at"])
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Date", "Meal", "Food", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Fiber (g)", "Sugar (g)", "Sodium (mg)", "Healthy Score"])
    for i in items:
        w.writerow([
            i["created_at"][:10], i.get("meal_type", ""), i.get("food_name", ""),
            i.get("calories", 0), i.get("protein", 0), i.get("carbs", 0),
            i.get("fat", 0), i.get("fiber", 0), i.get("sugar", 0), i.get("sodium", 0),
            i.get("healthy_score", 0),
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=food-report-{period}.csv"},
    )

@api.get("/report/pdf")
async def report_pdf(period: str = Query("weekly"), user=Depends(get_current_user)):
    uid = str(user["_id"])
    items = await db.history.find({"user_id": uid}, {"_id": 0}).to_list(5000)
    items = _filter_range(items, period)
    items.sort(key=lambda x: x["created_at"])

    # Extra data for report
    weight_recs = await db.weight_records.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(5)
    exercise_recs = await db.exercise_logs.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(10)
    bmi_rec = await db.bmi_records.find_one({"user_id": uid}, {"_id": 0}, sort=[("created_at", -1)])
    water_recs = await db.water_logs.find({"user_id": uid}, {"_id": 0}).sort("date", -1).to_list(7)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("t", parent=styles["Title"], textColor=colors.HexColor("#2C4C3B"), fontSize=20)
    h2_style = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#2C4C3B"), spaceBefore=14)
    story = [
        Paragraph(f"Nourish — Nutrition Report ({period.title()})", title_style),
        Paragraph(f"User: {user.get('name', user['email'])}", styles["Normal"]),
        Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]),
        Spacer(1, 16),
    ]

    # Summary
    total_cal = sum(i.get("calories", 0) for i in items)
    total_p = sum(i.get("protein", 0) for i in items)
    total_c = sum(i.get("carbs", 0) for i in items)
    total_f = sum(i.get("fat", 0) for i in items)
    total_fiber = sum(i.get("fiber", 0) for i in items)
    avg_score = sum(i.get("healthy_score", 0) for i in items) / max(1, len(items))

    story.append(Paragraph("Personal Summary", h2_style))
    summary = [
        ["Metric", "Value"],
        ["Total Meals Logged", len(items)],
        ["Total Calories (kcal)", round(total_cal, 1)],
        ["Avg Calories/Meal", round(total_cal / max(1, len(items)), 1)],
        ["Total Protein (g)", round(total_p, 1)],
        ["Total Carbs (g)", round(total_c, 1)],
        ["Total Fat (g)", round(total_f, 1)],
        ["Total Fiber (g)", round(total_fiber, 1)],
        ["Avg Healthy Score", round(avg_score, 1)],
        ["Daily Calorie Target", user.get("daily_calorie_target", 2000)],
    ]
    t = Table(summary, hAlign="LEFT", colWidths=[200, 140])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C4C3B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#F5F1EA")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EAE6")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E8EAE6")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # BMI
    if bmi_rec:
        story.append(Paragraph("BMI Summary", h2_style))
        bmi_data = [
            ["Height (cm)", "Weight (kg)", "BMI", "Category", "Date"],
            [bmi_rec.get("height_cm", ""), bmi_rec.get("weight_kg", ""), bmi_rec.get("bmi", ""), bmi_rec.get("category", ""), bmi_rec.get("created_at", "")[:10]],
        ]
        bt = Table(bmi_data, hAlign="LEFT")
        bt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C4C3B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E8EAE6")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(bt)
        story.append(Spacer(1, 10))

    # Weight records
    if weight_recs:
        story.append(Paragraph("Recent Weight Records", h2_style))
        wr_data = [["Date", "Weight (kg)", "Note"]] + [
            [r.get("created_at", "")[:10], r.get("weight_kg", ""), r.get("note", "")]
            for r in weight_recs
        ]
        wt = Table(wr_data, hAlign="LEFT", colWidths=[100, 100, 240])
        wt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C4C3B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E8EAE6")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(wt)
        story.append(Spacer(1, 10))

    # Exercise records
    if exercise_recs:
        story.append(Paragraph("Recent Exercise Logs", h2_style))
        ex_data = [["Date", "Exercise", "Duration (min)", "Calories Burned"]] + [
            [e.get("date", ""), e.get("exercise_name", ""), e.get("duration_min", 0), e.get("calories_burned", 0)]
            for e in exercise_recs
        ]
        et = Table(ex_data, hAlign="LEFT", colWidths=[80, 160, 100, 100])
        et.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C4C3B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E8EAE6")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(et)
        story.append(Spacer(1, 10))

    # Meal log
    story.append(Paragraph("Meal Log", h2_style))
    rows = [["Date", "Meal", "Food", "kcal", "P(g)", "C(g)", "F(g)", "Score"]]
    for i in items:
        rows.append([
            i["created_at"][:10], i.get("meal_type", ""), i.get("food_name", "")[:30],
            round(i.get("calories", 0), 1), round(i.get("protein", 0), 1),
            round(i.get("carbs", 0), 1), round(i.get("fat", 0), 1), i.get("healthy_score", 0),
        ])
    tbl = Table(rows, hAlign="LEFT", repeatRows=1, colWidths=[65, 55, 155, 45, 35, 35, 35, 40])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C4C3B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E8EAE6")),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9F7F2")]),
    ]))
    story.append(tbl)
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=nourish-report-{period}.pdf"}
    )

# ---------- Compare Reports ----------
@api.get("/report/compare")
async def compare_reports(period: str = Query("weekly"), user=Depends(get_current_user)):
    """Compare current vs previous period."""
    today = datetime.now(timezone.utc).date()
    if period == "weekly":
        curr_start = today - timedelta(days=6)
        prev_start = today - timedelta(days=13)
        prev_end = today - timedelta(days=7)
    elif period == "monthly":
        curr_start = today - timedelta(days=29)
        prev_start = today - timedelta(days=59)
        prev_end = today - timedelta(days=30)
    else:
        curr_start = today - timedelta(days=364)
        prev_start = today - timedelta(days=729)
        prev_end = today - timedelta(days=365)

    items = await db.history.find({"user_id": str(user["_id"])}, {"_id": 0}).to_list(5000)

    def summarize(items_list):
        if not items_list:
            return {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "meals": 0, "avg_healthy": 0}
        return {
            "calories": round(sum(i.get("calories", 0) for i in items_list), 1),
            "protein": round(sum(i.get("protein", 0) for i in items_list), 1),
            "carbs": round(sum(i.get("carbs", 0) for i in items_list), 1),
            "fat": round(sum(i.get("fat", 0) for i in items_list), 1),
            "meals": len(items_list),
            "avg_healthy": round(sum(i.get("healthy_score", 0) for i in items_list) / max(1, len(items_list)), 1),
        }

    curr_items = [i for i in items if curr_start.isoformat() <= _day_key(i["created_at"]) <= today.isoformat()]
    prev_items = [i for i in items if prev_start.isoformat() <= _day_key(i["created_at"]) <= prev_end.isoformat()]

    return {
        "period": period,
        "current": summarize(curr_items),
        "previous": summarize(prev_items),
        "current_label": f"{curr_start.isoformat()} to {today.isoformat()}",
        "previous_label": f"{prev_start.isoformat()} to {prev_end.isoformat()}",
    }

# ---------- Admin Analytics ----------
@api.get("/admin/stats")
async def admin_stats(user=Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_meals = await db.history.count_documents({})

    # Active users (logged in last 7 days by having meals)
    week_ago = (datetime.now(timezone.utc).date() - timedelta(days=7)).isoformat()
    active_pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "count"},
    ]
    active_res = await db.history.aggregate(active_pipeline).to_list(1)
    active_users = active_res[0]["count"] if active_res else 0

    # Most recognized foods
    food_pipeline = [
        {"$group": {"_id": "$food_name", "count": {"$sum": 1}, "avg_calories": {"$avg": "$calories"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_foods = await db.history.aggregate(food_pipeline).to_list(10)
    top_foods = [{"food": f["_id"], "count": f["count"], "avg_calories": round(f["avg_calories"], 1)} for f in top_foods]

    # Daily activity (last 14 days)
    daily_pipeline = [
        {"$match": {"created_at": {"$gte": (datetime.now(timezone.utc).date() - timedelta(days=13)).isoformat()}}},
        {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "meals": {"$sum": 1}, "calories": {"$sum": "$calories"}}},
        {"$sort": {"_id": 1}},
    ]
    daily_activity = await db.history.aggregate(daily_pipeline).to_list(14)
    daily_activity = [{"date": d["_id"], "meals": d["meals"], "calories": round(d["calories"], 1)} for d in daily_activity]

    # Monthly activity (last 12 months)
    monthly_pipeline = [
        {"$group": {"_id": {"$substr": ["$created_at", 0, 7]}, "meals": {"$sum": 1}, "users": {"$addToSet": "$user_id"}}},
        {"$project": {"month": "$_id", "meals": 1, "unique_users": {"$size": "$users"}}},
        {"$sort": {"month": -1}},
        {"$limit": 12},
    ]
    monthly_activity = await db.history.aggregate(monthly_pipeline).to_list(12)
    monthly_activity = [{"month": d["month"], "meals": d["meals"], "users": d["unique_users"]} for d in monthly_activity]

    # Avg calories
    avg_cal_res = await db.history.aggregate([{"$group": {"_id": None, "avg": {"$avg": "$calories"}}}]).to_list(1)
    avg_calories = round(avg_cal_res[0]["avg"], 1) if avg_cal_res else 0

    # User growth (by month)
    user_growth_pipeline = [
        {"$group": {"_id": {"$substr": ["$created_at", 0, 7]}, "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": 12},
    ]
    user_growth = await db.users.aggregate(user_growth_pipeline).to_list(12)
    user_growth = [{"month": d["_id"], "new_users": d["count"]} for d in user_growth]

    # Recent users
    recent_users = await db.users.find({}, {"_id": 0, "email": 1, "name": 1, "role": 1, "created_at": 1}).sort("created_at", -1).limit(10).to_list(10)

    return {
        "total_users": total_users,
        "active_users_7d": active_users,
        "total_meals": total_meals,
        "avg_calories_per_meal": avg_calories,
        "top_foods": top_foods,
        "daily_activity": daily_activity,
        "monthly_activity": monthly_activity,
        "user_growth": user_growth,
        "recent_users": recent_users,
    }

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.history.create_index([("user_id", 1), ("created_at", -1)])
    await db.bmi_records.create_index([("user_id", 1), ("created_at", -1)])
    await db.weight_records.create_index([("user_id", 1), ("created_at", -1)])
    await db.water_logs.create_index([("user_id", 1), ("date", -1)])
    await db.exercise_logs.create_index([("user_id", 1), ("date", -1)])
    await db.otps.create_index("email")
    await db.achievements.create_index([("user_id", 1), ("achievement_id", 1)], unique=True)
    await db.recommendations.create_index("user_id", unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@foodai.com")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_pw(admin_pass),
            "name": "Admin",
            "role": "admin",
            "daily_calorie_target": 2000,
            "daily_water_goal_ml": 2000,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_pw(admin_pass, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_pw(admin_pass)}}
        )

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ---------- Hello ----------
@api.get("/")
async def root():
    return {"app": "AI Food Recognition & Calorie Estimator", "status": "ok", "version": "2.0"}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)