from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI(title="KMT Bazaar API")
api = APIRouter(prefix="/api")


# ------------------ MODELS ------------------
class Role(str, Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    DELIVERY = "delivery"
    ADMIN = "admin"


class VendorStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class ProductStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class OrderItemStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PREPARING = "preparing"
    PACKED = "packed"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


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
    vendor_status: Optional[str] = None


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


def require_approved_vendor():
    """Vendor must be approved to access selling features."""
    async def _dep(current=Depends(get_current_user)):
        if current.get("role") != "vendor":
            raise HTTPException(status_code=403, detail="Vendor access required")
        vs = current.get("vendor_status", "pending")
        if vs != "approved":
            raise HTTPException(
                status_code=403,
                detail=f"Your vendor account is {vs}. Please wait for admin approval."
            )
        return current
    return _dep


def user_to_out(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u.get("name", ""),
        "email": u.get("email"),
        "phone": u.get("phone"),
        "role": u.get("role", "customer"),
        "avatar": u.get("avatar"),
        "vendor_status": u.get("vendor_status") if u.get("role") == "vendor" else None,
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
    # New vendors must be approved by admin before they can sell
    if data.role == Role.VENDOR:
        user_doc["vendor_status"] = VendorStatus.PENDING.value
        user_doc["vendor_applied_at"] = now_iso()
    token = create_token(uid, data.role.value)
    await db.users.insert_one(user_doc)
    # Notify admins of new vendor signup
    if data.role == Role.VENDOR:
        admins = await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(50)
        for a in admins:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()), "user_id": a["id"],
                "title": "New vendor signup",
                "body": f"{data.name} has applied to become a vendor. Review and approve.",
                "type": "vendor_signup", "read": False, "created_at": now_iso(),
            })
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
    stores = await db.stores.find({}, {"_id": 0}).to_list(100)
    return stores


@api.get("/products")
async def list_products(category: Optional[str] = None, q: Optional[str] = None, trending: Optional[bool] = None, limit: int = 50):
    # Customer-facing: only show approved products
    query: Dict[str, Any] = {"status": "approved"}
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
    p = await db.products.find_one({"id": product_id, "status": "approved"}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p


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


@api.delete("/addresses/{addr_id}")
async def delete_address(addr_id: str, current=Depends(get_current_user)):
    await db.addresses.delete_one({"id": addr_id, "user_id": current["id"]})
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
    created_at = now_iso()

    # Build order_items collection — each item has full snapshot + vendor_id
    order_items: List[Dict[str, Any]] = []
    vendor_ids = set()
    vendor_cache: Dict[str, Dict[str, Any]] = {}
    for it in expanded["items"]:
        p = await db.products.find_one({"id": it["product_id"]}, {"_id": 0})
        if not p:
            continue
        vendor_id = p.get("vendor_id")
        vendor_name = None
        store_name = None
        if vendor_id:
            v = vendor_cache.get(vendor_id) or await db.users.find_one(
                {"id": vendor_id}, {"_id": 0, "name": 1, "phone": 1}
            )
            vendor_cache[vendor_id] = v or {}
            vendor_name = (v or {}).get("name")
            vendor_ids.add(vendor_id)
        store = await db.stores.find_one({"id": p.get("store_id")}, {"_id": 0, "name": 1}) if p.get("store_id") else None
        store_name = (store or {}).get("name")

        item_id = "oi-" + uuid.uuid4().hex[:10]
        order_items.append({
            "id": item_id,
            "order_id": order_id,
            "product_id": p["id"],
            "vendor_id": vendor_id,
            "vendor_name": vendor_name,
            "store_id": p.get("store_id"),
            "store_name": store_name,
            "product_name": p["name"],
            "product_image": p.get("image"),
            "product_unit": p.get("unit", ""),
            "quantity": it["quantity"],
            "unit_price": p["price"],
            "mrp": p.get("mrp", p["price"]),
            "total_price": round(p["price"] * it["quantity"], 2),
            "status": OrderItemStatus.PENDING.value,
            "status_history": [{"status": "pending", "at": created_at, "label": "Order placed"}],
            "created_at": created_at,
        })

    # Customer snapshot
    customer_snap = {
        "id": current["id"],
        "name": current.get("name") or addr.get("full_name"),
        "phone": current.get("phone") or addr.get("phone"),
        "email": current.get("email"),
    }

    order = {
        "id": order_id,
        "order_no": order_no,
        "user_id": current["id"],
        "customer": customer_snap,
        "items": expanded["items"],  # keep denormalized list for backward compat
        "subtotal": expanded["subtotal"],
        "delivery_fee": expanded["delivery_fee"],
        "discount": 0.0,
        "tax": expanded["tax"],
        "total": expanded["total"],
        "final_amount": expanded["total"],
        "address": addr,
        "payment_method": data.payment_method,
        "payment_status": "paid" if data.payment_method == "online" else "pending",
        "status": "pending",
        "vendor_ids": list(vendor_ids),
        "notes": data.notes,
        "timeline": [{"status": "pending", "at": created_at, "label": "Order placed"}],
        "delivery_id": None,
        "created_at": created_at,
    }
    await db.orders.insert_one(dict(order))
    if order_items:
        await db.order_items.insert_many([dict(oi) for oi in order_items])

    # clear cart
    await db.carts.update_one({"user_id": current["id"]}, {"$set": {"items": [], "updated_at": now_iso()}})

    # Notify customer
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current["id"],
        "title": "Order placed",
        "body": f"Your order {order_no} has been placed successfully.",
        "type": "order",
        "order_id": order_id,
        "read": False,
        "created_at": created_at,
    })
    # Notify each vendor
    for vid in vendor_ids:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": vid,
            "title": "New order received",
            "body": f"You have new items in order {order_no}.",
            "type": "order",
            "order_id": order_id,
            "read": False,
            "created_at": created_at,
        })
    # Notify all admins
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(50)
    for a in admins:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": a["id"],
            "title": "New customer order",
            "body": f"Order {order_no} for ₹{order['final_amount']} placed.",
            "type": "order",
            "order_id": order_id,
            "read": False,
            "created_at": created_at,
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


