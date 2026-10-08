import asyncio
import base64
import hashlib
import secrets
import re
import os
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
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
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from PIL import Image, ImageOps
import io
from html import escape
import httpx
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/var/www/kmt-bazaar/uploads"))
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://kmtbazaar.com").rstrip("/")
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_IMAGE_SIZE = (1600, 1600)
PRODUCT_IMAGE_MAX_BYTES = 200 * 1024
PRODUCT_IMAGE_SIZES = (1000, 800, 640, 512, 448, 384, 320)
DEFAULT_HOLIDAY_BANNER_URL = "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1800&q=85"

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get("JWT_SECRET", "kmt-bazaar-super-secret-key-change-me")
JWT_ALGO = "HS256"
JWT_EXPIRE_MIN = 60 * 24 * 30  # 30 days

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM = (os.getenv("EMAIL_FROM") or os.getenv("RESEND_FROM_EMAIL") or "KMT Bazaar <noreply@kmtbazaar.com>").strip()
EMAIL_OTP_EXPIRE_MINUTES = 10
EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60
EMAIL_OTP_MAX_ATTEMPTS = 5

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI(title="KMT Bazaar API")
api = APIRouter(prefix="/api")

ALLOWED_ORIGINS = [
    "https://kmtbazaar.tech",
    "https://www.kmtbazaar.tech",
    "https://kmtbazaar.com",
    "https://www.kmtbazaar.com",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:19006",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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


class VendorType(str, Enum):
    STORE = "store"
    SERVICE = "service"


class ServiceType(str, Enum):
    HOLIDAY = "holiday"
    CAR_RENTAL = "car_rental"
    DAILY_SERVICE = "daily_service"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# Keep order documents small. Product images may be base64/data URIs.
MAX_ORDER_IMAGE_CHARS = 2048


def sanitize_order_image(value):
    if not isinstance(value, str):
        return ""
    value = value.strip()
    if not value or value.startswith(("data:", "blob:")):
        return ""
    if len(value) > MAX_ORDER_IMAGE_CHARS:
        return ""
    return value


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: Role = Role.CUSTOMER
    vendor_type: VendorType = VendorType.STORE
    service_type: Optional[ServiceType] = None


class LoginIn(BaseModel):
    identifier: str
    password: str


class IdentifierCheckIn(BaseModel):
    identifier: str


class GoogleLoginIn(BaseModel):
    credential: str


class EmailLoginOtpRequestIn(BaseModel):
    email: EmailStr
    password: str


class EmailOtpVerifyIn(BaseModel):
    email: EmailStr
    otp: str


class EmailSignupOtpRequestIn(RegisterIn):
    pass


class OtpRequestIn(BaseModel):
    phone: str


class OtpVerifyIn(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class VerifyResetOtpIn(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordIn(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class AvatarUpdateIn(BaseModel):
    avatar: str


class UserOut(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Role
    avatar: Optional[str] = None
    vendor_type: Optional[VendorType] = None
    service_type: Optional[ServiceType] = None


class AuthOut(BaseModel):
    token: str
    user: UserOut


class AddressIn(BaseModel):
    label: str  # Home, Work, Other
    full_name: str
    phone: str
    line1: str
    line2: str
    landmark: Optional[str] = ""
    district: str
    city: str
    state: str
    pincode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False

    @field_validator("full_name", "phone", "line1", "line2", "district", "city", "state", "pincode")
    @classmethod
    def required_address_text(cls, value):
        value = str(value or "").strip()
        if not value:
            raise ValueError("This address field is required")
        return value

    @field_validator("phone")
    @classmethod
    def validate_address_phone(cls, value):
        digits = "".join(ch for ch in str(value) if ch.isdigit())
        if len(digits) != 10:
            raise ValueError("Mobile Number must be exactly 10 digits")
        return digits

    @field_validator("pincode")
    @classmethod
    def validate_address_pincode(cls, value):
        value = str(value).strip()
        if not value.isdigit() or len(value) != 6:
            raise ValueError("Pincode must be exactly 6 digits")
        return value


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

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, value):
        if value not in {"cod", "online"}:
            raise ValueError("Invalid payment method")
        return value


class TravelPageIn(BaseModel):
    name: str
    slug: str
    subtitle: str = ""
    cover_image: str = ""
    description: str = ""
    theme_color: str = "#2563EB"


class TravelPackageIn(BaseModel):
    page_id: str
    title: str
    location: str = ""
    duration: str = ""
    price: float = 0
    mrp: Optional[float] = None
    cover_image: str = ""
    flight_image: str = ""
    gallery: List[str] = []
    hotel: str = ""
    inclusions: List[str] = []
    description: str = ""


class TravelCartItemIn(BaseModel):
    package_id: str
    quantity: int = 1


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

def hash_reset_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


def normalize_phone(value: str) -> str:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits


def validate_signup_password(password: str):
    if len(password) < 8 or not re.search(r"[A-Z]", password) or not re.search(r"[0-9]", password) or not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters and include uppercase, number, and special character",
        )


async def send_resend_email(to_email: str, subject: str, html: str):
    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service is not configured")

    payload = {
        "from": EMAIL_FROM,
        "to": [normalize_email(to_email)],
        "subject": subject,
        "html": html,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if response.status_code >= 400:
            logging.error("Resend email failed: %s %s", response.status_code, response.text[:500])
            raise HTTPException(status_code=502, detail="Email delivery service is unavailable")
    except HTTPException:
        raise
    except Exception:
        logging.exception("Resend email request failed")
        raise HTTPException(status_code=502, detail="Email delivery service is unavailable")


async def issue_email_otp(
    email: str,
    purpose: str,
    subject: str,
    html_template: str,
    payload: Optional[dict] = None,
):
    email = normalize_email(email)
    now = datetime.now(timezone.utc)

    existing = await db.email_auth_otps.find_one(
        {"email": email, "purpose": purpose},
        {"_id": 0, "created_at": 1},
    )
    if existing and existing.get("created_at"):
        created_at = existing["created_at"]
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        elapsed = (now - created_at).total_seconds()
        if elapsed < EMAIL_OTP_RESEND_COOLDOWN_SECONDS:
            retry_after = max(1, int(EMAIL_OTP_RESEND_COOLDOWN_SECONDS - elapsed))
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {retry_after} seconds before requesting another OTP",
            )

    otp = f"{secrets.randbelow(900000) + 100000}"
    otp_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "purpose": purpose,
        "otp_hash": hash_reset_otp(otp),
        "attempts": 0,
        "expires_at": now + timedelta(minutes=EMAIL_OTP_EXPIRE_MINUTES),
        "created_at": now,
        "payload": payload or {},
    }

    await db.email_auth_otps.delete_many({"email": email, "purpose": purpose})
    await db.email_auth_otps.insert_one(otp_doc)

    try:
        await send_resend_email(
            email,
            subject,
            html_template.format(
                otp=escape(otp),
                email=escape(email),
                expires=EMAIL_OTP_EXPIRE_MINUTES,
            ),
        )
    except Exception:
        await db.email_auth_otps.delete_one({"id": otp_doc["id"]})
        raise

    return {
        "sent": True,
        "email": email,
        "expires_in_minutes": EMAIL_OTP_EXPIRE_MINUTES,
    }


async def consume_email_otp(email: str, purpose: str, otp: str) -> dict:
    email = normalize_email(email)
    if not (len(str(otp).strip()) == 6 and str(otp).strip().isdigit()):
        raise HTTPException(status_code=400, detail="Enter a valid 6-digit OTP")

    record = await db.email_auth_otps.find_one(
        {
            "email": email,
            "purpose": purpose,
        },
        sort=[("created_at", -1)],
    )
    if not record:
        raise HTTPException(status_code=400, detail="OTP not found or expired")

    expires_at = record.get("expires_at")
    if not expires_at:
        await db.email_auth_otps.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        await db.email_auth_otps.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=400, detail="OTP expired")

    attempts = int(record.get("attempts", 0))
    if attempts >= EMAIL_OTP_MAX_ATTEMPTS:
        await db.email_auth_otps.delete_one({"_id": record["_id"]})
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Please request a new OTP")

    if hash_reset_otp(str(otp).strip()) != record.get("otp_hash"):
        new_attempts = attempts + 1
        if new_attempts >= EMAIL_OTP_MAX_ATTEMPTS:
            await db.email_auth_otps.delete_one({"_id": record["_id"]})
            raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Please request a new OTP")
        await db.email_auth_otps.update_one(
            {"_id": record["_id"]},
            {"$set": {"attempts": new_attempts}},
        )
        raise HTTPException(status_code=400, detail="Invalid OTP")

    await db.email_auth_otps.delete_one({"_id": record["_id"]})
    return record


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
    if user.get("active", True) is False:
        raise HTTPException(status_code=403, detail="Account is suspended")
    return user


def user_to_out(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u.get("name", ""),
        "email": u.get("email"),
        "phone": u.get("phone"),
        "role": u.get("role", "customer"),
        "avatar": u.get("avatar"),
        "vendor_type": (u.get("vendor_type") or "store") if u.get("role") == Role.VENDOR.value else None,
        "service_type": (
            (u.get("service_type") or ServiceType.DAILY_SERVICE.value)
            if u.get("role") == Role.VENDOR.value and (u.get("vendor_type") or "store") == VendorType.SERVICE.value
            else None
        ),
    }


# ------------------ AUTH ROUTES ------------------
@api.post("/auth/register", response_model=AuthOut)
async def register(data: RegisterIn):
    raise HTTPException(
        status_code=403,
        detail="Email verification is required. Please use the signup OTP flow.",
    )

@api.post("/auth/check-identifier")
async def check_identifier(data: IdentifierCheckIn):
    value = data.identifier.strip()
    if "@" in value:
        value = value.lower()
        if " " in value:
            raise HTTPException(status_code=400, detail="Enter a valid email or 10-digit mobile number")
    else:
        value = "".join(ch for ch in value if ch.isdigit())
        if len(value) != 10:
            raise HTTPException(status_code=400, detail="Enter a valid email or 10-digit mobile number")
    user = await db.users.find_one({"$or": [{"email": value}, {"phone": value}]}, {"_id": 0, "id": 1})
    return {"exists": bool(user)}


@api.post("/auth/login", response_model=AuthOut)
async def login(data: LoginIn):
    value = data.identifier.strip()
    if "@" in value:
        value = normalize_email(value)
        user = await db.users.find_one({"email": value})
        if not user or not verify_password(data.password, user.get("password", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(
            status_code=428,
            detail="Email OTP verification is required. Request an OTP to continue.",
        )

    value = normalize_phone(value)
    user = await db.users.find_one({"phone": value})
    if not user or not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid mobile number or password")
    if user.get("active", True) is False:
        raise HTTPException(status_code=403, detail="Account is suspended")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": user_to_out(user)}


@api.post("/auth/email-login/request")
async def request_email_login_otp(data: EmailLoginOtpRequestIn):
    email = normalize_email(data.email)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("active", True) is False:
        raise HTTPException(status_code=403, detail="Account is suspended")

    return await issue_email_otp(
        email=email,
        purpose="login",
        subject="Your KMT Bazaar login OTP",
        html_template="""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
          <h2 style="margin-bottom:8px">KMT Bazaar Login Verification</h2>
          <p>Your 6-digit login OTP is:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;margin:20px 0">"{otp}"</div>
          <p>This OTP expires in {expires} minutes.</p>
          <p style="color:#64748b;font-size:13px">Do not share this code with anyone.</p>
        </div>
        """.replace('\"','"'),
    )


@api.post("/auth/email-login/verify", response_model=AuthOut)
async def verify_email_login_otp(data: EmailOtpVerifyIn):
    record = await consume_email_otp(data.email, "login", data.otp)
    user = await db.users.find_one({"email": normalize_email(data.email)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("active", True) is False:
        raise HTTPException(status_code=403, detail="Account is suspended")
    token = create_token(user["id"], user["role"])
    return {"token": token, "user": user_to_out(user)}


@api.post("/auth/email-signup/request")
async def request_email_signup_otp(data: EmailSignupOtpRequestIn):
    email = normalize_email(data.email)
    phone = normalize_phone(data.phone or "")

    validate_signup_password(data.password)
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit phone number")

    if data.role == Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin accounts cannot be created through public registration")

    if data.role == Role.VENDOR and data.vendor_type == VendorType.SERVICE:
        if data.service_type not in {ServiceType.HOLIDAY, ServiceType.CAR_RENTAL}:
            raise HTTPException(status_code=400, detail="Only Holiday and Car Rental service vendors are supported")
        existing_service_vendor = await db.users.find_one({
            "role": Role.VENDOR.value,
            "vendor_type": VendorType.SERVICE.value,
            "service_type": data.service_type.value,
            "active": {"$ne": False},
        }, {"_id": 1})
        if existing_service_vendor:
            service_label = SERVICE_TYPES.get(data.service_type.value, {}).get("name", data.service_type.value)
            raise HTTPException(status_code=409, detail=f"{service_label} vendor account already exists")

    existing = await db.users.find_one({"$or": [{"email": email}, {"phone": phone}]})
    if existing:
        if existing.get("email") == email:
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    pending_payload = {
        "name": data.name.strip(),
        "email": email,
        "phone": phone,
        "password_hash": hash_password(data.password),
        "role": data.role.value,
        "vendor_type": data.vendor_type.value if data.role == Role.VENDOR else None,
        "service_type": (
            data.service_type.value
            if data.role == Role.VENDOR and data.vendor_type == VendorType.SERVICE and data.service_type
            else None
        ),
    }

    return await issue_email_otp(
        email=email,
        purpose="signup",
        subject="Verify your KMT Bazaar account",
        payload={"registration": pending_payload},
        html_template="""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
          <h2 style="margin-bottom:8px">Welcome to KMT Bazaar</h2>
          <p>Use this 6-digit OTP to verify your email and complete your account:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;margin:20px 0">"{otp}"</div>
          <p>This OTP expires in {expires} minutes.</p>
          <p style="color:#64748b;font-size:13px">Do not share this code with anyone.</p>
        </div>
        """.replace('\"','"'),
    )


@api.post("/auth/email-signup/verify", response_model=AuthOut)
async def verify_email_signup_otp(data: EmailOtpVerifyIn):
    record = await consume_email_otp(data.email, "signup", data.otp)
    registration = (record.get("payload") or {}).get("registration") or {}
    email = normalize_email(data.email)

    if not registration or normalize_email(registration.get("email")) != email:
        raise HTTPException(status_code=400, detail="Signup verification data is invalid")

    existing = await db.users.find_one({"$or": [{"email": email}, {"phone": registration.get("phone")}]})
    if existing:
        if existing.get("email") == email:
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    if registration.get("role") == Role.VENDOR.value and registration.get("vendor_type") == VendorType.SERVICE.value:
        existing_service_vendor = await db.users.find_one({
            "role": Role.VENDOR.value,
            "vendor_type": VendorType.SERVICE.value,
            "service_type": registration.get("service_type"),
            "active": {"$ne": False},
        }, {"_id": 1})
        if existing_service_vendor:
            raise HTTPException(status_code=409, detail="This service vendor account already exists")

    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid,
        "name": registration.get("name", "").strip(),
        "email": email,
        "phone": registration.get("phone"),
        "password": registration.get("password_hash"),
        "role": registration.get("role", Role.CUSTOMER.value),
        "vendor_type": registration.get("vendor_type"),
        "service_type": registration.get("service_type"),
        "avatar": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(uid, user_doc["role"])
    return {"token": token, "user": user_to_out(user_doc)}




@api.post("/auth/google", response_model=AuthOut)
async def google_login(data: GoogleLoginIn):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    try:
        info = google_id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google sign-in")

    email = str(info.get("email", "")).strip().lower()
    google_sub = str(info.get("sub", "")).strip()
    name = str(info.get("name", "")).strip() or "KMT Customer"

    if not email or not google_sub or not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified")

    user = await db.users.find_one({"email": email})

    if user:
        if user.get("role") != Role.CUSTOMER.value:
            raise HTTPException(status_code=403, detail="Please use your KMT account login for this account")
        if user.get("active", True) is False:
            raise HTTPException(status_code=403, detail="Account is suspended")
        if user.get("google_sub") and user.get("google_sub") != google_sub:
            raise HTTPException(status_code=409, detail="This email is linked to another Google account")
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"google_sub": google_sub, "name": name or user.get("name", "")}},
        )
        user["google_sub"] = google_sub
        user["name"] = name or user.get("name", "")
    else:
        uid = str(uuid.uuid4())
        user = {
            "id": uid,
            "name": name,
            "email": email,
            "phone": None,
            "password": hash_password(secrets.token_urlsafe(32)),
            "role": Role.CUSTOMER.value,
            "avatar": info.get("picture"),
            "google_sub": google_sub,
            "created_at": now_iso(),
        }
        await db.users.insert_one(dict(user))

    token = create_token(user["id"], user["role"])
    return {"token": token, "user": user_to_out(user)}


@api.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordIn):
    email = normalize_email(data.email)
    user = await db.users.find_one({"email": email})

    # Do not reveal whether an email is registered.
    # A real email/SMS provider should deliver the reset OTP.
    if not user:
        return {
            "success": True,
            "message": "If the account exists, a reset OTP has been sent.",
            "expires_in_minutes": 10,
        }

    otp = f"{secrets.randbelow(900000) + 100000}"

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.password_reset_otps.delete_many({
        "email": email
    })

    await db.password_reset_otps.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "otp_hash": hash_reset_otp(otp),
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    try:
        await send_resend_email(
            email,
            "Your KMT Bazaar password reset OTP",
            """
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
              <h2>Password Reset</h2>
              <p>Your KMT Bazaar password reset OTP is:</p>
              <div style="font-size:34px;font-weight:800;letter-spacing:8px;margin:20px 0">{otp}</div>
              <p>This OTP expires in 10 minutes.</p>
              <p style="color:#64748b;font-size:13px">If you did not request this, you can ignore this email.</p>
            </div>
            """.format(otp=escape(otp)),
        )
    except HTTPException:
        await db.password_reset_otps.delete_many({"email": email})
        raise

    return {
        "success": True,
        "message": "If the account exists, a reset OTP has been sent.",
        "expires_in_minutes": 10,
    }

@api.post("/auth/verify-reset-otp")
async def verify_reset_otp(data: VerifyResetOtpIn):
    reset = await db.password_reset_otps.find_one({
        "email": normalize_email(data.email)
    })

    if not reset:
        raise HTTPException(
            status_code=400,
            detail="OTP not found or expired"
        )

    expires_at = reset.get("expires_at")

    if not expires_at:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        await db.password_reset_otps.delete_many({
            "email": normalize_email(data.email)
        })
        raise HTTPException(
            status_code=400,
            detail="OTP expired"
        )

    if not (len(data.otp) == 6 and data.otp.isdigit()):
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    if hash_reset_otp(data.otp) != reset.get("otp_hash"):
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    return {
        "success": True,
        "message": "OTP verified successfully"
    }

@api.post("/auth/reset-password")
async def reset_password(data: ResetPasswordIn):
    validate_signup_password(data.new_password)

    reset = await db.password_reset_otps.find_one({
        "email": normalize_email(data.email)
    })

    if not reset:
        raise HTTPException(
            status_code=400,
            detail="OTP not found or expired"
        )

    expires_at = reset.get("expires_at")

    if not expires_at:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        await db.password_reset_otps.delete_many({
            "email": normalize_email(data.email)
        })
        raise HTTPException(
            status_code=400,
            detail="OTP expired"
        )

    if not (len(data.otp) == 6 and data.otp.isdigit()):
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    if hash_reset_otp(data.otp) != reset.get("otp_hash"):
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    user = await db.users.find_one({
        "email": normalize_email(data.email)
    })

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    await db.users.update_one(
        {"email": normalize_email(data.email)},
        {"$set": {"password": hash_password(data.new_password)}}
    )

    await db.password_reset_otps.delete_many({
        "email": normalize_email(data.email)
    })

    return {
        "success": True,
        "message": "Password reset successfully"
    }
@api.post("/auth/otp/request")
async def request_otp(data: OtpRequestIn):
    # Mock: any phone gets OTP 123456 (or any 6-digit accepted on verify)
    return {"sent": True, "phone": data.phone, "hint": "Enter any 6-digit code (mock OTP)"}


@api.post("/auth/otp/verify", response_model=AuthOut)
async def verify_otp(data: OtpVerifyIn):
    # Mock OTP ka existing 6-digit format check
    if not (len(data.otp) == 6 and data.otp.isdigit()):
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Mobile number ko digits-only format mein normalize karo
    def normalize_phone(value):
        digits = "".join(ch for ch in str(value or "") if ch.isdigit())

        # India country code / leading zero ko handle karo
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]

        return digits

    entered_phone = normalize_phone(data.phone)

    if len(entered_phone) != 10:
        raise HTTPException(
            status_code=400,
            detail="Invalid mobile number. Please register now."
        )

    # Indexed direct lookup — poori customer collection memory mein load mat karo.
    # Existing accounts ke stored phone formats ko support karne ke liye
    # exact normalized lookup ke saath common Indian formats bhi check karo.
    phone_candidates = [entered_phone, "0" + entered_phone, "91" + entered_phone, "+91" + entered_phone]

    user = await db.users.find_one(
        {
            "role": Role.CUSTOMER.value,
            "phone": {"$in": phone_candidates}
        },
        {"_id": 0}
    )

    # Number registered nahi hai: reject, account create mat karo
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Invalid mobile number. Please register now."
        )

    # Existing token creation
    token = create_token(user["id"], user["role"])

    return {
        "token": token,
        "user": user_to_out(user)
    }


