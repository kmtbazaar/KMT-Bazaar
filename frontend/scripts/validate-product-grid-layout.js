'use strict';

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const home = read("app/(tabs)/home.tsx");
const categories = read("app/(tabs)/categories.tsx");
const categoryPage = read("app/category/[id].tsx");
const search = read("app/search.tsx");
const store = read("app/store/[id].tsx");
const productCard = read("src/components/ProductCard.tsx");

assert.match(
  home,
  /pathname:\s*"\/(?:\(tabs\))\/categories",\s*params:\s*\{\s*categoryId:\s*String\(c\.id\)\s*\}/,
  "Home category tiles must open the split category browser with the chosen category."
);
assert.match(home, /api\.categories\(\)\.catch/);
assert.match(home, /api\.stores\(\)\.catch/);
assert.match(home, /api\.products\(\{ trending: true \}\)\.catch/);
assert.match(home, /api\.unreadCount\(\)\.catch/, "Unread count failure must not block catalog rendering.");
assert.match(categories, /useLocalSearchParams/);
assert.match(categories, /const \{ categoryId \} = useLocalSearchParams/);
assert.match(categories, /requestedCategory/);
assert.match(categories, /if \(requestedId\) setActive\(String\(requestedId\)\)/);
assert.match(categories, /style=\{\{ flex: 1, minWidth: 0 \}\}/);
assert.match(categories, /productCell:\s*\{\s*width:\s*"50%"/);
assert.match(categories, /<View style=\{s\.productCell\}>\s*<ProductCard p=\{item\} compact \/>/);

assert.match(categoryPage, /productCell:\s*\{\s*width:\s*"33\.333333%"/);
assert.match(categoryPage, /<View style=\{s\.productCell\}>\s*<ProductCard p=\{item\} compact=\{true\} \/>/);
assert.match(search, /productCell:\s*\{\s*width:\s*"50%"/);
assert.match(search, /<View style=\{s\.productCell\}>\s*<ProductCard p=\{item\} compact=\{true\} \/>/);
assert.match(store, /gridCell:\s*\{\s*width:\s*"50%"/);
assert.match(store, /flexGrow:\s*0/);
assert.match(store, /flexShrink:\s*0/);
assert.match(store, /api\.products\(\{ store_id: id \}\)\.catch/);
assert.doesNotMatch(store, /removeClippedSubviews=\{true\}/);

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
console.log("Compact cards fill fixed 2/3-column cells; last rows keep the same cell width.");
console.log("Home Shop by Category opens the left-rail category browser with the selected category.");
