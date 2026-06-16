"""
KMT Bazaar — Phase 1 backend refactor regression tests.

Covers:
  - Vendor approval workflow (pending/approved/rejected/suspended/reactivate)
  - Product approval workflow (pending → approved/rejected, edit→pending, admin-created auto-approved)
  - Multi-vendor order_items (vendor isolation, customer snapshot, vendor_ids[], totals)
  - Notifications fan-out
  - Role guards
  - Backward compat (customer GET /orders, legacy backfill of order_items)
"""

import os
import uuid
import pytest
import requests
from pathlib import Path

# Resolve base URL from env (fail fast if missing) — same env-var the frontend uses.
_FE_ENV = Path(__file__).resolve().parents[2] / "frontend" / ".env"
_env: dict = {}
if _FE_ENV.exists():
    for line in _FE_ENV.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            _env[k.strip()] = v.strip().strip('"')

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or _env.get("EXPO_PUBLIC_BACKEND_URL")
    or _env.get("EXPO_BACKEND_URL")
)
assert BASE_URL, "Backend URL not configured (EXPO_PUBLIC_BACKEND_URL in frontend/.env)"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@kmtbazaar.com", "Admin@123")
VENDOR1 = ("vendor@kmtbazaar.com", "Vendor@123")          # Demo Vendor (Fresh Mart st-1 + Tasty Bites st-4)
VENDOR2 = ("vendor2@kmtbazaar.com", "Vendor@123")         # TechWorld + MediQuick (st-2, st-3)
CUSTOMER = ("customer@kmtbazaar.com", "Customer@123")
DELIVERY = ("delivery@kmtbazaar.com", "Delivery@123")