@api.get("/auth/me", response_model=UserOut)
async def me(current=Depends(get_current_user)):
    return user_to_out(current)

@api.post("/auth/update-avatar", response_model=UserOut)
async def update_avatar(data: AvatarUpdateIn, current=Depends(get_current_user)):
    avatar = str(data.avatar or "").strip()
    if not avatar.startswith("data:image/") or ";base64," not in avatar:
        raise HTTPException(status_code=400, detail="Invalid image data")

    header, encoded = avatar.split(";base64,", 1)
    mime = header[5:].lower()
    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Only JPG, PNG or WebP images are allowed")

    try:
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Image is too large. Maximum size is 8 MB.")

        image = Image.open(io.BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"avatar-{current['id']}-{uuid.uuid4().hex}.webp"
        output_path = UPLOAD_DIR / filename
        image.save(output_path, format="WEBP", quality=86, method=6)

        avatar_url = f"{PUBLIC_BASE_URL}/uploads/{filename}"
        await db.users.update_one({"id": current["id"]}, {"$set": {"avatar": avatar_url}})
        return user_to_out({**current, "avatar": avatar_url})
    except HTTPException:
        raise
    except (ValueError, OSError) as e:
        logging.exception("Avatar upload failed")
        raise HTTPException(status_code=400, detail=f"Image upload failed: {str(e)}")
    except Exception:
        logging.exception("Avatar upload failed")
        raise HTTPException(status_code=500, detail="Unable to save profile picture")


# ------------------ ROOJGAR CATEGORIES ------------------

@api.get("/roojgar-categories")
async def roojgar_categories():
    return {
        "categories": [
            {"id": "1", "name": "Plumber", "icon": "🔧"},
            {"id": "2", "name": "Electrician", "icon": "⚡"},
            {"id": "3", "name": "Carpenter", "icon": "🪚"},
            {"id": "4", "name": "Painter", "icon": "🎨"},
            {"id": "5", "name": "RajMistri", "icon": "🧱"},
            {"id": "6", "name": "Welder", "icon": "🔥"},
            {"id": "7", "name": "AC Technician", "icon": "❄️"},
            {"id": "8", "name": "Driver", "icon": "🚗"},
            {"id": "9", "name": "Delivery Boy", "icon": "🛵"},
            {"id": "10", "name": "Cook", "icon": "👨‍🍳"},
            {"id": "11", "name": "House Maid", "icon": "🧹"},
            {"id": "12", "name": "Security Guard", "icon": "🛡️"},
            {"id": "13", "name": "Gardener", "icon": "🌿"},
            {"id": "14", "name": "Mechanic", "icon": "🛠️"},
            {"id": "15", "name": "Computer Operator", "icon": "💻"},
            {"id": "16", "name": "Data Entry", "icon": "⌨️"},
            {"id": "17", "name": "Tailor", "icon": "🧵"},
            {"id": "18", "name": "Beautician", "icon": "💄"},
            {"id": "19", "name": "Teacher", "icon": "📚"},
            {"id": "20", "name": "Other", "icon": "📋"},
        ]
    }

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


@api.get("/item-categories")
async def list_item_categories(
    category_id: Optional[str] = None,
    store_id: Optional[str] = None,
):
    query = {"active": {"$ne": False}}
    if store_id:
        query["store_id"] = store_id
    elif category_id:
        query["category_id"] = category_id
    return await db.item_categories.find(
        query,
        {"_id": 0}
    ).sort([("order", 1), ("name", 1)]).to_list(500)


@api.get("/banners")
async def list_banners():
    banners = await db.banners.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return banners


@api.get("/stores")
async def list_stores():
    stores = await db.stores.find({"is_approved": True}, {"_id": 0}).to_list(100)
    return stores


@api.get("/holiday/banner")
async def get_holiday_banner():
    vendor = await db.users.find_one(
        {
            "role": Role.VENDOR.value,
            "vendor_type": VendorType.SERVICE.value,
            "service_type": ServiceType.HOLIDAY.value,
            "is_active": {"$ne": False},
        },
        {"_id": 0, "name": 1, "holiday_banner_url": 1, "holiday_banner_urls": 1}
    )
    urls = [str(x).strip() for x in ((vendor or {}).get("holiday_banner_urls") or []) if str(x).strip()]
    if not urls:
        legacy = str((vendor or {}).get("holiday_banner_url") or "").strip()
        if legacy:
            urls = [legacy]
    if not urls:
        urls = [DEFAULT_HOLIDAY_BANNER_URL]
    return {
        "url": urls[0],
        "urls": urls,
        "vendor_name": (vendor or {}).get("name"),
    }


@api.get("/vendor-services")
async def list_vendor_services():
    return await db.vendor_services.find(
        {"active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)


@api.get("/vendor-services/{service_id}")
async def get_vendor_service(service_id: str):
    service = await db.vendor_services.find_one(
        {"id": service_id, "active": True},
        {"_id": 0}
    )
    if not service:
        raise HTTPException(status_code=404, detail="Vendor service not found")
    return service


@api.get("/products")
async def list_products(
    category: Optional[str] = None,
    q: Optional[str] = None,
    trending: Optional[bool] = None,
    store_id: Optional[str] = None,
    item_category: Optional[str] = None,
    item_category_id: Optional[str] = None,
    limit: int = 50
):
    # Sirf approved stores ke IDs nikalo
    approved_stores = await db.stores.find(
        {"is_approved": True},
        {"_id": 0, "id": 1}
    ).to_list(500)

    approved_store_ids = [store["id"] for store in approved_stores]

    # Agar koi approved store nahi hai
    if not approved_store_ids:
        return []

    # Base query:
    # Customer ko sirf approved stores ke products milenge
    query = {
        "store_id": {"$in": approved_store_ids},
        "is_available": {"$ne": False},
    }

    # IMPORTANT:
    # Agar customer kisi particular store par hai,
    # to sirf usi store ke products return honge.
    if store_id:
        if store_id not in approved_store_ids:
            return []

        query["store_id"] = store_id

    # Category filter
    if category:
        query["category_id"] = category

    # Store-specific item category filter
    if store_id and item_category:
        query["item_category"] = item_category

    if store_id and item_category_id:
        query["item_category_id"] = item_category_id

    # Trending filter
    if trending:
        query["trending"] = True

    # Search filter
    if q:
        query["name"] = {
            "$regex": q,
            "$options": "i"
        }

    products = await db.products.find(
        query,
        {"_id": 0}
    ).limit(limit).to_list(limit)

    return products


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    # Product pehle find karo
    p = await db.products.find_one(
        {"id": product_id},
        {"_id": 0}
    )

    if not p:
        raise HTTPException(404, "Product not found")

    # Product jis store ka hai, wo approved hona chahiye
    store = await db.stores.find_one(
        {
            "id": p.get("store_id"),
            "is_approved": True
        },
        {"_id": 0, "id": 1}
    )

    # Store pending/rejected hua toh product customer ko nahi milega
    if not store:
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
        p = await db.products.find_one(
            {"id": item["product_id"]},
            {"_id": 0}
        )

        if not p:
            continue

        # Product ka store approved hona zaroori hai
        store = await db.stores.find_one(
            {
                "id": p.get("store_id"),
                "is_approved": True
            },
            {"_id": 0, "id": 1}
        )

        # Store pending/rejected ya product unavailable ho toh cart me nahi dikhega
        if not store or p.get("is_available", True) is False:
            continue

        line_total = p["price"] * item["quantity"]
        subtotal += line_total

        items.append({
            "product_id": p["id"],
            "name": p["name"],
            "image": sanitize_order_image(p.get("image")),
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
async def add_to_cart(
    item: CartItemIn,
    current=Depends(get_current_user)
):
    # Product exist karta hai ya nahi
    product = await db.products.find_one(
        {"id": item.product_id},
        {"_id": 0}
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Product jis store ka hai, wo approved hona chahiye
    store = await db.stores.find_one(
        {
            "id": product.get("store_id"),
            "is_approved": True
        },
        {"_id": 0, "id": 1}
    )

    if not store:
        raise HTTPException(
            status_code=400,
            detail="This product is not available right now"
        )

    if product.get("is_available", True) is False:
        raise HTTPException(
            status_code=400,
            detail="This product is not available right now"
        )

    cart = await get_cart_doc(current["id"])

    found = False

    for it in cart["items"]:
        if (
            it["product_id"] == item.product_id
            and it.get("variant") == item.variant
        ):
            it["quantity"] += item.quantity
            found = True
            break

    if not found:
        cart["items"].append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "variant": item.variant
        })

    await db.carts.update_one(
        {"user_id": current["id"]},
        {
            "$set": {
                "items": cart["items"],
                "updated_at": now_iso()
            }
        }
    )

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
@api.get("/geo/reverse")
async def reverse_geocode(latitude: float, longitude: float, current=Depends(get_current_user)):
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid location coordinates")

    nominatim_data = {}
    photon_data = {}

    async def fetch_nominatim(client):
        response = await client.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 18,
                "lat": latitude,
                "lon": longitude,
                "accept-language": "en-IN",
            },
        )
        response.raise_for_status()
        return response.json()

    async def fetch_photon(client):
        response = await client.get(
            "https://photon.komoot.io/reverse",
            params={
                "lat": latitude,
                "lon": longitude,
                "lang": "en",
            },
        )
        response.raise_for_status()
        return response.json()

    try:
        async with httpx.AsyncClient(
            timeout=7.0,
            headers={"User-Agent": "KMT-Bazaar/1.0 (+https://kmtbazaar.tech)"},
        ) as client:
            results = await asyncio.gather(
                fetch_nominatim(client),
                fetch_photon(client),
                return_exceptions=True,
            )

        if not isinstance(results[0], Exception):
            nominatim_data = results[0] or {}
        if not isinstance(results[1], Exception):
            photon_data = results[1] or {}

        address = nominatim_data.get("address") or {}
        display_name = str(nominatim_data.get("display_name") or "").strip()

        house = address.get("house_number") or address.get("building") or ""
        road = (
            address.get("road")
            or address.get("pedestrian")
            or address.get("footway")
            or address.get("cycleway")
            or ""
        )
        area = (
            address.get("neighbourhood")
            or address.get("suburb")
            or address.get("residential")
            or address.get("quarter")
            or address.get("locality")
            or address.get("village")
            or address.get("hamlet")
            or ""
        )

        line1_parts = [str(part).strip() for part in [house, road] if str(part).strip()]
        line1 = ", ".join(dict.fromkeys(line1_parts))

        line2 = str(area).strip()
        if not line2 and road and display_name:
            remaining = display_name.replace(str(road), "", 1).strip(" ,")
            if remaining:
                line2 = remaining.split(",")[0].strip()

        city = (
            address.get("city")
            or address.get("town")
            or address.get("municipality")
            or address.get("city_district")
            or address.get("village")
            or address.get("hamlet")
            or ""
        )
        district = (
            address.get("district")
            or address.get("county")
            or address.get("state_district")
            or address.get("region")
            or ""
        )
        state = address.get("state") or address.get("state_district") or ""
        nominatim_pin = str(address.get("postcode") or "").strip()

        photon_features = photon_data.get("features") or []
        photon_props = (photon_features[0].get("properties") or {}) if photon_features else {}
        photon_pin = str(photon_props.get("postcode") or "").strip()
        photon_line1 = str(photon_props.get("street") or "").strip()
        photon_house = str(photon_props.get("housenumber") or "").strip()
        photon_area = str(
            photon_props.get("district")
            or photon_props.get("locality")
            or photon_props.get("name")
            or ""
        ).strip()

        # Prefer an exact cross-source postcode agreement. If sources disagree,
        # leave the field blank instead of silently presenting a potentially wrong PIN.
        pincode = ""
        if nominatim_pin and photon_pin and nominatim_pin == photon_pin:
            pincode = nominatim_pin
        elif photon_pin and not nominatim_pin:
            pincode = photon_pin

        if not line1:
            if photon_house and photon_line1:
                line1 = f"{photon_house}, {photon_line1}"
            elif photon_line1:
                line1 = photon_line1
        if not line2 and photon_area:
            line2 = photon_area
        if not line1 and display_name:
            line1 = display_name.split(",")[0].strip()
        if not line2 and display_name:
            parts = [part.strip() for part in display_name.split(",") if part.strip()]
            if len(parts) > 1:
                line2 = parts[1]

        if not display_name and photon_features:
            display_name = ", ".join(
                part for part in [
                    line1,
                    line2,
                    city,
                    district,
                    state,
                    pincode,
                ]
                if part
            )

        if not any([line1, line2, city, district, state, pincode, display_name]):
            raise HTTPException(
                status_code=502,
                detail="Could not read address details from the current location.",
            )

        return {
            "display_name": display_name,
            "line1": line1,
            "line2": line2,
            "district": str(district).strip(),
            "city": str(city).strip(),
            "state": str(state).strip(),
            "pincode": pincode,
            "latitude": latitude,
            "longitude": longitude,
            "attribution": "© OpenStreetMap contributors; Photon",
        }
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Address lookup service is temporarily unavailable. GPS location is still saved.",
        )
    except HTTPException:
        raise
    except Exception:
        logging.exception("Reverse geocoding failed")
        raise HTTPException(
            status_code=502,
            detail="Could not read address details from the current location. GPS location is still saved.",
        )


@api.get("/addresses")
async def list_addresses(current=Depends(get_current_user)):
    addrs = await db.addresses.find({"user_id": current["id"]}, {"_id": 0}).to_list(50)
    for addr in addrs:
        addr["has_location"] = addr.get("latitude") is not None and addr.get("longitude") is not None
        addr.pop("latitude", None)
        addr.pop("longitude", None)
    return addrs


@api.post("/addresses")
async def create_address(data: AddressIn, current=Depends(get_current_user)):
    if (data.latitude is None) != (data.longitude is None):
        raise HTTPException(400, "Both latitude and longitude are required")
    if data.latitude is not None and not (-90 <= data.latitude <= 90 and -180 <= data.longitude <= 180):
        raise HTTPException(400, "Invalid location coordinates")
    if data.is_default:
        await db.addresses.update_many({"user_id": current["id"]}, {"$set": {"is_default": False}})
    addr = {"id": str(uuid.uuid4()), "user_id": current["id"], **data.dict(), "created_at": now_iso()}
    await db.addresses.insert_one(dict(addr))
    addr.pop("_id", None)
    public_addr = dict(addr)
    public_addr["has_location"] = public_addr.get("latitude") is not None and public_addr.get("longitude") is not None
    public_addr.pop("latitude", None)
    public_addr.pop("longitude", None)
    return public_addr


# 🔥 EDIT / UPDATE ADDRESS
@api.put("/addresses/{addr_id}")
async def update_address(addr_id: str, data: AddressIn, current=Depends(get_current_user)):
    if (data.latitude is None) != (data.longitude is None):
        raise HTTPException(400, "Both latitude and longitude are required")
    if data.latitude is not None and not (-90 <= data.latitude <= 90 and -180 <= data.longitude <= 180):
        raise HTTPException(400, "Invalid location coordinates")
    if data.is_default:
        await db.addresses.update_many({"user_id": current["id"]}, {"$set": {"is_default": False}})
    res = await db.addresses.update_one({"id": addr_id, "user_id": current["id"]}, {"$set": data.dict()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    updated = await db.addresses.find_one({"id": addr_id, "user_id": current["id"]}, {"_id": 0})
    updated["has_location"] = updated.get("latitude") is not None and updated.get("longitude") is not None
    updated.pop("latitude", None)
    updated.pop("longitude", None)
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
async def checkout(
    data: CheckoutIn,
    current=Depends(get_current_user)
):
    cart = await get_cart_doc(current["id"])

    if not cart["items"]:
        raise HTTPException(400, "Cart is empty")

    # Checkout se pehle har product ke store approval ko verify karo
    for cart_item in cart["items"]:
        product = await db.products.find_one(
            {"id": cart_item["product_id"]},
            {"_id": 0, "id": 1, "store_id": 1}
        )

        if not product:
            raise HTTPException(
                400,
                "One or more products are no longer available"
            )

        store = await db.stores.find_one(
            {
                "id": product.get("store_id"),
                "is_approved": True
            },
            {"_id": 0, "id": 1}
        )

        if not store:
            raise HTTPException(
                400,
                "One or more products are no longer available"
            )

    expanded = await expand_cart(cart)

    if not expanded["items"]:
        raise HTTPException(
            400,
            "One or more products are no longer available"
        )

    # Safety check: cart ke saare products checkout me hone chahiye
    if len(expanded["items"]) != len(cart["items"]):
        raise HTTPException(
            400,
            "One or more products are no longer available"
        )

    addr = await db.addresses.find_one(
        {"id": data.address_id, "user_id": current["id"]},
        {"_id": 0}
    )
    if not addr:
        raise HTTPException(400, "Invalid address")

    stored_latitude = addr.get("latitude")
    stored_longitude = addr.get("longitude")
    if stored_latitude is None or stored_longitude is None:
        raise HTTPException(400, "Delivery location missing. Please save this address with your current location before placing the order.")
    if not (-90 <= stored_latitude <= 90 and -180 <= stored_longitude <= 180):
        raise HTTPException(400, "Saved address has invalid location coordinates")

    customer_location = {
        "latitude": stored_latitude,
        "longitude": stored_longitude,
        "updated_at": now_iso(),
    }

    order_id = str(uuid.uuid4())
    order_no = (
        "KMT"
        + datetime.now().strftime("%y%m%d")
        + order_id[:4].upper()
    )

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
        "customer_location": customer_location,
        "payment_method": data.payment_method,
        # Online payment is not marked paid until a payment gateway
        # webhook verifies the transaction.
        "payment_status": "pending",
        "status": "pending",
        "notes": data.notes,
        "timeline": [
            {
                "status": "pending",
                "at": now_iso(),
                "label": "Order placed"
            },
        ],
        "created_at": now_iso(),
    }

    await db.orders.insert_one(dict(order))

    # Clear cart
    await db.carts.update_one(
        {"user_id": current["id"]},
        {
            "$set": {
                "items": [],
                "updated_at": now_iso()
            }
        }
    )

    # Create notification
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


class DeliveryLocationIn(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

@api.post("/delivery/orders/{order_id}/location")
async def update_delivery_location(
    order_id: str,
    data: DeliveryLocationIn,
    current=Depends(get_current_user),
):
    if current.get("role") != Role.DELIVERY.value:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not (-90 <= data.latitude <= 90 and -180 <= data.longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid location coordinates")

    result = await db.orders.update_one(
        {
            "id": order_id,
            "delivery_id": current["id"],
            "status": "out_for_delivery",
        },
        {
            "$set": {
                "delivery_location": {
                    "latitude": data.latitude,
                    "longitude": data.longitude,
                    "accuracy": data.accuracy,
                    "updated_at": now_iso(),
                }
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Active delivery order not found")
    return {"ok": True}

class CustomerLocationIn(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

@api.post("/orders/{order_id}/customer-location")
async def update_customer_location(
    order_id: str,
    data: CustomerLocationIn,
    current=Depends(get_current_user),
):
    if not (-90 <= data.latitude <= 90 and -180 <= data.longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid location coordinates")

    o = await db.orders.find_one(
        {"id": order_id, "user_id": current["id"], "status": "out_for_delivery"},
        {"_id": 0, "id": 1, "delivery_id": 1},
    )
    if not o:
        raise HTTPException(status_code=404, detail="Active delivery order not found")

    await db.orders.update_one(
        {"id": order_id, "user_id": current["id"], "status": "out_for_delivery"},
        {"$set": {
            "customer_location": {
                "latitude": data.latitude,
                "longitude": data.longitude,
                "accuracy": data.accuracy,
                "updated_at": now_iso(),
            }
        }},
    )
    return {"ok": True}


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


# ------------------ TRAVEL / BANNER PAGES ------------------

@api.get("/travel/pages/{slug}")
async def get_travel_page(slug: str):
    page = await db.travel_pages.find_one({"slug": slug}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Travel page not found")

    packages = await db.travel_packages.find(
        {"page_id": page["id"], "active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return {**page, "packages": packages}


# ------------------ ROLE GUARDS ------------------
def require_roles(*roles):
    async def _dep(current=Depends(get_current_user)):
        if current.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current
    return _dep


@api.get("/admin/travel/pages")
async def admin_travel_pages(_=Depends(require_roles("admin"))):
    return await db.travel_pages.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/admin/travel/pages")
async def admin_create_travel_page(data: TravelPageIn, _=Depends(require_roles("admin"))):
    existing = await db.travel_pages.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=409, detail="Page slug already exists")

    page = {
        "id": "travel-" + uuid.uuid4().hex[:10],
        **data.dict(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.travel_pages.insert_one(dict(page))
    return page


@api.put("/admin/travel/pages/{page_id}")
async def admin_update_travel_page(page_id: str, data: TravelPageIn, _=Depends(require_roles("admin"))):
    existing = await db.travel_pages.find_one({"slug": data.slug, "id": {"$ne": page_id}})
    if existing:
        raise HTTPException(status_code=409, detail="Page slug already exists")

    result = await db.travel_pages.update_one(
        {"id": page_id},
        {"$set": {**data.dict(), "updated_at": now_iso()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Travel page not found")

    return await db.travel_pages.find_one({"id": page_id}, {"_id": 0})


@api.delete("/admin/travel/pages/{page_id}")
async def admin_delete_travel_page(page_id: str, _=Depends(require_roles("admin"))):
    result = await db.travel_pages.delete_one({"id": page_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Travel page not found")
    await db.travel_packages.delete_many({"page_id": page_id})
    return {"ok": True}


@api.post("/admin/travel/packages")
async def admin_create_travel_package(data: TravelPackageIn, _=Depends(require_roles("admin"))):
    page = await db.travel_pages.find_one({"id": data.page_id}, {"_id": 0, "id": 1})
    if not page:
        raise HTTPException(status_code=404, detail="Travel page not found")

    package = {
        "id": "pkg-" + uuid.uuid4().hex[:10],
        **data.dict(),
        "active": True,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.travel_packages.insert_one(dict(package))
    return package


@api.put("/admin/travel/packages/{package_id}")
async def admin_update_travel_package(package_id: str, data: TravelPackageIn, _=Depends(require_roles("admin"))):
    result = await db.travel_packages.update_one(
        {"id": package_id},
        {"$set": {**data.dict(), "updated_at": now_iso()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Travel package not found")
    return await db.travel_packages.find_one({"id": package_id}, {"_id": 0})


@api.delete("/admin/travel/packages/{package_id}")
async def admin_delete_travel_package(package_id: str, _=Depends(require_roles("admin"))):
    result = await db.travel_packages.delete_one({"id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Travel package not found")
    await db.travel_carts.update_many(
        {"items.package_id": package_id},
        {"$pull": {"items": {"package_id": package_id}}}
    )
    return {"ok": True}


@api.get("/travel/cart")
async def get_travel_cart(current=Depends(get_current_user)):
    cart = await db.travel_carts.find_one({"user_id": current["id"]}, {"_id": 0})
    if not cart:
        return {"items": [], "total": 0}

    ids = [i.get("package_id") for i in cart.get("items", []) if i.get("package_id")]
    packages = await db.travel_packages.find(
        {"id": {"$in": ids}, "active": True},
        {"_id": 0}
    ).to_list(100) if ids else []

    package_map = {p["id"]: p for p in packages}
    items = []
    total = 0

    for item in cart.get("items", []):
        p = package_map.get(item.get("package_id"))
        if not p:
            continue
        qty = max(1, int(item.get("quantity", 1)))
        line_total = round(float(p.get("price", 0)) * qty, 2)
        total += line_total
        items.append({
            "package": p,
            "quantity": qty,
            "line_total": line_total,
        })

    return {"items": items, "total": round(total, 2)}


@api.post("/travel/cart/add")
async def add_travel_cart(item: TravelCartItemIn, current=Depends(get_current_user)):
    if item.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    package = await db.travel_packages.find_one(
        {"id": item.package_id, "active": True},
        {"_id": 0}
    )
    if not package:
        raise HTTPException(status_code=404, detail="Travel package not found")

    cart = await db.travel_carts.find_one({"user_id": current["id"]}) or {
        "user_id": current["id"],
        "items": [],
        "updated_at": now_iso(),
    }

    found = False
    for it in cart["items"]:
        if it.get("package_id") == item.package_id:
            it["quantity"] = int(it.get("quantity", 1)) + item.quantity
            found = True
            break

    if not found:
        cart["items"].append({"package_id": item.package_id, "quantity": item.quantity})

    cart["updated_at"] = now_iso()
    await db.travel_carts.update_one(
        {"user_id": current["id"]},
        {"$set": {"items": cart["items"], "updated_at": cart["updated_at"]}},
        upsert=True
    )
    return await get_travel_cart(current)


@api.delete("/travel/cart/{package_id}")
async def remove_travel_cart(package_id: str, current=Depends(get_current_user)):
    await db.travel_carts.update_one(
        {"user_id": current["id"]},
        {"$pull": {"items": {"package_id": package_id}}}
    )
    return await get_travel_cart(current)


@api.delete("/travel/cart")
async def clear_travel_cart(current=Depends(get_current_user)):
    await db.travel_carts.update_one(
        {"user_id": current["id"]},
        {"$set": {"items": [], "updated_at": now_iso()}},
        upsert=True
    )
    return {"items": [], "total": 0}


def _encode_product_webp(image):
    qualities = (80, 72, 64, 56, 48, 40, 34)

    for max_side in PRODUCT_IMAGE_SIZES:
        candidate = image.copy()
        candidate.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

        if candidate.mode not in ("RGB", "RGBA"):
            candidate = candidate.convert("RGBA" if "A" in candidate.getbands() else "RGB")

        for quality in qualities:
            buffer = io.BytesIO()
            candidate.save(
                buffer,
                format="WEBP",
                quality=quality,
                method=6,
            )
            data = buffer.getvalue()
            if len(data) <= PRODUCT_IMAGE_MAX_BYTES:
                return data

    # Safety fallback: keep reducing dimensions until the hard limit is met.
    candidate = image.copy()
    max_side = 256
    while max_side >= 128:
        candidate.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        if candidate.mode not in ("RGB", "RGBA"):
            candidate = candidate.convert("RGBA" if "A" in candidate.getbands() else "RGB")
        buffer = io.BytesIO()
        candidate.save(buffer, format="WEBP", quality=28, method=6)
        data = buffer.getvalue()
        if len(data) <= PRODUCT_IMAGE_MAX_BYTES:
            return data
        max_side -= 32

    raise HTTPException(400, "Could not compress product image below 200 KB")


@api.post("/uploads/image")
async def upload_image(
    file: UploadFile = File(...),
    purpose: Optional[str] = Header(default=None, alias="X-KMT-Image-Purpose"),
    current=Depends(require_roles("admin", "vendor"))
):
    if not file.content_type or file.content_type.lower() not in {
        "image/jpeg",
        "image/png",
        "image/webp",
    }:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG or WebP images are allowed"
        )

    try:
        raw = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Image is too large. Maximum size is 8 MB."
            )

        image = Image.open(io.BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)

        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4().hex}.webp"
        output_path = UPLOAD_DIR / filename

        if str(purpose or "").strip().lower() == "product":
            encoded = _encode_product_webp(image)
            output_path.write_bytes(encoded)
        else:
            image.save(
                output_path,
                format="WEBP",
                quality=82,
                method=6
            )

        return {
            "url": f"{PUBLIC_BASE_URL}/uploads/{filename}",
            "filename": filename,
            "size": output_path.stat().st_size,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Image upload failed")
        raise HTTPException(
            status_code=400,
            detail=f"Image upload failed: {str(e)}"
        )
    

# ------------------ ADMIN ------------------

class ProductIn(BaseModel):
    name: str
    category_id: str
    item_category: Optional[str] = None
    item_category_id: Optional[str] = None
    store_id: Optional[str] = None
    price: float
    mrp: Optional[float] = None
    unit: str = ""
    stock: int = 0
    image: str = ""
    description: str = ""
    is_available: bool = True
    trending: bool = False


class CategoryIn(BaseModel):
    name: str
    icon: str = "tag"
    color: str = "#2563EB"
    image: str = ""


class ItemCategoryIn(BaseModel):
    name: str
    category_id: str
    icon: str = "tag-outline"
    color: str = "#F97316"
    order: int = 99
    active: bool = True


class ItemCategoryUpdateIn(BaseModel):
    name: str
    icon: str = "tag-outline"
    color: str = "#F97316"
    order: int = 99
    active: bool = True


class StoreItemCategoryIn(BaseModel):
    name: str
    icon: str = "tag-outline"
    color: str = "#F97316"
    order: int = 99
    active: bool = True


class StoreItemCategoryUpdateIn(BaseModel):
    name: str
    icon: str = "tag-outline"
    color: str = "#F97316"
    order: int = 99
    active: bool = True


class BannerIn(BaseModel):
    title: str
    subtitle: str = ""
    cta: str = "Shop Now"
    image: str
    color: str = "#2563EB"
    order: int = 99
    category_id: Optional[str] = None
    target_type: str = "category"
    target_slug: Optional[str] = None


class VendorServiceIn(BaseModel):
    name: str
    vendor_name: str = ""
    description: str = ""
    image: str = ""
    gallery: list[str] = []
    location: str = ""
    category: str = ""
    type: str = ""
    phone: str = ""
    order: int = 99
    active: bool = True
    price: float = 0
    adult_price: float = 0
    child_price: float = 0
    unit: str = "visit"
    duration: str = ""
    seats: int = 0
    bags: int = 0
    transmission: str = ""
    fuel: str = ""
    tag: str = ""
    includes: list[str] = []
    icon: str = "tools"
    rating: float = 0
    reviews: int = 0
    service_type: ServiceType = ServiceType.DAILY_SERVICE

class OrderStatusIn(BaseModel):
    status: str


class CommissionIn(BaseModel):
    percent: float


class AdminUserUpdateIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


@api.get("/admin/stats")
async def admin_stats(_=Depends(require_roles("admin"))):
    users_count, vendors_count, delivery_count, products_count, orders_count, pending_count, delivered_count, revenue_doc, settings = await asyncio.gather(
        db.users.count_documents({"role": "customer"}),
        db.users.count_documents({"role": "vendor"}),
        db.users.count_documents({"role": "delivery"}),
        db.products.count_documents({}),
        db.orders.count_documents({}),
        db.orders.count_documents({"status": "pending"}),
        db.orders.count_documents({"status": "delivered"}),
        db.orders.aggregate([{"$group": {"_id": None, "total": {"$sum": "$total"}}}]).to_list(1),
        db.settings.find_one({"id": "global"}, {"_id": 0}),
    )

    rev = round((revenue_doc[0].get("total", 0) if revenue_doc else 0) or 0, 2)
    settings = settings or {"commission_percent": 10.0}
    commission = settings.get("commission_percent", 10.0)
    platform_earnings = round(rev * commission / 100, 2)

    # Last 7 days: run all seven indexed counts concurrently.
    from datetime import timedelta as _td
    today = datetime.now(timezone.utc).date()
    day_queries = []
    for i in range(6, -1, -1):
        d = today - _td(days=i)
        start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc).isoformat()
        end = (datetime(d.year, d.month, d.day, tzinfo=timezone.utc) + _td(days=1)).isoformat()
        day_queries.append(db.orders.count_documents({"created_at": {"$gte": start, "$lt": end}}))

    day_counts = await asyncio.gather(*day_queries)
    chart = [
        {"day": (today - _td(days=i)).strftime("%a"), "orders": count}
        for i, count in zip(range(6, -1, -1), day_counts)
    ]

    return {
        "users": users_count,
        "vendors": vendors_count,
        "delivery": delivery_count,
        "products": products_count,
        "orders": orders_count,
        "pending_orders": pending_count,
        "delivered_orders": delivered_count,
        "revenue": rev,
        "platform_earnings": platform_earnings,
        "commission_percent": commission,
        "chart": chart,
    }


# ------------------ ADMIN ROOJGAR APPLICATIONS ------------------

@api.get("/admin/roojgar-applications")
async def admin_roojgar_applications(
    status: Optional[str] = None,
    _=Depends(require_roles("admin"))
):
    query = {}

    if status:
        query["status"] = status

    applications = await db.roojgar_applications.find(
        query,
        {
            "_id": 0,
            "aadhar": 0
        }
    ).sort(
        "created_at",
        -1
    ).to_list(500)

    return applications


class RoojgarStatusIn(BaseModel):
    status: str


class RoojgarStatusIn(BaseModel):
    status: str


@api.post("/admin/roojgar-applications/{application_id}/status")
async def admin_update_roojgar_status(
    application_id: str,
    data: RoojgarStatusIn,
    _=Depends(require_roles("admin"))
):
    allowed_statuses = [
        "pending",
        "done"
    ]

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status must be pending or done"
        )

    result = await db.roojgar_applications.update_one(
        {"id": application_id},
        {
            "$set": {
                "status": data.status
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Roojgar application not found"
        )

    return {
        "success": True,
        "message": "Roojgar application status updated",
        "status": data.status
    }


@api.put("/admin/service-vendors/{user_id}")
async def admin_update_service_vendor(
    user_id: str,
    data: AdminUserUpdateIn,
    _=Depends(require_roles("admin"))
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if user.get("role") != Role.VENDOR.value or user.get("vendor_type") != VendorType.SERVICE.value:
        raise HTTPException(status_code=400, detail="This is not a service vendor")
    if user.get("service_type") not in {ServiceType.HOLIDAY.value, ServiceType.CAR_RENTAL.value}:
        raise HTTPException(status_code=400, detail="Daily Services are admin-managed")
    update = {"name": data.name.strip()}
    if not update["name"]:
        raise HTTPException(status_code=400, detail="Vendor name is required")
    if data.email is not None:
        update["email"] = str(data.email).strip().lower()
    if data.phone is not None:
        update["phone"] = str(data.phone).strip()
    duplicate = await db.users.find_one({
        "$or": [
            {"email": update.get("email")} if update.get("email") else {"id": "__none__"},
            {"phone": update.get("phone")} if update.get("phone") else {"id": "__none__"},
        ],
        "id": {"$ne": user_id}
    })
    if duplicate:
        raise HTTPException(status_code=409, detail="Email or mobile number already belongs to another account")
    await db.users.update_one({"id": user_id}, {"$set": update})
    return await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})

@api.get("/admin/users")
async def admin_users(
    role: Optional[str] = None,
    _=Depends(require_roles("admin"))
):
    q = {}

    if role:
        q["role"] = role

    users = await db.users.find(
        q,
        {
            "_id": 0,
            "password": 0
        }
    ).sort(
        "created_at",
        -1
    ).to_list(500)

    return users


@api.post("/admin/users/{user_id}/toggle")
async def admin_toggle_user(
    user_id: str,
    _=Depends(require_roles("admin"))
):
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0}
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Not found"
        )

    # Admin account ko suspend/unsuspend nahi karna
    if user.get("role") == Role.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="Admin account cannot be suspended"
        )

    new_state = not user.get("active", True)

    await db.users.update_one(
        {"id": user_id},
        {"$set": {"active": new_state}}
    )

    if user.get("role") == Role.VENDOR.value:
        if new_state is False:
            await db.stores.update_many(
                {"vendor_id": user_id},
                {"$set": {"is_online": False, "vendor_suspended": True}}
            )
        else:
            await db.stores.update_many(
                {"vendor_id": user_id},
                {"$set": {"vendor_suspended": False}}
            )

    return {
        "ok": True,
        "active": new_state
    }


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    current=Depends(require_roles("admin"))
):
    # User ko database se pehle check karo
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0}
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Admin account ko delete karne se rokna
    if user.get("role") == Role.ADMIN.value:
        raise HTTPException(
            status_code=403,
            detail="Admin account cannot be deleted"
        )

    role = user.get("role")

    # ---------------- CUSTOMER CLEANUP ----------------
    if role == Role.CUSTOMER.value:

        # Customer ki personal/supporting data delete hogi
        await db.addresses.delete_many({
            "user_id": user_id
        })

        await db.carts.delete_many({
            "user_id": user_id
        })

        await db.notifications.delete_many({
            "user_id": user_id
        })

        if user.get("email"):
            await db.password_reset_otps.delete_many({
                "email": user.get("email")
            })

        # Orders intentionally delete nahi kar rahe.
        # Business/order history safe rahegi.

    # ---------------- VENDOR CLEANUP ----------------
    elif role == Role.VENDOR.value:

        stores = await db.stores.find(
            {"vendor_id": user_id},
            {"_id": 0, "id": 1}
        ).to_list(500)

        store_ids = [
            store["id"]
            for store in stores
        ]

        # Vendor ke products delete karo
        if store_ids:
            await db.products.delete_many({
                "store_id": {"$in": store_ids}
            })

        # Vendor ke stores delete karo
        await db.stores.delete_many({
            "vendor_id": user_id
        })

        await db.notifications.delete_many({
            "user_id": user_id
        })

        if user.get("email"):
            await db.password_reset_otps.delete_many({
                "email": user.get("email")
            })

        # Existing orders delete nahi kar rahe.

    # ---------------- DELIVERY CLEANUP ----------------
    elif role == Role.DELIVERY.value:

        await db.notifications.delete_many({
            "user_id": user_id
        })

        if user.get("email"):
            await db.password_reset_otps.delete_many({
                "email": user.get("email")
            })

        # Existing orders safe rahenge.

    # ---------------- COMMON USER DELETE ----------------
    await db.users.delete_one({
        "id": user_id
    })

    return {
        "ok": True,
        "message": f"{role.title()} deleted successfully",
        "user_id": user_id,
        "role": role
    }
    
@api.get("/admin/orders")
async def admin_orders(
    status: Optional[str] = None,
    _=Depends(require_roles("admin"))
):
    query = {}
    if status:
        query["status"] = status

    orders = await db.orders.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)

    if not orders:
        return []

    # Batch-fetch all related data instead of querying once per order/item.
    customer_ids = list({
        o.get("user_id")
        for o in orders
        if o.get("user_id")
    })

    product_ids = list({
        item.get("product_id")
        for o in orders
        for item in o.get("items", [])
        if item.get("product_id")
    })

    customers = await db.users.find(
        {"id": {"$in": customer_ids}},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "email": 1,
            "phone": 1
        }
    ).to_list(None) if customer_ids else []

    customer_map = {
        u["id"]: u for u in customers
    }

    products = await db.products.find(
        {"id": {"$in": product_ids}},
        {
            "_id": 0,
            "id": 1,
            "store_id": 1
        }
    ).to_list(None) if product_ids else []

    product_map = {
        p["id"]: p for p in products
    }

    store_ids = list({
        p.get("store_id")
        for p in products
        if p.get("store_id")
    })

    stores = await db.stores.find(
        {"id": {"$in": store_ids}},
        {
            "_id": 0,
            "id": 1,
            "vendor_id": 1,
            "name": 1
        }
    ).to_list(None) if store_ids else []

    store_map = {
        s["id"]: s for s in stores
    }

    vendor_ids = list({
        s.get("vendor_id")
        for s in stores
        if s.get("vendor_id")
    })

    vendors = await db.users.find(
        {"id": {"$in": vendor_ids}},
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "email": 1,
            "phone": 1
        }
    ).to_list(None) if vendor_ids else []

    vendor_map = {
        v["id"]: v for v in vendors
    }

    for order in orders:
        order["customer"] = customer_map.get(
            order.get("user_id"),
            {}
        )

        order_vendor_ids = []

        for item in order.get("items", []):
            product = product_map.get(item.get("product_id"))

            if not product:
                continue

            store = store_map.get(product.get("store_id"))

            if not store:
                continue

            vendor_id = store.get("vendor_id")

            if vendor_id and vendor_id not in order_vendor_ids:
                order_vendor_ids.append(vendor_id)

        order["vendor_ids"] = order_vendor_ids
        order["vendors"] = [
            vendor_map[vid]
            for vid in order_vendor_ids
            if vid in vendor_map
        ]

    return orders


@api.post("/admin/orders/{order_id}/status")
async def admin_update_order(order_id: str, data: OrderStatusIn, _=Depends(require_roles("admin"))):
    allowed_statuses = {"pending", "accepted", "rejected", "out_for_delivery", "delivered"}
    if data.status not in allowed_statuses:
        raise HTTPException(400, "Invalid order status")

    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Order not found")
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


@api.get("/admin/products")
async def admin_list_products(_=Depends(require_roles("admin"))):
    return await db.products.find({}, {"_id": 0}).to_list(500)


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


@api.put("/admin/categories/{cid}")
async def admin_update_cat(cid: str, data: CategoryIn, _=Depends(require_roles("admin"))):
    result = await db.categories.update_one(
        {"id": cid},
        {"$set": data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return await db.categories.find_one({"id": cid}, {"_id": 0})


@api.get("/admin/item-categories")
async def admin_list_item_categories(_=Depends(require_roles("admin"))):
    return await db.item_categories.find(
        {},
        {"_id": 0}
    ).sort([("category_id", 1), ("order", 1), ("name", 1)]).to_list(500)


@api.post("/admin/item-categories")
async def admin_create_item_category(data: ItemCategoryIn, _=Depends(require_roles("admin"))):
    parent = await db.categories.find_one(
        {"id": data.category_id},
        {"_id": 0, "id": 1}
    )
    if not parent:
        raise HTTPException(400, "Parent category not found")

    name = str(data.name or "").strip()
    if not name:
        raise HTTPException(400, "Item category name is required")

    duplicate = await db.item_categories.find_one({
        "category_id": data.category_id,
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
    })
    if duplicate:
        raise HTTPException(409, "Item category already exists for this shop category")

    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        raise HTTPException(400, "Enter a valid item category name")

    parent_slug = re.sub(r"[^a-z0-9]+", "-", data.category_id.lower()).strip("-")
    base_id = f"item-{parent_slug}-{slug}"
    item_id = base_id
    suffix = 2

    while await db.item_categories.find_one({"id": item_id}, {"_id": 1}):
        item_id = f"{base_id}-{suffix}"
        suffix += 1

    doc = {
        "id": item_id,
        "name": name,
        "category_id": data.category_id,
        "icon": data.icon,
        "color": data.color,
        "order": data.order,
        "active": data.active,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.item_categories.insert_one(dict(doc))
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/admin/item-categories/{item_id}")
async def admin_update_item_category(
    item_id: str,
    data: ItemCategoryUpdateIn,
    _=Depends(require_roles("admin"))
):
    name = str(data.name or "").strip()
    if not name:
        raise HTTPException(400, "Item category name is required")

    current = await db.item_categories.find_one(
        {"id": item_id},
        {"_id": 0}
    )
    if not current:
        raise HTTPException(404, "Item category not found")

    duplicate = await db.item_categories.find_one({
        "id": {"$ne": item_id},
        "category_id": current["category_id"],
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
    })
    if duplicate:
        raise HTTPException(409, "Item category already exists for this shop category")

    result = await db.item_categories.update_one(
        {"id": item_id},
        {"$set": {
            "name": name,
            "icon": data.icon,
            "color": data.color,
            "order": data.order,
            "active": data.active,
            "updated_at": now_iso(),
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Item category not found")
    return await db.item_categories.find_one({"id": item_id}, {"_id": 0})


@api.delete("/admin/item-categories/{item_id}")
async def admin_delete_item_category(
    item_id: str,
    _=Depends(require_roles("admin"))
):
    result = await db.item_categories.update_one(
        {"id": item_id},
        {"$set": {"active": False, "updated_at": now_iso()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Item category not found")
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


@api.put("/admin/banners/{bid}")
async def admin_update_banner(bid: str, data: BannerIn, _=Depends(require_roles("admin"))):
    result = await db.banners.update_one(
        {"id": bid},
        {"$set": data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return await db.banners.find_one({"id": bid}, {"_id": 0})


@api.get("/admin/vendor-services")
async def admin_list_vendor_services(_=Depends(require_roles("admin"))):
    return await db.vendor_services.find(
        {},
        {"_id": 0}
    ).sort("order", 1).to_list(200)


@api.post("/admin/vendor-services")
async def admin_create_vendor_service(
    data: VendorServiceIn,
    _=Depends(require_roles("admin"))
):
    service_id = "vsvc-" + uuid.uuid4().hex[:8]
    doc = {
        "id": service_id,
        **data.dict(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.vendor_services.insert_one(dict(doc))
    return doc


@api.put("/admin/vendor-services/{service_id}")
async def admin_update_vendor_service(
    service_id: str,
    data: VendorServiceIn,
    _=Depends(require_roles("admin"))
):
    result = await db.vendor_services.update_one(
        {"id": service_id},
        {"$set": {**data.dict(), "updated_at": now_iso()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor service not found")
    return await db.vendor_services.find_one(
        {"id": service_id},
        {"_id": 0}
    )


@api.delete("/admin/vendor-services/{service_id}")
async def admin_delete_vendor_service(
    service_id: str,
    _=Depends(require_roles("admin"))
):
    result = await db.vendor_services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor service not found")
    return {"ok": True}


@api.get("/admin/daily-service-stats")
async def admin_daily_service_stats(_=Depends(require_roles("admin"))):
    services, bookings, settings = await asyncio.gather(
        db.vendor_services.find({"service_type": ServiceType.DAILY_SERVICE.value}, {"_id": 0, "id": 1, "active": 1, "price": 1}).to_list(500),
        db.service_bookings.find({"service_type": ServiceType.DAILY_SERVICE.value}, {"_id": 0, "paid_amount": 1, "status": 1}).to_list(500),
        db.settings.find_one({"id": "global"}, {"_id": 0})
    )
    revenue = round(sum(float(x.get("paid_amount", 0) or 0) for x in bookings), 2)
    completed = sum(1 for x in bookings if x.get("status") in {"completed", "delivered"})
    pending = sum(1 for x in bookings if x.get("status") not in {"completed", "cancelled", "delivered"})
    commission = float((settings or {}).get("commission_percent", 10.0) or 10.0)
    payout = round(revenue * (1 - commission / 100), 2)
    return {
        "services": len(services),
        "active_services": sum(1 for x in services if x.get("active") is not False),
        "bookings": len(bookings),
        "completed": completed,
        "pending": pending,
        "revenue": revenue,
        "commission_percent": commission,
        "platform_earnings": round(revenue - payout, 2),
        "provider_payout": payout,
    }

@api.get("/admin/service-bookings")
async def admin_service_bookings(_=Depends(require_roles("admin"))):
    # Admin uses this central queue to review and approve all service requests.
    return await db.service_bookings.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)


@api.post("/admin/service-bookings/{booking_id}/status")
async def admin_service_booking_status(booking_id: str, data: OrderStatusIn, _=Depends(require_roles("admin"))):
    booking = await db.service_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, "Booking not found")

    service_type = booking.get("service_type")
    allowed = {
        ServiceType.DAILY_SERVICE.value: {"pending", "confirmed", "cancelled", "completed", "delivered"},
        ServiceType.HOLIDAY.value: {"pending", "confirmed", "travel_scheduled", "completed", "cancelled"},
        ServiceType.CAR_RENTAL.value: {"pending", "booking_requested", "accepted", "vehicle_assigned", "trip_started", "completed", "cancelled"},
    }
    status = data.status.strip().lower()
    if status not in allowed.get(service_type, set()):
        raise HTTPException(400, "Invalid service booking status")

    result = await db.service_bookings.update_one(
        {"id": booking_id, "service_type": service_type},
        {"$set": {"status": status, "updated_at": now_iso()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Booking not found")
    return await db.service_bookings.find_one({"id": booking_id}, {"_id": 0})


@api.get("/admin/commission")
async def admin_get_commission(_=Depends(require_roles("admin"))):
    s = await db.settings.find_one({"id": "global"}, {"_id": 0})
    return s or {"id": "global", "commission_percent": 10.0}


@api.post("/admin/commission")
async def admin_set_commission(data: CommissionIn, _=Depends(require_roles("admin"))):
    await db.settings.update_one({"id": "global"}, {"$set": {"commission_percent": data.percent}}, upsert=True)
    return {"ok": True, "commission_percent": data.percent}


# --- ADMIN STORE APPROVALS ---

@api.get("/admin/vendors/{vendor_id}/stores")
async def admin_vendor_stores(vendor_id: str, _=Depends(require_roles("admin"))):
    vendor = await db.users.find_one({"id": vendor_id, "role": Role.VENDOR.value}, {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "active": 1, "vendor_type": 1, "service_type": 1})
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    stores = await db.stores.find({"vendor_id": vendor_id}, {"_id": 0}).sort("name", 1).to_list(100)
    return {"vendor": vendor, "stores": stores}

@api.put("/admin/stores/{store_id}")
async def admin_update_store(store_id: str, data: StoreUpdateIn, _=Depends(require_roles("admin"))):
    update_data = data.dict(exclude_unset=True)
    store = await db.stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(404, "Store not found")
    if "category_id" in update_data:
        parent = await db.categories.find_one({"id": update_data["category_id"]}, {"_id": 0, "id": 1})
        if not parent:
            raise HTTPException(400, "Please select a valid shop category")
    if "name" in update_data and not str(update_data["name"]).strip():
        raise HTTPException(400, "Store name cannot be empty")
    if "address" in update_data and not str(update_data["address"]).strip():
        raise HTTPException(400, "Store address cannot be empty")
    if not update_data:
        raise HTTPException(400, "No store changes provided")
    category_changed = "category_id" in update_data and update_data["category_id"] != store.get("category_id")
    if category_changed:
        update_data["item_categories"] = []
        await db.products.update_many(
            {"store_id": store_id},
            {"$set": {"category_id": update_data["category_id"]}, "$unset": {"item_category_id": "", "item_category": ""}}
        )
    await db.stores.update_one({"id": store_id}, {"$set": update_data})
    return await db.stores.find_one({"id": store_id}, {"_id": 0})

@api.post("/admin/stores/{store_id}/toggle")
async def admin_toggle_store(store_id: str, _=Depends(require_roles("admin"))):
    store = await db.stores.find_one({"id": store_id}, {"_id": 0, "id": 1, "admin_suspended": 1})
    if not store:
        raise HTTPException(404, "Store not found")
    suspended = store.get("admin_suspended") is True
    await db.stores.update_one(
        {"id": store_id},
        {"$set": {"admin_suspended": not suspended, "is_online": suspended}}
    )
    return {"ok": True, "admin_suspended": not suspended, "is_online": suspended}

@api.get("/admin/stores/{store_id}/item-categories")
async def admin_store_item_categories(store_id: str, _=Depends(require_roles("admin"))):
    store = await db.stores.find_one({"id": store_id}, {"_id": 0, "id": 1})
    if not store:
        raise HTTPException(404, "Store not found")
    return await db.item_categories.find({"store_id": store_id}, {"_id": 0}).sort([("order", 1), ("name", 1)]).to_list(200)

@api.post("/admin/stores/{store_id}/item-categories")
async def admin_create_store_item_category(store_id: str, data: StoreItemCategoryIn, _=Depends(require_roles("admin"))):
    store = await db.stores.find_one({"id": store_id}, {"_id": 0, "id": 1, "vendor_id": 1})
    if not store:
        raise HTTPException(404, "Store not found")
    name = str(data.name or "").strip()
    if not name:
        raise HTTPException(400, "Item category name is required")
    duplicate = await db.item_categories.find_one({"store_id": store_id, "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if duplicate:
        raise HTTPException(409, "This item category already exists in this store")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        raise HTTPException(400, "Enter a valid item category name")
    base_id = f"item-{store_id}-{slug}"
    item_id, suffix = base_id, 2
    while await db.item_categories.find_one({"id": item_id}, {"_id": 1}):
        item_id = f"{base_id}-{suffix}"; suffix += 1
    doc = {"id": item_id, "name": name, "store_id": store_id, "vendor_id": store.get("vendor_id"), "icon": data.icon, "color": data.color, "order": data.order, "active": data.active, "created_at": now_iso(), "updated_at": now_iso()}
    await db.item_categories.insert_one(dict(doc))
    return doc

@api.put("/admin/stores/{store_id}/item-categories/{item_id}")
async def admin_update_store_item_category(store_id: str, item_id: str, data: StoreItemCategoryUpdateIn, _=Depends(require_roles("admin"))):
    item = await db.item_categories.find_one({"id": item_id, "store_id": store_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Item category not found")
    name = str(data.name or "").strip()
    if not name:
        raise HTTPException(400, "Item category name is required")
    duplicate = await db.item_categories.find_one({"id": {"$ne": item_id}, "store_id": store_id, "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if duplicate:
        raise HTTPException(409, "This item category already exists in this store")
    await db.item_categories.update_one({"id": item_id, "store_id": store_id}, {"$set": {"name": name, "icon": data.icon, "color": data.color, "order": data.order, "active": data.active, "updated_at": now_iso()}})
    await db.products.update_many({"store_id": store_id, "item_category_id": item_id}, {"$set": {"item_category": name}})
    return await db.item_categories.find_one({"id": item_id}, {"_id": 0})

@api.delete("/admin/stores/{store_id}/item-categories/{item_id}")
async def admin_delete_store_item_category(store_id: str, item_id: str, _=Depends(require_roles("admin"))):
    result = await db.item_categories.update_one({"id": item_id, "store_id": store_id}, {"$set": {"active": False, "updated_at": now_iso()}})
    if result.matched_count == 0:
        raise HTTPException(404, "Item category not found")
    await db.products.update_many({"store_id": store_id, "item_category_id": item_id}, {"$unset": {"item_category_id": "", "item_category": ""}})
    return {"ok": True}

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



async def _notify_service_booking_created(booking: dict):
    service_type = booking.get("service_type") or ""
    label = {
        ServiceType.DAILY_SERVICE.value: "Daily Service",
        ServiceType.HOLIDAY.value: "Holiday",
        ServiceType.CAR_RENTAL.value: "Car Rental",
    }.get(service_type, "Service")
    service_name = booking.get("service_name") or label
    customer_name = booking.get("customer_name") or "Customer"
    body = f"New {label} booking from {customer_name}: {service_name}."
    base = {
        "title": f"New {label} booking",
        "body": body,
        "type": "service_booking",
        "read": False,
        "created_at": now_iso(),
        "booking_id": booking.get("id"),
        "service_type": service_type,
    }

    admins = await db.users.find(
        {"role": Role.ADMIN.value, "active": {"$ne": False}},
        {"_id": 0, "id": 1}
    ).to_list(100)
    docs = []
    for admin in admins:
        docs.append({**base, "id": str(uuid.uuid4()), "user_id": admin["id"]})

    vendor_id = booking.get("vendor_id")
    if vendor_id and service_type in {ServiceType.HOLIDAY.value, ServiceType.CAR_RENTAL.value}:
        docs.append({**base, "id": str(uuid.uuid4()), "user_id": vendor_id})

    if docs:
        await db.notifications.insert_many(docs)


# ------------------ SERVICE MARKETPLACE ------------------
SERVICE_TYPES = {
    "holiday": {
        "id": "holiday",
        "name": "Holiday",
        "icon": "airplane-takeoff",
        "description": "Holiday packages and trip bookings",
    },
    "car_rental": {
        "id": "car_rental",
        "name": "Car Rental",
        "icon": "car",
        "description": "Cars, rentals and trip bookings",
    },
    "daily_service": {
        "id": "daily_service",
        "name": "Daily Services",
        "icon": "tools",
        "description": "Repair, mistri, labour and local home services",
    },
}


class ServiceBookingIn(BaseModel):
    service_type: ServiceType
    service_id: str
    booking_date: str
    booking_time: str = ""
    address_id: Optional[str] = None
    quantity: int = 1
    notes: str = ""
    extra: Dict[str, Any] = {}


@api.get("/service-types")
async def service_types():
    return list(SERVICE_TYPES.values())


@api.get("/services/catalog/{service_type}")
async def service_catalog(service_type: ServiceType):
    items = await db.vendor_services.find(
        {"service_type": service_type.value, "active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(200)
    return items


@api.get("/services/catalog/{service_type}/{service_id}")
async def service_catalog_detail(service_type: ServiceType, service_id: str):
    item = await db.vendor_services.find_one(
        {"id": service_id, "service_type": service_type.value, "active": True},
        {"_id": 0}
    )
    if not item:
        raise HTTPException(404, "Service not found")
    return item



@api.get("/service-cart")
async def get_service_cart(current=Depends(require_roles("customer"))):
    cart = await db.service_carts.find_one({"user_id": current["id"]}, {"_id": 0})
    return cart or {"user_id": current["id"], "items": []}


class ServiceCartAddIn(BaseModel):
    service_type: ServiceType
    service_id: str
    booking_date: str
    booking_time: str = ""
    address_id: Optional[str] = None
    quantity: int = 1
    notes: str = ""
    extra: Dict[str, Any] = {}


class ServiceCustomerDetailsIn(BaseModel):
    full_name: str
    phone: str
    email: str = ""


class ServicePaymentIn(BaseModel):
    payment_plan: str = "booking"
    payment_method: str = "upi"
    gateway_reference: str = ""


@api.post("/service-cart/add")
async def add_service_cart(data: ServiceCartAddIn, current=Depends(require_roles("customer"))):
    service = await db.vendor_services.find_one(
        {"id": data.service_id, "service_type": data.service_type.value, "active": True},
        {"_id": 0}
    )

    is_mock = (
        data.service_type in (ServiceType.HOLIDAY, ServiceType.CAR_RENTAL, ServiceType.DAILY_SERVICE)
        and str(data.service_id).startswith("mock-")
        and (data.extra or {}).get("source") in ("mock-package", "mock-car", "mock-daily")
    )

    if not service and not is_mock:
        raise HTTPException(404, "Service is not available")

    item = data.dict()
    item["service_type"] = data.service_type.value
    item["service_name"] = (
        service.get("name", "")
        if service
        else (data.extra or {}).get("package_name", "Service Booking")
    )
    item["vendor_id"] = service.get("vendor_id") if service else None
    item["vendor_name"] = (
        service.get("vendor_name", "")
        if service
        else (data.extra or {}).get("vendor_name", "KMT Bazaar Holidays")
    )
    item["customer_name"] = (data.extra or {}).get("customer_name", "")
    item["customer_phone"] = (data.extra or {}).get("customer_phone", "")
    item["customer_email"] = (data.extra or {}).get("customer_email", "")
    item["added_at"] = now_iso()
    await db.service_carts.update_one(
        {"user_id": current["id"]},
        {"$set": {"items": [item], "updated_at": now_iso()}},
        upsert=True
    )
    return await get_service_cart(current)





@api.post("/service-cart/customer")
async def update_service_cart_customer(data: ServiceCustomerDetailsIn, current=Depends(require_roles("customer"))):
    full_name = data.full_name.strip()
    phone = "".join(ch for ch in data.phone if ch.isdigit())
    email = data.email.strip()

    if len(full_name) < 2:
        raise HTTPException(400, "Please enter your full name")
    if len(phone) != 10:
        raise HTTPException(400, "Please enter a valid 10-digit mobile number")

    cart = await db.service_carts.find_one({"user_id": current["id"]}, {"_id": 0})
    items = (cart or {}).get("items", [])
    if not items:
        raise HTTPException(400, "Service booking cart is empty")

    updated_items = []
    for item in items:
        updated = dict(item)
        updated["customer_name"] = full_name
        updated["customer_phone"] = phone
        updated["customer_email"] = email
        updated_items.append(updated)

    await db.service_carts.update_one(
        {"user_id": current["id"]},
        {
            "$set": {
                "items": updated_items,
                "customer": {
                    "full_name": full_name,
                    "phone": phone,
                    "email": email,
                },
                "updated_at": now_iso(),
            }
        },
    )
    return await get_service_cart(current)


@api.post("/service-cart/pay")
async def pay_service_cart(data: ServicePaymentIn, current=Depends(require_roles("customer"))):
    if data.payment_plan not in {"booking", "full"}:
        raise HTTPException(400, "Invalid payment plan")
    if data.payment_method not in {"upi", "card", "netbanking"}:
        raise HTTPException(400, "Invalid payment method")

    cart = await db.service_carts.find_one({"user_id": current["id"]}, {"_id": 0})
    items = (cart or {}).get("items", [])
    if not items:
        raise HTTPException(400, "Service booking cart is empty")

    customer = (cart or {}).get("customer") or {}
    customer_name = customer.get("full_name") or current.get("name") or ""
    customer_phone = customer.get("phone") or current.get("phone") or ""
    customer_email = customer.get("email") or current.get("email") or ""

    if len(str(customer_name).strip()) < 2 or len("".join(ch for ch in str(customer_phone) if ch.isdigit())) != 10:
        raise HTTPException(400, "Please complete your booking contact details first")

    total = 0.0
    for item in items:
        extra = item.get("extra") or {}
        try:
            adult_price = float(extra.get("adult_price") or extra.get("package_price") or 0)
        except Exception:
            adult_price = 0.0
        try:
            child_price = float(extra.get("child_price") or (adult_price * 0.5))
        except Exception:
            child_price = adult_price * 0.5
        has_split = "adult_count" in extra or "child_count" in extra
        if has_split:
            try:
                adult_count = max(1, int(extra.get("adult_count", 1) or 1))
            except Exception:
                adult_count = 1
            try:
                child_count = max(0, int(extra.get("child_count", 0) or 0))
            except Exception:
                child_count = 0
            total += (adult_price * adult_count) + (child_price * child_count)
        else:
            qty = max(1, int(item.get("quantity", 1)))
            total += adult_price * qty

    total = round(total, 2)
    booking_amount = round(total * 0.20, 2) if total > 0 else 0
    amount_paid = total if data.payment_plan == "full" else booking_amount

    if total > 0 and amount_paid <= 0:
        raise HTTPException(400, "Payment amount could not be calculated")

    reference = data.gateway_reference.strip() or ("KMT-" + uuid.uuid4().hex[:10].upper())
    created = []
    for item in items:
        service = await db.vendor_services.find_one(
            {"id": item.get("service_id"), "service_type": item.get("service_type"), "active": True},
            {"_id": 0}
        )
        extra = item.get("extra") or {}
        booking_id = "sbk-" + uuid.uuid4().hex[:10]

        doc = {
            "id": booking_id,
            "customer_id": current["id"],
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "customer_email": customer_email,
            "vendor_id": service.get("vendor_id") if service else item.get("vendor_id"),
            "service_id": item.get("service_id"),
            "service_type": item.get("service_type", ServiceType.HOLIDAY.value),
            "service_name": service.get("name", item.get("service_name", "Holiday Package")) if service else item.get("service_name", "Holiday Package"),
            "vendor_name": service.get("vendor_name", item.get("vendor_name", "")) if service else item.get("vendor_name", "KMT Bazaar Holidays"),
            "booking_date": item.get("booking_date", ""),
            "booking_time": item.get("booking_time", ""),
            "address_id": item.get("address_id"),
            "quantity": max(1, int(item.get("quantity", 1))),
            "notes": item.get("notes", ""),
            "extra": extra,
            "total_amount": total,
            "booking_amount": booking_amount,
            "paid_amount": amount_paid,
            "payment_plan": data.payment_plan,
            "payment_method": data.payment_method,
            "payment_gateway": "kmt-test-gateway",
            "gateway_reference": reference,
            "payment_status": "paid",
            "status": "pending",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.service_bookings.insert_one(dict(doc))
        await _notify_service_booking_created(doc)
        created.append(doc)

    await db.service_carts.delete_one({"user_id": current["id"]})

    return {
        "ok": True,
        "confirmation_id": reference,
        "payment_plan": data.payment_plan,
        "payment_method": data.payment_method,
        "total_amount": total,
        "paid_amount": amount_paid,
        "remaining_amount": round(max(0, total - amount_paid), 2),
        "bookings": created,
    }


@api.delete("/service-cart/clear")
async def clear_service_cart(current=Depends(require_roles("customer"))):
    await db.service_carts.delete_one({"user_id": current["id"]})
    return {"ok": True}


@api.post("/service-cart/checkout")
async def checkout_service_cart(current=Depends(require_roles("customer"))):
    cart = await db.service_carts.find_one({"user_id": current["id"]}, {"_id": 0})
    items = (cart or {}).get("items", [])
    if not items:
        raise HTTPException(400, "Service booking cart is empty")
    created = []
    for item in items:
        data = ServiceBookingIn(
            service_type=item["service_type"],
            service_id=item["service_id"],
            booking_date=item["booking_date"],
            booking_time=item.get("booking_time", ""),
            address_id=item.get("address_id"),
            quantity=max(1, int(item.get("quantity", 1))),
            notes=item.get("notes", ""),
            extra=item.get("extra") or {},
        )
        created.append(await create_service_booking(data, current))
    await db.service_carts.delete_one({"user_id": current["id"]})
    return {"ok": True, "bookings": created}


@api.post("/service-bookings")
async def create_service_booking(data: ServiceBookingIn, current=Depends(require_roles("customer"))):
    service = await db.vendor_services.find_one(
        {"id": data.service_id, "service_type": data.service_type.value, "active": True},
        {"_id": 0}
    )
    if not service:
        raise HTTPException(404, "Service is not available")
    booking_id = "sbk-" + uuid.uuid4().hex[:10]
    status_value = "pending"
    doc = {
        "id": booking_id,
        "customer_id": current["id"],
        "customer_name": current.get("name", ""),
        "vendor_id": service.get("vendor_id"),
        "service_id": service["id"],
        "service_type": data.service_type.value,
        "service_name": service.get("name", ""),
        "vendor_name": service.get("vendor_name", ""),
        "booking_date": data.booking_date,
        "booking_time": data.booking_time,
        "address_id": data.address_id,
        "quantity": max(1, data.quantity),
        "notes": data.notes,
        "extra": data.extra,
        "status": status_value,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.service_bookings.insert_one(dict(doc))
    await _notify_service_booking_created(doc)
    return doc


@api.get("/service-bookings")
async def list_service_bookings(current=Depends(require_roles("customer"))):
    return await db.service_bookings.find(
        {"customer_id": current["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)


@api.get("/service-bookings/{booking_id}")
async def get_service_booking(booking_id: str, current=Depends(get_current_user)):
    query = {"id": booking_id}
    if current.get("role") == Role.CUSTOMER.value:
        query["customer_id"] = current["id"]
    elif current.get("role") == Role.VENDOR.value:
        query["vendor_id"] = current["id"]
    else:
        raise HTTPException(403, "Access denied")
    doc = await db.service_bookings.find_one(query, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Booking not found")
    return doc


@api.post("/vendor/service-bookings/{booking_id}/status")
async def vendor_service_booking_status(
    booking_id: str,
    data: OrderStatusIn,
    current=Depends(require_roles("vendor"))
):
    _require_vendor_type(current, "service")
    booking = await db.service_bookings.find_one(
        {"id": booking_id, "vendor_id": current["id"]},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(404, "Booking not found")
    allowed = {
        "holiday": {"pending", "confirmed", "travel_scheduled", "completed", "cancelled"},
        "car_rental": {"booking_requested", "accepted", "vehicle_assigned", "trip_started", "completed", "cancelled"},
        "daily_service": {"booking_requested", "provider_accepted", "provider_on_the_way", "service_started", "completed", "cancelled"},
    }
    st = data.status.strip().lower()
    if st not in allowed.get(booking.get("service_type"), set()):
        raise HTTPException(400, "Invalid status for this service type")
    await db.service_bookings.update_one(
        {"id": booking_id, "vendor_id": current["id"]},
        {"$set": {"status": st, "updated_at": now_iso()}}
    )
    return await db.service_bookings.find_one({"id": booking_id}, {"_id": 0})


@api.get("/vendor/service-bookings")
async def vendor_service_bookings(current=Depends(require_roles("vendor"))):
    _require_vendor_type(current, "service")
    return await db.service_bookings.find(
        {"vendor_id": current["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)


@api.get("/vendor/service-type")
async def vendor_service_type(current=Depends(require_roles("vendor"))):
    _require_vendor_type(current, "service")
    return {
        "service_type": current.get("service_type") or ServiceType.DAILY_SERVICE.value,
        "name": SERVICE_TYPES.get(current.get("service_type") or ServiceType.DAILY_SERVICE.value, {}).get("name", "Daily Services"),
    }


# ------------------ VENDOR SERVICES ------------------
def _require_vendor_type(current, expected: str):
    if (current.get("vendor_type") or "store") != expected:
        raise HTTPException(status_code=403, detail=f"{expected.title()} Vendor access required")

@api.get("/vendor/service-stats")
async def vendor_service_stats(current=Depends(require_roles("vendor"))):
    _require_vendor_type(current, "service")
    service_type = current.get("service_type") or ServiceType.DAILY_SERVICE.value
    services_count, active_count, bookings, settings = await asyncio.gather(
        db.vendor_services.count_documents({"vendor_id": current["id"], "service_type": service_type}),
        db.vendor_services.count_documents({"vendor_id": current["id"], "service_type": service_type, "active": True}),
        db.service_bookings.find({"vendor_id": current["id"], "service_type": service_type}, {"_id": 0, "paid_amount": 1, "status": 1}).to_list(500),
        db.settings.find_one({"id": "global"}, {"_id": 0})
    )
    revenue = round(sum(float(x.get("paid_amount", 0) or 0) for x in bookings), 2)
    pending = sum(1 for x in bookings if x.get("status") not in {"completed", "cancelled"})
    completed = sum(1 for x in bookings if x.get("status") == "completed")
    commission = float((settings or {}).get("commission_percent", 10.0) or 10.0)
    payout = round(revenue * (1 - commission / 100), 2)
    return {
        "service_type": service_type,
        "services": services_count,
        "active_services": active_count,
        "bookings": len(bookings),
        "completed": completed,
        "pending": pending,
        "revenue": revenue,
        "commission_percent": commission,
        "payout": payout,
    }

@api.get("/vendor/holiday/banner")
async def vendor_holiday_banner(current=Depends(require_roles("vendor"))):
    _require_vendor_type(current, "service")
    if current.get("service_type") != ServiceType.HOLIDAY.value:
        raise HTTPException(status_code=403, detail="Holiday Vendor access required")
    user = await db.users.find_one(
        {"id": current["id"]},
        {"_id": 0, "name": 1, "holiday_banner_url": 1, "holiday_banner_urls": 1}
    )
    urls = [str(x).strip() for x in ((user or {}).get("holiday_banner_urls") or []) if str(x).strip()]
    if not urls:
        legacy = str((user or {}).get("holiday_banner_url") or "").strip()
        if legacy:
            urls = [legacy]
    return {"url": urls[0] if urls else "", "urls": urls, "vendor_name": current.get("name")}

@api.put("/vendor/holiday/banner")
async def update_holiday_banner(
    data: Dict[str, Any],
    current=Depends(require_roles("vendor"))
):
    _require_vendor_type(current, "service")
    if current.get("service_type") != ServiceType.HOLIDAY.value:
        raise HTTPException(status_code=403, detail="Holiday Vendor access required")
    raw_urls = data.get("urls")
    if isinstance(raw_urls, list):
        urls = [str(x).strip() for x in raw_urls if str(x).strip()]
    else:
        url = str(data.get("url") or "").strip()
        urls = [url] if url else []
    if len(urls) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 holiday banners allowed")
    if any(len(url) > 2000 for url in urls):
        raise HTTPException(status_code=400, detail="Banner image URL is too long")
    await db.users.update_one(
        {"id": current["id"]},
        {"$set": {"holiday_banner_urls": urls, "holiday_banner_url": urls[0] if urls else "", "updated_at": now_iso()}}
    )
    return {"url": urls[0] if urls else "", "urls": urls, "vendor_name": current.get("name")}

@api.post("/vendor/holiday/banner")
async def add_holiday_banner(
    data: Dict[str, Any],
    current=Depends(require_roles("vendor"))
):
    _require_vendor_type(current, "service")
    if current.get("service_type") != ServiceType.HOLIDAY.value:
        raise HTTPException(status_code=403, detail="Holiday Vendor access required")
    url = str(data.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Banner image URL is required")
    if len(url) > 2000:
        raise HTTPException(status_code=400, detail="Banner image URL is too long")
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "holiday_banner_url": 1, "holiday_banner_urls": 1})
    urls = [str(x).strip() for x in ((user or {}).get("holiday_banner_urls") or []) if str(x).strip()]
    if not urls:
        legacy = str((user or {}).get("holiday_banner_url") or "").strip()
        if legacy:
            urls = [legacy]
    if len(urls) >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 holiday banners allowed")
    if url not in urls:
        urls.append(url)
    await db.users.update_one(
        {"id": current["id"]},
        {"$set": {"holiday_banner_urls": urls, "holiday_banner_url": urls[0] if urls else "", "updated_at": now_iso()}}
    )
    return {"url": urls[0] if urls else "", "urls": urls, "vendor_name": current.get("name")}

@api.delete("/vendor/holiday/banner/{index}")
async def delete_holiday_banner(
    index: int,
    current=Depends(require_roles("vendor"))
):
    _require_vendor_type(current, "service")
    if current.get("service_type") != ServiceType.HOLIDAY.value:
        raise HTTPException(status_code=403, detail="Holiday Vendor access required")
    user = await db.users.find_one({"id": current["id"]}, {"_id": 0, "holiday_banner_url": 1, "holiday_banner_urls": 1})
    urls = [str(x).strip() for x in ((user or {}).get("holiday_banner_urls") or []) if str(x).strip()]
    if not urls:
        legacy = str((user or {}).get("holiday_banner_url") or "").strip()
        if legacy:
            urls = [legacy]
    if index < 0 or index >= len(urls):
        raise HTTPException(status_code=404, detail="Banner not found")
    urls.pop(index)
    await db.users.update_one(
        {"id": current["id"]},
        {"$set": {"holiday_banner_urls": urls, "holiday_banner_url": urls[0] if urls else "", "updated_at": now_iso()}}
    )
    return {"url": urls[0] if urls else "", "urls": urls, "vendor_name": current.get("name")}


@api.get("/vendor/services")
async def vendor_list_services(current=Depends(require_roles("vendor"))):
    _require_vendor_type(current, "service")
    if current.get("service_type") not in {ServiceType.HOLIDAY.value, ServiceType.CAR_RENTAL.value}:
        raise HTTPException(status_code=403, detail="Daily Services are managed by Admin only")
    return await db.vendor_services.find(
        {"vendor_id": current["id"], "service_type": current.get("service_type") or ServiceType.DAILY_SERVICE.value},
        {"_id": 0}
    ).sort("order", 1).to_list(200)


@api.post("/vendor/services")
async def vendor_create_service(
    data: VendorServiceIn,
    current=Depends(require_roles("vendor"))
):
    _require_vendor_type(current, "service")
    if current.get("service_type") not in {ServiceType.HOLIDAY.value, ServiceType.CAR_RENTAL.value}:
        raise HTTPException(status_code=403, detail="Daily Services are managed by Admin only")
    service_id = "vsvc-" + uuid.uuid4().hex[:8]
    _require_vendor_type(current, "service")
    vendor_service_type = current.get("service_type") or ServiceType.DAILY_SERVICE.value
    doc = {
        "id": service_id,
        **data.dict(),
        "service_type": vendor_service_type,
        "vendor_id": current["id"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.vendor_services.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/vendor/services/{service_id}")
async def vendor_update_service(
    service_id: str,
    data: VendorServiceIn,
    current=Depends(require_roles("vendor"))
):
    _require_vendor_type(current, "service")
    if current.get("service_type") not in {ServiceType.HOLIDAY.value, ServiceType.CAR_RENTAL.value}:
        raise HTTPException(status_code=403, detail="Daily Services are managed by Admin only")
    update_data = data.dict()
    update_data["service_type"] = current.get("service_type") or ServiceType.DAILY_SERVICE.value
    result = await db.vendor_services.update_one(
        {"id": service_id, "vendor_id": current["id"], "service_type": update_data["service_type"]},
        {"$set": {**update_data, "updated_at": now_iso()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return await db.vendor_services.find_one(
        {"id": service_id, "vendor_id": current["id"]},
        {"_id": 0}
    )


@api.delete("/vendor/services/{service_id}")
async def vendor_delete_service(
    service_id: str,
    current=Depends(require_roles("vendor"))
):
    _require_vendor_type(current, "service")
    if current.get("service_type") not in {ServiceType.HOLIDAY.value, ServiceType.CAR_RENTAL.value}:
        raise HTTPException(status_code=403, detail="Daily Services are managed by Admin only")
    result = await db.vendor_services.delete_one(
        {"id": service_id, "vendor_id": current["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"ok": True}


# ------------------ VENDOR ------------------
async def _vendor_store_ids(vendor_id: str):
    stores = await db.stores.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(50)
    return [s["id"] for s in stores], stores


async def _resolve_vendor_item_category(
    store_id: str,
    store_category_id: str,
    item_category_id: Optional[str],
    item_category_name: Optional[str],
):
    if item_category_id:
        item = await db.item_categories.find_one(
            {
                "id": item_category_id,
                "store_id": store_id,
                "active": {"$ne": False},
            },
            {"_id": 0, "id": 1, "name": 1}
        )
        # Backward compatibility for products created with the old
        # admin-defined global item categories.
        if not item:
            item = await db.item_categories.find_one(
                {
                    "id": item_category_id,
                    "category_id": store_category_id,
                    "active": {"$ne": False},
                },
                {"_id": 0, "id": 1, "name": 1}
            )
        if not item:
            raise HTTPException(400, "Invalid item category for this store")
        return {
            "item_category_id": item["id"],
            "item_category": item["name"],
        }

    name = str(item_category_name or "").strip()
    if not name:
        return {
            "item_category_id": None,
            "item_category": None,
        }

    item = await db.item_categories.find_one(
        {
            "store_id": store_id,
            "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
            "active": {"$ne": False},
        },
        {"_id": 0, "id": 1, "name": 1}
    )
    # Backward compatibility for old global categories.
    if not item:
        item = await db.item_categories.find_one(
            {
                "category_id": store_category_id,
                "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
                "active": {"$ne": False},
            },
            {"_id": 0, "id": 1, "name": 1}
        )
    if not item:
        raise HTTPException(400, "Invalid item category for this store")

    return {
        "item_category_id": item["id"],
        "item_category": item["name"],
    }

class OnlineIn(BaseModel):
    online: bool


class StoreIn(BaseModel):
    name: str
    address: str
    category_id: str
    item_categories: list[str] = []
    delivery_min: int = 30
    image: str = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80" # Default image

# Yahan Vendor ke section ke aas paas hoga ye code
@api.post("/vendor/stores")
async def vendor_create_store(data: StoreIn, current=Depends(require_roles("vendor"))):
    parent = await db.categories.find_one(
        {"id": data.category_id},
        {"_id": 0, "id": 1}
    )
    if not parent:
        raise HTTPException(400, "Please select a valid shop category")

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


class StoreUpdateIn(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    category_id: Optional[str] = None
    item_categories: Optional[list[str]] = None
    delivery_min: Optional[int] = None
    image: Optional[str] = None


@api.put("/vendor/stores/{store_id}")
async def vendor_update_store(
    store_id: str,
    data: StoreUpdateIn,
    current=Depends(require_roles("vendor"))
):
    update_data = data.dict(exclude_unset=True)

    existing_store = await db.stores.find_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"_id": 0, "id": 1, "category_id": 1}
    )
    if not existing_store:
        raise HTTPException(404, "Store not found or not owned by vendor")

    if "category_id" in update_data:
        parent = await db.categories.find_one(
            {"id": update_data["category_id"]},
            {"_id": 0, "id": 1}
        )
        if not parent:
            raise HTTPException(400, "Please select a valid shop category")

    if "name" in update_data and not str(update_data["name"]).strip():
        raise HTTPException(400, "Store name cannot be empty")

    if "address" in update_data and not str(update_data["address"]).strip():
        raise HTTPException(400, "Store address cannot be empty")

    if not update_data:
        raise HTTPException(400, "No store changes provided")

    category_changed = (
        "category_id" in update_data
        and update_data["category_id"] != existing_store.get("category_id")
    )
    if category_changed:
        update_data["item_categories"] = []
        await db.products.update_many(
            {"store_id": store_id},
            {
                "$set": {"category_id": update_data["category_id"]},
                "$unset": {
                    "item_category_id": "",
                    "item_category": "",
                },
            }
        )

    result = await db.stores.update_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Store not found or not owned by vendor")

    updated = await db.stores.find_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"_id": 0}
    )
    return updated


@api.post("/vendor/stores/{store_id}/online")
async def vendor_store_online(
    store_id: str,
    data: OnlineIn,
    current=Depends(require_roles("vendor"))
):
    # Sirf current vendor ki apni store ka status update hoga.
    result = await db.stores.update_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"$set": {"is_online": data.online}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Store not found or not owned by vendor")

    return {"ok": True, "is_online": data.online}


@api.delete("/vendor/stores/{store_id}")
async def vendor_delete_store(
    store_id: str,
    current=Depends(require_roles("vendor"))
):
    # Sirf current vendor ki apni store delete hogi.
    store = await db.stores.find_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"_id": 0, "id": 1}
    )

    if not store:
        raise HTTPException(
            status_code=404,
            detail="Store not found or not owned by vendor"
        )

    # Store ke products remove karo. Existing orders ko intentionally preserve karte hain.
    await db.products.delete_many({"store_id": store_id})
    await db.stores.delete_one({"id": store_id, "vendor_id": current["id"]})

    return {
        "ok": True,
        "message": "Store and its products deleted successfully"
    }


@api.get("/vendor/stats")
async def vendor_stats(current=Depends(require_roles("vendor"))):
    user_doc, store_data = await asyncio.gather(
        db.users.find_one({"id": current["id"]}, {"_id": 0, "active": 1}),
        _vendor_store_ids(current["id"])
    )
    is_active = user_doc.get("active", True) if user_doc else False
    store_ids, stores = store_data

    if not store_ids:
        return {
            "stores": stores, "products": 0, "orders": 0, "pending": 0,
            "delivered": 0, "revenue": 0, "commission_percent": 10.0,
            "payout": 0, "is_suspended": not is_active
        }

    products, products_count, settings = await asyncio.gather(
        db.products.find({"store_id": {"$in": store_ids}}, {"_id": 0, "id": 1}).to_list(2000),
        db.products.count_documents({"store_id": {"$in": store_ids}}),
        db.settings.find_one({"id": "global"}, {"_id": 0})
    )
    product_ids = [p["id"] for p in products if p.get("id")]
    orders = await db.orders.find(
        {"items.product_id": {"$in": product_ids}},
        {"_id": 0}
    ).to_list(500) if product_ids else []

    product_id_set = set(product_ids)
    revenue = 0.0
    pending = 0
    delivered = 0
    for o in orders:
        for it in o.get("items", []):
            if it.get("product_id") in product_id_set:
                revenue += float(it.get("line_total", 0) or 0)
        pending += o.get("status") == "pending"
        delivered += o.get("status") == "delivered"

    commission = (settings or {}).get("commission_percent", 10.0)
    payout = round(revenue * (1 - commission / 100), 2)

    return {
        "stores": stores, "products": products_count,
        "orders": len(orders), "pending": pending, "delivered": delivered,
        "revenue": round(revenue, 2), "commission_percent": commission,
        "payout": payout, "is_suspended": not is_active
    }


@api.get("/vendor/stores/{store_id}/item-categories")
async def vendor_list_store_item_categories(
    store_id: str,
    current=Depends(require_roles("vendor"))
):
    store = await db.stores.find_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"_id": 0, "id": 1}
    )
    if not store:
        raise HTTPException(404, "Store not found or not owned by vendor")

    return await db.item_categories.find(
        {"store_id": store_id},
        {"_id": 0}
    ).sort([("order", 1), ("name", 1)]).to_list(200)


@api.post("/vendor/stores/{store_id}/item-categories")
async def vendor_create_store_item_category(
    store_id: str,
    data: StoreItemCategoryIn,
    current=Depends(require_roles("vendor"))
):
    store = await db.stores.find_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"_id": 0, "id": 1}
    )
    if not store:
        raise HTTPException(404, "Store not found or not owned by vendor")

    name = str(data.name or "").strip()
    if not name:
        raise HTTPException(400, "Item category name is required")

    duplicate = await db.item_categories.find_one({
        "store_id": store_id,
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
    })
    if duplicate:
        raise HTTPException(409, "This item category already exists in this store")

    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        raise HTTPException(400, "Enter a valid item category name")

    base_id = f"item-{store_id}-{slug}"
    item_id = base_id
    suffix = 2
    while await db.item_categories.find_one({"id": item_id}, {"_id": 1}):
        item_id = f"{base_id}-{suffix}"
        suffix += 1

    doc = {
        "id": item_id,
        "name": name,
        "store_id": store_id,
        "vendor_id": current["id"],
        "icon": data.icon,
        "color": data.color,
        "order": data.order,
        "active": data.active,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.item_categories.insert_one(dict(doc))
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/vendor/stores/{store_id}/item-categories/{item_id}")
async def vendor_update_store_item_category(
    store_id: str,
    item_id: str,
    data: StoreItemCategoryUpdateIn,
    current=Depends(require_roles("vendor"))
):
    store = await db.stores.find_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"_id": 0, "id": 1}
    )
    if not store:
        raise HTTPException(404, "Store not found or not owned by vendor")

    name = str(data.name or "").strip()
    if not name:
        raise HTTPException(400, "Item category name is required")

    current_item = await db.item_categories.find_one(
        {"id": item_id, "store_id": store_id, "vendor_id": current["id"]},
        {"_id": 0}
    )
    if not current_item:
        raise HTTPException(404, "Item category not found")

    duplicate = await db.item_categories.find_one({
        "id": {"$ne": item_id},
        "store_id": store_id,
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
    })
    if duplicate:
        raise HTTPException(409, "This item category already exists in this store")

    await db.item_categories.update_one(
        {"id": item_id, "store_id": store_id, "vendor_id": current["id"]},
        {"$set": {
            "name": name,
            "icon": data.icon,
            "color": data.color,
            "order": data.order,
            "active": data.active,
            "updated_at": now_iso(),
        }}
    )

    # Keep stored product category names in sync with the renamed category.
    await db.products.update_many(
        {"store_id": store_id, "item_category_id": item_id},
        {"$set": {"item_category": name}}
    )

    return await db.item_categories.find_one({"id": item_id}, {"_id": 0})


@api.delete("/vendor/stores/{store_id}/item-categories/{item_id}")
async def vendor_delete_store_item_category(
    store_id: str,
    item_id: str,
    current=Depends(require_roles("vendor"))
):
    store = await db.stores.find_one(
        {"id": store_id, "vendor_id": current["id"]},
        {"_id": 0, "id": 1}
    )
    if not store:
        raise HTTPException(404, "Store not found or not owned by vendor")

    result = await db.item_categories.update_one(
        {"id": item_id, "store_id": store_id, "vendor_id": current["id"]},
        {"$set": {"active": False, "updated_at": now_iso()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Item category not found")

    await db.products.update_many(
        {"store_id": store_id, "item_category_id": item_id},
        {"$unset": {"item_category_id": "", "item_category": ""}}
    )
    return {"ok": True}


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

    store = next((s for s in stores if s.get("id") == sid), None)
    if not store:
        raise HTTPException(400, "Invalid store for vendor")

    store_category_id = store.get("category_id")
    if not store_category_id:
        raise HTTPException(400, "Shop category is not configured")

    pid = "p-" + uuid.uuid4().hex[:8]
    doc = data.dict()
    doc["store_id"] = sid
    doc["category_id"] = store_category_id
    doc.update(
        await _resolve_vendor_item_category(
            sid,
            store_category_id,
            data.item_category_id,
            data.item_category,
        )
    )
    if doc.get("mrp") is None:
        doc["mrp"] = doc["price"]
    doc.update({"id": pid, "vendor_id": current["id"]})
    await db.products.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/vendor/products/{pid}")
async def vendor_update_product(pid: str, data: ProductIn, current=Depends(require_roles("vendor"))):
    store_ids, stores = await _vendor_store_ids(current["id"])
    p = await db.products.find_one({"id": pid}, {"_id": 0})
    if not p or p.get("store_id") not in store_ids:
        raise HTTPException(404, "Not your product")

    store = next((s for s in stores if s.get("id") == p.get("store_id")), None)
    if not store:
        raise HTTPException(404, "Store not found")
    store_category_id = store.get("category_id")
    if not store_category_id:
        raise HTTPException(400, "Shop category is not configured")

    upd = data.dict()
    upd["store_id"] = p.get("store_id")
    upd["category_id"] = store_category_id
    upd.update(
        await _resolve_vendor_item_category(
            p.get("store_id"),
            store_category_id,
            data.item_category_id,
            data.item_category,
        )
    )
    if upd.get("mrp") is None:
        upd["mrp"] = upd["price"]
    await db.products.update_one({"id": pid}, {"$set": upd})
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.post("/vendor/products/{pid}/availability")
async def vendor_product_availability(
    pid: str,
    data: OnlineIn,
    current=Depends(require_roles("vendor"))
):
    store_ids, _ = await _vendor_store_ids(current["id"])
    product = await db.products.find_one(
        {"id": pid, "store_id": {"$in": store_ids}},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(404, "Not your product")

    await db.products.update_one(
        {"id": pid, "store_id": {"$in": store_ids}},
        {"$set": {"is_available": data.online}}
    )
    return {"ok": True, "is_available": data.online}


@api.post("/vendor/products/{pid}/duplicate")
async def vendor_duplicate_product(
    pid: str,
    current=Depends(require_roles("vendor"))
):
    store_ids, _ = await _vendor_store_ids(current["id"])
    source = await db.products.find_one(
        {"id": pid, "store_id": {"$in": store_ids}},
        {"_id": 0}
    )
    if not source:
        raise HTTPException(404, "Not your product")

    new_product = dict(source)
    new_product.pop("_id", None)
    new_product["id"] = "p-" + uuid.uuid4().hex[:8]
    new_product["vendor_id"] = current["id"]
    new_product["name"] = f'{str(source.get("name") or "Product").strip()} Copy'
    new_product["is_available"] = True
    new_product["created_at"] = now_iso()

    await db.products.insert_one(dict(new_product))
    return {k: v for k, v in new_product.items() if k != "_id"}


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

    if not store_ids:
        return []

    # Vendor ke products nikalo
    products = await db.products.find(
        {"store_id": {"$in": store_ids}},
        {"_id": 0, "id": 1}
    ).to_list(2000)

    product_ids = [p["id"] for p in products if p.get("id")]

    # Orders mein vendor ke products ya stores dono se match karo
    match_conditions = []

    if product_ids:
        match_conditions.append({
            "items.product_id": {"$in": product_ids}
        })

    match_conditions.append({
        "items.store_id": {"$in": store_ids}
    })

    orders = await db.orders.find(
        {"$or": match_conditions},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)

    # Fetch all customers in one indexed query instead of one query per order.
    customer_ids = list({o.get("user_id") or o.get("customer_id") for o in orders if o.get("user_id") or o.get("customer_id")})
    customers = await db.users.find(
        {"id": {"$in": customer_ids}},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1}
    ).to_list(None) if customer_ids else []
    customer_map = {u["id"]: u for u in customers}

    result = []

    for o in orders:
        # Sirf current vendor ke items rakho
        my_items = []

        for item in o.get("items", []):
            product_id = item.get("product_id")
            item_store_id = item.get("store_id")

            if product_id in product_ids or item_store_id in store_ids:
                my_items.append(item)

        # Koi matching item na ho to order skip karo
        if not my_items:
            continue

        # Customer details attach karo
        user_id = o.get("user_id") or o.get("customer_id")
        customer = customer_map.get(user_id, {})

        # Vendor ke items ka subtotal calculate karo
        my_revenue = 0

        for item in my_items:
            line_total = item.get("line_total")

            if line_total is not None:
                my_revenue += float(line_total)
            else:
                price = float(item.get("price", item.get("unit_price", 0)) or 0)
                quantity = float(item.get("quantity", item.get("qty", 1)) or 1)
                my_revenue += price * quantity

        # Frontend ke liye order data
        vendor_order = dict(o)
        vendor_order["customer"] = customer
        vendor_order["my_items"] = my_items
        vendor_order["my_revenue"] = round(my_revenue, 2)

        result.append(vendor_order)

    return result


# ------------------ DELIVERY ------------------
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
    orders = await db.orders.find(
        {"status": "accepted", "delivery_id": {"$in": [None, ""]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    customer_ids = list({o.get("user_id") for o in orders if o.get("user_id")})
    customers = await db.users.find(
        {"id": {"$in": customer_ids}},
        {"_id": 0, "id": 1, "name": 1, "phone": 1}
    ).to_list(None) if customer_ids else []
    customer_map = {u["id"]: u for u in customers}

    for o in orders:
        o["customer"] = customer_map.get(o.get("user_id"), {})
        o.pop("customer_location", None)
    return orders


@api.post("/delivery/orders/{order_id}/claim")
async def delivery_claim(order_id: str, current=Depends(require_roles("delivery"))):
    o = await db.orders.find_one(
        {"id": order_id, "status": "accepted"},
        {"_id": 0}
    )
    if not o:
        raise HTTPException(404, "Order not available for pickup")
    if o.get("delivery_id"):
        raise HTTPException(400, "Already claimed")

    timeline = o.get("timeline", [])
    timeline.append({
        "status": "out_for_delivery",
        "at": now_iso(),
        "label": "Out for Delivery"
    })

    result = await db.orders.update_one(
        {
            "id": order_id,
            "status": "accepted",
            "$or": [
                {"delivery_id": {"$exists": False}},
                {"delivery_id": None},
                {"delivery_id": ""}
            ]
        },
        {"$set": {
            "delivery_id": current["id"],
            "status": "out_for_delivery",
            "timeline": timeline,
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(409, "Order was already claimed")
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": o["user_id"], "title": "Out for delivery",
        "body": f"Your order {o['order_no']} is on the way!", "type": "delivery", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.post("/delivery/orders/{order_id}/delivered")
async def delivery_mark_delivered(order_id: str, current=Depends(require_roles("delivery"))):
    o = await db.orders.find_one(
        {
            "id": order_id,
            "delivery_id": current["id"],
            "status": "out_for_delivery"
        },
        {"_id": 0}
    )
    if not o: raise HTTPException(404, "Not assigned to you")
    timeline = o.get("timeline", [])
    timeline.append({"status": "delivered", "at": now_iso(), "label": "Delivered"})
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "delivered", "timeline": timeline}, "$unset": {"customer_location": "", "delivery_location": ""}})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": o["user_id"], "title": "Order delivered",
        "body": f"Your order {o['order_no']} has been delivered. Enjoy!", "type": "delivery", "read": False, "created_at": now_iso(),
    })
    return {"ok": True}


@api.get("/delivery/my")
async def delivery_my(current=Depends(require_roles("delivery"))):
    orders = await db.orders.find(
        {"delivery_id": current["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    customer_ids = list({o.get("user_id") for o in orders if o.get("user_id")})
    customers = await db.users.find(
        {"id": {"$in": customer_ids}},
        {"_id": 0, "id": 1, "name": 1, "phone": 1}
    ).to_list(None) if customer_ids else []
    customer_map = {u["id"]: u for u in customers}

    for o in orders:
        o["customer"] = customer_map.get(o.get("user_id"), {})
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


# Vendor order decision flow
@api.get("/vendor/pending-orders")
async def vendor_pending_orders(current=Depends(require_roles("vendor"))):
    store_ids, _ = await _vendor_store_ids(current["id"])
    if not store_ids:
        return []

    products = await db.products.find(
        {"store_id": {"$in": store_ids}},
        {"_id": 0, "id": 1}
    ).to_list(2000)

    product_ids = [p["id"] for p in products if p.get("id")]

    match_conditions = []
    if product_ids:
        match_conditions.append({"items.product_id": {"$in": product_ids}})
    match_conditions.append({"items.store_id": {"$in": store_ids}})

    orders = await db.orders.find(
        {
            "status": "pending",
            "$or": match_conditions
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    customer_ids = list({
        o.get("user_id") or o.get("customer_id")
        for o in orders
        if o.get("user_id") or o.get("customer_id")
    })
    customers = await db.users.find(
        {"id": {"$in": customer_ids}},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "email": 1}
    ).to_list(None) if customer_ids else []
    customer_map = {u["id"]: u for u in customers}

    enriched = []
    for o in orders:
        my_items = [
            item for item in o.get("items", [])
            if item.get("product_id") in product_ids
            or item.get("store_id") in store_ids
        ]
        if not my_items:
            continue

        user_id = o.get("user_id") or o.get("customer_id")
        customer = customer_map.get(user_id, {})
        vendor_total = 0.0
        for item in my_items:
            if item.get("line_total") is not None:
                vendor_total += float(item.get("line_total") or 0)
            else:
                price = float(item.get("price", item.get("unit_price", 0)) or 0)
                quantity = float(item.get("quantity", item.get("qty", 1)) or 1)
                vendor_total += price * quantity

        enriched.append({
            "id": o.get("id"),
            "order_no": o.get("order_no"),
            "total": o.get("total"),
            "status": o.get("status"),
            "created_at": o.get("created_at"),
            "customer": customer,
            "my_items": my_items,
            "my_revenue": round(vendor_total, 2),
            "subtotal": o.get("subtotal"),
            "delivery_fee": o.get("delivery_fee"),
            "tax": o.get("tax"),
            "payment_method": o.get("payment_method"),
            "address": o.get("address"),
        })

    return enriched


@api.post("/vendor/orders/{order_id}/accept")
async def vendor_accept(order_id: str, current=Depends(require_roles("vendor"))):
    store_ids, _ = await _vendor_store_ids(current["id"])
    if not store_ids:
        raise HTTPException(404, "Order not found")

    vendor_products = await db.products.find(
        {"store_id": {"$in": store_ids}},
        {"_id": 0, "id": 1}
    ).to_list(2000)
    vendor_product_ids = {p["id"] for p in vendor_products if p.get("id")}

    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Not found")

    owns_item = any(
        item.get("product_id") in vendor_product_ids
        or item.get("store_id") in store_ids
        for item in o.get("items", [])
    )
    if not owns_item:
        raise HTTPException(403, "You cannot accept this order")
    if o.get("status") != "pending":
        raise HTTPException(409, "Order is no longer pending")

    timeline = o.get("timeline", [])
    timeline.append({
        "status": "accepted",
        "at": now_iso(),
        "label": "Accepted by vendor"
    })

    result = await db.orders.update_one(
        {"id": order_id, "status": "pending"},
        {"$set": {"status": "accepted", "timeline": timeline}}
    )
    if result.matched_count == 0:
        raise HTTPException(409, "Order is no longer pending")

    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": o["user_id"],
        "title": "Order accepted",
        "body": f"Your order {o['order_no']} has been accepted by the vendor.",
        "type": "order",
        "read": False,
        "created_at": now_iso(),
    })

    return {"ok": True}


@api.post("/vendor/orders/{order_id}/reject")
async def vendor_reject(order_id: str, current=Depends(require_roles("vendor"))):
    store_ids, _ = await _vendor_store_ids(current["id"])
    if not store_ids:
        raise HTTPException(404, "Order not found")

    vendor_products = await db.products.find(
        {"store_id": {"$in": store_ids}},
        {"_id": 0, "id": 1}
    ).to_list(2000)
    vendor_product_ids = {p["id"] for p in vendor_products if p.get("id")}

    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Not found")

    owns_item = any(
        item.get("product_id") in vendor_product_ids
        or item.get("store_id") in store_ids
        for item in o.get("items", [])
    )
    if not owns_item:
        raise HTTPException(403, "You cannot reject this order")
    if o.get("status") != "pending":
        raise HTTPException(409, "Order is no longer pending")

    timeline = o.get("timeline", [])
    timeline.append({
        "status": "rejected",
        "at": now_iso(),
        "label": "Rejected by vendor"
    })

    result = await db.orders.update_one(
        {"id": order_id, "status": "pending"},
        {"$set": {"status": "rejected", "timeline": timeline}}
    )
    if result.matched_count == 0:
        raise HTTPException(409, "Order is no longer pending")

    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": o["user_id"],
        "title": "Order rejected",
        "body": f"Your order {o['order_no']} has been rejected by the vendor.",
        "type": "order",
        "read": False,
        "created_at": now_iso(),
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


async def ensure_db_indexes():
    """Create the indexes used by the four panels and common customer APIs."""
    await asyncio.gather(
        db.users.create_index("id", unique=True),
        db.users.create_index("email", unique=True, sparse=True),
        db.users.create_index([("role", 1), ("phone", 1)]),
        db.stores.create_index("id", unique=True),
        db.stores.create_index([("vendor_id", 1), ("is_approved", 1)]),
        db.stores.create_index("is_approved"),
        db.products.create_index("id", unique=True),
        db.products.create_index("store_id"),
        db.products.create_index([("store_id", 1), ("category_id", 1)]),
        db.products.create_index([("store_id", 1), ("trending", 1)]),
        db.orders.create_index("id", unique=True),
        db.orders.create_index([("user_id", 1), ("created_at", -1)]),
        db.orders.create_index([("status", 1), ("created_at", -1)]),
        db.orders.create_index([("delivery_id", 1), ("created_at", -1)]),
        db.orders.create_index("items.product_id"),
        db.addresses.create_index([("user_id", 1), ("created_at", -1)]),
        db.carts.create_index("user_id", unique=True),
        db.notifications.create_index([("user_id", 1), ("created_at", -1)]),
        db.notifications.create_index([("user_id", 1), ("read", 1)]),
        db.settings.create_index("id", unique=True),
        db.roojgar_applications.create_index([("status", 1), ("created_at", -1)]),
        db.travel_pages.create_index("id", unique=True),
        db.travel_pages.create_index("slug", unique=True),
        db.travel_packages.create_index("id", unique=True),
        db.travel_packages.create_index([("page_id", 1), ("active", 1)]),
        db.travel_carts.create_index("user_id", unique=True),
    )


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

    # Existing demo stores ko approved rakho
    # Sirf un stores ko update karega jisme is_approved field abhi nahi hai.
    await db.stores.update_many(
        {
            "id": {"$in": ["st-1", "st-2", "st-3", "st-4"]},
            "is_approved": {"$exists": False}
        },
        {
            "$set": {"is_approved": True}
        }
    )
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

    # Seed reusable YatraSphere Holiday page if it does not exist
    travel_page = await db.travel_pages.find_one({"slug": "yatasphere-holiday"})
    if not travel_page:
        travel_page = {
            "id": "travel-yatasphere",
            "name": "YatraSphere Holiday",
            "slug": "yatasphere-holiday",
            "subtitle": "Curated holiday packages",
            "cover_image": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=85",
            "description": "Plan your next holiday with curated travel packages, hotel stays and flight information.",
            "theme_color": "#2563EB",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.travel_pages.insert_one(dict(travel_page))

    if not await db.travel_packages.find_one({"page_id": travel_page["id"]}):
        await db.travel_packages.insert_many([
            {
                "id": "pkg-shimla-45",
                "page_id": travel_page["id"],
                "title": "Shimla 4 Nights / 5 Days",
                "location": "Shimla, Himachal Pradesh",
                "duration": "5 Days / 4 Nights",
                "price": 18999,
                "mrp": 22999,
                "cover_image": "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=900&q=85",
                "flight_image": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=85",
                "gallery": [],
                "hotel": "3★ Hotel with breakfast",
                "inclusions": ["Hotel stay", "Breakfast", "Airport/Bus transfer", "Sightseeing"],
                "description": "Scenic Shimla holiday package with stay, transfers and sightseeing.",
                "active": True,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
            {
                "id": "pkg-manali-45",
                "page_id": travel_page["id"],
                "title": "Manali 4 Nights / 5 Days",
                "location": "Manali, Himachal Pradesh",
                "duration": "5 Days / 4 Nights",
                "price": 20999,
                "mrp": 25999,
                "cover_image": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=900&q=85",
                "flight_image": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=85",
                "gallery": [],
                "hotel": "3★ Hotel with breakfast",
                "inclusions": ["Hotel stay", "Breakfast", "Local transfers", "Sightseeing"],
                "description": "Mountain getaway with hotel stay, transfers and sightseeing.",
                "active": True,
                "created_at": now_iso(),
                "updated_at": now_iso(),
            },
        ])

    await db.banners.update_many(
        {"title": {"$regex": "yatasphere|yatra.?sphere", "$options": "i"}},
        {"$set": {"target_type": "category"}, "$unset": {"target_slug": ""}}
    )

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
                        "product_id": p["id"], "name": p["name"], "image": sanitize_order_image(p.get("image")),
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
    await ensure_db_indexes()
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
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY not configured"
            )

        response = await asyncio.to_thread(
            gemini_client.models.generate_content,
            model=GEMINI_MODEL,
            contents=req.message,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are KMT Bazaar AI Assistant. "
                    "Help customers with products, orders, sellers, "
                    "delivery and general shopping questions. "
                    "Be concise, friendly and useful."
                )
            ),
        )

        return {
            "message": response.text or "Sorry, I could not generate a response."
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.exception("AI chat failed")
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}",
        )
@api.get("/test-db")
async def test_db(_=Depends(require_roles("admin"))):
    return {"users": await db.users.count_documents({}), "orders": await db.orders.count_documents({})}



app.include_router(api)
# CORS is configured once above with the production and local development origins.

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
    
    
