"""KMT Bazaar — image upload (base64) regression tests for Admin panel.

Verifies:
- POST/PUT /admin/products | /admin/categories | /admin/banners accept large base64 data URI
- Backend does NOT return 413 Payload Too Large
- Image is persisted and returned in subsequent GET (/api/products, /categories, /banners)
- All 4 role logins succeed
- Admin-protected routes reject non-admin tokens
"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://bazaar-mobile-hub.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@kmtbazaar.com", "password": "Admin@123"}
VENDOR = {"email": "vendor@kmtbazaar.com", "password": "Vendor@123"}
DELIVERY = {"email": "delivery@kmtbazaar.com", "password": "Delivery@123"}
CUSTOMER = {"email": "customer@kmtbazaar.com", "password": "Customer@123"}


# ------------ helpers ------------
def _login(session, creds):
    r = session.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login {creds['email']} failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _make_large_base64_image(approx_mb: float = 2.0) -> str:
    """Build a data URI with a JPEG header followed by ~approx_mb of base64 noise."""
    # Minimal JPEG SOI + APP0 header bytes
    jpeg_header = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
    ])
    pad_bytes = max(0, int(approx_mb * 1024 * 1024) - len(jpeg_header))
    payload = jpeg_header + (b"\x00" * pad_bytes)
    b64 = base64.b64encode(payload).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


# ------------ fixtures ------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    return _login(session, ADMIN)


@pytest.fixture(scope="session")
def customer_token(session):
    return _login(session, CUSTOMER)


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def customer_headers(customer_token):
    return {"Authorization": f"Bearer {customer_token}"}


# ------------ 1. all 4 role logins ------------
class TestRoleLogins:
    def test_admin_login(self, session):
        assert _login(session, ADMIN)

    def test_vendor_login(self, session):
        assert _login(session, VENDOR)

    def test_delivery_login(self, session):
        assert _login(session, DELIVERY)

    def test_customer_login(self, session):
        assert _login(session, CUSTOMER)


# ------------ 2. admin role guard on non-admin tokens ------------
class TestAdminRoleGuard:
    def test_customer_token_blocked_on_admin_products(self, session, customer_headers):
        big = _make_large_base64_image(0.01)
        r = session.post(f"{API}/admin/products", headers=customer_headers, json={
            "name": "TEST_NoAuth", "category_id": "cat-grocery", "price": 1, "image": big,
        }, timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}"

    def test_no_token_blocked_on_admin_categories(self, session):
        r = session.post(f"{API}/admin/categories", json={"name": "TEST_NoAuth", "image": "x"}, timeout=15)
        assert r.status_code == 401


# ------------ 3. products: POST/PUT/GET with large base64 image ------------
class TestAdminProductImageUpload:
    created_id = None

    def test_create_product_with_large_base64(self, session, admin_headers):
        big = _make_large_base64_image(2.0)  # ~2 MB raw → ~2.7 MB base64
        assert len(big) > 2_000_000, "test image not large enough"
        r = session.post(f"{API}/admin/products", headers=admin_headers, json={
            "name": "TEST_ImgProduct",
            "category_id": "cat-grocery",
            "store_id": "st-1",
            "price": 99.0,
            "mrp": 120.0,
            "unit": "1 pc",
            "stock": 5,
            "image": big,
            "description": "TEST product with base64 image",
            "trending": False,
        }, timeout=60)
        assert r.status_code != 413, "Backend rejected payload with 413 Payload Too Large"
        assert r.status_code == 200, f"create failed: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["name"] == "TEST_ImgProduct"
        assert body["image"].startswith("data:image/jpeg;base64,")
        assert len(body["image"]) == len(big)
        TestAdminProductImageUpload.created_id = body["id"]

    def test_get_products_returns_base64_image(self, session):
        pid = TestAdminProductImageUpload.created_id
        assert pid, "previous test must have created product"
        r = session.get(f"{API}/products", timeout=30)
        assert r.status_code == 200
        prods = r.json()
        match = next((p for p in prods if p["id"] == pid), None)
        assert match is not None, "newly-created product not in GET /products"
        assert match["image"].startswith("data:image/jpeg;base64,")
        # also via product detail
        r = session.get(f"{API}/products/{pid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["image"].startswith("data:image/jpeg;base64,")

    def test_update_product_with_new_large_base64(self, session, admin_headers):
        pid = TestAdminProductImageUpload.created_id
        assert pid
        new_img = _make_large_base64_image(1.5)
        r = session.put(f"{API}/admin/products/{pid}", headers=admin_headers, json={
            "name": "TEST_ImgProduct_Updated",
            "category_id": "cat-grocery",
            "store_id": "st-1",
            "price": 199.0,
            "mrp": 220.0,
            "unit": "1 pc",
            "stock": 3,
            "image": new_img,
            "description": "updated",
            "trending": True,
        }, timeout=60)
        assert r.status_code != 413
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert body["name"] == "TEST_ImgProduct_Updated"
        assert body["image"] == new_img
        # verify via GET
        r = session.get(f"{API}/products/{pid}", timeout=30)
        assert r.status_code == 200
        assert r.json()["image"] == new_img
        assert r.json()["name"] == "TEST_ImgProduct_Updated"

    def test_cleanup_delete_product(self, session, admin_headers):
        pid = TestAdminProductImageUpload.created_id
        if not pid:
            pytest.skip("nothing to clean up")
        r = session.delete(f"{API}/admin/products/{pid}", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        # confirm gone
        r = session.get(f"{API}/products/{pid}", timeout=15)
        assert r.status_code == 404


# ------------ 4. categories: large base64 ------------
class TestAdminCategoryImageUpload:
    created_id = None

    def test_create_category_with_large_base64(self, session, admin_headers):
        big = _make_large_base64_image(1.0)
        r = session.post(f"{API}/admin/categories", headers=admin_headers, json={
            "name": "TEST_ImgCat", "icon": "tag", "color": "#123456", "image": big,
        }, timeout=60)
        assert r.status_code != 413
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert body["name"] == "TEST_ImgCat"
        assert body["image"].startswith("data:image/jpeg;base64,")
        TestAdminCategoryImageUpload.created_id = body["id"]

    def test_get_categories_returns_base64(self, session):
        cid = TestAdminCategoryImageUpload.created_id
        assert cid
        r = session.get(f"{API}/categories", timeout=30)
        assert r.status_code == 200
        match = next((c for c in r.json() if c["id"] == cid), None)
        assert match, "new category missing in GET /categories"
        assert match["image"].startswith("data:image/jpeg;base64,")

    def test_cleanup_delete_category(self, session, admin_headers):
        cid = TestAdminCategoryImageUpload.created_id
        if not cid:
            pytest.skip("nothing to clean")
        r = session.delete(f"{API}/admin/categories/{cid}", headers=admin_headers, timeout=20)
        assert r.status_code == 200


# ------------ 5. banners: large base64 ------------
class TestAdminBannerImageUpload:
    created_id = None

    def test_create_banner_with_large_base64(self, session, admin_headers):
        big = _make_large_base64_image(1.0)
        r = session.post(f"{API}/admin/banners", headers=admin_headers, json={
            "title": "TEST_ImgBanner", "subtitle": "sub", "cta": "Shop",
            "image": big, "color": "#000000", "order": 99,
        }, timeout=60)
        assert r.status_code != 413
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert body["title"] == "TEST_ImgBanner"
        assert body["image"].startswith("data:image/jpeg;base64,")
        TestAdminBannerImageUpload.created_id = body["id"]

    def test_get_banners_returns_base64(self, session):
        bid = TestAdminBannerImageUpload.created_id
        assert bid
        r = session.get(f"{API}/banners", timeout=30)
        assert r.status_code == 200
        match = next((b for b in r.json() if b["id"] == bid), None)
        assert match, "new banner missing in GET /banners"
        assert match["image"].startswith("data:image/jpeg;base64,")

    def test_cleanup_delete_banner(self, session, admin_headers):
        bid = TestAdminBannerImageUpload.created_id
        if not bid:
            pytest.skip("nothing to clean")
        r = session.delete(f"{API}/admin/banners/{bid}", headers=admin_headers, timeout=20)
        assert r.status_code == 200


# ------------ 6. Stress: 5MB image (close to 50MB cap, but realistic for mobile photo) ------------
class TestVeryLargePayload:
    def test_5mb_product_image_not_413(self, session, admin_headers):
        big = _make_large_base64_image(5.0)  # ~6.7 MB base64 string
        r = session.post(f"{API}/admin/products", headers=admin_headers, json={
            "name": "TEST_5MB",
            "category_id": "cat-grocery",
            "store_id": "st-1",
            "price": 1.0, "unit": "x", "stock": 1, "image": big, "description": "x",
        }, timeout=120)
        assert r.status_code != 413, "5MB image triggered 413 — payload limit too small"
        assert r.status_code == 200, f"unexpected {r.status_code}: {r.text[:200]}"
        pid = r.json()["id"]
        # cleanup
        session.delete(f"{API}/admin/products/{pid}", headers=admin_headers, timeout=20)
