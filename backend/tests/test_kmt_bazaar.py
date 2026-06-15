"""KMT Bazaar backend API tests (Phase 1 — customer flow)."""
import os
import re
import json
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://bazaar-mobile-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CUSTOMER = {"email": "customer@kmtbazaar.com", "password": "Customer@123"}
ADMIN = {"email": "admin@kmtbazaar.com", "password": "Admin@123"}
VENDOR = {"email": "vendor@kmtbazaar.com", "password": "Vendor@123"}
DELIVERY = {"email": "delivery@kmtbazaar.com", "password": "Delivery@123"}


def _no_mongo_id(obj):
    """Recursively check there is no _id field."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leaked in response: {list(obj.keys())}"
        for v in obj.values():
            _no_mongo_id(v)
    elif isinstance(obj, list):
        for v in obj:
            _no_mongo_id(v)


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def customer_token(session):
    r = session.post(f"{API}/auth/login", json=CUSTOMER, timeout=20)
    assert r.status_code == 200, f"customer login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(customer_token):
    return {"Authorization": f"Bearer {customer_token}"}


# ---------- AUTH ----------
class TestAuth:
    def test_login_all_demo_accounts(self, session):
        for acc in [CUSTOMER, ADMIN, VENDOR, DELIVERY]:
            r = session.post(f"{API}/auth/login", json=acc, timeout=15)
            assert r.status_code == 200, f"{acc['email']} login failed: {r.text}"
            body = r.json()
            assert body["user"]["email"] == acc["email"]
            _no_mongo_id(body)

    def test_login_invalid_password(self, session):
        r = session.post(f"{API}/auth/login",
                         json={"email": CUSTOMER["email"], "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_register_duplicate_email(self, session):
        r = session.post(f"{API}/auth/register", json={
            "name": "Dup", "email": CUSTOMER["email"], "password": "x", "role": "customer"
        }, timeout=15)
        assert r.status_code == 400

    def test_otp_request_and_verify_mock(self, session):
        phone = "9876500001"
        r = session.post(f"{API}/auth/otp/request", json={"phone": phone}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("sent") is True

        r = session.post(f"{API}/auth/otp/verify", json={"phone": phone, "otp": "123456"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and body["user"]["phone"] == phone
        _no_mongo_id(body)

    def test_otp_invalid_code_rejected(self, session):
        r = session.post(f"{API}/auth/otp/verify",
                         json={"phone": "9876500002", "otp": "abc"}, timeout=15)
        assert r.status_code == 400

    def test_me_unauthenticated_401(self, session):
        r = session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_authenticated(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == CUSTOMER["email"]
        assert u["role"] == "customer"
        _no_mongo_id(u)


# ---------- CATALOG ----------
class TestCatalog:
    def test_categories_seeded(self, session):
        r = session.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) == 5, f"expected 5 cats, got {len(cats)}"
        _no_mongo_id(cats)

    def test_banners_seeded(self, session):
        r = session.get(f"{API}/banners", timeout=15)
        assert r.status_code == 200
        banners = r.json()
        assert len(banners) == 3
        _no_mongo_id(banners)

    def test_stores_seeded(self, session):
        r = session.get(f"{API}/stores", timeout=15)
        assert r.status_code == 200
        stores = r.json()
        assert len(stores) == 4
        _no_mongo_id(stores)

    def test_products_seeded_15(self, session):
        r = session.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        products = r.json()
        assert len(products) == 15
        _no_mongo_id(products)

    def test_products_trending_filter(self, session):
        r = session.get(f"{API}/products?trending=true", timeout=15)
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) > 0
        assert all(p.get("trending") is True for p in prods)

    def test_products_category_filter(self, session):
        r = session.get(f"{API}/products?category=cat-grocery", timeout=15)
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) > 0
        assert all(p["category_id"] == "cat-grocery" for p in prods)

    def test_products_search_q(self, session):
        r = session.get(f"{API}/products?q=pizza", timeout=15)
        assert r.status_code == 200
        prods = r.json()
        assert any("pizza" in p["name"].lower() for p in prods)

    def test_product_detail(self, session):
        r = session.get(f"{API}/products/p-1", timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["id"] == "p-1"
        _no_mongo_id(p)

    def test_product_detail_404(self, session):
        r = session.get(f"{API}/products/does-not-exist", timeout=15)
        assert r.status_code == 404


# ---------- CART + CHECKOUT (FULL FLOW) ----------
class TestCartCheckout:
    def test_cart_unauth_401(self, session):
        for path in ["/cart", "/orders", "/addresses", "/notifications", "/notifications/unread-count"]:
            r = session.get(f"{API}{path}", timeout=15)
            assert r.status_code == 401, f"{path} returned {r.status_code} (expected 401)"

    def test_full_checkout_flow(self, session, auth_headers):
        # 1. Clear cart first (cleanup from any previous run)
        r = session.delete(f"{API}/cart/clear", headers=auth_headers, timeout=15)
        assert r.status_code == 200

        # 2. Add product (p-10 wireless headphones, ₹1999 — above 199 so no delivery)
        r = session.post(f"{API}/cart/add", headers=auth_headers,
                         json={"product_id": "p-1", "quantity": 2}, timeout=15)
        assert r.status_code == 200, r.text
        cart = r.json()
        assert cart["item_count"] == 2
        assert cart["subtotal"] == 78.0  # 39 * 2
        # subtotal 78 < 199 → delivery fee 25
        assert cart["delivery_fee"] == 25
        # tax 5%
        assert cart["tax"] == round(78 * 0.05, 2)
        assert cart["total"] == round(78 + 25 + cart["tax"], 2)
        _no_mongo_id(cart)

        # 3. Update qty -> 3
        r = session.post(f"{API}/cart/update", headers=auth_headers,
                         json={"product_id": "p-1", "quantity": 3}, timeout=15)
        assert r.status_code == 200
        assert r.json()["item_count"] == 3

        # 4. Add big product so subtotal >= 199 → delivery free
        r = session.post(f"{API}/cart/add", headers=auth_headers,
                         json={"product_id": "p-10", "quantity": 1}, timeout=15)
        assert r.status_code == 200
        cart = r.json()
        assert cart["delivery_fee"] == 0
        assert cart["subtotal"] >= 199

        # 5. Get cart
        r = session.get(f"{API}/cart", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        cart = r.json()
        assert len(cart["items"]) == 2

        # 6. Create address
        r = session.post(f"{API}/addresses", headers=auth_headers, json={
            "label": "Home", "full_name": "Demo Customer", "phone": "9000000001",
            "line1": "TEST 123 Main St", "city": "Noida", "state": "UP",
            "pincode": "201301", "is_default": True
        }, timeout=15)
        assert r.status_code == 200, r.text
        addr = r.json()
        assert "id" in addr
        _no_mongo_id(addr)
        addr_id = addr["id"]

        # 7. GET addresses verify persistence
        r = session.get(f"{API}/addresses", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        addrs = r.json()
        assert any(a["id"] == addr_id for a in addrs)

        # 8. Checkout (COD)
        r = session.post(f"{API}/orders/checkout", headers=auth_headers, json={
            "address_id": addr_id, "payment_method": "cod", "notes": "TEST order"
        }, timeout=20)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["status"] == "pending"
        assert order["payment_method"] == "cod"
        assert order["payment_status"] == "pending"
        assert order["order_no"].startswith("KMT")
        assert len(order["items"]) == 2
        assert order["timeline"][0]["label"] == "Order placed"
        _no_mongo_id(order)
        order_id = order["id"]

        # 9. Cart cleared after checkout
        r = session.get(f"{API}/cart", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["item_count"] == 0

        # 10. Order visible in list
        r = session.get(f"{API}/orders", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        orders = r.json()
        assert any(o["id"] == order_id for o in orders)
        _no_mongo_id(orders)

        # 11. Order detail
        r = session.get(f"{API}/orders/{order_id}", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        _no_mongo_id(r.json())

        # 12. Notification created
        r = session.get(f"{API}/notifications", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        notifs = r.json()
        assert any("Order placed" in n["title"] for n in notifs)
        _no_mongo_id(notifs)
        nid = next(n["id"] for n in notifs if "Order placed" in n["title"])

        # 13. Unread count > 0
        r = session.get(f"{API}/notifications/unread-count", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["count"] >= 1

        # 14. Mark read
        r = session.post(f"{API}/notifications/{nid}/read", headers=auth_headers, timeout=15)
        assert r.status_code == 200

        # 15. Cleanup address
        r = session.delete(f"{API}/addresses/{addr_id}", headers=auth_headers, timeout=15)
        assert r.status_code == 200

    def test_checkout_with_empty_cart_fails(self, session, auth_headers):
        session.delete(f"{API}/cart/clear", headers=auth_headers, timeout=15)
        # create dummy addr
        r = session.post(f"{API}/addresses", headers=auth_headers, json={
            "label": "Home", "full_name": "T", "phone": "9000000001",
            "line1": "TEST", "city": "x", "state": "x", "pincode": "1"
        }, timeout=15)
        addr_id = r.json()["id"]
        r = session.post(f"{API}/orders/checkout", headers=auth_headers,
                         json={"address_id": addr_id, "payment_method": "cod"}, timeout=15)
        assert r.status_code == 400
        session.delete(f"{API}/addresses/{addr_id}", headers=auth_headers, timeout=15)

    def test_online_payment_marks_paid(self, session, auth_headers):
        session.delete(f"{API}/cart/clear", headers=auth_headers, timeout=15)
        session.post(f"{API}/cart/add", headers=auth_headers,
                     json={"product_id": "p-5", "quantity": 1}, timeout=15)
        r = session.post(f"{API}/addresses", headers=auth_headers, json={
            "label": "Home", "full_name": "T", "phone": "9000000001",
            "line1": "TEST online", "city": "x", "state": "x", "pincode": "1"
        }, timeout=15)
        addr_id = r.json()["id"]
        r = session.post(f"{API}/orders/checkout", headers=auth_headers,
                         json={"address_id": addr_id, "payment_method": "online"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["payment_status"] == "paid"
        session.delete(f"{API}/addresses/{addr_id}", headers=auth_headers, timeout=15)