# ------------------ helpers ------------------
def _login(email: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def tokens() -> dict:
    return {
        "admin":    _login(*ADMIN),
        "vendor1":  _login(*VENDOR1),
        "vendor2":  _login(*VENDOR2),
        "customer": _login(*CUSTOMER),
        "delivery": _login(*DELIVERY),
    }


@pytest.fixture(scope="module")
def vendor_ids(tokens) -> dict:
    """Resolve user ids for the seeded vendors via admin /admin/vendors."""
    r = requests.get(f"{API}/admin/vendors", headers=_h(tokens["admin"]), timeout=30)
    assert r.status_code == 200, r.text
    by_email = {v["email"]: v["id"] for v in r.json() if v.get("email")}
    return {
        "vendor1": by_email.get(VENDOR1[0]),
        "vendor2": by_email.get(VENDOR2[0]),
    }


# =====================================================================
# [VENDOR APPROVAL]
# =====================================================================
class TestVendorApproval:
    def test_01_register_vendor_pending(self):
        email = f"TEST_pending_vendor_{uuid.uuid4().hex[:8]}@kmttest.co"
        r = requests.post(f"{API}/auth/register", json={
            "name": "TEST Pending Vendor", "email": email,
            "password": "Test@1234", "role": "vendor"
        }, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["role"] == "vendor"
        assert body["user"].get("vendor_status") == "pending", body["user"]
        # stash for next tests
        pytest.pending_vendor_email = email
        pytest.pending_vendor_token = body["token"]
        pytest.pending_vendor_id = body["user"]["id"]

    def test_02_pending_vendor_cannot_create_product(self):
        token = pytest.pending_vendor_token
        r = requests.post(
            f"{API}/vendor/products",
            headers=_h(token),
            json={"name": "x", "category_id": "cat-grocery", "price": 10},
            timeout=30,
        )
        assert r.status_code == 403, r.text
        assert "pending" in r.text.lower() or "approval" in r.text.lower()

    def test_03_admin_lists_vendors_with_status(self, tokens):
        r = requests.get(f"{API}/admin/vendors", headers=_h(tokens["admin"]), timeout=30)
        assert r.status_code == 200, r.text
        vendors = r.json()
        assert isinstance(vendors, list) and len(vendors) >= 3
        for v in vendors:
            assert "vendor_status" in v, v
        # filter ?status=pending
        r2 = requests.get(f"{API}/admin/vendors?status=pending",
                          headers=_h(tokens["admin"]), timeout=30)
        assert r2.status_code == 200
        for v in r2.json():
            assert v["vendor_status"] == "pending"
        # our newly registered pending vendor should be in there
        emails = [v.get("email") for v in r2.json()]
        assert pytest.pending_vendor_email in emails

    def test_04_admin_approve_vendor_and_notif(self, tokens):
        r = requests.post(
            f"{API}/admin/vendors/{pytest.pending_vendor_id}/approve",
            headers=_h(tokens["admin"]), timeout=30,
        )
        assert r.status_code == 200, r.text
        # vendor /me reflects approved
        me = requests.get(f"{API}/vendor/me",
                          headers=_h(pytest.pending_vendor_token), timeout=30)
        assert me.status_code == 200
        assert me.json()["vendor_status"] == "approved"
        # notification was sent
        ns = requests.get(f"{API}/notifications",
                          headers=_h(pytest.pending_vendor_token), timeout=30)
        assert ns.status_code == 200
        titles = [n.get("title", "") for n in ns.json()]
        assert any("approved" in t.lower() for t in titles), titles

    def test_05_admin_reject_vendor(self, tokens):
        # create a fresh vendor to reject
        email = f"TEST_reject_{uuid.uuid4().hex[:8]}@kmttest.co"
        r = requests.post(f"{API}/auth/register", json={
            "name": "TEST Reject", "email": email,
            "password": "Test@1234", "role": "vendor"
        }, timeout=30)
        vid = r.json()["user"]["id"]
        vtok = r.json()["token"]
        rr = requests.post(f"{API}/admin/vendors/{vid}/reject",
                           headers=_h(tokens["admin"]),
                           json={"reason": "docs missing"}, timeout=30)
        assert rr.status_code == 200, rr.text
        me = requests.get(f"{API}/vendor/me", headers=_h(vtok), timeout=30).json()
        assert me["vendor_status"] == "rejected"
        assert (me.get("rejection_reason") or "").lower().startswith("docs")

    def test_06_admin_suspend_then_reactivate(self, tokens, vendor_ids):
        vid = vendor_ids["vendor1"]
        assert vid, "vendor1 id resolved"
        r1 = requests.post(f"{API}/admin/vendors/{vid}/suspend",
                           headers=_h(tokens["admin"]),
                           json={"reason": "test suspend"}, timeout=30)
        assert r1.status_code == 200, r1.text
        r2 = requests.get(f"{API}/admin/vendors?status=suspended",
                          headers=_h(tokens["admin"]), timeout=30).json()
        assert any(v["id"] == vid and v["vendor_status"] == "suspended" for v in r2)
        r3 = requests.post(f"{API}/admin/vendors/{vid}/reactivate",
                           headers=_h(tokens["admin"]), timeout=30)
        assert r3.status_code == 200, r3.text
        r4 = requests.get(f"{API}/admin/vendors",
                          headers=_h(tokens["admin"]), timeout=30).json()
        st = {v["id"]: v["vendor_status"] for v in r4}
        assert st.get(vid) == "approved"

    def test_07_vendor_me_for_approved_vendor(self, tokens):
        r = requests.get(f"{API}/vendor/me",
                         headers=_h(tokens["vendor1"]), timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["vendor_status"] == "approved"
        assert "id" in b and "email" in b


# =====================================================================
# [PRODUCT APPROVAL]
# =====================================================================
class TestProductApproval:
    def test_08_vendor_creates_product_pending(self, tokens):
        r = requests.post(
            f"{API}/vendor/products", headers=_h(tokens["vendor1"]),
            json={
                "name": "TEST Vendor1 Product",
                "category_id": "cat-grocery", "store_id": "st-1",
                "price": 99.0, "mrp": 150.0, "unit": "1 pc", "stock": 5,
                "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
                "description": "test product"
            }, timeout=30,
        )
        assert r.status_code == 200, r.text
        pytest.test_product_id = r.json()["id"]
        assert r.json()["status"] == "pending"

    def test_09_customer_products_excludes_pending(self):
        r = requests.get(f"{API}/products?limit=500", timeout=30)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert pytest.test_product_id not in ids

    def test_10_admin_products_includes_all_with_filter(self, tokens):
        # all
        ra = requests.get(f"{API}/admin/products",
                          headers=_h(tokens["admin"]), timeout=30)
        assert ra.status_code == 200
        ids = [p["id"] for p in ra.json()]
        assert pytest.test_product_id in ids
        # ?status=pending
        rp = requests.get(f"{API}/admin/products?status=pending",
                          headers=_h(tokens["admin"]), timeout=30)
        assert rp.status_code == 200
        for p in rp.json():
            assert p.get("status") == "pending"
        assert pytest.test_product_id in [p["id"] for p in rp.json()]

    def test_11_admin_approves_product_and_visible_to_customers(self, tokens):
        r = requests.post(
            f"{API}/admin/products/{pytest.test_product_id}/approve",
            headers=_h(tokens["admin"]), timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json()["product"]["status"] == "approved"
        # customer listing now contains it
        lst = requests.get(f"{API}/products?limit=500", timeout=30).json()
        assert pytest.test_product_id in [p["id"] for p in lst]
        # vendor got notif
        ns = requests.get(f"{API}/notifications",
                          headers=_h(tokens["vendor1"]), timeout=30).json()
        assert any("approved" in (n.get("title", "")).lower() for n in ns)

    def test_12_admin_rejects_a_product(self, tokens):
        # create another pending product first
        r = requests.post(
            f"{API}/vendor/products", headers=_h(tokens["vendor1"]),
            json={"name": "TEST Reject Prod", "category_id": "cat-grocery",
                  "store_id": "st-1", "price": 10}, timeout=30,
        )
        pid = r.json()["id"]
        rr = requests.post(f"{API}/admin/products/{pid}/reject",
                           headers=_h(tokens["admin"]),
                           json={"reason": "bad image"}, timeout=30)
        assert rr.status_code == 200, rr.text
        p = rr.json()["product"]
        assert p["status"] == "rejected"
        assert "bad image" in (p.get("rejection_reason") or "").lower()
        # vendor sees rejection notif
        ns = requests.get(f"{API}/notifications",
                          headers=_h(tokens["vendor1"]), timeout=30).json()
        assert any("rejected" in (n.get("title", "")).lower() for n in ns)
        pytest.rejected_product_id = pid

    def test_13_vendor_edit_drops_status_to_pending(self, tokens):
        # the previously approved product should fall back to pending after edit
        r = requests.put(
            f"{API}/vendor/products/{pytest.test_product_id}",
            headers=_h(tokens["vendor1"]),
            json={
                "name": "TEST Vendor1 Product Edited",
                "category_id": "cat-grocery", "store_id": "st-1",
                "price": 109, "unit": "1 pc", "stock": 4,
                "image": "https://example.com/x.jpg", "description": "edited"
            }, timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "pending"

    def test_14_admin_create_product_auto_approved(self, tokens):
        r = requests.post(
            f"{API}/admin/products", headers=_h(tokens["admin"]),
            json={"name": "TEST Admin Direct", "category_id": "cat-grocery",
                  "store_id": "st-1", "price": 49, "unit": "1 pc"}, timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "approved"
        # cleanup
        requests.delete(f"{API}/admin/products/{body['id']}",
                        headers=_h(tokens["admin"]), timeout=30)


# =====================================================================
# [ORDER + ORDER_ITEMS + CUSTOMER SNAPSHOT]
# =====================================================================
class TestMultiVendorOrder:
    def _ensure_address(self, tok) -> str:
        existing = requests.get(f"{API}/addresses", headers=_h(tok), timeout=30).json()
        if existing:
            return existing[0]["id"]
        r = requests.post(f"{API}/addresses", headers=_h(tok), json={
            "label": "Home", "full_name": "Demo Customer", "phone": "9000000001",
            "line1": "Flat 302", "line2": "Sec 62", "city": "Noida",
            "state": "UP", "pincode": "201301", "is_default": True
        }, timeout=30)
        return r.json()["id"]

    def test_15_customer_multi_vendor_checkout(self, tokens):
        tok = tokens["customer"]
        # clear cart
        requests.delete(f"{API}/cart/clear", headers=_h(tok), timeout=30)
        # p-1 (vendor1, st-1) + p-10 (vendor2, st-3)
        for pid in ("p-1", "p-10"):
            ra = requests.post(f"{API}/cart/add", headers=_h(tok),
                               json={"product_id": pid, "quantity": 1}, timeout=30)
            assert ra.status_code == 200, ra.text
        addr_id = self._ensure_address(tok)
        co = requests.post(f"{API}/orders/checkout", headers=_h(tok),
                           json={"address_id": addr_id, "payment_method": "cod"},
                           timeout=30)
        assert co.status_code == 200, co.text
        order = co.json()
        # customer snapshot
        cust = order.get("customer") or {}
        for k in ("id", "name", "phone", "email"):
            assert k in cust, f"customer.{k} missing: {cust}"
        # address snapshot
        assert order.get("address"), order
        assert order["address"].get("pincode")
        # financial fields
        for k in ("subtotal", "delivery_fee", "tax", "total", "discount", "final_amount"):
            assert k in order, f"missing {k}"
        # vendor_ids contains both vendors
        assert len(order.get("vendor_ids", [])) == 2, order.get("vendor_ids")
        pytest.test_order_id = order["id"]
        pytest.test_order_no = order["order_no"]

    def test_16_admin_order_detail_has_order_items(self, tokens):
        r = requests.get(f"{API}/admin/orders/{pytest.test_order_id}",
                         headers=_h(tokens["admin"]), timeout=30)
        assert r.status_code == 200, r.text
        o = r.json()
        items = o.get("order_items") or []
        assert len(items) == 2, items
        for it in items:
            for k in ("product_name", "product_image", "quantity", "unit_price",
                      "total_price", "vendor_id", "vendor_name", "status",
                      "status_history"):
                assert k in it, f"order_item.{k} missing in {it}"

    def test_17_vendor_isolation_in_vendor_orders(self, tokens, vendor_ids):
        # vendor1 sees only p-1
        v1 = requests.get(f"{API}/vendor/orders",
                          headers=_h(tokens["vendor1"]), timeout=30)
        assert v1.status_code == 200, v1.text
        v1_orders = [o for o in v1.json() if o.get("order_id") == pytest.test_order_id]
        assert len(v1_orders) == 1, v1.json()
        o1 = v1_orders[0]
        item_pids_1 = [i["product_id"] for i in o1["items"]]
        assert item_pids_1 == ["p-1"], item_pids_1
        assert o1["my_revenue"] > 0
        # vendor2 sees only p-10
        v2 = requests.get(f"{API}/vendor/orders",
                          headers=_h(tokens["vendor2"]), timeout=30)
        assert v2.status_code == 200, v2.text
        v2_orders = [o for o in v2.json() if o.get("order_id") == pytest.test_order_id]
        assert len(v2_orders) == 1
        o2 = v2_orders[0]
        item_pids_2 = [i["product_id"] for i in o2["items"]]
        assert item_pids_2 == ["p-10"], item_pids_2
        # cross-isolation
        assert "p-10" not in item_pids_1
        assert "p-1" not in item_pids_2

    def test_18_vendor_accept_promotes_order(self, tokens):
        r = requests.post(
            f"{API}/vendor/orders/{pytest.test_order_id}/accept",
            headers=_h(tokens["vendor1"]), timeout=30,
        )
        assert r.status_code == 200, r.text
        # order.status should be accepted now (vendor1 accepted)
        det = requests.get(f"{API}/admin/orders/{pytest.test_order_id}",
                           headers=_h(tokens["admin"]), timeout=30).json()
        assert det["status"] == "accepted", det["status"]
        v1_items = [it for it in det["order_items"]
                    if it["vendor_id"] == det["vendor_ids"][0]
                    or it["product_id"] == "p-1"]
        for it in v1_items:
            if it["product_id"] == "p-1":
                assert it["status"] == "accepted"
        # customer received "Order accepted" notif
        cn = requests.get(f"{API}/notifications",
                          headers=_h(tokens["customer"]), timeout=30).json()
        assert any("accepted" in (n.get("title", "")).lower() for n in cn)

    def test_19_per_item_status_pack_promotes_ready_for_pickup(self, tokens):
        # Get current items
        det = requests.get(f"{API}/admin/orders/{pytest.test_order_id}",
                           headers=_h(tokens["admin"]), timeout=30).json()
        items = det["order_items"]
        v1_items = [i for i in items if i["product_id"] == "p-1"]
        v2_items = [i for i in items if i["product_id"] == "p-10"]
        assert v1_items and v2_items
        # vendor1 packs p-1
        r1 = requests.post(
            f"{API}/vendor/order-items/{v1_items[0]['id']}/status",
            headers=_h(tokens["vendor1"]),
            json={"status": "packed"}, timeout=30,
        )
        assert r1.status_code == 200, r1.text
        # vendor2 accepts & packs p-10
        ra = requests.post(
            f"{API}/vendor/order-items/{v2_items[0]['id']}/status",
            headers=_h(tokens["vendor2"]),
            json={"status": "accepted"}, timeout=30,
        )
        assert ra.status_code == 200, ra.text
        rp = requests.post(
            f"{API}/vendor/order-items/{v2_items[0]['id']}/status",
            headers=_h(tokens["vendor2"]),
            json={"status": "packed"}, timeout=30,
        )
        assert rp.status_code == 200, rp.text
        # order status promoted to ready_for_pickup
        det2 = requests.get(f"{API}/admin/orders/{pytest.test_order_id}",
                            headers=_h(tokens["admin"]), timeout=30).json()
        assert det2["status"] == "ready_for_pickup", det2["status"]

    def test_20_customer_and_admin_notifications_after_order(self, tokens, vendor_ids):
        # customer notif
        cn = requests.get(f"{API}/notifications",
                          headers=_h(tokens["customer"]), timeout=30).json()
        assert any(n.get("order_id") == pytest.test_order_id
                   and "placed" in n.get("title", "").lower() for n in cn), \
            "customer 'order placed' notif missing"
        # vendor1 notif
        vn1 = requests.get(f"{API}/notifications",
                           headers=_h(tokens["vendor1"]), timeout=30).json()
        assert any(n.get("order_id") == pytest.test_order_id for n in vn1)
        # vendor2 notif
        vn2 = requests.get(f"{API}/notifications",
                           headers=_h(tokens["vendor2"]), timeout=30).json()
        assert any(n.get("order_id") == pytest.test_order_id for n in vn2)
        # admin notif
        an = requests.get(f"{API}/notifications",
                          headers=_h(tokens["admin"]), timeout=30).json()
        assert any(n.get("order_id") == pytest.test_order_id for n in an)


# =====================================================================
# [ROLE GUARDS]
# =====================================================================
class TestRoleGuards:
    def test_21_customer_cannot_list_admin_vendors(self, tokens):
        r = requests.get(f"{API}/admin/vendors",
                         headers=_h(tokens["customer"]), timeout=30)
        assert r.status_code == 403, r.text

    def test_22_pending_vendor_blocked_from_vendor_stats(self):
        # Create a new pending vendor
        email = f"TEST_block_{uuid.uuid4().hex[:8]}@kmttest.co"
        r = requests.post(f"{API}/auth/register", json={
            "name": "TEST Block", "email": email,
            "password": "Test@1234", "role": "vendor"
        }, timeout=30)
        tok = r.json()["token"]
        rr = requests.get(f"{API}/vendor/stats", headers=_h(tok), timeout=30)
        assert rr.status_code == 403, rr.text
        body = rr.text.lower()
        assert "pending" in body or "approval" in body

    def test_23_approved_vendor_can_get_stats(self, tokens):
        r = requests.get(f"{API}/vendor/stats",
                         headers=_h(tokens["vendor1"]), timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("stores", "products", "orders", "revenue", "payout"):
            assert k in body


# =====================================================================
# [BACKWARD COMPATIBILITY + LEGACY BACKFILL]
# =====================================================================
class TestBackCompat:
    def test_24_customer_orders_list(self, tokens):
        r = requests.get(f"{API}/orders", headers=_h(tokens["customer"]), timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_25_customer_order_detail(self, tokens):
        r = requests.get(f"{API}/orders/{pytest.test_order_id}",
                         headers=_h(tokens["customer"]), timeout=30)
        assert r.status_code == 200, r.text
        o = r.json()
        assert o.get("customer") and o.get("address")
        assert o["id"] == pytest.test_order_id

    def test_26_legacy_orders_backfilled_with_order_items(self, tokens):
        r = requests.get(f"{API}/admin/orders",
                         headers=_h(tokens["admin"]), timeout=30)
        assert r.status_code == 200
        orders = r.json()
        assert len(orders) >= 1
        # All orders should have non-empty order_items list (backfill ran)
        missing = [o["id"] for o in orders
                   if not isinstance(o.get("order_items"), list)
                   or len(o["order_items"]) == 0]
        # exclude orders that legitimately have empty items
        empties = []
        for oid in missing:
            o = next(x for x in orders if x["id"] == oid)
            if not o.get("items"):
                empties.append(oid)
        truly_missing = [m for m in missing if m not in empties]
        assert not truly_missing, f"legacy orders missing order_items backfill: {truly_missing}"


# =====================================================================
# [CLEANUP]
# =====================================================================
def teardown_module(_):
    """Best-effort: remove test products created during this run."""
    try:
        admin_tok = _login(*ADMIN)
        for attr in ("test_product_id", "rejected_product_id"):
            pid = getattr(pytest, attr, None)
            if pid:
                requests.delete(f"{API}/admin/products/{pid}",
                                headers=_h(admin_tok), timeout=10)
    except Exception:
        pass
