"""
PakDelivery Pro — Auth Routes
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/refresh
POST /auth/logout
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import random, json
from pathlib import Path

OTP_FILE = Path("otp_store.json")

def load_otps():
    try:
        if OTP_FILE.exists(): return json.loads(OTP_FILE.read_text())
    except: pass
    return {}

def save_otps(otps):
    OTP_FILE.write_text(json.dumps(otps))
import uuid

from database import get_db, User, Store
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Schemas ───────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email:      str
    password:   str
    full_name:  str
    store_name: str   # First store name

class LoginRequest(BaseModel):
    email:    str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check email already exists
    existing = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if existing:
        raise HTTPException(400, "Yeh email already registered hai")

    # Password validation
    if len(data.password) < 6:
        raise HTTPException(400, "Password kam az kam 6 characters ka hona chahiye")

    # Create user
    user_id = str(uuid.uuid4())
    user = User(
        id            = user_id,
        email         = data.email.lower().strip(),
        password_hash = hash_password(data.password),
        full_name     = data.full_name.strip(),
        role          = "owner",
        created_at    = datetime.utcnow(),
    )
    db.add(user)

    # Create first store automatically
    store_id = str(uuid.uuid4())
    store = Store(
        id         = store_id,
        owner_id   = user_id,
        name       = data.store_name.strip(),
        created_at = datetime.utcnow(),
    )
    db.add(store)
    db.commit()
    db.refresh(user)

    # Generate tokens
    access_token  = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user": {
            "id":        user.id,
            "email":     user.email,
            "full_name": user.full_name,
            "role":      user.role,
        },
        "store": {
            "id":   store.id,
            "name": store.name,
        }
    }


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Email ya password galat hai")

    if not user.is_active:
        raise HTTPException(403, "Account deactivated hai — admin se rabta karein")

    # Get user's stores
    stores = db.query(Store).filter(Store.owner_id == user.id).all()

    access_token  = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user": {
            "id":        user.id,
            "email":     user.email,
            "full_name": user.full_name,
            "role":      user.role,
        },
        "stores": [{"id": s.id, "name": s.name} for s in stores],
        "active_store": stores[0].id if stores else None,
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stores = db.query(Store).filter(Store.owner_id == current_user.id).all()
    return {
        "id":        current_user.id,
        "email":     current_user.email,
        "full_name": current_user.full_name,
        "role":      current_user.role,
        "stores":    [{"id": s.id, "name": s.name, "shopify_enabled": s.shopify_enabled} for s in stores],
    }


@router.post("/refresh")
def refresh_token(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Refresh token invalid ya expire ho gaya")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(401, "User nahi mila")

    access_token = create_access_token(user.id, user.email)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/change-password")
def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")

    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(400, "Purana password galat hai")

    if len(new_password) < 6:
        raise HTTPException(400, "Naya password 6 characters se zyada hona chahiye")

    current_user.password_hash = hash_password(new_password)
    db.commit()
    return {"message": "Password change ho gaya ✅"}


@router.post("/add-store")
def add_store(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    store_name = data.get("name", "").strip()
    if not store_name:
        raise HTTPException(400, "Store name daalo")

    store = Store(
        id       = str(uuid.uuid4()),
        owner_id = current_user.id,
        name     = store_name,
        created_at = datetime.utcnow(),
    )
    db.add(store)
    db.commit()
    return {"id": store.id, "name": store.name, "message": "Store add ho gaya ✅"}


class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email:        str
    otp:          str
    new_password: str

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user:
        raise HTTPException(404, "Yeh email registered nahi hai")

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    expire   = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

    otps = load_otps()
    otps[data.email.lower()] = {"otp": otp_code, "expires": expire}
    save_otps(otps)

    # TODO: Send email — abhi OTP console mein print kar rahe hain
    # Production mein: SendGrid / SMTP use karein
    print(f"\n{'='*40}")
    print(f"OTP for {data.email}: {otp_code}")
    print(f"Expires: {expire}")
    print(f"{'='*40}\n")

    # For now return OTP in response (development only)
    # Production mein yeh hataao aur sirf email bhejo
    return {
        "message": "OTP generate ho gaya",
        "otp_preview": otp_code,  # DEVELOPMENT ONLY — production mein hatao
        "note": "Abhi OTP backend console mein print ho raha hai — email integration baad mein lagayein"
    }


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    otps  = load_otps()
    email = data.email.lower().strip()
    entry = otps.get(email)

    if not entry:
        raise HTTPException(400, "Pehle OTP request karein")

    # Check expiry
    if datetime.utcnow() > datetime.fromisoformat(entry["expires"]):
        otps.pop(email, None)
        save_otps(otps)
        raise HTTPException(400, "OTP expire ho gaya — dobara request karein")

    if entry["otp"] != data.otp.strip():
        raise HTTPException(400, "OTP galat hai")

    if len(data.new_password) < 6:
        raise HTTPException(400, "Password 6 characters se zyada hona chahiye")

    # Update password
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, "User nahi mila")

    user.password_hash = hash_password(data.new_password)
    db.commit()

    # Remove used OTP
    otps.pop(email, None)
    save_otps(otps)

    return {"message": "Password reset ho gaya — ab login karein ✅"}