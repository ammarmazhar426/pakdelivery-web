"""
PakDelivery Pro — Database Setup (SQLAlchemy + SQLite)
Migrate to PostgreSQL: change DATABASE_URL in .env
"""

from sqlalchemy import create_engine, Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pakdelivery.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True)           # UUID
    email         = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name     = Column(String, nullable=False)
    role          = Column(String, default="owner")            # owner / staff / viewer
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    stores = relationship("Store", back_populates="owner")


class Store(Base):
    __tablename__ = "stores"

    id             = Column(String, primary_key=True)          # UUID
    owner_id       = Column(String, ForeignKey("users.id"), nullable=False)
    name           = Column(String, nullable=False)            # Store display name
    shopify_shop   = Column(String, default="")                # yourstore.myshopify.com
    shopify_token  = Column(String, default="")                # shpat_xxx
    shopify_enabled= Column(Boolean, default=False)
    last_synced    = Column(String, default="")
    created_at     = Column(DateTime, default=datetime.utcnow)

    owner  = relationship("User", back_populates="stores")
    orders = relationship("Order", back_populates="store", cascade="all, delete")
    blacklist = relationship("Blacklist", back_populates="store", cascade="all, delete")


class Order(Base):
    __tablename__ = "orders"

    id             = Column(String, primary_key=True)          # PK-0001
    store_id       = Column(String, ForeignKey("stores.id"), nullable=False)
    shopify_id     = Column(String, default="")
    shopify_number = Column(String, default="")
    name           = Column(String, default="")
    phone          = Column(String, default="")
    address        = Column(String, default="")
    city           = Column(String, default="")
    product        = Column(String, default="")
    amount         = Column(Float, default=0)
    courier        = Column(String, default="")
    status         = Column(String, default="pending")
    notes          = Column(Text, default="")
    source         = Column(String, default="manual")          # manual / shopify
    risk_level     = Column(String, default="")
    risk_score     = Column(Integer, default=0)
    reminders_sent = Column(Text, default="[]")               # JSON array
    rto_reason     = Column(String, default="")
    rto_date       = Column(String, default="")
    created_at     = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="orders")


class Blacklist(Base):
    __tablename__ = "blacklist"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    store_id      = Column(String, ForeignKey("stores.id"), nullable=False)
    phone         = Column(String, nullable=False)
    name          = Column(String, default="")
    reason        = Column(String, default="")
    times_blocked = Column(Integer, default=1)
    added_on      = Column(String, default="")

    store = relationship("Store", back_populates="blacklist")


class PNLRecord(Base):
    __tablename__ = "pnl_records"

    id               = Column(String, primary_key=True)
    store_id         = Column(String, ForeignKey("stores.id"), nullable=False)
    date             = Column(String, default="")
    label            = Column(String, default="")
    total_orders     = Column(Integer, default=0)
    confirmed        = Column(Integer, default=0)
    dispatched       = Column(Integer, default=0)
    delivered        = Column(Integer, default=0)
    rto              = Column(Integer, default=0)
    selling_price    = Column(Float, default=0)
    product_cost     = Column(Float, default=0)
    packing_cost     = Column(Float, default=0)
    forward_shipping = Column(Float, default=0)
    rto_shipping     = Column(Float, default=0)
    ad_spend_total   = Column(Float, default=0)
    employee_cost    = Column(Float, default=0)
    platform_fees    = Column(Float, default=0)
    other_costs      = Column(Float, default=0)
    revenue          = Column(Float, default=0)
    total_cost       = Column(Float, default=0)
    profit           = Column(Float, default=0)
    margin           = Column(Float, default=0)
    delivery_rate    = Column(Float, default=0)
    created_at       = Column(String, default="")


# ── Init DB ───────────────────────────────────────────────────────────────────
def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()