class RejectIn(BaseModel):
    reason: str = ""


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


# ----- Vendor Approval Queue -----
@api.get("/admin/vendors")
async def admin_vendors(status: Optional[str] = None, _=Depends(require_roles("admin"))):
    q: Dict[str, Any] = {"role": "vendor"}
    if status:
        q["vendor_status"] = status
    vendors = await db.users.find(q, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(500)
    # Enrich with store + product count
    for v in vendors:
        v["stores"] = await db.stores.find({"vendor_id": v["id"]}, {"_id": 0}).to_list(20)
        v["products_count"] = await db.products.count_documents({"vendor_id": v["id"]})
        v["orders_count"] = len({oi["order_id"] async for oi in db.order_items.find({"vendor_id": v["id"]}, {"order_id": 1})})
    return vendors


@api.post("/admin/vendors/{vid}/approve")
async def admin_approve_vendor(vid: str, _=Depends(require_roles("admin"))):
    v = await db.users.find_one({"id": vid, "role": "vendor"}, {"_id": 0})
    if not v: raise HTTPException(404, "Vendor not found")
    await db.users.update_one(
        {"id": vid},
        {"$set": {
            "vendor_status": VendorStatus.APPROVED.value,
            "vendor_approved_at": now_iso(),
            "vendor_rejection_reason": None,
        }}
    )
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": vid,
        "title": "Vendor account approved",
        "body": "Congratulations! Your vendor account has been approved. You can now start selling.",
        "type": "vendor_status", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.post("/admin/vendors/{vid}/reject")
async def admin_reject_vendor(vid: str, data: RejectIn, _=Depends(require_roles("admin"))):
    v = await db.users.find_one({"id": vid, "role": "vendor"}, {"_id": 0})
    if not v: raise HTTPException(404, "Vendor not found")
    await db.users.update_one(
        {"id": vid},
        {"$set": {
            "vendor_status": VendorStatus.REJECTED.value,
            "vendor_rejection_reason": data.reason or "Application did not meet criteria.",
            "vendor_rejected_at": now_iso(),
        }}
    )
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": vid,
        "title": "Vendor application rejected",
        "body": f"Your application was rejected. Reason: {data.reason or 'Did not meet criteria'}",
        "type": "vendor_status", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.post("/admin/vendors/{vid}/suspend")
async def admin_suspend_vendor(vid: str, data: RejectIn, _=Depends(require_roles("admin"))):
    v = await db.users.find_one({"id": vid, "role": "vendor"}, {"_id": 0})
    if not v: raise HTTPException(404, "Vendor not found")
    await db.users.update_one(
        {"id": vid},
        {"$set": {
            "vendor_status": VendorStatus.SUSPENDED.value,
            "vendor_rejection_reason": data.reason or "Account suspended by admin.",
            "vendor_suspended_at": now_iso(),
        }}
    )
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": vid,
        "title": "Vendor account suspended",
        "body": f"Your account has been suspended. Reason: {data.reason or 'Admin action'}. Contact support.",
        "type": "vendor_status", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.post("/admin/vendors/{vid}/reactivate")
async def admin_reactivate_vendor(vid: str, _=Depends(require_roles("admin"))):
    v = await db.users.find_one({"id": vid, "role": "vendor"}, {"_id": 0})
    if not v: raise HTTPException(404, "Vendor not found")
    await db.users.update_one(
        {"id": vid},
        {"$set": {
            "vendor_status": VendorStatus.APPROVED.value,
            "vendor_rejection_reason": None,
            "vendor_reactivated_at": now_iso(),
        }}
    )
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": vid,
        "title": "Vendor account reactivated",
        "body": "Your vendor account has been reactivated. You can resume selling.",
        "type": "vendor_status", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.get("/admin/orders")
async def admin_orders(status: Optional[str] = None, _=Depends(require_roles("admin"))):
    q = {}
    if status: q["status"] = status
    orders = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    for o in orders:
        # attach order_items (with vendor info)
        oi = await db.order_items.find({"order_id": o["id"]}, {"_id": 0}).to_list(500)
        o["order_items"] = oi
        # attach customer (fresh if snapshot missing)
        if not o.get("customer"):
            u = await db.users.find_one({"id": o.get("user_id")}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
            o["customer"] = u or {}
    return orders


@api.get("/admin/orders/{order_id}")
async def admin_order_detail(order_id: str, _=Depends(require_roles("admin"))):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o: raise HTTPException(404, "Order not found")
    o["order_items"] = await db.order_items.find({"order_id": order_id}, {"_id": 0}).to_list(500)
    if not o.get("customer"):
        u = await db.users.find_one({"id": o.get("user_id")}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
        o["customer"] = u or {}
    return o


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
    # Admin-created products are auto-approved
    doc["status"] = ProductStatus.APPROVED.value
    doc["approved_at"] = now_iso()
    doc["created_at"] = now_iso()
    await db.products.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/admin/products/{pid}")
async def admin_update_product(pid: str, data: ProductIn, _=Depends(require_roles("admin"))):
    upd = {k: v for k, v in data.dict().items() if v is not None}
    if upd.get("mrp") is None: upd["mrp"] = upd.get("price")
    upd["updated_at"] = now_iso()
    res = await db.products.update_one({"id": pid}, {"$set": upd})
    if res.matched_count == 0: raise HTTPException(404, "Not found")
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, _=Depends(require_roles("admin"))):
    await db.products.delete_one({"id": pid})
    return {"ok": True}


@api.get("/admin/products")
async def admin_list_products(status: Optional[str] = None, _=Depends(require_roles("admin"))):
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    products = await db.products.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    # attach vendor info
    for p in products:
        if p.get("vendor_id"):
            v = await db.users.find_one({"id": p["vendor_id"]}, {"_id": 0, "name": 1, "email": 1})
            p["vendor"] = v or {}
    return products


@api.post("/admin/products/{pid}/approve")
async def admin_approve_product(pid: str, _=Depends(require_roles("admin"))):
    res = await db.products.update_one(
        {"id": pid},
        {"$set": {"status": ProductStatus.APPROVED.value, "approved_at": now_iso(), "rejection_reason": None}}
    )
    if res.matched_count == 0: raise HTTPException(404, "Not found")
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    # notify vendor
    if p and p.get("vendor_id"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": p["vendor_id"],
            "title": "Product approved",
            "body": f"Your product '{p['name']}' has been approved and is now live.",
            "type": "product", "product_id": pid, "read": False, "created_at": now_iso(),
        })
    return {"ok": True, "product": p}


@api.post("/admin/products/{pid}/reject")
async def admin_reject_product(pid: str, data: RejectIn, _=Depends(require_roles("admin"))):
    res = await db.products.update_one(
        {"id": pid},
        {"$set": {
            "status": ProductStatus.REJECTED.value,
            "rejection_reason": data.reason or "Did not meet marketplace guidelines.",
            "rejected_at": now_iso(),
        }}
    )
    if res.matched_count == 0: raise HTTPException(404, "Not found")
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if p and p.get("vendor_id"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": p["vendor_id"],
            "title": "Product rejected",
            "body": f"Your product '{p['name']}' was rejected. Reason: {data.reason or 'Did not meet guidelines'}",
            "type": "product", "product_id": pid, "read": False, "created_at": now_iso(),
        })
    return {"ok": True, "product": p}


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


