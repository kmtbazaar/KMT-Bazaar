const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const source = fs.readFileSync("app/admin/index.tsx", "utf8");
const adminActions = fs.readFileSync("src/adminSettings.ts", "utf8");

function styleBlock(name) {
  const marker = `  ${name}: {`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Missing dashboard style block: ${name}`);
  const end = source.indexOf("\n  },", start);
  assert.ok(end >= 0, `Unterminated dashboard style block: ${name}`);
  return source.slice(start, end);
}
function requireRules(name, rules) {
  const block = styleBlock(name);
  for (const rule of rules) assert.ok(block.includes(rule), `Layout validation failed: ${name} must include ${rule}`);
}

// Regression guard for prior blank-page error: a removed width variable had remained in rendered JSX.
assert.ok(!source.includes("quickActionCardWidth"), "Undefined quickActionCardWidth reference must never return");
assert.ok(!source.includes("kpiGridWidth") && !source.includes("quickActionsGridWidth"), "No measured tile width state is allowed");
assert.ok(source.includes("useWindowDimensions") && (source.includes("screenWidth >= 768") || source.includes("screenWidth >= 640")), "Desktop KPI layout must adapt to viewport width");
assert.ok(source.includes('const kpiColumnCount = Platform.OS === "web" && screenWidth >= 768 ? 4 : 2;') || source.includes('const kpiColumnCount = Platform.OS === "web" && screenWidth >= 640 ? 4 : 2;'), "Desktop must use four KPI columns and smaller screens two");
assert.equal((source.match(/<KPI key=/g) || []).length, 8, "Expected all 8 KPI cards");
assert.ok(source.includes("const kpiRows = Array.from(") && source.includes("kpiCards.slice(rowIndex * kpiColumnCount"), "Eight KPI cards must be grouped into responsive rows");
const compactKpiLayout = source.includes("compact={kpiColumnCount === 4}") || (source.includes("compact={compactKpiTiles}") && source.includes('const compactKpiTiles = Platform.OS === "web";'));
assert.ok(source.includes("compact && s.kpiCardCompact") && compactKpiLayout, "Web KPI cards must use compact dimensions");
requireRules("headerText", ['alignItems: "center"']);
requireRules("headerEyebrow", ["fontSize: 21", 'textAlign: "center"']);
requireRules("headerTitle", ["fontSize: 9", 'textAlign: "center"']);
assert.ok(source.includes("AnimatedBrandLogo size={60}"), "Admin profile brand logo must be enlarged");
requireRules("logoBox", ["width: 64", "height: 64"]);
requireRules("logoutButton", ['marginLeft: "auto"', "zIndex: 2"]);
const overviewDuplicateActions = ["Customers", "Vendors", "Delivery Partners", "Vendor Service", "Service Bookings", "All Orders", "Commission"];
for (const label of overviewDuplicateActions) assert.ok(!adminActions.includes(`label: "${label}"`), `Overview duplicate must not be a Quick Action: ${label}`);
for (const label of ["Products", "Categories", "Daily Services", "Banners", "Roojgar"]) assert.ok(adminActions.includes(`label: "${label}"`), `Distinct Quick Action must remain: ${label}`);
assert.ok(adminActions.includes("validLabels") && adminActions.includes("filter((label: any) => validLabels.has(label))"), "Old saved quick-action entries must be cleaned against the current allowed list");
assert.ok(source.includes("quickActionRows.map((row, rowIndex)"), "Quick Actions must use explicit three-card rows");
assert.ok(source.includes("row.length < 3"), "Last Quick Actions row must retain empty spacer columns");

requireRules("kpiGrid", ['width: "100%"', 'flexDirection: "column"']);
requireRules("kpiRow", ['width: "100%"', 'flexDirection: "row"', "gap: 10"]);
requireRules("kpiCardWrap", ["flex: 1", "minWidth: 0"]);
requireRules("kpiCard", ['width: "100%"', "height: 164", "minHeight: 164", "maxHeight: 164", "flexShrink: 0"]);
requireRules("kpiCardCompact", ["height: 60", "minHeight: 60", "maxHeight: 60", "padding: 5"]);
requireRules("kpiIconCompact", ["width: 18", "height: 18"]);
requireRules("kpiValueCompact", ["fontSize: 13", "marginTop: 1"]);
requireRules("kpiLabelCompact", ["fontSize: 8"]);
requireRules("kpiSubCompact", ["fontSize: 7"]);
assert.ok(!source.includes("View details") && !source.includes("{!compact ? ("), "KPI cards must not render a View details row or bottom gap");
requireRules("grid", ['width: "100%"', 'flexDirection: "column"']);
requireRules("gridRow", ['width: "100%"', 'flexDirection: "row"', "gap: 10"]);
requireRules("gridWrapper", ["flex: 1", "minWidth: 0"]);
requireRules("gridItem", ['width: "100%"', "height: 128", "minHeight: 128", "maxHeight: 128", "flexShrink: 0"]);

console.log("ADMIN_DASHBOARD_LAYOUT_VALIDATION_PASS");
console.log("KPI: desktop 4 columns × 2 rows / compact 60px tiles with no View details gap; centered KMT Bazaar heading. Smaller screens retain 2 columns.");

if (process.argv.includes("--check-build")) {
  const dist = path.resolve("dist");
  const candidates = [path.join(dist, "admin", "index.html"), path.join(dist, "admin.html")];
  const adminHtmlPath = candidates.find((candidate) => fs.existsSync(candidate));
  assert.ok(adminHtmlPath, "Build validation failed: /admin HTML route is missing");
  const html = fs.readFileSync(adminHtmlPath, "utf8");
  const matches = [...html.matchAll(/\/?_expo\/static\/js\/web\/entry-[A-Za-z0-9._-]+\.js/g)];
  assert.ok(matches.length > 0, "Build validation failed: /admin HTML has no web entry bundle reference");
  const asset = matches[0][0].replace(/^\//, "");
  assert.ok(fs.existsSync(path.join(dist, asset)), `Build validation failed: referenced web entry bundle missing: ${asset}`);
  console.log("ADMIN_ROUTE_ASSET_SMOKE_PASS");
}
