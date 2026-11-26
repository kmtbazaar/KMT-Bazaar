export function formatRupees(value: unknown): string {
  const raw = String(value ?? "0").replace(/[₹,\s]/g, "");
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return "₹0";
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount)}`;
}
