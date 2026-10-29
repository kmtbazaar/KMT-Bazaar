'use strict';

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const home = read("app/(tabs)/home.tsx");
const homeCategory = read("app/home-category/[id].tsx");
const categories = read("app/(tabs)/categories.tsx");
const categoryPage = read("app/category/[id].tsx");
const search = read("app/search.tsx");
const store = read("app/store/[id].tsx");
const productCard = read("src/components/ProductCard.tsx");

// Home uses its dedicated category browser (with a left rail of item categories).
assert.match(
  home,
  /pathname:\s*"\/home-category\/\[id\]",\s*params:\s*\{\s*id:\s*String\(c\.id\),\s*name:\s*String\(c\.name\s*\|\|\s*""\)\s*\}/,
  "Home category tiles must open their dedicated browser with the selected category."
);
assert.match(homeCategory, /const params = useLocalSearchParams/);
assert.match(homeCategory, /const id = Array\.isArray\(params\.id\) \? params\.id\[0\] : params\.id/);
assert.match(homeCategory, /api\.products\(\{ category: String\(id\) \}\)\.catch/);
assert.match(homeCategory, /style=\{s\.categoryRail\}/);
assert.match(homeCategory, /filteredProducts\.map\(\(product: any\) => \([\s\S]*<CategoryProductTile p=\{product\} \/>/);
assert.match(homeCategory, /productCell:\s*\{\s*width:\s*"50%"/);
assert.match(homeCategory, /productGrid:\s*\{[\s\S]*flexDirection:\s*"row"[\s\S]*flexWrap:\s*"wrap"/);

assert.match(home, /api\.categories\(\)\.catch/);
assert.match(home, /api\.stores\(\)\.catch/);
assert.match(home, /api\.products\(\{ trending: true \}\)\.catch/);
assert.match(home, /api\.unreadCount\(\)\.catch/, "Unread count failure must not block catalog rendering.");
assert.doesNotMatch(home, /if \(!locationReady\) return;/, "Catalog loading must not be blocked before a delivery location is selected.");
assert.match(home, /Browse products and stores now\./);

assert.match(categories, /useLocalSearchParams/);
assert.match(categories, /const \{ categoryId \} = useLocalSearchParams/);
assert.match(categories, /requestedCategory/);
assert.match(categories, /firstCategoryWithProducts/);
assert.match(categories, /availableProductCategories/);
assert.match(categories, /requestedId\) setActive\(String\(requestedId\)\)/);
assert.match(categories, /style=\{\{ flex: 1, minWidth: 0 \}\}/);
assert.match(categories, /products\.map\(\(item\) => \([\s\S]*<CategoryProductTile p=\{item\} \/>/);
assert.match(categories, /productGrid:\s*\{[\s\S]*flexDirection:\s*"row"[\s\S]*flexWrap:\s*"wrap"/);
assert.doesNotMatch(categories, /<FlatList/);

assert.match(categoryPage, /productCell:\s*\{\s*width:\s*"33\.333333%"/);
assert.match(categoryPage, /<View style=\{s\.productCell\}>\s*<ProductCard p=\{item\} compact=\{true\} \/>/);
assert.match(search, /productCell:\s*\{\s*width:\s*"50%"/);
assert.match(search, /<View style=\{s\.productCell\}>\s*<ProductCard p=\{item\} compact=\{true\} \/>/);
assert.match(store, /gridCell:\s*\{\s*width:\s*"50%"/);
assert.match(store, /flexGrow:\s*0/);
assert.match(store, /flexShrink:\s*0/);
assert.match(store, /api\.products\(\{ store_id: id \}\)\.catch/);
assert.match(store, /filteredProducts\.map\(\(item: any\) => \([\s\S]*<StoreProductTile p=\{item\} \/>/);
assert.match(store, /productGrid:\s*\{[\s\S]*flexDirection:\s*"row"[\s\S]*flexWrap:\s*"wrap"/);
assert.doesNotMatch(store, /<FlatList|removeClippedSubviews=\{true\}/);

assert.match(productCard, /unit:\s*\{\s*fontSize:\s*11,\s*fontWeight:\s*"700"/,
  "Product unit labels should be readable and visibly emphasized.");
assert.match(productCard, /addBtn:\s*\{[\s\S]*?minWidth:\s*48,[\s\S]*?height:\s*34,/,
  "The main Add button should be taller and keep a minimum tap width.");
assert.match(productCard, /stepper:\s*\{[\s\S]*?height:\s*34,/,
  "The quantity stepper should stay vertically aligned with the Add button.");

assert.match(
  productCard,
  /cardCompact:\s*\{\s*width:\s*"100%"[\s\S]*?flex:\s*0[\s\S]*?minWidth:\s*0[\s\S]*?margin:\s*0[\s\S]*?alignSelf:\s*"stretch"/,
  "Compact cards must fill a stable parent cell rather than expanding to content."
);
assert.match(
  productCard,
  /cardStoreGrid:\s*\{\s*width:\s*"100%"[\s\S]*?flex:\s*0[\s\S]*?margin:\s*0[\s\S]*?alignSelf:\s*"stretch"/
);

console.log("PRODUCT_GRID_LAYOUT_VALIDATION_PASS");
console.log("Compact product tiles fill fixed grid cells; incomplete rows keep the same width.");
console.log("Home category tiles open the dedicated left-rail item-category browser.");
