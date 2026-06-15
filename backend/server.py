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
