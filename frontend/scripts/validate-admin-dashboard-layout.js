const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const source = fs.readFileSync("app/admin/index.tsx", "utf8");

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
assert.ok(source.includes("useWindowDimensions") && source.includes("screenWidth >= 768"), "Desktop KPI layout must adapt to viewport width");
assert.ok(source.includes('const kpiColumnCount = Platform.OS === "web" && screenWidth >= 768 ? 4 : 2;'), "Desktop must use four KPI columns and smaller screens two");
assert.equal((source.match(/<KPI key=/g) || []).length, 8, "Expected all 8 KPI cards");
assert.ok(source.includes("const kpiRows = Array.from(") && source.includes("kpiCards.slice(rowIndex * kpiColumnCount"), "Eight KPI cards must be grouped into responsive rows");
assert.ok(source.includes("compact && s.kpiCardCompact") && source.includes("compact={kpiColumnCount === 4}"), "Desktop KPI cards must use compact dimensions");
assert.ok(source.includes("quickActionRows.map((row, rowIndex)"), "Quick Actions must use explicit three-card rows");
assert.ok(source.includes("row.length < 3"), "Last Quick Actions row must retain empty spacer columns");

requireRules("kpiGrid", ['width: "100%"', 'flexDirection: "column"']);
requireRules("kpiRow", ['width: "100%"', 'flexDirection: "row"', "gap: 10"]);
requireRules("kpiCardWrap", ["flex: 1", "minWidth: 0"]);
requireRules("kpiCard", ['width: "100%"', "height: 164", "minHeight: 164", "maxHeight: 164", "flexShrink: 0"]);
requireRules("kpiCardCompact", ["height: 80", "minHeight: 80", "maxHeight: 80", "padding: 6"]);
requireRules("kpiIconCompact", ["width: 21", "height: 21"]);
requireRules("kpiValueCompact", ["fontSize: 14", "marginTop: 2"]);
requireRules("kpiLabelCompact", ["fontSize: 8"]);
requireRules("kpiSubCompact", ["fontSize: 8"]);
requireRules("kpiTapHintCompact", ["marginTop: 3"]);
requireRules("grid", ['width: "100%"', 'flexDirection: "column"']);
requireRules("gridRow", ['width: "100%"', 'flexDirection: "row"', "gap: 10"]);
requireRules("gridWrapper", ["flex: 1", "minWidth: 0"]);
requireRules("gridItem", ['width: "100%"', "height: 128", "minHeight: 128", "maxHeight: 128", "flexShrink: 0"]);

console.log("ADMIN_DASHBOARD_LAYOUT_VALIDATION_PASS");
console.log("KPI: desktop 4 columns × 2 rows / compact 80px tiles; smaller screens 2 columns. Quick Actions: 3 equal columns / fixed 128px height.");

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
