"""
PakDelivery Pro — Auth Utilities
JWT token generation & verification
Password hashing with bcrypt
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os, uuid

from database import get_db, User

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY      = os.getenv("JWT_SECRET_KEY", "pakdelivery-secret-change-in-production")
ALGORITHM       = "HS256"
ACCESS_EXPIRE   = int(os.getenv("JWT_ACCESS_EXPIRE_HOURS", "24"))    # 24 hours
REFRESH_EXPIRE  = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "7"))     # 7 days

# ── Password ──────────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── JWT ───────────────────────────────────────────────────────────────────────
def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_EXPIRE)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expire, "type": "access"},
        SECRET_KEY, algorithm=ALGORITHM
    )

def create_refresh_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_EXPIRE)
    return jwt.encode(
        {"sub": user_id, "exp": expire, "type": "refresh"},
        SECRET_KEY, algorithm=ALGORITHM
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return {}

# ── Auth Dependency ───────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid ya expire ho gaya — dobara login karein",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User nahi mila")

    return user

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except:
        return None