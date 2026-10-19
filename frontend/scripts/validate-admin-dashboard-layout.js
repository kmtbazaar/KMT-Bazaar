const fs = require("node:fs");
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
  for (const rule of rules) {
    assert.ok(block.includes(rule), `Layout validation failed: ${name} must include ${rule}`);
  }
}

assert.ok(!source.includes("useWindowDimensions"), "Tile sizes must not depend on JS viewport measurements");
assert.ok(!source.includes("kpiGridWidth") && !source.includes("quickActionsGridWidth"), "Tile widths must not be driven by measured React state");
assert.ok(!source.includes("handleKpiGridLayout") && !source.includes("handleQuickActionsGridLayout"), "No layout-measurement feedback loop is allowed");
assert.ok(!source.includes("cardWidth={"), "KPI widths must follow the grid's fixed column contract");

requireRules("kpiGrid", ['width: "100%"', 'alignSelf: "stretch"']);
requireRules("kpiCardWrap", ['width: "48%"', 'maxWidth: "48%"', 'flexBasis: "48%"', "flexGrow: 0", "flexShrink: 0"]);
requireRules("kpiCard", ['width: "100%"', "height: 164", "minHeight: 164", "maxHeight: 164", "flexGrow: 0", "flexShrink: 0"]);
requireRules("grid", ['width: "100%"', 'alignSelf: "stretch"']);
requireRules("gridWrapper", ['width: "31%"', 'maxWidth: "31%"', 'flexBasis: "31%"', "flexGrow: 0", "flexShrink: 0"]);
requireRules("gridItem", ['width: "100%"', "height: 128", "minHeight: 128", "maxHeight: 128", "flexGrow: 0", "flexShrink: 0"]);

console.log("ADMIN_DASHBOARD_LAYOUT_VALIDATION_PASS");
console.log("KPI: 48% column width / 164px fixed height; Quick Actions: 31% column width / 128px fixed height.");
