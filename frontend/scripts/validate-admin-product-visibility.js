'use strict';

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const readFrontend = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");

const vendorDashboard = readFrontend("app/vendor/index.tsx");
const adminProducts = readFrontend("app/admin/products.tsx");
const backend = fs.readFileSync(
  path.join(__dirname, "..", "..", "backend", "server.py"),
  "utf8"
);

assert.ok(
  vendorDashboard.includes('placeholder="Store Name (e.g. Wahal Gupta Store)"'),
  "Store creation placeholder must use Wahal Gupta Store as the example."
);
assert.ok(
  !vendorDashboard.includes("CyberDham Mart"),
  "The old store-name example must not remain."
);

assert.ok(adminProducts.includes("adminApi.stores()"), "Admin product page must load stores.");
assert.ok(adminProducts.includes("stores={stores}"), "Product modal must receive store choices.");
assert.ok(adminProducts.includes('testID={`pf-store-${storeId}`}'), "Admin product modal must expose store choices.");
assert.ok(adminProducts.includes("store_id: String(selectedStore.id || selectedStore._id)"), "Saved products must include store_id.");
assert.ok(adminProducts.includes('category_id: String(f.category_id || "").trim()'), "Saved products must retain the selected shop category.");
assert.ok(adminProducts.includes('!String(f.category_id || "").trim() || !categories.some'), "Admin product form must require a valid shop category selection.");
assert.ok(adminProducts.includes("Could not save product"), "Product save failures must be shown to the admin.");
assert.ok(adminProducts.includes("Platform, Alert }"), "Alert must be imported for form validation and save errors.");

const createStart = backend.indexOf('@api.post("/admin/products")');
const updateStart = backend.indexOf('@api.put("/admin/products/{pid}")', createStart);
const deleteStart = backend.indexOf('@api.delete("/admin/products/{pid}")', updateStart);
assert.ok(createStart >= 0 && updateStart > createStart && deleteStart > updateStart, "Admin product route definitions must exist.");
const createRoute = backend.slice(createStart, updateStart);
const updateRoute = backend.slice(updateStart, deleteStart);

assert.ok(createRoute.includes("db.stores.find_one("), "Admin product create must verify the selected store.");
assert.ok(createRoute.includes('product_data["store_id"] = store_id'), "Admin product create must store the selected store ID.");
assert.ok(createRoute.includes('category = await db.categories.find_one({"id": category_id}'), "Admin product create must validate the selected shop category.");
assert.ok(createRoute.includes('product_data["category_id"] = category_id'), "Admin product create must save the selected shop category.");
assert.ok(updateRoute.includes('upd["store_id"] = store_id'), "Admin product update must keep a valid store association.");
assert.ok(updateRoute.includes('category = await db.categories.find_one({"id": category_id}'), "Admin product update must validate the selected shop category.");
assert.ok(updateRoute.includes('upd["category_id"] = category_id'), "Admin product update must save the selected shop category.");

const publicStart = backend.indexOf('@api.get("/products")');
const publicEnd = backend.indexOf('@api.get("/products/{product_id}")', publicStart);
assert.ok(publicStart >= 0 && publicEnd > publicStart, "Customer product catalog route must exist.");
const publicRoute = backend.slice(publicStart, publicEnd);
assert.ok(publicRoute.includes('"store_id": {"$in": approved_store_ids}'), "Customer catalog must remain restricted to approved stores.");
assert.ok(publicRoute.includes('"is_available": {"$ne": False}'), "Customer catalog must honor product availability.");

console.log("ADMIN_PRODUCT_VISIBILITY_VALIDATION_PASS");
console.log("Store examples, product/store association, store category, and customer catalog filters are aligned.");