# ------------------ VENDOR ------------------
async def _vendor_store_ids(vendor_id: str):
    stores = await db.stores.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(50)
    return [s["id"] for s in stores], stores


@api.get("/vendor/me")
async def vendor_me(current=Depends(require_roles("vendor"))):
    """Get vendor's profile + approval status."""
    return {
        "id": current["id"],
        "name": current.get("name"),
        "email": current.get("email"),
        "phone": current.get("phone"),
        "vendor_status": current.get("vendor_status", "pending"),
        "rejection_reason": current.get("vendor_rejection_reason"),
        "applied_at": current.get("vendor_applied_at"),
        "approved_at": current.get("vendor_approved_at"),
    }


@api.get("/vendor/stats")
async def vendor_stats(current=Depends(require_approved_vendor())):
    store_ids, stores = await _vendor_store_ids(current["id"])
    products_count = await db.products.count_documents({"vendor_id": current["id"]})
    # query order_items belonging to this vendor
    items = await db.order_items.find({"vendor_id": current["id"]}, {"_id": 0}).to_list(2000)
    order_ids = {it["order_id"] for it in items}
    revenue = sum(it.get("total_price", 0) for it in items if it.get("status") not in ("rejected", "cancelled"))
    pending = sum(1 for it in items if it.get("status") == "pending")
    delivered = sum(1 for it in items if it.get("status") == "delivered")
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    commission = settings.get("commission_percent", 10.0)
    payout = round(revenue * (1 - commission / 100), 2)
    return {
        "stores": stores, "products": products_count,
        "orders": len(order_ids), "pending": pending, "delivered": delivered,
        "revenue": round(revenue, 2), "commission_percent": commission, "payout": payout,
    }


