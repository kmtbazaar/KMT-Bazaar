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
assert.ok(!source.includes("useWindowDimensions"), "Tile sizing must not depend on viewport calculations");
assert.equal((source.match(/<KPI\n/g) || []).length, 8, "Expected all 8 KPI cards");
assert.equal((source.match(/<View style=\{s\.kpiRow\}>/g) || []).length, 4, "Overview must use four two-card rows");
assert.ok(source.includes("quickActionRows.map((row, rowIndex)"), "Quick Actions must use explicit three-card rows");
assert.ok(source.includes("row.length < 3"), "Last Quick Actions row must retain empty spacer columns");

requireRules("kpiGrid", ['width: "100%"', 'flexDirection: "column"']);
requireRules("kpiRow", ['width: "100%"', 'flexDirection: "row"', "gap: 10"]);
requireRules("kpiCardWrap", ["flex: 1", "minWidth: 0"]);
requireRules("kpiCard", ['width: "100%"', "height: 164", "minHeight: 164", "maxHeight: 164", "flexShrink: 0"]);
requireRules("grid", ['width: "100%"', 'flexDirection: "column"']);
requireRules("gridRow", ['width: "100%"', 'flexDirection: "row"', "gap: 10"]);
requireRules("gridWrapper", ["flex: 1", "minWidth: 0"]);
requireRules("gridItem", ['width: "100%"', "height: 128", "minHeight: 128", "maxHeight: 128", "flexShrink: 0"]);

console.log("ADMIN_DASHBOARD_LAYOUT_VALIDATION_PASS");
console.log("KPI: 2 equal columns / fixed 164px height; Quick Actions: 3 equal columns / fixed 128px height.");

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
