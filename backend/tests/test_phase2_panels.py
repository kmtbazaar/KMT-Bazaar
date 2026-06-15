"""KMT Bazaar Phase 2 — Admin / Vendor / Delivery panel tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://bazaar-mobile-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@kmtbazaar.com", "password": "Admin@123"}
VENDOR = {"email": "vendor@kmtbazaar.com", "password": "Vendor@123"}
VENDOR2 = {"email": "vendor2@kmtbazaar.com", "password": "Vendor@123"}
DELIVERY = {"email": "delivery@kmtbazaar.com", "password": "Delivery@123"}
CUSTOMER = {"email": "customer@kmtbazaar.com", "password": "Customer@123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.text}"
    return r.json()["token"], r.json()["user"]


def _no_id(obj):
    if isinstance(obj, dict):
        assert "_id" not in obj
        for v in obj.values():
            _no_id(v)
    elif isinstance(obj, list):
        for v in obj:
            _no_id(v)


@pytest.fixture(scope="session")
def tokens():
    out = {}
    for k, c in [("admin", ADMIN), ("vendor", VENDOR), ("vendor2", VENDOR2),
                 ("delivery", DELIVERY), ("customer", CUSTOMER)]:
        out[k], _ = _login(c)
    return out


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ---------------- ADMIN ----------------
class TestAdminStats:
    def test_admin_stats_full_shape(self, tokens):
        r = requests.get(f"{API}/admin/stats", headers=H(tokens["admin"]), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["users", "vendors", "delivery", "products", "orders",
                  "pending_orders", "delivered_orders", "revenue",
                  "platform_earnings", "commission_percent", "chart"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["chart"], list) and len(d["chart"]) == 7
        assert all("day" in c and "orders" in c for c in d["chart"])
        # revenue / earnings consistency
        expected_pe = round(d["revenue"] * d["commission_percent"] / 100, 2)
        assert abs(d["platform_earnings"] - expected_pe) < 0.01
        _no_id(d)

    def test_admin_stats_role_guard(self, tokens):
        for who in ["vendor", "delivery", "customer"]:
            r = requests.get(f"{API}/admin/stats", headers=H(tokens[who]), timeout=10)
            assert r.status_code == 403, f"{who} got {r.status_code}"

    def test_admin_unauth_401(self):
        r = requests.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 401


class TestAdminUsers:
    def test_list_users_by_role(self, tokens):
        for role in ["customer", "vendor", "delivery"]:
            r = requests.get(f"{API}/admin/users?role={role}", headers=H(tokens["admin"]), timeout=15)
            assert r.status_code == 200
            arr = r.json()
            assert isinstance(arr, list)
            assert all(u.get("role") == role for u in arr)
            assert all("password" not in u for u in arr)
            _no_id(arr)

    def test_toggle_user(self, tokens):
        # find a customer (not the demo one) — fall back to demo customer if list small
        r = requests.get(f"{API}/admin/users?role=customer", headers=H(tokens["admin"]), timeout=15)
        users = r.json()
        assert len(users) > 0
        u = users[0]
        r1 = requests.post(f"{API}/admin/users/{u['id']}/toggle", headers=H(tokens["admin"]), timeout=10)
        assert r1.status_code == 200
        state1 = r1.json()["active"]
        r2 = requests.post(f"{API}/admin/users/{u['id']}/toggle", headers=H(tokens["admin"]), timeout=10)
        assert r2.status_code == 200
        state2 = r2.json()["active"]
        assert state1 != state2  # toggled back


class TestAdminOrders:
    def test_list_orders_filters(self, tokens):
        r = requests.get(f"{API}/admin/orders", headers=H(tokens["admin"]), timeout=15)
        assert r.status_code == 200
        all_orders = r.json()
        assert isinstance(all_orders, list)
        for o in all_orders:
            assert "customer" in o
        _no_id(all_orders)

        for st in ["pending", "accepted", "out_for_delivery", "delivered"]:
            r = requests.get(f"{API}/admin/orders?status={st}", headers=H(tokens["admin"]), timeout=15)
            assert r.status_code == 200
            for o in r.json():
                assert o["status"] == st

    def test_advance_order_status_creates_notification(self, tokens):
        # find a pending order; if none, skip
        r = requests.get(f"{API}/admin/orders?status=pending", headers=H(tokens["admin"]), timeout=15)
        pend = r.json()
        if not pend:
            pytest.skip("no pending orders to advance")
        o = pend[0]
        order_id = o["id"]
        user_id = o["user_id"]
        # capture customer's existing notifications for that user via customer login if same user
        r = requests.post(f"{API}/admin/orders/{order_id}/status",
                          headers=H(tokens["admin"]), json={"status": "accepted"}, timeout=15)
        assert r.status_code == 200
        # verify status changed
        r = requests.get(f"{API}/admin/orders?status=accepted", headers=H(tokens["admin"]), timeout=15)
        ids = [x["id"] for x in r.json()]
        assert order_id in ids
        # if user is demo customer, verify notification created
        if user_id:
            cust_tok = tokens["customer"]
            # only verifiable if user_id matches demo customer
            me = requests.get(f"{API}/auth/me", headers=H(cust_tok), timeout=10).json()
            if me["id"] == user_id:
                n = requests.get(f"{API}/notifications", headers=H(cust_tok), timeout=10).json()
                assert any("Accepted" in x["title"] for x in n)


class TestAdminProducts:
    def test_product_crud(self, tokens):
        # create
        payload = {"name": "TEST_AdminProd", "price": 99.0, "store_id": "st-1",
                   "category_id": "cat-grocery", "image": "https://x.test/x.jpg"}
        r = requests.post(f"{API}/admin/products", headers=H(tokens["admin"]), json=payload, timeout=15)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["mrp"] == 99.0  # mrp fallback
        # verify via public products
        r = requests.get(f"{API}/products/{pid}", timeout=10)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_AdminProd"
        # update
        r = requests.put(f"{API}/admin/products/{pid}", headers=H(tokens["admin"]),
                         json={**payload, "name": "TEST_AdminProdUpdated", "price": 120.0}, timeout=10)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_AdminProdUpdated"
        # delete
        r = requests.delete(f"{API}/admin/products/{pid}", headers=H(tokens["admin"]), timeout=10)
        assert r.status_code == 200
        r = requests.get(f"{API}/products/{pid}", timeout=10)
        assert r.status_code == 404


class TestAdminCategoriesBanners:
    def test_category_create_delete(self, tokens):
        r = requests.post(f"{API}/admin/categories", headers=H(tokens["admin"]),
                          json={"name": "TEST_Cat", "icon": "tag", "color": "#000"}, timeout=10)
        assert r.status_code == 200
        cid = r.json()["id"]
        cats = requests.get(f"{API}/categories", timeout=10).json()
        assert any(c["id"] == cid for c in cats)
        r = requests.delete(f"{API}/admin/categories/{cid}", headers=H(tokens["admin"]), timeout=10)
        assert r.status_code == 200

    def test_banner_create_delete(self, tokens):
        r = requests.post(f"{API}/admin/banners", headers=H(tokens["admin"]),
                          json={"title": "TEST_Banner", "image": "https://x.test/b.jpg"}, timeout=10)
        assert r.status_code == 200
        bid = r.json()["id"]
        banners = requests.get(f"{API}/banners", timeout=10).json()
        assert any(b["id"] == bid for b in banners)
        r = requests.delete(f"{API}/admin/banners/{bid}", headers=H(tokens["admin"]), timeout=10)
        assert r.status_code == 200


class TestAdminCommission:
    def test_get_and_set(self, tokens):
        r = requests.get(f"{API}/admin/commission", headers=H(tokens["admin"]), timeout=10)
        assert r.status_code == 200
        orig = r.json().get("commission_percent", 10.0)
        # set new
        r = requests.post(f"{API}/admin/commission", headers=H(tokens["admin"]),
                          json={"percent": 15}, timeout=10)
        assert r.status_code == 200
        assert r.json()["commission_percent"] == 15
        # verify persist
        r = requests.get(f"{API}/admin/commission", headers=H(tokens["admin"]), timeout=10)
        assert r.json()["commission_percent"] == 15
        # restore
        requests.post(f"{API}/admin/commission", headers=H(tokens["admin"]),
                      json={"percent": orig}, timeout=10)


# ---------------- VENDOR ----------------
class TestVendor:
    def test_vendor_stats_and_payout(self, tokens):
        r = requests.get(f"{API}/vendor/stats", headers=H(tokens["vendor"]), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["stores", "products", "orders", "pending", "delivered",
                  "revenue", "commission_percent", "payout"]:
            assert k in d
        # vendor1 should own st-1 + st-4 per problem statement
        sids = [s["id"] for s in d["stores"]]
        assert "st-1" in sids and "st-4" in sids, f"unexpected stores: {sids}"
        # payout math
        expected = round(d["revenue"] * (1 - d["commission_percent"] / 100), 2)
        assert abs(d["payout"] - expected) < 0.01
        _no_id(d)

    def test_vendor_products_scoped(self, tokens):
        r = requests.get(f"{API}/vendor/products", headers=H(tokens["vendor"]), timeout=15)
        assert r.status_code == 200
        prods = r.json()
        assert all(p["store_id"] in ("st-1", "st-4") for p in prods), \
            f"vendor1 saw foreign store products: {[p['store_id'] for p in prods]}"

    def test_vendor_orders_my_items(self, tokens):
        r = requests.get(f"{API}/vendor/orders", headers=H(tokens["vendor"]), timeout=15)
        assert r.status_code == 200
        orders = r.json()
        for o in orders:
            assert "my_items" in o and "my_revenue" in o
            # my_revenue equals sum of my_items.line_total
            mr = round(sum(it["line_total"] for it in o["my_items"]), 2)
            assert abs(mr - o["my_revenue"]) < 0.01

    def test_vendor_role_guard(self, tokens):
        r = requests.get(f"{API}/vendor/stats", headers=H(tokens["customer"]), timeout=10)
        assert r.status_code == 403
        r = requests.get(f"{API}/vendor/stats", headers=H(tokens["admin"]), timeout=10)
        assert r.status_code == 403

    def test_vendor_cannot_edit_foreign_product(self, tokens):
        # find vendor2's product, try to update with vendor1
        r = requests.get(f"{API}/vendor/products", headers=H(tokens["vendor2"]), timeout=10)
        v2 = r.json()
        if not v2:
            pytest.skip("vendor2 has no products")
        target = v2[0]
        r = requests.put(f"{API}/vendor/products/{target['id']}",
                         headers=H(tokens["vendor"]),
                         json={"name": "HACK", "price": 1.0, "store_id": target["store_id"],
                               "category_id": target.get("category_id", "cat-grocery")},
                         timeout=10)
        assert r.status_code == 404  # "Not your product"


# ---------------- DELIVERY ----------------
class TestDelivery:
    def test_delivery_online_toggle_and_me(self, tokens):
        r = requests.post(f"{API}/delivery/online", headers=H(tokens["delivery"]),
                          json={"online": True}, timeout=10)
        assert r.status_code == 200
        assert r.json()["online"] is True
        r = requests.get(f"{API}/delivery/me", headers=H(tokens["delivery"]), timeout=10)
        assert r.status_code == 200
        assert r.json()["online"] is True

    def test_available_only_accepted(self, tokens):
        r = requests.get(f"{API}/delivery/available", headers=H(tokens["delivery"]), timeout=10)
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "accepted"
            assert not o.get("delivery_id")

    def test_claim_and_deliver_flow(self, tokens):
        avail = requests.get(f"{API}/delivery/available", headers=H(tokens["delivery"]), timeout=10).json()
        if not avail:
            pytest.skip("no available accepted orders to claim")
        order = avail[0]
        oid = order["id"]
        # claim
        r = requests.post(f"{API}/delivery/orders/{oid}/claim",
                          headers=H(tokens["delivery"]), timeout=10)
        assert r.status_code == 200
        # appears in my
        my = requests.get(f"{API}/delivery/my", headers=H(tokens["delivery"]), timeout=10).json()
        target = next((o for o in my if o["id"] == oid), None)
        assert target is not None
        assert target["status"] == "out_for_delivery"
        # claiming again should fail
        r = requests.post(f"{API}/delivery/orders/{oid}/claim",
                          headers=H(tokens["delivery"]), timeout=10)
        assert r.status_code == 400
        # deliver
        r = requests.post(f"{API}/delivery/orders/{oid}/delivered",
                          headers=H(tokens["delivery"]), timeout=10)
        assert r.status_code == 200
        my = requests.get(f"{API}/delivery/my", headers=H(tokens["delivery"]), timeout=10).json()
        target = next((o for o in my if o["id"] == oid), None)
        assert target and target["status"] == "delivered"

    def test_delivery_stats(self, tokens):
        r = requests.get(f"{API}/delivery/stats", headers=H(tokens["delivery"]), timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ["total", "delivered", "active", "earnings", "today_orders"]:
            assert k in d
        # ₹30 flat
        assert d["earnings"] == d["delivered"] * 30

    def test_delivery_role_guard(self, tokens):
        r = requests.get(f"{API}/delivery/stats", headers=H(tokens["customer"]), timeout=10)
        assert r.status_code == 403
