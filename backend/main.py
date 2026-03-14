"""
PakDelivery Pro — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
import os
load_dotenv()  # Load .env file
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from datetime import datetime, date
import json, re, threading, requests as req_lib

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="PakDelivery Pro API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Data ──────────────────────────────────────────────────────────────────────
DATA_FILE = Path("orders.json")

def load_orders():
    try:
        if DATA_FILE.exists():
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except:
        pass
    return []

def save_orders(orders):
    DATA_FILE.write_text(
        json.dumps(orders, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

# ── WhatsApp ──────────────────────────────────────────────────────────────────
WA_INSTANCE = os.getenv("WA_INSTANCE")  # Set in .env
WA_TOKEN    = os.getenv("WA_TOKEN")     # Set in .env

def send_whatsapp(phone: str, message: str) -> dict:
    """Returns dict with sent:bool and error:str"""
    if not WA_INSTANCE or not WA_TOKEN:
        return {"sent": False, "error": "WA_INSTANCE ya WA_TOKEN .env mein set nahi — backend restart karo"}
    try:
        p = re.sub(r"\D", "", phone)
        if not p:
            return {"sent": False, "error": "Phone number empty hai"}
        if p.startswith("0"): p = "92" + p[1:]
        r = req_lib.post(
            f"https://api.ultramsg.com/{WA_INSTANCE}/messages/chat",
            data={"token": WA_TOKEN, "to": p, "body": message},
            timeout=15
        )
        res = r.json()
        sent = res.get("sent") == "true"
        return {"sent": sent, "error": None if sent else str(res)}
    except Exception as e:
        return {"sent": False, "error": str(e)}

# ── Blacklist ─────────────────────────────────────────────────────────────────
BLACKLIST_FILE = Path("blacklist.json")

def load_blacklist():
    try:
        if BLACKLIST_FILE.exists():
            return json.loads(BLACKLIST_FILE.read_text(encoding="utf-8"))
    except: pass
    return []

def save_blacklist(bl):
    BLACKLIST_FILE.write_text(json.dumps(bl, ensure_ascii=False, indent=2), encoding="utf-8")

def clean_phone(p: str) -> str:
    p = re.sub(r"\D","", str(p))
    if p.startswith("92"): p = "0" + p[2:]
    return p

# ── High RTO Areas (Pakistan) ─────────────────────────────────────────────────
HIGH_RTO_AREAS = [
    "orangi","lyari","korangi","landhi","baldia","surjani","qasba","manghopir",
    "labour","liaquatabad","nazimabad","new karachi","north karachi",
    "french colony","soldier bazar","kharadar","mithadar","shershah",
    "rawalpindi cantonment","dhoke","pirwadhai","sadiqabad","adiala",
    "shahdara","data darbar","ichhra","badami bagh","township","kot lakhpat",
    "faisalabad old city","millat road","jhang road","samanabad",
    "gujranwala","sialkot","gujrat","wazirabad",
]
MEDIUM_RTO_AREAS = [
    "gulshan","gulberg","johar","north nazimabad","federal b area",
    "model town","garden town","johar town","allama iqbal",
    "hayatabad","peshawar old","saddar peshawar","cantonment",
]

FAKE_NAMES    = ["test","asdf","xyz","fake","dummy","abc","qwerty","asd","aaaa","bbbb","cccc","xxx","yyy"]
FAKE_CITIES   = ["unknown","test","abc","xyz","asdf","qwerty","n/a","na","none","null"]
FAKE_PRODUCTS = ["test","asdf","xyz","fake","dummy","sample"]

# Products that historically attract high fake orders
HIGH_RISK_PRODUCTS = [
    "slimming","slim","weight loss","fat burn","enlargement","timing","delay",
    "cream","oil","spray","drops","pills","tablets","capsules","medicine",
    "magic","miracle","instant","guaranteed","100%","free","gift",
]

def analyze_order(order: dict) -> dict:
    score   = 0
    issues  = []
    details = {}   # per-factor breakdown

    name    = str(order.get("name","")).lower().strip()
    phone   = clean_phone(str(order.get("phone","")))
    city    = str(order.get("city","")).lower().strip()
    product = str(order.get("product","")).lower().strip()
    amount  = float(order.get("amount", 0) or 0)
    address = str(order.get("address","")).lower().strip()
    orders  = load_orders()
    bl      = load_blacklist()

    # ── 1. BLACKLIST CHECK (highest priority) ─────────────────────────────────
    bl_entry = next((b for b in bl if clean_phone(b["phone"]) == phone), None)
    if bl_entry:
        score += 80
        issues.append(f"🚫 BLACKLISTED — {bl_entry.get('reason','Fake order history')}")
        details["blacklist"] = {
            "blacklisted": True,
            "reason": bl_entry.get("reason",""),
            "added_on": bl_entry.get("added_on",""),
            "times_blocked": bl_entry.get("times_blocked", 1),
        }
    else:
        details["blacklist"] = {"blacklisted": False}

    # ── 2. PHONE HISTORY (from existing orders) ───────────────────────────────
    if phone:
        same_phone_orders = [o for o in orders if clean_phone(o.get("phone","")) == phone]
        total_prev   = len(same_phone_orders)
        rto_prev     = sum(1 for o in same_phone_orders if o.get("status") == "rto")
        delivered    = sum(1 for o in same_phone_orders if o.get("status") == "delivered")
        cancelled    = sum(1 for o in same_phone_orders if o.get("status") == "cancelled")

        if total_prev > 0:
            rto_rate = rto_prev / total_prev
            if rto_rate >= 0.6:
                score += 35
                issues.append(f"📱 Yeh number {rto_prev}/{total_prev} orders mein RTO de chuka hai")
            elif rto_rate >= 0.4:
                score += 20
                issues.append(f"📱 Number ka RTO history hai ({rto_prev} baar)")
            elif delivered > 0:
                score -= 10  # trusted customer bonus
                issues.append(f"✅ Purana customer — {delivered} baar deliver hua")

        details["phone_history"] = {
            "total_orders": total_prev,
            "delivered": delivered,
            "rto": rto_prev,
            "cancelled": cancelled,
            "is_returning_customer": total_prev > 0,
        }
    else:
        details["phone_history"] = {"total_orders": 0}

    # ── 3. NAME CHECK ─────────────────────────────────────────────────────────
    if any(f in name for f in FAKE_NAMES):
        score += 35; issues.append("⚠️ Suspicious name")
    elif len(name) < 3:
        score += 20; issues.append("⚠️ Name bohat chota hai")
    elif len(name.split()) < 2:
        score += 8;  issues.append("💡 Sirf ek naam — pura naam lo")

    # ── 4. PHONE FORMAT ───────────────────────────────────────────────────────
    if not phone or len(phone) < 10:
        score += 35; issues.append("❌ Phone number invalid hai")
    elif not phone.startswith("03"):
        score += 15; issues.append("⚠️ Pakistani number nahi lagta")
    elif len(phone) != 11:
        score += 10; issues.append("⚠️ Phone number format sahi nahi")

    # ── 5. CITY / AREA RTO RISK ───────────────────────────────────────────────
    city_risk = "low"
    if any(f in city for f in FAKE_CITIES) or len(city) < 2:
        score += 25; issues.append("❌ City invalid hai"); city_risk = "invalid"
    else:
        address_full = city + " " + address
        if any(area in address_full for area in HIGH_RTO_AREAS):
            score += 20; issues.append(f"🗺️ High RTO area detect hua ({city})"); city_risk = "high"
        elif any(area in address_full for area in MEDIUM_RTO_AREAS):
            score += 8; issues.append(f"🗺️ Medium RTO area ({city})"); city_risk = "medium"
    details["city_risk"] = city_risk

    # ── 6. ADDRESS INTELLIGENCE ───────────────────────────────────────────────
    # Pakistani cities & countries — if address ONLY has these, it's invalid
    PK_CITIES    = ["karachi","lahore","islamabad","rawalpindi","faisalabad","multan",
                    "peshawar","quetta","hyderabad","gujranwala","sialkot","abbottabad",
                    "bahawalpur","sargodha","sukkur","larkana","sheikhupura","rahim yar khan",
                    "jhang","gujrat","mardan","kasur","dera ghazi khan","nawabshah",
                    "mirpur khas","mingora","okara","chiniot","kamoke","hafizabad"]
    PK_COUNTRIES = ["pakistan","pak","pkistan","pkstan"]

    addr_score   = 0
    addr_problem = None
    addr_tip     = None

    if not address or len(address.strip()) < 3:
        score += 25; addr_score = 0
        addr_problem = "❌ Address bilkul nahi diya"
        addr_tip     = "Ghar number, gali/street, mohalla, city — sab lo"

    else:
        addr_lower   = address.lower().strip()
        addr_words   = set(addr_lower.replace(","," ").split())
        has_number   = bool(re.search(r'\b\d+\b', addr_lower))
        has_street   = any(w in addr_lower for w in [
            "street","st ","gali","road","rd ","block","sector","phase","house","flat",
            "floor","plot","makan","makaan","mohalla","colony","town","avenue","ave",
            "lane","chowk","bazar","bazaar","market","near","opposite","behind","beside",
            "next to","b/w","between","shop","apartment","apt","villa","bungalow",
        ])
        word_count   = len(addr_lower.split())

        # ── DETECT: Only city/country in address ──────────────────────────────
        meaningful_words = addr_words - set(PK_CITIES) - set(PK_COUNTRIES) - {"pakistan",",","."}
        only_city_country = len(meaningful_words) == 0 or (
            word_count <= 3 and
            any(city in addr_lower for city in PK_CITIES) and
            not has_number and not has_street
        )

        if only_city_country:
            score += 30; addr_score = 5
            addr_problem = "🚨 Address mein sirf city/country ka naam hai — yeh valid address nahi!"
            addr_tip     = "Courier delivery ke liye chahiye: Ghar/flat number + Gali/Street + Mohalla/Block + City"

        elif not has_number and not has_street:
            score += 18; addr_score = 20
            addr_problem = "⚠️ Address mein ghar number aur gali/block nahi"
            addr_tip     = "Example: House 5, Street 3, Block B, Gulshan — is tarah daalo"

        elif not has_number:
            score += 8; addr_score = 50
            addr_problem = "💡 Ghar/plot number missing hai"
            addr_tip     = "Ghar ya plot number add karo taake courier dhundh sake"

        elif not has_street:
            score += 5; addr_score = 60
            addr_problem = "💡 Gali/Street/Block missing hai"
            addr_tip     = "Street, gali ya block ka naam bhi daalo"

        elif has_number and has_street and word_count >= 6:
            addr_score = 100  # Complete address

        elif has_number and has_street:
            addr_score = 80
            addr_tip   = "Address acha hai — aur detail ho sakti hai (mohalla/landmark)"

        else:
            addr_score = 60

        if addr_problem:
            issues.append(addr_problem)

    details["address_score"] = addr_score
    details["address_tip"]   = addr_tip
    details["address_problem"] = addr_problem

    # ── COURIER SUGGESTION based on city ──────────────────────────────────────
    COURIER_COVERAGE = {
        "leopards": {
            "major":   ["karachi","lahore","islamabad","rawalpindi","faisalabad","multan",
                        "peshawar","quetta","hyderabad","gujranwala","sialkot"],
            "partial": ["abbottabad","bahawalpur","sargodha","sukkur","dera ghazi khan",
                        "mardan","mingora","swat","mirpur","muzaffarabad"],
            "note":    "Major cities mein best — remote areas limited"
        },
        "tcs": {
            "major":   ["karachi","lahore","islamabad","rawalpindi","faisalabad","multan",
                        "peshawar","quetta","hyderabad","gujranwala","sialkot","abbottabad"],
            "partial": ["bahawalpur","sargodha","rahim yar khan","sukkur","larkana",
                        "mingora","mardan","swabi","nowshera"],
            "note":    "Wide network — villages tak bhi jata hai"
        },
        "blueex": {
            "major":   ["karachi","lahore","islamabad","rawalpindi","faisalabad","multan",
                        "peshawar","hyderabad","gujranwala"],
            "partial": ["sialkot","bahawalpur","sargodha","sukkur"],
            "note":    "Urban areas best — COD fast settlement"
        },
        "rider": {
            "major":   ["karachi","lahore","islamabad","rawalpindi"],
            "partial": ["faisalabad","multan","peshawar","hyderabad"],
            "note":    "Fast delivery — sirf bade shehar"
        },
        "m&p": {
            "major":   ["karachi","lahore","islamabad","rawalpindi","faisalabad","multan",
                        "peshawar","quetta","hyderabad","gujranwala","sialkot","abbottabad",
                        "bahawalpur","sargodha","rahim yar khan","sukkur","larkana",
                        "sheikhupura","dera ghazi khan","mardan","mingora","swat"],
            "partial": ["remote villages","azad kashmir","gilgit","chitral","dir"],
            "note":    "Sab se zyada coverage — villages tak bhi jata hai"
        },
        "call courier": {
            "major":   ["karachi"],
            "partial": ["hyderabad","sukkur"],
            "note":    "Sirf Sindh — karachi best"
        },
    }

    city_lower = city.lower().strip()
    courier_suggestion = []
    for courier, data in COURIER_COVERAGE.items():
        if any(c in city_lower for c in data["major"]):
            courier_suggestion.append({"courier": courier.upper(), "coverage": "✅ Full coverage", "note": data["note"]})
        elif any(c in city_lower for c in data["partial"]):
            courier_suggestion.append({"courier": courier.upper(), "coverage": "⚠️ Partial coverage", "note": data["note"]})

    # Sort: full coverage first
    courier_suggestion.sort(key=lambda x: 0 if "Full" in x["coverage"] else 1)

    # If no courier found — remote area
    if not courier_suggestion and city:
        courier_suggestion = [
            {"courier": "M&P",     "coverage": "🔍 Check karein", "note": "Sab se wide network"},
            {"courier": "TCS",     "coverage": "🔍 Check karein", "note": "Villages tak bhi jata hai"},
            {"courier": "LEOPARDS","coverage": "🔍 Check karein", "note": "Confirm karein is area mein jata hai ya nahi"},
        ]
        issues.append(f"⚠️ '{city}' mein limited courier coverage ho sakta hai — pehle check karein")

    details["courier_suggestions"] = courier_suggestion[:4]  # top 4

    # ── 7. PRODUCT RISK ───────────────────────────────────────────────────────
    if any(f in product for f in FAKE_PRODUCTS):
        score += 30; issues.append("❌ Suspicious product name")
    elif any(kw in product for kw in HIGH_RISK_PRODUCTS):
        score += 18; issues.append(f"⚠️ Is category ka product fake orders zyada attract karta hai")

    # ── 8. AMOUNT CHECK ───────────────────────────────────────────────────────
    if amount == 0:
        score += 20; issues.append("❌ Amount zero hai")
    elif amount < 200:
        score += 10; issues.append("⚠️ Amount bohat kam hai")
    elif amount > 15000:
        score += 12; issues.append("⚠️ Very high amount — confirm zaroor karo")

    # ── 9. ORDER TIME PATTERN ─────────────────────────────────────────────────
    created = str(order.get("created_at",""))
    if created:
        try:
            hour = int(created[11:13])
            if 0 <= hour < 6:
                score += 15; issues.append("🕐 Raat ko order — late night orders zyada fake hote hain")
            elif 23 <= hour <= 24:
                score += 10; issues.append("🕐 Raat ke order")
        except: pass

    # ── Cap score at 100 ──────────────────────────────────────────────────────
    score = max(0, min(score, 100))

    # ── Final verdict ─────────────────────────────────────────────────────────
    if bl_entry:
        level, rec, emoji = "CRITICAL", "REJECT", "🔴"
    elif score >= 65:
        level, rec, emoji = "CRITICAL", "REJECT",  "🔴"
    elif score >= 40:
        level, rec, emoji = "HIGH",     "REJECT",  "🟠"
    elif score >= 20:
        level, rec, emoji = "MEDIUM",   "CALL",    "🟡"
    else:
        level, rec, emoji = "LOW",      "APPROVE", "🟢"

    # Human readable summary
    if not issues:
        summary = "✅ Sab theek lagta hai — directly approve kar sakte hain"
    elif level in ("CRITICAL","HIGH"):
        summary = f"🚨 {len(issues)} serious issues mile — reject ya call recommend"
    elif level == "MEDIUM":
        summary = f"⚠️ {len(issues)} warnings — pehle customer ko call karo"
    else:
        summary = f"💡 Minor issues — approve lekin note rakhein"

    return {
        "score":   score,
        "level":   level,
        "rec":     rec,
        "emoji":   emoji,
        "issues":  issues,
        "summary": summary,
        "details": details,
    }

# ── WhatsApp Messages ─────────────────────────────────────────────────────────
REMINDER_STAGES = {
    "confirmed":    {"label": "Order Confirmed",     "msg": "Assalam o Alaikum {name}! Aapka order #{order_id} confirm ho gaya hai. Amount: Rs.{amount}. Shukriya! 🎉"},
    "dispatched":   {"label": "Order Dispatched",    "msg": "Assalam o Alaikum {name}! Aapka order #{order_id} dispatch ho gaya hai. Courier: {courier}. Jald pahunch jayega! 🚚"},
    "day_of":       {"label": "Out for Delivery",    "msg": "Assalam o Alaikum {name}! Aapka order #{order_id} aaj deliver hoga. Cash Rs.{amount} ready rakhein. 📦"},
    "delivered":    {"label": "Delivered",           "msg": "Assalam o Alaikum {name}! Umeed hai aapko order #{order_id} pasand aaya. Feedback zaroor dein! ⭐"},
    "rto":          {"label": "RTO / Return",        "msg": "Assalam o Alaikum {name}! Aapka order #{order_id} wapas aa gaya. Dobara order ke liye rabta karein. 🔄"},
}

def build_message(stage_key: str, order: dict) -> str:
    tmpl = REMINDER_STAGES.get(stage_key, {}).get("msg", "")
    return tmpl.format(
        name=order.get("name",""),
        order_id=order.get("order_id",""),
        amount=order.get("amount",""),
        courier=order.get("courier",""),
    )

STATUS_LABELS = {
    "pending":          "Pending",
    "confirmed":        "Confirmed",
    "dispatched":       "Dispatched",
    "out_for_delivery": "Out for Delivery",
    "delivered":        "Delivered",
    "cancelled":        "Cancelled",
    "rto":              "RTO / Return",
}

STATUS_TO_REMINDER = {
    "confirmed":        "confirmed",
    "dispatched":       "dispatched",
    "out_for_delivery": "day_of",
    "delivered":        "delivered",
    "rto":              "rto",
}

# ── Pydantic Models ───────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    name:     str
    phone:    str
    address:  str
    city:     str
    product:  str
    amount:   float
    courier:  Optional[str] = ""
    notes:    Optional[str] = ""

class OrderUpdate(BaseModel):
    status:   Optional[str] = None
    notes:    Optional[str] = None
    courier:  Optional[str] = None

class WhatsAppSend(BaseModel):
    order_id:  str
    stage_key: str

# ── Counter ───────────────────────────────────────────────────────────────────
def next_order_id(orders):
    nums = []
    for o in orders:
        m = re.search(r"(\d+)", str(o.get("order_id","")))
        if m: nums.append(int(m.group(1)))
    return f"PK-{(max(nums)+1 if nums else 1):04d}"

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

# ── Orders CRUD ───────────────────────────────────────────────────────────────
@app.get("/orders")
def get_orders(status: Optional[str] = None):
    orders = load_orders()
    if status and status != "all":
        orders = [o for o in orders if o.get("status") == status]
    # Add risk analysis to each
    for o in orders:
        o["_risk"] = analyze_order(o)
    return {"orders": orders, "total": len(orders)}

@app.post("/orders")
def create_order(data: OrderCreate):
    orders = load_orders()
    order = {
        "order_id":       next_order_id(orders),
        "name":           data.name,
        "phone":          data.phone,
        "address":        data.address,
        "city":           data.city,
        "product":        data.product,
        "amount":         data.amount,
        "courier":        data.courier,
        "notes":          data.notes,
        "status":         "pending",
        "created_at":     datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "reminders_sent": [],
        "rto_reason":     "",
        "rto_date":       "",
    }
    orders.append(order)
    save_orders(orders)
    return {"order": order, "risk": analyze_order(order)}

@app.get("/orders/{order_id}")
def get_order(order_id: str):
    orders = load_orders()
    for o in orders:
        if o["order_id"].upper() == order_id.upper():
            o["_risk"] = analyze_order(o)
            return o
    raise HTTPException(404, "Order not found")

@app.patch("/orders/{order_id}")
def update_order(order_id: str, data: OrderUpdate):
    orders = load_orders()
    for o in orders:
        if o["order_id"].upper() == order_id.upper():
            if data.status  is not None: o["status"]  = data.status
            if data.notes   is not None: o["notes"]   = data.notes
            if data.courier is not None: o["courier"] = data.courier
            save_orders(orders)

            # Auto WhatsApp on status change
            new_status = data.status
            if new_status and new_status not in ("cancelled", "rto"):
                stage_key = STATUS_TO_REMINDER.get(new_status, "")
                risk = analyze_order(o)
                if stage_key and stage_key not in o.get("reminders_sent",[]) and risk["rec"] != "REJECT":
                    msg = build_message(stage_key, o)
                    def _send(order=o, sk=stage_key, m=msg):
                        result = send_whatsapp(order["phone"], m)
                        if result["sent"]:
                            all_orders = load_orders()
                            for ord_ in all_orders:
                                if ord_["order_id"] == order["order_id"]:
                                    ord_.setdefault("reminders_sent",[])
                                    if sk not in ord_["reminders_sent"]:
                                        ord_["reminders_sent"].append(sk)
                            save_orders(all_orders)
                    threading.Thread(target=_send, daemon=True).start()

            o["_risk"] = analyze_order(o)
            return o
    raise HTTPException(404, "Order not found")

@app.delete("/orders/{order_id}")
def delete_order(order_id: str, delete_from_shopify: bool = False):
    orders = load_orders()
    # Find order first
    target = next((o for o in orders if o["order_id"].upper() == order_id.upper()), None)
    if not target:
        raise HTTPException(404, "Order not found")

    shopify_deleted = False

    # If it's a Shopify order, also remove from synced_ids so it doesn't re-import
    if target.get("shopify_id"):
        cfg = load_shopify_config()
        synced = set(cfg.get("synced_ids", []))
        synced.discard(target["shopify_id"])
        cfg["synced_ids"] = list(synced)
        save_shopify_config(cfg)

        # Also delete from Shopify if requested
        if delete_from_shopify and cfg.get("enabled") and cfg.get("token"):
            try:
                resp = req_lib.delete(
                    f"https://{cfg['shop']}/admin/api/2024-01/orders/{target['shopify_id']}.json",
                    headers={"X-Shopify-Access-Token": cfg["token"]},
                    timeout=10
                )
                shopify_deleted = resp.status_code in [200, 204]
            except:
                pass

    new_orders = [o for o in orders if o["order_id"].upper() != order_id.upper()]
    save_orders(new_orders)
    return {"deleted": order_id, "shopify_deleted": shopify_deleted, "was_shopify_order": bool(target.get("shopify_id"))}

# ── Risk Check ────────────────────────────────────────────────────────────────
@app.post("/orders/check-risk")
def check_risk(data: OrderCreate):
    order = data.dict()
    return analyze_order(order)

# ── WhatsApp Debug / Test ────────────────────────────────────────────────────
@app.get("/whatsapp/test")
def test_whatsapp():
    """Test WhatsApp credentials — call this to debug"""
    return {
        "WA_INSTANCE":  WA_INSTANCE or "❌ NOT SET — .env mein WA_INSTANCE nahi",
        "WA_TOKEN":     (WA_TOKEN[:6]+"...") if WA_TOKEN else "❌ NOT SET — .env mein WA_TOKEN nahi",
        "status":       "✅ Credentials loaded" if (WA_INSTANCE and WA_TOKEN) else "❌ Credentials missing",
    }

# ── WhatsApp Manual Send ──────────────────────────────────────────────────────
@app.post("/whatsapp/send")
def manual_send(data: WhatsAppSend):
    orders = load_orders()
    for o in orders:
        if o["order_id"].upper() == data.order_id.upper():
            msg = build_message(data.stage_key, o)
            result = send_whatsapp(o["phone"], msg)
            if result["sent"]:
                o.setdefault("reminders_sent", [])
                if data.stage_key not in o["reminders_sent"]:
                    o["reminders_sent"].append(data.stage_key)
                save_orders(orders)
            return {"sent": result["sent"], "stage": data.stage_key, "error": result.get("error")}
    raise HTTPException(404, "Order not found")

# ── Stats ─────────────────────────────────────────────────────────────────────
@app.get("/stats")
def get_stats():
    orders = load_orders()
    total     = len(orders)
    delivered = sum(1 for o in orders if o.get("status") == "delivered")
    risks     = [analyze_order(o) for o in orders]
    fake      = sum(1 for r in risks if r["rec"] == "REJECT")
    call      = sum(1 for r in risks if r["rec"] == "CALL")
    genuine   = total - fake - call
    return {
        "total": total, "delivered": delivered,
        "fake": fake, "call": call, "genuine": genuine,
    }

# ── Reminders ─────────────────────────────────────────────────────────────────
@app.get("/reminders/stages")
def get_stages():
    return REMINDER_STAGES

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0"}

# ── Blacklist ──────────────────────────────────────────────────────────────────
class BlacklistAdd(BaseModel):
    phone:  str
    name:   Optional[str] = ""
    reason: Optional[str] = ""

@app.get("/blacklist")
def get_blacklist():
    return {"blacklist": load_blacklist()}

@app.post("/blacklist")
def add_blacklist(data: BlacklistAdd):
    bl    = load_blacklist()
    phone = clean_phone(data.phone)
    existing = next((b for b in bl if clean_phone(b["phone"]) == phone), None)
    if existing:
        existing["times_blocked"] = existing.get("times_blocked", 1) + 1
        existing["reason"] = data.reason or existing.get("reason","")
    else:
        bl.append({
            "phone":         data.phone,
            "name":          data.name,
            "reason":        data.reason,
            "added_on":      datetime.now().strftime("%Y-%m-%d %H:%M"),
            "times_blocked": 1,
        })
    save_blacklist(bl)
    return {"added": True, "total": len(bl)}

@app.delete("/blacklist/{phone}")
def remove_blacklist(phone: str):
    bl  = load_blacklist()
    ph  = clean_phone(phone)
    new = [b for b in bl if clean_phone(b["phone"]) != ph]
    if len(new) == len(bl):
        raise HTTPException(404, "Not in blacklist")
    save_blacklist(new)
    return {"removed": True}

# ── Risk Analytics (area & product heatmap) ───────────────────────────────────
@app.get("/risk/analytics")
def risk_analytics():
    orders = load_orders()

    # City RTO rates
    city_stats = {}
    for o in orders:
        city = (o.get("city","") or "Unknown").title()
        if city not in city_stats:
            city_stats[city] = {"total":0,"rto":0,"delivered":0}
        city_stats[city]["total"] += 1
        if o.get("status") == "rto":      city_stats[city]["rto"] += 1
        if o.get("status") == "delivered":city_stats[city]["delivered"] += 1

    city_data = []
    for city, s in city_stats.items():
        if s["total"] >= 2:
            rto_rate = round(s["rto"]/s["total"]*100, 1)
            city_data.append({
                "city": city, "total": s["total"],
                "rto": s["rto"], "delivered": s["delivered"],
                "rto_rate": rto_rate,
                "risk_level": "high" if rto_rate>=50 else "medium" if rto_rate>=25 else "low"
            })
    city_data.sort(key=lambda x: x["rto_rate"], reverse=True)

    # Product RTO rates
    product_stats = {}
    for o in orders:
        prod = (o.get("product","") or "Unknown").lower()
        # Group similar products
        key = prod[:20]
        if key not in product_stats:
            product_stats[key] = {"product":prod,"total":0,"rto":0,"delivered":0}
        product_stats[key]["total"] += 1
        if o.get("status") == "rto":       product_stats[key]["rto"] += 1
        if o.get("status") == "delivered": product_stats[key]["delivered"] += 1

    product_data = []
    for s in product_stats.values():
        if s["total"] >= 2:
            rto_rate = round(s["rto"]/s["total"]*100, 1)
            product_data.append({
                "product": s["product"], "total": s["total"],
                "rto": s["rto"], "rto_rate": rto_rate,
                "risk_level": "high" if rto_rate>=50 else "medium" if rto_rate>=25 else "low"
            })
    product_data.sort(key=lambda x: x["rto_rate"], reverse=True)

    # Hourly pattern
    hour_stats = {str(h):{"total":0,"rto":0} for h in range(24)}
    for o in orders:
        created = str(o.get("created_at",""))
        try:
            hour = str(int(created[11:13]))
            hour_stats[hour]["total"] += 1
            if o.get("status") == "rto": hour_stats[hour]["rto"] += 1
        except: pass

    # Blacklist count
    bl_count = len(load_blacklist())

    return {
        "city_heatmap":   city_data[:10],
        "product_risk":   product_data[:10],
        "hour_pattern":   hour_stats,
        "blacklist_count": bl_count,
        "total_analyzed": len(orders),
    }

# ── Import / Export ───────────────────────────────────────────────────────────
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
import io, csv

@app.get("/export/csv")
def export_csv():
    orders = load_orders()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "order_id","name","phone","address","city",
        "product","amount","courier","status","notes","created_at"
    ])
    writer.writeheader()
    for o in orders:
        writer.writerow({k: o.get(k,"") for k in writer.fieldnames})
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"}
    )

@app.get("/export/json")
def export_json():
    orders = load_orders()
    content = json.dumps(orders, ensure_ascii=False, indent=2)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=orders.json"}
    )

@app.post("/import/json")
async def import_json(file: UploadFile = File(...)):
    try:
        content = await file.read()
        new_orders = json.loads(content)
        if not isinstance(new_orders, list):
            raise HTTPException(400, "Invalid format — list expected")
        existing = load_orders()
        existing_ids = {o["order_id"] for o in existing}
        added = 0
        for o in new_orders:
            if o.get("order_id") not in existing_ids:
                existing.append(o)
                added += 1
        save_orders(existing)
        return {"imported": added, "total": len(existing)}
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/import/csv")
async def import_csv(file: UploadFile = File(...)):
    try:
        content = (await file.read()).decode("utf-8")
        reader  = csv.DictReader(io.StringIO(content))
        existing    = load_orders()
        existing_ids = {o["order_id"] for o in existing}
        added = 0
        for row in reader:
            if row.get("order_id") and row["order_id"] not in existing_ids:
                row["amount"] = float(row.get("amount", 0) or 0)
                row.setdefault("reminders_sent", [])
                row.setdefault("rto_reason", "")
                row.setdefault("rto_date", "")
                existing.append(row)
                added += 1
        save_orders(existing)
        return {"imported": added, "total": len(existing)}
    except Exception as e:
        raise HTTPException(400, str(e))

# ── Notifications ─────────────────────────────────────────────────────────────
@app.get("/notifications")
def get_notifications():
    orders  = load_orders()
    notifs  = []
    today   = date.today().isoformat()

    for o in orders:
        risk = analyze_order(o)
        # High/critical risk pending orders
        if o.get("status") == "pending" and risk["level"] in ("HIGH","CRITICAL"):
            notifs.append({
                "type":    "risk",
                "icon":    "🚨",
                "title":   f"High Risk Order — {o['order_id']}",
                "message": f"{o['name']} | {risk['level']} risk",
                "color":   "#F43F5E",
                "order_id": o["order_id"],
            })
        # Pending orders older than 2 days
        try:
            created = o.get("created_at","")[:10]
            from datetime import timedelta
            delta = (date.today() - date.fromisoformat(created)).days
            if o.get("status") == "pending" and delta >= 2:
                notifs.append({
                    "type":    "old_pending",
                    "icon":    "⏰",
                    "title":   f"Old Pending — {o['order_id']}",
                    "message": f"{delta} din se pending hai",
                    "color":   "#F59E0B",
                    "order_id": o["order_id"],
                })
        except: pass

    return {"notifications": notifs, "count": len(notifs)}

# ── P&L Records ───────────────────────────────────────────────────────────────
PNL_FILE = Path("pnl_records.json")

def load_pnl():
    try:
        if PNL_FILE.exists():
            return json.loads(PNL_FILE.read_text(encoding="utf-8"))
    except: pass
    return []

def save_pnl(records):
    PNL_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

class PNLRecord(BaseModel):
    date:             str
    label:            Optional[str] = ""
    total_orders:     int   = 0
    delivered:        int   = 0
    rto:              int   = 0
    selling_price:    float = 0
    product_cost:     float = 0
    packing_cost:     float = 0
    forward_shipping: float = 0
    rto_shipping:     float = 0
    ad_cpo:           float = 0
    employee_cost:    float = 0
    platform_fees:    float = 0
    other_costs:      float = 0

@app.get("/pnl")
def get_pnl():
    return {"records": load_pnl()}

@app.post("/pnl")
def create_pnl(data: PNLRecord):
    records = load_pnl()
    # Calculate
    revenue        = data.delivered * data.selling_price
    total_product  = data.total_orders * data.product_cost
    total_packing  = data.total_orders * data.packing_cost
    total_forward  = data.total_orders * data.forward_shipping
    total_rto_ship = data.rto * data.rto_shipping
    total_ads      = data.total_orders * data.ad_cpo
    total_employee = data.total_orders * data.employee_cost
    total_platform = data.total_orders * data.platform_fees
    total_other    = data.other_costs
    total_cost     = (total_product + total_packing + total_forward +
                      total_rto_ship + total_ads + total_employee +
                      total_platform + total_other)
    profit         = revenue - total_cost
    margin         = round((profit / revenue * 100), 1) if revenue > 0 else 0
    delivery_rate  = round((data.delivered / data.total_orders * 100), 1) if data.total_orders > 0 else 0

    record = {
        "id":              datetime.now().strftime("%Y%m%d%H%M%S"),
        "date":            data.date,
        "label":           data.label,
        "total_orders":    data.total_orders,
        "delivered":       data.delivered,
        "rto":             data.rto,
        "selling_price":   data.selling_price,
        "product_cost":    data.product_cost,
        "packing_cost":    data.packing_cost,
        "forward_shipping":data.forward_shipping,
        "rto_shipping":    data.rto_shipping,
        "ad_cpo":          data.ad_cpo,
        "employee_cost":   data.employee_cost,
        "platform_fees":   data.platform_fees,
        "other_costs":     data.other_costs,
        # Calculated
        "revenue":         revenue,
        "total_cost":      total_cost,
        "profit":          profit,
        "margin":          margin,
        "delivery_rate":   delivery_rate,
        "created_at":      datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    records.append(record)
    save_pnl(records)
    return record

@app.delete("/pnl/{record_id}")
def delete_pnl(record_id: str):
    records = load_pnl()
    new = [r for r in records if r["id"] != record_id]
    if len(new) == len(records):
        raise HTTPException(404, "Record not found")
    save_pnl(new)
    return {"deleted": record_id}

# ══════════════════════════════════════════════════════════════════════════════
# SHOPIFY INTEGRATION
# ══════════════════════════════════════════════════════════════════════════════
SHOPIFY_CONFIG_FILE = Path("shopify_config.json")

def load_shopify_config():
    try:
        if SHOPIFY_CONFIG_FILE.exists():
            return json.loads(SHOPIFY_CONFIG_FILE.read_text(encoding="utf-8"))
    except: pass
    return {"enabled": False, "shop": "", "token": "", "last_synced": "", "synced_ids": []}

def save_shopify_config(cfg):
    SHOPIFY_CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")

def shopify_to_order(s_order: dict, existing_id: str) -> dict:
    """Convert Shopify order format to PakDelivery format"""
    addr = s_order.get("shipping_address") or s_order.get("billing_address") or {}
    customer = s_order.get("customer") or {}

    name = (
        f"{addr.get('first_name','')} {addr.get('last_name','')}".strip() or
        f"{customer.get('first_name','')} {customer.get('last_name','')}".strip() or
        s_order.get("email","Unknown")
    )

    phone = (
        addr.get("phone") or
        customer.get("phone") or
        s_order.get("phone") or ""
    )

    address_parts = [
        addr.get("address1",""),
        addr.get("address2",""),
        addr.get("zip",""),
    ]
    address = ", ".join(p for p in address_parts if p).strip()

    city    = addr.get("city","") or ""
    amount  = float(s_order.get("total_price", 0) or 0)

    # Get product names
    items   = s_order.get("line_items", [])
    product = ", ".join(i.get("name","") for i in items[:2]) or "Shopify Order"

    return {
        "order_id":       existing_id,
        "shopify_id":     str(s_order.get("id","")),
        "shopify_number": s_order.get("name",""),   # e.g. #1001
        "name":           name,
        "phone":          phone,
        "address":        address,
        "city":           city,
        "product":        product,
        "amount":         amount,
        "courier":        "",
        "notes":          f"Shopify Order {s_order.get('name','')} | {s_order.get('email','')}",
        "status":         "pending",
        "source":         "shopify",
        "created_at":     datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "shopify_created": s_order.get("created_at",""),
        "reminders_sent": [],
        "rto_reason":     "",
        "rto_date":       "",
    }

def sync_shopify_orders():
    """Poll Shopify for new orders and import them"""
    cfg = load_shopify_config()
    if not cfg.get("enabled") or not cfg.get("token") or not cfg.get("shop"):
        return {"synced": 0, "message": "Shopify not configured"}

    try:
        headers = {
            "X-Shopify-Access-Token": cfg["token"],
            "Content-Type": "application/json",
        }
        # Get recent orders (last 7 days, unfulfilled + pending)
        url = f"https://{cfg['shop']}/admin/api/2024-01/orders.json?status=any&limit=50"
        resp = req_lib.get(url, headers=headers, timeout=15)

        if resp.status_code != 200:
            return {"synced": 0, "error": f"Shopify API error: {resp.status_code}"}

        shopify_orders = resp.json().get("orders", [])
        existing       = load_orders()
        synced_ids     = set(cfg.get("synced_ids", []))

        # ── IDs currently in Shopify ───────────────────────────────────────
        shopify_ids_live = {str(o.get("id","")) for o in shopify_orders}

        # ── DELETE: Remove orders that were deleted from Shopify ───────────
        deleted_count = 0
        new_existing = []
        for o in existing:
            sid = o.get("shopify_id", "")
            if sid and sid not in shopify_ids_live:
                # This order was deleted from Shopify — remove from PakDelivery too
                synced_ids.discard(sid)
                deleted_count += 1
            else:
                new_existing.append(o)

        if deleted_count > 0:
            existing = new_existing
            save_orders(existing)

        # ── ADD: Import new orders ─────────────────────────────────────────
        existing_shopify_ids = {o.get("shopify_id","") for o in existing}

        new_count = 0
        for s_order in shopify_orders:
            sid = str(s_order.get("id",""))
            if sid in existing_shopify_ids or sid in synced_ids:
                continue  # Already imported

            new_id    = next_order_id(existing)
            new_order = shopify_to_order(s_order, new_id)
            risk      = analyze_order(new_order)
            new_order["_risk_level"] = risk["level"]
            new_order["_risk_score"] = risk["score"]

            existing.append(new_order)
            synced_ids.add(sid)
            new_count += 1

        if new_count > 0:
            save_orders(existing)

        cfg["synced_ids"]  = list(synced_ids)
        cfg["last_synced"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        save_shopify_config(cfg)

        return {"synced": new_count, "deleted": deleted_count, "total_shopify": len(shopify_orders), "last_synced": cfg["last_synced"]}

    except Exception as e:
        return {"synced": 0, "error": str(e)}

# ── Background polling every 5 min ────────────────────────────────────────────
def start_shopify_polling():
    import time
    def poll():
        while True:
            try:
                cfg = load_shopify_config()
                if cfg.get("enabled"):
                    sync_shopify_orders()
            except: pass
            time.sleep(int(os.getenv("POLL_INTERVAL", "180")))  # default 3 min
    t = threading.Thread(target=poll, daemon=True)
    t.start()

start_shopify_polling()

# ── Shopify API Endpoints ──────────────────────────────────────────────────────
class ShopifyConfig(BaseModel):
    shop:  str
    token: str

@app.get("/shopify/config")
def get_shopify_config():
    cfg = load_shopify_config()
    # Don't expose full token
    safe = {**cfg, "token": cfg["token"][:8]+"..." if cfg.get("token") else ""}
    return safe

@app.post("/shopify/connect")
def connect_shopify(data: ShopifyConfig):
    shop  = data.shop.replace("https://","").replace("http://","").strip().rstrip("/")
    if not shop.endswith(".myshopify.com"):
        shop = shop + ".myshopify.com"

    # Test connection
    try:
        resp = req_lib.get(
            f"https://{shop}/admin/api/2024-01/shop.json",
            headers={"X-Shopify-Access-Token": data.token},
            timeout=10
        )
        if resp.status_code != 200:
            raise HTTPException(400, f"Token invalid ya shop galat hai — {resp.status_code}")
        shop_info = resp.json().get("shop", {})
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(400, f"Connection failed: {str(e)}")

    cfg = load_shopify_config()
    cfg.update({
        "enabled":    True,
        "shop":       shop,
        "token":      data.token,
        "shop_name":  shop_info.get("name",""),
        "shop_email": shop_info.get("email",""),
        "synced_ids": cfg.get("synced_ids",[]),
    })
    save_shopify_config(cfg)
    return {"connected": True, "shop_name": shop_info.get("name",""), "shop": shop}

@app.post("/shopify/sync")
def manual_sync():
    result = sync_shopify_orders()
    return result

@app.get("/shopify/status")
def shopify_status():
    cfg = load_shopify_config()
    return {
        "enabled":     cfg.get("enabled", False),
        "shop":        cfg.get("shop",""),
        "shop_name":   cfg.get("shop_name",""),
        "last_synced": cfg.get("last_synced",""),
        "synced_count":len(cfg.get("synced_ids",[])),
    }

@app.post("/shopify/reset-sync")
def reset_sync():
    cfg = load_shopify_config()
    cfg["synced_ids"] = []
    save_shopify_config(cfg)
    return {"reset": True, "message": "Sync history clear — ab dobara sab orders import honge"}

@app.post("/shopify/disconnect")
def disconnect_shopify():
    cfg = load_shopify_config()
    cfg["enabled"] = False
    cfg["token"]   = ""
    save_shopify_config(cfg)
    return {"disconnected": True}