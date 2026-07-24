import os
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
   gemini_client = genai.Client(api_key=GEMINI_API_KEY)
from google.genai import types
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from google import genai
from google.genai import types
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get("JWT_SECRET", "kmt-bazaar-super-secret-key-change-me")
JWT_ALGO = "HS256"
JWT_EXPIRE_MIN = 60 * 24 * 30  # 30 days

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI(title="KMT Bazaar API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ MODELS ------------------
class Role(str, Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    DELIVERY = "delivery"
    ADMIN = "admin"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: Role = Role.CUSTOMER


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class OtpRequestIn(BaseModel):
    phone: str


class OtpVerifyIn(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None


class UserOut(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Role
    avatar: Optional[str] = None


class AuthOut(BaseModel):
    token: str
    user: UserOut


class AddressIn(BaseModel):
    label: str  # Home, Work, Other
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = ""
    city: str
    state: str
    pincode: str
    is_default: bool = False


class CartItemIn(BaseModel):
    product_id: str
    quantity: int = 1
    variant: Optional[str] = None


class CartUpdateIn(BaseModel):
    product_id: str
    quantity: int
    variant: Optional[str] = None


class CheckoutIn(BaseModel):
    address_id: str
    payment_method: str  # cod | online
    notes: Optional[str] = ""


class AIChatRequest(BaseModel):
    message: str


class JobApplicationIn(BaseModel):
    name: str
    mobile: str
    aadhar: str
    address: str
    category: str
    appliedAt: Optional[str] = None
    


# ------------------ HELPERS ------------------
def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def user_to_out(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u.get("name", ""),
        "email": u.get("email"),
        "phone": u.get("phone"),
        "role": u.get("role", "customer"),
        "avatar": u.get("avatar"),
    }


# ------------------ AUTH ROUTES ------------------
@api.post("/auth/register", response_model=AuthOut)
async def register(data: RegisterIn):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "password": hash_password(data.password),
        "role": data.role.value,
        "avatar": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(uid, data.role.value)
    return {"token": token, "user": user_to_out(user_doc)}


@api.post("/auth/login", response_model=AuthOut)
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": user_to_out(user)}


@api.post("/auth/otp/request")
async def request_otp(data: OtpRequestIn):
    # Mock: any phone gets OTP 123456 (or any 6-digit accepted on verify)
    return {"sent": True, "phone": data.phone, "hint": "Enter any 6-digit code (mock OTP)"}


@api.post("/auth/otp/verify", response_model=AuthOut)
async def verify_otp(data: OtpVerifyIn):
    if not (len(data.otp) == 6 and data.otp.isdigit()):
        raise HTTPException(status_code=400, detail="Invalid OTP")
    user = await db.users.find_one({"phone": data.phone})
    if not user:
        uid = str(uuid.uuid4())
        user = {
            "id": uid,
            "name": data.name or f"User {data.phone[-4:]}",
            "email": None,
            "phone": data.phone,
            "password": "",
            "role": Role.CUSTOMER.value,
            "avatar": None,
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": user_to_out(user)}


@api.get("/auth/me", response_model=UserOut)
async def me(current=Depends(get_current_user)):
    return user_to_out(current)

# --- NAYA AVATAR UPDATE CODE (Safe Block) ---
class AvatarUpdateIn(BaseModel):
    avatar: str

@api.post("/submit-roojgar")
async def submit_roojgar(data: JobApplicationIn):

    application = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "mobile": data.mobile,
        "aadhar": data.aadhar,
        "address": data.address,
        "category": data.category,
        "status": "pending",
        "appliedAt": data.appliedAt or now_iso(),
        "created_at": now_iso()
    }

    await db.roojgar_applications.insert_one(application)

    application.pop("_id", None)

    return {
        "success": True,
        "message": "Roojgar application submitted",
        "data": application
    }
# ------------------ ROJGAR ------------------

@api.post("/jobs/apply")
async def apply_job(data: JobApplicationIn):

    job = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "phone": data.phone,
        "skill": data.skill,
        "location": data.location,
        "experience": data.experience,
        "status": "pending",
        "created_at": now_iso()
    }

    await db.job_applications.insert_one(job)

    job.pop("_id", None)

    return {
        "success": True,
        "message": "Application submitted",
        "data": job
    }

# ------------------ CATALOG ------------------
@api.get("/categories")
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats


@api.get("/banners")
async def list_banners():
    banners = await db.banners.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return banners


@api.get("/stores")
async def list_stores():
    stores = await db.stores.find({"is_approved": True}, {"_id": 0}).to_list(100)
    return stores


@api.get("/products")
async def list_products(category: Optional[str] = None, q: Optional[str] = None, trending: Optional[bool] = None, limit: int = 50):
    query = {}
    if category:
        query["category_id"] = category
    if trending:
        query["trending"] = True
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    products = await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return products


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p


class AIChatRequest(BaseModel):
    message: str

@app.post("/api/ai/chat")  # (Agar aapka /ai/chat hai toh wahi rehne dein)
async def ai_chat(req: AIChatRequest):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

        # Naya aur fast tarika (gemini_client ka use karke)
        response = gemini_client.models.generate_content(
          model='gemini-flash-latest',
            contents=req.message,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are KMT Bazaar AI Assistant. "
                    "Help customers with products, orders, sellers, "
                    "delivery and general shopping questions."
                )
            )
        )

        return {
            "message": response.text
        }
        
    except Exception as e:
        print("==== API ERROR ====", str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ------------------ CART ------------------
async def get_cart_doc(user_id: str):
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    if not cart:
        cart = {"user_id": user_id, "items": [], "updated_at": now_iso()}
        await db.carts.insert_one(dict(cart))
    return cart


async def expand_cart(cart):
    items = []
    subtotal = 0.0
    for item in cart.get("items", []):
        p = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not p:
            continue
        line_total = p["price"] * item["quantity"]
        subtotal += line_total
        items.append({
            "product_id": p["id"],
            "name": p["name"],
            "image": p.get("image"),
            "price": p["price"],
            "mrp": p.get("mrp", p["price"]),
            "quantity": item["quantity"],
            "variant": item.get("variant"),
            "unit": p.get("unit", ""),
            "line_total": round(line_total, 2),
        })
    delivery_fee = 0 if subtotal >= 199 or subtotal == 0 else 25
    tax = round(subtotal * 0.05, 2)
    total = round(subtotal + delivery_fee + tax, 2)
    return {
        "items": items,
        "subtotal": round(subtotal, 2),
        "delivery_fee": delivery_fee,
        "tax": tax,
        "total": total,
        "item_count": sum(i["quantity"] for i in items),
    }


@api.get("/cart")
async def get_cart(current=Depends(get_current_user)):
    cart = await get_cart_doc(current["id"])
    return await expand_cart(cart)


@api.post("/cart/add")
async def add_to_cart(item: CartItemIn, current=Depends(get_current_user)):
    cart = await get_cart_doc(current["id"])
    found = False
    for it in cart["items"]:
        if it["product_id"] == item.product_id and it.get("variant") == item.variant:
            it["quantity"] += item.quantity
            found = True
            break
    if not found:
        cart["items"].append({"product_id": item.product_id, "quantity": item.quantity, "variant": item.variant})
    await db.carts.update_one({"user_id": current["id"]}, {"$set": {"items": cart["items"], "updated_at": now_iso()}})
    return await expand_cart(cart)


@api.post("/cart/update")
async def update_cart(item: CartUpdateIn, current=Depends(get_current_user)):
    cart = await get_cart_doc(current["id"])
    new_items = []
    for it in cart["items"]:
        if it["product_id"] == item.product_id and it.get("variant") == item.variant:
            if item.quantity > 0:
                it["quantity"] = item.quantity
                new_items.append(it)
        else:
            new_items.append(it)
    await db.carts.update_one({"user_id": current["id"]}, {"$set": {"items": new_items, "updated_at": now_iso()}})
    cart["items"] = new_items
    return await expand_cart(cart)


@api.delete("/cart/clear")
async def clear_cart(current=Depends(get_current_user)):
    await db.carts.update_one({"user_id": current["id"]}, {"$set": {"items": [], "updated_at": now_iso()}})
    return {"ok": True}


# ------------------ ADDRESSES ------------------
@api.get("/addresses")
async def list_addresses(current=Depends(get_current_user)):
    addrs = await db.addresses.find({"user_id": current["id"]}, {"_id": 0}).to_list(50)
    return addrs


@api.post("/addresses")
async def create_address(data: AddressIn, current=Depends(get_current_user)):
    if data.is_default:
        await db.addresses.update_many({"user_id": current["id"]}, {"$set": {"is_default": False}})
    addr = {
        "id": str(uuid.uuid4()),
        "user_id": current["id"],
        **data.dict(),
        "created_at": now_iso(),
    }
    await db.addresses.insert_one(dict(addr))
    addr.pop("_id", None)
    return addr


# 🔥 EDIT / UPDATE ADDRESS
@api.put("/addresses/{addr_id}")
async def update_address(addr_id: str, data: AddressIn, current=Depends(get_current_user)):
    if data.is_default:
        await db.addresses.update_many({"user_id": current["id"]}, {"$set": {"is_default": False}})
    
    res = await db.addresses.update_one(
        {"id": addr_id, "user_id": current["id"]},
        {"$set": data.dict()}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
        
    updated = await db.addresses.find_one({"id": addr_id, "user_id": current["id"]}, {"_id": 0})
    return updated


# 🔥 DELETE ADDRESS (WITH LOGS)
@api.delete("/addresses/{addr_id}")
async def delete_address(addr_id: str, current=Depends(get_current_user)):
    print(f"\n--- DELETE REQUEST ---")
    print(f"Target Addr ID: {addr_id}")
    print(f"User ID: {current['id']}")
    
    res = await db.addresses.delete_one({"id": addr_id, "user_id": current["id"]})
    
    if res.deleted_count == 0:
        print("❌ Delete fail: ID match nahi hui ya user alag tha.")
        raise HTTPException(status_code=404, detail="Address not found or unauthorized")
        
    print("✅ Address successfully deleted from MongoDB!")
    return {"ok": True}



# ------------------ ORDERS ------------------
@api.post("/orders/checkout")
async def checkout(data: CheckoutIn, current=Depends(get_current_user)):
    cart = await get_cart_doc(current["id"])
    if not cart["items"]:
        raise HTTPException(400, "Cart is empty")
    expanded = await expand_cart(cart)
    addr = await db.addresses.find_one({"id": data.address_id, "user_id": current["id"]}, {"_id": 0})
    if not addr:
        raise HTTPException(400, "Invalid address")
    order_id = str(uuid.uuid4())
    order_no = "KMT" + datetime.now().strftime("%y%m%d") + order_id[:4].upper()
    order = {
        "id": order_id,
        "order_no": order_no,
        "user_id": current["id"],
        "items": expanded["items"],
        "subtotal": expanded["subtotal"],
        "delivery_fee": expanded["delivery_fee"],
        "tax": expanded["tax"],
        "total": expanded["total"],
        "address": addr,
        "payment_method": data.payment_method,
        "payment_status": "paid" if data.payment_method == "online" else "pending",
        "status": "pending",  # pending | accepted | out_for_delivery | delivered | cancelled
        "notes": data.notes,
        "timeline": [
            {"status": "pending", "at": now_iso(), "label": "Order placed"},
        ],
        "created_at": now_iso(),
    }
    await db.orders.insert_one(dict(order))
    # clear cart
    await db.carts.update_one({"user_id": current["id"]}, {"$set": {"items": [], "updated_at": now_iso()}})
    # create notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current["id"],
        "title": "Order placed",
        "body": f"Your order {order_no} has been placed successfully.",
        "type": "order",
        "read": False,
        "created_at": now_iso(),
    })
    order.pop("_id", None)
    return order


@api.get("/orders")
async def list_orders(current=Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders


@api.get("/orders/{order_id}")
async def get_order(order_id: str, current=Depends(get_current_user)):
    o = await db.orders.find_one({"id": order_id, "user_id": current["id"]}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
    return o


# ------------------ NOTIFICATIONS ------------------
@api.get("/notifications")
async def list_notifications(current=Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifs


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, current=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": current["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.get("/notifications/unread-count")
async def unread_count(current=Depends(get_current_user)):
    c = await db.notifications.count_documents({"user_id": current["id"], "read": False})
    return {"count": c}


# ------------------ ROLE GUARDS ------------------
def require_roles(*roles):
    async def _dep(current=Depends(get_current_user)):
        if current.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current
    return _dep


# ------------------ ADMIN ------------------
class ProductIn(BaseModel):
    name: str
    category_id: str
    store_id: Optional[str] = None
    price: float
    mrp: Optional[float] = None
    unit: str = ""
    stock: int = 0
    image: str = ""
    description: str = ""
    trending: bool = False


class CategoryIn(BaseModel):
    name: str
    icon: str = "tag"
    color: str = "#2563EB"
    image: str = ""


class BannerIn(BaseModel):
    title: str
    subtitle: str = ""
    cta: str = "Shop Now"
    image: str
    color: str = "#2563EB"
    order: int = 99
    category_id: Optional[str] = None


class OrderStatusIn(BaseModel):
    status: str  # accepted | out_for_delivery | delivered | cancelled


class CommissionIn(BaseModel):
    percent: float


@api.get("/admin/stats")
async def admin_stats(_=Depends(require_roles("admin"))):
    users_count = await db.users.count_documents({"role": "customer"})
    vendors_count = await db.users.count_documents({"role": "vendor"})
    delivery_count = await db.users.count_documents({"role": "delivery"})
    products_count = await db.products.count_documents({})
    orders_count = await db.orders.count_documents({})
    pending_count = await db.orders.count_documents({"status": "pending"})
    delivered_count = await db.orders.count_documents({"status": "delivered"})

    revenue_cursor = db.orders.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ])
    rev = 0.0
    async for d in revenue_cursor:
        rev = round(d.get("total", 0) or 0, 2)

    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {"commission_percent": 10.0}
    commission = settings.get("commission_percent", 10.0)
    platform_earnings = round(rev * commission / 100, 2)

    # last 7 days
    from datetime import timedelta as _td
    today = datetime.now(timezone.utc).date()
    chart = []
    for i in range(6, -1, -1):
        d = today - _td(days=i)
        start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc).isoformat()
        end = (datetime(d.year, d.month, d.day, tzinfo=timezone.utc) + _td(days=1)).isoformat()
        c = await db.orders.count_documents({"created_at": {"$gte": start, "$lt": end}})
        chart.append({"day": d.strftime("%a"), "orders": c})

    return {
        "users": users_count, "vendors": vendors_count, "delivery": delivery_count,
        "products": products_count, "orders": orders_count,
        "pending_orders": pending_count, "delivered_orders": delivered_count,
        "revenue": rev, "platform_earnings": platform_earnings, "commission_percent": commission,
        "chart": chart,
    }


@api.get("/admin/users")
async def admin_users(role: Optional[str] = None, _=Depends(require_roles("admin"))):
    q = {}
    if role: q["role"] = role
    users = await db.users.find(q, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(500)
    return users


@api.post("/admin/users/{user_id}/toggle")
async def admin_toggle_user(user_id: str, _=Depends(require_roles("admin"))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user: raise HTTPException(404, "Not found")
    new_state = not user.get("active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"active": new_state}})
    return {"ok": True, "active": new_state}


@api.get("/admin/orders")
async def admin_orders(status: Optional[str] = None, _=Depends(require_roles("admin"))):
    q = {}
    if status: q["status"] = status
    orders = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    # attach customer name
    for o in orders:
        u = await db.users.find_one({"id": o.get("user_id")}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
        o["customer"] = u or {}
    return orders


@api.post("/admin/orders/{order_id}/status")
async def admin_update_order(order_id: str, data: OrderStatusIn, _=Depends(require_roles("admin"))):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o: raise HTTPException(404, "Order not found")
    timeline = o.get("timeline", [])
    timeline.append({"status": data.status, "at": now_iso(), "label": data.status.replace("_", " ").title()})
    await db.orders.update_one({"id": order_id}, {"$set": {"status": data.status, "timeline": timeline}})
    # notify customer
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": o["user_id"],
        "title": f"Order {data.status.replace('_',' ').title()}",
        "body": f"Order {o['order_no']} is now {data.status.replace('_',' ')}",
        "type": "order", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.post("/admin/products")
async def admin_create_product(data: ProductIn, _=Depends(require_roles("admin"))):
    pid = "p-" + uuid.uuid4().hex[:8]
    doc = {"id": pid, **data.dict(), "vendor_id": None}
    if doc.get("mrp") is None: doc["mrp"] = doc["price"]
    await db.products.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/admin/products/{pid}")
async def admin_update_product(pid: str, data: ProductIn, _=Depends(require_roles("admin"))):
    upd = data.dict()
    if upd.get("mrp") is None: upd["mrp"] = upd["price"]
    res = await db.products.update_one({"id": pid}, {"$set": upd})
    if res.matched_count == 0: raise HTTPException(404, "Not found")
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, _=Depends(require_roles("admin"))):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


@api.post("/admin/categories")
async def admin_create_cat(data: CategoryIn, _=Depends(require_roles("admin"))):
    cid = "cat-" + uuid.uuid4().hex[:6]
    doc = {"id": cid, **data.dict()}
    await db.categories.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.delete("/admin/categories/{cid}")
async def admin_delete_cat(cid: str, _=Depends(require_roles("admin"))):
    await db.categories.delete_one({"id": cid})
    return {"ok": True}


@api.post("/admin/banners")
async def admin_create_banner(data: BannerIn, _=Depends(require_roles("admin"))):
    bid = "ban-" + uuid.uuid4().hex[:6]
    doc = {"id": bid, **data.dict()}
    await db.banners.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.delete("/admin/banners/{bid}")
async def admin_delete_banner(bid: str, _=Depends(require_roles("admin"))):
    await db.banners.delete_one({"id": bid})
    return {"ok": True}


@api.get("/admin/commission")
async def admin_get_commission(_=Depends(require_roles("admin"))):
    s = await db.settings.find_one({"id": "global"}, {"_id": 0})
    return s or {"id": "global", "commission_percent": 10.0}


@api.post("/admin/commission")
async def admin_set_commission(data: CommissionIn, _=Depends(require_roles("admin"))):
    await db.settings.update_one({"id": "global"}, {"$set": {"commission_percent": data.percent}}, upsert=True)
    return {"ok": True, "commission_percent": data.percent}


# --- ADMIN STORE APPROVALS ---

@api.get("/admin/stores")
async def admin_get_stores(status: Optional[str] = None, _=Depends(require_roles("admin"))):
    query = {}
    if status == "pending":
        query["is_approved"] = False
    elif status == "approved":
        query["is_approved"] = True
        
    stores = await db.stores.find(query, {"_id": 0}).to_list(100)
    return stores

@api.post("/admin/stores/{store_id}/approve")
async def admin_approve_store(store_id: str, _=Depends(require_roles("admin"))):
    res = await db.stores.update_one({"id": store_id}, {"$set": {"is_approved": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Store not found")
    return {"ok": True, "message": "Store Approved"}

@api.post("/admin/stores/{store_id}/reject")
async def admin_reject_store(store_id: str, _=Depends(require_roles("admin"))):
    # Reject karne par hum dukaan ko database se hamesha ke liye delete kar rahe hain
    res = await db.stores.delete_one({"id": store_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Store not found")
    return {"ok": True, "message": "Store Rejected and Deleted"}


# ------------------ VENDOR ------------------
async def _vendor_store_ids(vendor_id: str):
    stores = await db.stores.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(50)
    return [s["id"] for s in stores], stores


class StoreIn(BaseModel):
    name: str
    address: str
    category_id: str
    delivery_min: int = 30
    image: str = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80" # Default image

# Yahan Vendor ke section ke aas paas hoga ye code
@api.post("/vendor/stores")
async def vendor_create_store(data: StoreIn, current=Depends(require_roles("vendor"))):
    sid = "st-" + uuid.uuid4().hex[:6]
    doc = data.dict()
    doc.update({
        "id": sid,
        "vendor_id": current["id"],
        "rating": 5.0,
        "is_approved": False,
        "is_online": True, # 🔥 NAYA: By default nayi dukaan online dikhegi (jab approve hogi)
    })
    # ... baaki code
    await db.stores.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.get("/vendor/stats")
async def vendor_stats(current=Depends(require_roles("vendor"))):
    # 🔥 FIX: Database se live check karo ki Admin ne vendor ko suspend (active: false) toh nahi kiya
    user_doc = await db.users.find_one({"id": current["id"]}, {"_id": 0, "active": 1})
    is_active = user_doc.get("active", True) if user_doc else False

    store_ids, stores = await _vendor_store_ids(current["id"])
    products_count = await db.products.count_documents({"store_id": {"$in": store_ids}}) if store_ids else 0
    
    # orders that contain at least one of my products
    if store_ids:
        product_ids = [p["id"] async for p in db.products.find({"store_id": {"$in": store_ids}}, {"id": 1})]
    else:
        product_ids = []
        
    orders = await db.orders.find({"items.product_id": {"$in": product_ids}}, {"_id": 0}).to_list(500) if product_ids else []
    revenue = 0.0; pending = 0; delivered = 0
    
    for o in orders:
        for it in o.get("items", []):
            if it["product_id"] in product_ids:
                revenue += it.get("line_total", 0)
        if o.get("status") == "pending": pending += 1
        if o.get("status") == "delivered": delivered += 1
        
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    commission = settings.get("commission_percent", 10.0)
    payout = round(revenue * (1 - commission / 100), 2)
    
    return {
        "stores": stores, "products": products_count,
        "orders": len(orders), "pending": pending, "delivered": delivered,
        "revenue": round(revenue, 2), "commission_percent": commission, "payout": payout,
        # 🔥 NAYA: Realtime suspension flag sent to frontend
        "is_suspended": not is_active 
    }


@api.get("/vendor/products")
async def vendor_products(current=Depends(require_roles("vendor"))):
    store_ids, _ = await _vendor_store_ids(current["id"])
    if not store_ids: return []
    return await db.products.find({"store_id": {"$in": store_ids}}, {"_id": 0}).to_list(500)


@api.post("/vendor/products")
async def vendor_create_product(data: ProductIn, current=Depends(require_roles("vendor"))):
    store_ids, stores = await _vendor_store_ids(current["id"])
    sid = data.store_id or (store_ids[0] if store_ids else None)
    if sid not in store_ids:
        raise HTTPException(400, "Invalid store for vendor")
    pid = "p-" + uuid.uuid4().hex[:8]
    doc = data.dict(); doc["store_id"] = sid
    if doc.get("mrp") is None: doc["mrp"] = doc["price"]
    doc.update({"id": pid, "vendor_id": current["id"]})
    await db.products.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/vendor/products/{pid}")
async def vendor_update_product(pid: str, data: ProductIn, current=Depends(require_roles("vendor"))):
    store_ids, _ = await _vendor_store_ids(current["id"])
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p or p.get("store_id") not in store_ids:
        raise HTTPException(404, "Not your product")
    upd = data.dict()
    if upd.get("mrp") is None: upd["mrp"] = upd["price"]
    await db.products.update_one({"id": pid}, {"$set": upd})
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.delete("/vendor/products/{pid}")
async def vendor_delete_product(pid: str, current=Depends(require_roles("vendor"))):
    store_ids, _ = await _vendor_store_ids(current["id"])
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p or p.get("store_id") not in store_ids:
        raise HTTPException(404, "Not your product")
    await db.products.delete_one({"id": pid})
    return {"ok": True}


@api.get("/vendor/orders")
async def vendor_orders(current=Depends(require_roles("vendor"))):
    store_ids, _ = await _vendor_store_ids(current["id"])
    if not store_ids: return []
    product_ids = [p["id"] async for p in db.products.find({"store_id": {"$in": store_ids}}, {"id": 1})]
    orders = await db.orders.find({"items.product_id": {"$in": product_ids}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    # attach customer
    for o in orders:
        u = await db.users.find_one({"id": o.get("user_id")}, {"_id": 0, "name": 1, "phone": 1})
        o["customer"] = u or {}
        # only include vendor's items + their subtotal
        o["my_items"] = [it for it in o.get("items", []) if it["product_id"] in product_ids]
        o["my_revenue"] = round(sum(it["line_total"] for it in o["my_items"]), 2)
    return orders


@api.put("/vendor/stores/{store_id}")
async def vendor_update_store(store_id: str, data: dict, current=Depends(require_roles("vendor"))):
    update_data = {}
    if "name" in data: update_data["name"] = data["name"]
    if "is_online" in data: update_data["is_online"] = data["is_online"]
    
    await db.stores.update_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"$set": update_data}
    )
    return {"ok": True}


@api.delete("/vendor/stores/{store_id}")
async def vendor_delete_store(store_id: str, current=Depends(require_roles("vendor"))):
    # Database se store ko hamesha ke liye delete karna (Sirf wahi store jo is vendor ka ho)
    res = await db.stores.delete_one({"id": store_id, "vendor_id": current["id"]})
    
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Store not found or access denied")
        
    return {"ok": True, "message": "Store permanently deleted"}


# ------------------ DELIVERY ------------------
class OnlineIn(BaseModel):
    online: bool


@api.post("/delivery/online")
async def delivery_online(data: OnlineIn, current=Depends(require_roles("delivery"))):
    await db.users.update_one({"id": current["id"]}, {"$set": {"online": data.online}})
    return {"online": data.online}


@api.get("/delivery/me")
async def delivery_me(current=Depends(require_roles("delivery"))):
    u = await db.users.find_one({"id": current["id"]}, {"_id": 0, "password": 0})
    return {"online": u.get("online", False) if u else False}


@api.get("/delivery/available")
async def delivery_available(current=Depends(require_roles("delivery"))):
    """Orders ready for pickup: status=accepted and no delivery partner assigned."""
    orders = await db.orders.find({"status": "accepted", "delivery_id": {"$in": [None, ""]}},
                                  {"_id": 0}).sort("created_at", -1).to_list(50)
    for o in orders:
        u = await db.users.find_one({"id": o.get("user_id")}, {"_id": 0, "name": 1, "phone": 1})
        o["customer"] = u or {}
    return orders


@api.post("/delivery/orders/{order_id}/claim")
async def delivery_claim(order_id: str, current=Depends(require_roles("delivery"))):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o: raise HTTPException(404, "Not found")
    if o.get("delivery_id"): raise HTTPException(400, "Already claimed")
    timeline = o.get("timeline", [])
    timeline.append({"status": "out_for_delivery", "at": now_iso(), "label": "Out for Delivery"})
    await db.orders.update_one({"id": order_id}, {"$set": {
        "delivery_id": current["id"], "status": "out_for_delivery", "timeline": timeline,
    }})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": o["user_id"], "title": "Out for delivery",
        "body": f"Your order {o['order_no']} is on the way!", "type": "delivery", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.post("/delivery/orders/{order_id}/delivered")
async def delivery_mark_delivered(order_id: str, current=Depends(require_roles("delivery"))):
    o = await db.orders.find_one({"id": order_id, "delivery_id": current["id"]}, {"_id": 0})
    if not o: raise HTTPException(404, "Not assigned to you")
    timeline = o.get("timeline", [])
    timeline.append({"status": "delivered", "at": now_iso(), "label": "Delivered"})
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "delivered", "timeline": timeline}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": o["user_id"], "title": "Order delivered",
        "body": f"Your order {o['order_no']} has been delivered. Enjoy!", "type": "delivery", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.get("/delivery/my")
async def delivery_my(current=Depends(require_roles("delivery"))):
    orders = await db.orders.find({"delivery_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for o in orders:
        u = await db.users.find_one({"id": o.get("user_id")}, {"_id": 0, "name": 1, "phone": 1})
        o["customer"] = u or {}
    return orders


@api.get("/delivery/stats")
async def delivery_stats(current=Depends(require_roles("delivery"))):
    orders = await db.orders.find({"delivery_id": current["id"]}, {"_id": 0}).to_list(500)
    total = len(orders)
    delivered = sum(1 for o in orders if o.get("status") == "delivered")
    # ₹30 per delivery (flat payout)
    earnings = delivered * 30
    today = datetime.now(timezone.utc).date().isoformat()
    today_orders = [o for o in orders if (o.get("created_at") or "")[:10] == today]
    return {
        "total": total, "delivered": delivered, "active": total - delivered,
        "earnings": earnings, "today_orders": len(today_orders),
    }


# Auto-accept pending orders (admin/vendor would do this; for demo we expose vendor endpoint)
@api.post("/vendor/orders/{order_id}/accept")
async def vendor_accept(order_id: str, current=Depends(require_roles("vendor"))):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o: raise HTTPException(404, "Not found")
    timeline = o.get("timeline", [])
    timeline.append({"status": "accepted", "at": now_iso(), "label": "Accepted by vendor"})
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "accepted", "timeline": timeline}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": o["user_id"], "title": "Order accepted",
        "body": f"Your order {o['order_no']} has been accepted by the vendor.", "type": "order",
        "read": False, "created_at": now_iso(),
    })
    return {"ok": True}




# ------------------ SEED ------------------
SEED_CATEGORIES = [
    {"id": "cat-grocery", "name": "Grocery", "icon": "cart-outline", "color": "#16A34A",
     "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80"},
    {"id": "cat-food", "name": "Food", "icon": "food", "color": "#F97316",
     "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80"},
    {"id": "cat-medicine", "name": "Medicines", "icon": "pill", "color": "#DC2626",
     "image": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&q=80"},
    {"id": "cat-electronics", "name": "Electronics", "icon": "headphones", "color": "#2563EB",
     "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80"},
    {"id": "cat-fashion", "name": "Fashion", "icon": "tshirt-crew", "color": "#9333EA",
     "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80"},
]

SEED_BANNERS = [
    {"id": "ban-1", "title": "Fresh Groceries", "subtitle": "Delivered in 30 mins", "cta": "Shop Now",
     "image": "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=900&q=80",
     "color": "#16A34A", "order": 1, "category_id": "cat-grocery"},
    {"id": "ban-2", "title": "Mega Electronics Sale", "subtitle": "Up to 60% OFF", "cta": "Grab Deals",
     "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80",
     "color": "#2563EB", "order": 2, "category_id": "cat-electronics"},
    {"id": "ban-3", "title": "Fashion Festival", "subtitle": "New arrivals daily", "cta": "Explore",
     "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80",
     "color": "#F97316", "order": 3, "category_id": "cat-fashion"},
]

SEED_STORES = [
    {"id": "st-1", "name": "Fresh Mart", "rating": 4.6, "delivery_min": 25, "category_id": "cat-grocery",
     "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
     "address": "Sector 18, Noida"},
    {"id": "st-2", "name": "MediQuick Pharmacy", "rating": 4.8, "delivery_min": 15, "category_id": "cat-medicine",
     "image": "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&q=80",
     "address": "Connaught Place, Delhi"},
    {"id": "st-3", "name": "TechWorld", "rating": 4.5, "delivery_min": 45, "category_id": "cat-electronics",
     "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
     "address": "Cyber Hub, Gurgaon"},
    {"id": "st-4", "name": "Tasty Bites", "rating": 4.7, "delivery_min": 20, "category_id": "cat-food",
     "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
     "address": "South Ex, Delhi"},
]

SEED_PRODUCTS = [
    # Grocery
    {"id": "p-1", "name": "Fresh Tomatoes", "category_id": "cat-grocery", "store_id": "st-1",
     "price": 39, "mrp": 50, "unit": "1 kg", "stock": 50, "trending": True,
     "image": "https://images.unsplash.com/photo-1546470427-227df1e4b3a8?w=600&q=80",
     "description": "Fresh, juicy red tomatoes hand-picked from local farms."},
    {"id": "p-2", "name": "Bananas", "category_id": "cat-grocery", "store_id": "st-1",
     "price": 49, "mrp": 60, "unit": "1 dozen", "stock": 30, "trending": True,
     "image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80",
     "description": "Ripe yellow bananas, perfect for breakfast."},
    {"id": "p-3", "name": "Amul Gold Milk", "category_id": "cat-grocery", "store_id": "st-1",
     "price": 68, "mrp": 70, "unit": "1 L", "stock": 100, "trending": True,
     "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80",
     "description": "Full cream milk, 6% fat, pasteurized."},
    {"id": "p-4", "name": "Brown Bread", "category_id": "cat-grocery", "store_id": "st-1",
     "price": 45, "mrp": 50, "unit": "400 g", "stock": 25,
     "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
     "description": "Whole wheat bread, freshly baked."},
    # Food
    {"id": "p-5", "name": "Margherita Pizza", "category_id": "cat-food", "store_id": "st-4",
     "price": 249, "mrp": 299, "unit": "Regular", "stock": 20, "trending": True,
     "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
     "description": "Classic pizza with mozzarella and fresh basil."},
    {"id": "p-6", "name": "Chicken Biryani", "category_id": "cat-food", "store_id": "st-4",
     "price": 199, "mrp": 250, "unit": "Full", "stock": 15, "trending": True,
     "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80",
     "description": "Aromatic basmati rice with tender chicken pieces."},
    {"id": "p-7", "name": "Veg Burger", "category_id": "cat-food", "store_id": "st-4",
     "price": 99, "mrp": 120, "unit": "1 pc", "stock": 30,
     "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
     "description": "Crispy veggie patty with cheese and fresh lettuce."},
    # Medicines
    {"id": "p-8", "name": "Crocin Advance", "category_id": "cat-medicine", "store_id": "st-2",
     "price": 35, "mrp": 40, "unit": "15 tabs", "stock": 100, "trending": True,
     "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80",
     "description": "Fast relief from fever and headache."},
    {"id": "p-9", "name": "Vitamin C 500mg", "category_id": "cat-medicine", "store_id": "st-2",
     "price": 199, "mrp": 250, "unit": "30 tabs", "stock": 50,
     "image": "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600&q=80",
     "description": "Boost immunity, antioxidant rich."},
    # Electronics
    {"id": "p-10", "name": "Wireless Headphones", "category_id": "cat-electronics", "store_id": "st-3",
     "price": 1999, "mrp": 3999, "unit": "1 unit", "stock": 15, "trending": True,
     "image": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80",
     "description": "Premium wireless headphones with active noise cancellation."},
    {"id": "p-11", "name": "Smart Watch", "category_id": "cat-electronics", "store_id": "st-3",
     "price": 2499, "mrp": 4999, "unit": "1 unit", "stock": 12, "trending": True,
     "image": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80",
     "description": "Heart rate monitor, GPS, 7-day battery life."},
    {"id": "p-12", "name": "Bluetooth Speaker", "category_id": "cat-electronics", "store_id": "st-3",
     "price": 1499, "mrp": 2499, "unit": "1 unit", "stock": 20,
     "image": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80",
     "description": "Portable speaker with deep bass, 12-hour playback."},
    # Fashion
    {"id": "p-13", "name": "Cotton T-Shirt", "category_id": "cat-fashion", "store_id": "st-1",
     "price": 499, "mrp": 999, "unit": "M", "stock": 40, "trending": True,
     "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
     "description": "100% cotton, breathable, regular fit."},
    {"id": "p-14", "name": "Denim Jeans", "category_id": "cat-fashion", "store_id": "st-1",
     "price": 1299, "mrp": 2499, "unit": "32", "stock": 25,
     "image": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80",
     "description": "Slim-fit blue denim jeans, premium fabric."},
    {"id": "p-15", "name": "Running Sneakers", "category_id": "cat-fashion", "store_id": "st-1",
     "price": 1799, "mrp": 3499, "unit": "UK 9", "stock": 18, "trending": True,
     "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
     "description": "Lightweight running shoes with cushioned sole."},
]


async def seed_db():
    # Seed admin
    if not await db.users.find_one({"email": "admin@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "KMT Admin",
            "email": "admin@kmtbazaar.com",
            "phone": "9999999999",
            "password": hash_password("Admin@123"),
            "role": Role.ADMIN.value,
            "avatar": None,
            "created_at": now_iso(),
        })
    else:
        await db.users.update_one({"email": "admin@kmtbazaar.com"}, {"$set": {"name": "KMT Admin", "role": Role.ADMIN.value}})

    # Seed sample customer
    if not await db.users.find_one({"email": "customer@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "KMT Customer",
            "email": "customer@kmtbazaar.com",
            "phone": "9000000001",
            "password": hash_password("Customer@123"),
            "role": Role.CUSTOMER.value,
            "avatar": None,
            "created_at": now_iso(),
        })
    else:
        await db.users.update_one({"email": "customer@kmtbazaar.com"}, {"$set": {"name": "KMT Customer", "role": Role.CUSTOMER.value}})

    # Seed vendor & delivery
    if not await db.users.find_one({"email": "vendor@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "KMT Vendor", "email": "vendor@kmtbazaar.com",
            "phone": "9000000002", "password": hash_password("Vendor@123"),
            "role": Role.VENDOR.value, "avatar": None, "created_at": now_iso(),
        })
    else:
        await db.users.update_one({"email": "vendor@kmtbazaar.com"}, {"$set": {"name": "KMT Vendor", "role": Role.VENDOR.value}})

    if not await db.users.find_one({"email": "vendor2@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "TechWorld Owner", "email": "vendor2@kmtbazaar.com",
            "phone": "9000000004", "password": hash_password("Vendor@123"),
            "role": Role.VENDOR.value, "avatar": None, "created_at": now_iso(),
        })
    else:
        await db.users.update_one({"email": "vendor2@kmtbazaar.com"}, {"$set": {"name": "TechWorld Owner", "role": Role.VENDOR.value}})

    if not await db.users.find_one({"email": "delivery@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "KMT Delivery", "email": "delivery@kmtbazaar.com",
            "phone": "9000000003", "password": hash_password("Delivery@123"),
            "role": Role.DELIVERY.value, "avatar": None, "created_at": now_iso(),
        })
    else:
        await db.users.update_one({"email": "delivery@kmtbazaar.com"}, {"$set": {"name": "KMT Delivery", "role": Role.DELIVERY.value}})

    # Categories
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([dict(c) for c in SEED_CATEGORIES])
    # Banners
    if await db.banners.count_documents({}) == 0:
        await db.banners.insert_many([dict(b) for b in SEED_BANNERS])
    # Stores
    if await db.stores.count_documents({}) == 0:
        await db.stores.insert_many([dict(s) for s in SEED_STORES])
    # Products
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many([dict(p) for p in SEED_PRODUCTS])

    # Link demo vendors to stores (idempotent)
    vendor1 = await db.users.find_one({"email": "vendor@kmtbazaar.com"})
    vendor2 = await db.users.find_one({"email": "vendor2@kmtbazaar.com"})
    if vendor1:
        # Demo Vendor owns Fresh Mart (st-1) + Tasty Bites (st-4)
        await db.stores.update_many({"id": {"$in": ["st-1", "st-4"]}}, {"$set": {"vendor_id": vendor1["id"]}})
        await db.products.update_many({"store_id": {"$in": ["st-1", "st-4"]}}, {"$set": {"vendor_id": vendor1["id"]}})
    if vendor2:
        await db.stores.update_many({"id": {"$in": ["st-2", "st-3"]}}, {"$set": {"vendor_id": vendor2["id"]}})
        await db.products.update_many({"store_id": {"$in": ["st-2", "st-3"]}}, {"$set": {"vendor_id": vendor2["id"]}})

    # Default settings
    if not await db.settings.find_one({"id": "global"}):
        await db.settings.insert_one({"id": "global", "commission_percent": 10.0})

    # Seed a few demo orders if none for showcase
    if await db.orders.count_documents({}) == 0:
        cust = await db.users.find_one({"email": "customer@kmtbazaar.com"})
        if cust:
            addr = {
                "id": str(uuid.uuid4()), "user_id": cust["id"], "label": "Home",
                "full_name": "Demo Customer", "phone": "9000000001",
                "line1": "Flat 302, Skyline Apartments", "line2": "Sector 62",
                "city": "Noida", "state": "UP", "pincode": "201301", "is_default": True,
                "created_at": now_iso(),
            }
            if not await db.addresses.find_one({"user_id": cust["id"]}):
                await db.addresses.insert_one(dict(addr))

            demo_orders = [
                ("delivered", [("p-1", 2), ("p-3", 1)], "cod"),
                ("accepted", [("p-10", 1)], "online"),
                ("pending", [("p-5", 1), ("p-7", 2)], "cod"),
            ]
            from datetime import timedelta as _td2
            base_dt = datetime.now(timezone.utc)
            for i, (st, items_in, pm) in enumerate(demo_orders):
                items = []
                subtotal = 0.0
                for pid, qty in items_in:
                    p = await db.products.find_one({"id": pid}, {"_id": 0})
                    if not p: continue
                    lt = p["price"] * qty
                    subtotal += lt
                    items.append({
                        "product_id": p["id"], "name": p["name"], "image": p.get("image"),
                        "price": p["price"], "mrp": p.get("mrp", p["price"]), "quantity": qty,
                        "variant": None, "unit": p.get("unit", ""), "line_total": round(lt, 2),
                    })
                delivery_fee = 0 if subtotal >= 199 else 25
                tax = round(subtotal * 0.05, 2)
                total = round(subtotal + delivery_fee + tax, 2)
                oid = str(uuid.uuid4())
                ono = "KMT" + (base_dt - _td2(days=i)).strftime("%y%m%d") + oid[:4].upper()
                await db.orders.insert_one({
                    "id": oid, "order_no": ono, "user_id": cust["id"], "items": items,
                    "subtotal": round(subtotal, 2), "delivery_fee": delivery_fee, "tax": tax, "total": total,
                    "address": addr, "payment_method": pm,
                    "payment_status": "paid" if pm == "online" or st == "delivered" else "pending",
                    "status": st, "notes": "",
                    "delivery_id": None,
                    "timeline": [{"status": "pending", "at": now_iso(), "label": "Order placed"}],
                    "created_at": (base_dt - _td2(days=i)).isoformat(),
                })


@app.on_event("startup")
async def on_startup():
    await seed_db()
    logging.info("KMT Bazaar API ready. Seed completed.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return {"app": "KMT Bazaar", "status": "ok"}

@api.post("/ai/chat")
async def ai_chat(req: AIChatRequest):
    try:
        print("==== BHEJA GAYA MODEL NAAM HAI: ====", GEMINI_MODEL)
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY not configured"
            )

        response = gemini_client.chat.completions.create(
            model="gemini-1.5-flash",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are KMT Bazaar AI Assistant. "
                        "Help customers with products, orders, sellers, "
                        "delivery and general shopping questions."
                    ),
                },
                {
                    "role": "user",
                    "content": req.message,
                },
            ],
        )

        return {
            "message": response.choices[0].message.content
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
@api.get("/test-db")
async def test_db():
    return {"users": await db.users.count_documents({}), "orders": await db.orders.count_documents({})}



app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
    
    