@api.get("/vendor/products")
async def vendor_products(status: Optional[str] = None, current=Depends(require_roles("vendor"))):
    """Vendor sees all THEIR products (any status) so they can manage them."""
    q: Dict[str, Any] = {"vendor_id": current["id"]}
    if status:
        q["status"] = status
    return await db.products.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/vendor/products")
async def vendor_create_product(data: ProductIn, current=Depends(require_approved_vendor())):
    store_ids, _ = await _vendor_store_ids(current["id"])
    sid = data.store_id or (store_ids[0] if store_ids else None)
    if sid not in store_ids:
        raise HTTPException(400, "Invalid store for vendor")
    pid = "p-" + uuid.uuid4().hex[:8]
    doc = data.dict(); doc["store_id"] = sid
    if doc.get("mrp") is None: doc["mrp"] = doc["price"]
    doc.update({
        "id": pid,
        "vendor_id": current["id"],
        "status": ProductStatus.PENDING.value,
        "created_at": now_iso(),
    })
    await db.products.insert_one(dict(doc))
    # notify admins
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(50)
    for a in admins:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": a["id"],
            "title": "New product needs approval",
            "body": f"'{doc['name']}' by {current.get('name')} is pending approval.",
            "type": "product", "product_id": pid, "read": False, "created_at": now_iso(),
        })
    doc.pop("_id", None)
    return doc


@api.put("/vendor/products/{pid}")
async def vendor_update_product(pid: str, data: ProductIn, current=Depends(require_approved_vendor())):
    p = await db.products.find_one({"id": pid, "vendor_id": current["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not your product")
    upd = {k: v for k, v in data.dict().items() if v is not None}
    if upd.get("mrp") is None: upd["mrp"] = upd.get("price")
    # Edits force re-approval
    upd["status"] = ProductStatus.PENDING.value
    upd["updated_at"] = now_iso()
    upd["rejection_reason"] = None
    await db.products.update_one({"id": pid}, {"$set": upd})
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.delete("/vendor/products/{pid}")
async def vendor_delete_product(pid: str, current=Depends(require_approved_vendor())):
    p = await db.products.find_one({"id": pid, "vendor_id": current["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not your product")
    await db.products.delete_one({"id": pid})
    return {"ok": True}


@api.get("/vendor/orders")
async def vendor_orders(current=Depends(require_approved_vendor())):
    """List all orders containing items from this vendor — with only this vendor's items."""
    items = await db.order_items.find({"vendor_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    by_order: Dict[str, List[Dict[str, Any]]] = {}
    for it in items:
        by_order.setdefault(it["order_id"], []).append(it)
    out = []
    for oid, oi in by_order.items():
        order = await db.orders.find_one({"id": oid}, {"_id": 0})
        if not order:
            continue
        revenue = round(sum(i["total_price"] for i in oi if i.get("status") not in ("rejected", "cancelled")), 2)
        out.append({
            "order_id": oid,
            "order_no": order.get("order_no"),
            "status": order.get("status"),
            "payment_method": order.get("payment_method"),
            "payment_status": order.get("payment_status"),
            "customer": order.get("customer") or {},
            "address": order.get("address") or {},
            "items": oi,
            "my_revenue": revenue,
            "created_at": order.get("created_at"),
        })
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return out


class ItemStatusIn(BaseModel):
    status: str  # accepted | rejected | preparing | packed


@api.post("/vendor/order-items/{item_id}/status")
async def vendor_update_item_status(item_id: str, data: ItemStatusIn, current=Depends(require_approved_vendor())):
    """Vendor updates per-item status (accept/reject/preparing/packed)."""
    valid = {"accepted", "rejected", "preparing", "packed"}
    if data.status not in valid:
        raise HTTPException(400, f"Invalid status. Allowed: {valid}")
    item = await db.order_items.find_one({"id": item_id, "vendor_id": current["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Item not found")
    history = item.get("status_history", [])
    history.append({"status": data.status, "at": now_iso(), "label": data.status.replace("_", " ").title()})
    await db.order_items.update_one(
        {"id": item_id},
        {"$set": {"status": data.status, "status_history": history, "updated_at": now_iso()}}
    )
    # Check if ALL items in the order are packed → promote order to "ready_for_pickup"
    order = await db.orders.find_one({"id": item["order_id"]}, {"_id": 0})
    if order:
        all_items = await db.order_items.find({"order_id": item["order_id"]}, {"_id": 0}).to_list(200)
        statuses = {it.get("status") for it in all_items}
        new_order_status = None
        # If any item is accepted/preparing/packed → order = accepted (vendor has acknowledged)
        if order.get("status") == "pending" and statuses & {"accepted", "preparing", "packed"}:
            new_order_status = "accepted"
        # If all items packed → ready for pickup
        if all_items and all(s in ("packed", "rejected", "cancelled") for s in statuses):
            non_rejected = [it for it in all_items if it.get("status") == "packed"]
            if non_rejected:
                new_order_status = "ready_for_pickup"
        if new_order_status and new_order_status != order.get("status"):
            tl = order.get("timeline", [])
            tl.append({"status": new_order_status, "at": now_iso(), "label": new_order_status.replace("_", " ").title()})
            await db.orders.update_one(
                {"id": order["id"]},
                {"$set": {"status": new_order_status, "timeline": tl}}
            )
            # notify customer
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()), "user_id": order["user_id"],
                "title": f"Order {new_order_status.replace('_',' ').title()}",
                "body": f"Order {order['order_no']} is now {new_order_status.replace('_',' ')}.",
                "type": "order", "order_id": order["id"], "read": False, "created_at": now_iso(),
            })
    return {"ok": True}


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


# Vendor bulk-accepts all their items in an order
@api.post("/vendor/orders/{order_id}/accept")
async def vendor_accept(order_id: str, current=Depends(require_approved_vendor())):
    items = await db.order_items.find({"order_id": order_id, "vendor_id": current["id"]}, {"_id": 0}).to_list(100)
    if not items:
        raise HTTPException(404, "No items for you in this order")
    for it in items:
        if it.get("status") in ("rejected", "delivered", "cancelled"):
            continue
        hist = it.get("status_history", [])
        hist.append({"status": "accepted", "at": now_iso(), "label": "Accepted by vendor"})
        await db.order_items.update_one(
            {"id": it["id"]},
            {"$set": {"status": "accepted", "status_history": hist, "updated_at": now_iso()}}
        )
    # promote order to accepted if currently pending
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if order and order.get("status") == "pending":
        tl = order.get("timeline", [])
        tl.append({"status": "accepted", "at": now_iso(), "label": "Accepted"})
        await db.orders.update_one({"id": order_id}, {"$set": {"status": "accepted", "timeline": tl}})
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": order["user_id"],
            "title": "Order accepted",
            "body": f"Your order {order['order_no']} has been accepted by the vendor.",
            "type": "order", "order_id": order_id, "read": False, "created_at": now_iso(),
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
    # Seed sample customer
    if not await db.users.find_one({"email": "customer@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Demo Customer",
            "email": "customer@kmtbazaar.com",
            "phone": "9000000001",
            "password": hash_password("Customer@123"),
            "role": Role.CUSTOMER.value,
            "avatar": None,
            "created_at": now_iso(),
        })
    # Seed vendor & delivery
    if not await db.users.find_one({"email": "vendor@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "Demo Vendor", "email": "vendor@kmtbazaar.com",
            "phone": "9000000002", "password": hash_password("Vendor@123"),
            "role": Role.VENDOR.value, "avatar": None, "created_at": now_iso(),
        })
    if not await db.users.find_one({"email": "vendor2@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "TechWorld Owner", "email": "vendor2@kmtbazaar.com",
            "phone": "9000000004", "password": hash_password("Vendor@123"),
            "role": Role.VENDOR.value, "avatar": None, "created_at": now_iso(),
        })
    if not await db.users.find_one({"email": "delivery@kmtbazaar.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "Demo Delivery", "email": "delivery@kmtbazaar.com",
            "phone": "9000000003", "password": hash_password("Delivery@123"),
            "role": Role.DELIVERY.value, "avatar": None, "created_at": now_iso(),
        })

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

    # Self-heal: restore store_id on seed products if it got nulled by prior admin edits
    for sp in SEED_PRODUCTS:
        await db.products.update_one(
            {"id": sp["id"], "$or": [{"store_id": None}, {"store_id": {"$exists": False}}]},
            {"$set": {"store_id": sp["store_id"]}}
        )

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

    # ---- Migration: ensure existing data has approval status set ----
    # Mark all existing vendor users without vendor_status as approved
    await db.users.update_many(
        {"role": "vendor", "vendor_status": {"$exists": False}},
        {"$set": {"vendor_status": VendorStatus.APPROVED.value, "vendor_approved_at": now_iso()}}
    )
    # Mark all existing products without status as approved
    await db.products.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": ProductStatus.APPROVED.value, "approved_at": now_iso()}}
    )
    # Backfill order_items collection for legacy orders that don't have entries yet
    legacy_orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    for o in legacy_orders:
        existing_count = await db.order_items.count_documents({"order_id": o["id"]})
        if existing_count > 0:
            continue
        items_to_insert = []
        for it in o.get("items", []):
            p = await db.products.find_one({"id": it["product_id"]}, {"_id": 0})
            vendor_id = p.get("vendor_id") if p else None
            vendor_name = None
            store_name = None
            if vendor_id:
                v = await db.users.find_one({"id": vendor_id}, {"_id": 0, "name": 1})
                vendor_name = (v or {}).get("name")
            if p and p.get("store_id"):
                s = await db.stores.find_one({"id": p["store_id"]}, {"_id": 0, "name": 1})
                store_name = (s or {}).get("name")
            items_to_insert.append({
                "id": "oi-" + uuid.uuid4().hex[:10],
                "order_id": o["id"],
                "product_id": it["product_id"],
                "vendor_id": vendor_id,
                "vendor_name": vendor_name,
                "store_id": (p or {}).get("store_id"),
                "store_name": store_name,
                "product_name": it.get("name") or (p or {}).get("name"),
                "product_image": it.get("image") or (p or {}).get("image"),
                "product_unit": it.get("unit") or (p or {}).get("unit", ""),
                "quantity": it.get("quantity", 1),
                "unit_price": it.get("price") or (p or {}).get("price", 0),
                "mrp": it.get("mrp") or (p or {}).get("mrp", 0),
                "total_price": it.get("line_total", 0),
                "status": "delivered" if o.get("status") == "delivered" else (
                    "out_for_delivery" if o.get("status") == "out_for_delivery" else (
                    "accepted" if o.get("status") == "accepted" else "pending")),
                "status_history": [{"status": "pending", "at": o.get("created_at", now_iso()), "label": "Order placed"}],
                "created_at": o.get("created_at", now_iso()),
            })
        if items_to_insert:
            await db.order_items.insert_many(items_to_insert)
        # also set vendor_ids on order
        vids = list({i["vendor_id"] for i in items_to_insert if i.get("vendor_id")})
        if vids and not o.get("vendor_ids"):
            await db.orders.update_one({"id": o["id"]}, {"$set": {"vendor_ids": vids}})
        # set customer snapshot if missing
        if not o.get("customer"):
            cust = await db.users.find_one({"id": o.get("user_id")}, {"_id": 0, "name": 1, "phone": 1, "email": 1, "id": 1})
            if cust:
                await db.orders.update_one({"id": o["id"]}, {"$set": {"customer": cust}})

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
