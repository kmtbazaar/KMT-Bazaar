function valueText(value: any): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return String(value);
  if (value && typeof value === "object") {
    return valueText(value.value ?? value.label ?? value.text ?? value.name ?? value.selected_value);
  }
  return "";
}

function readAttribute(source: any, pattern: RegExp): string {
  if (!source || typeof source !== "object") return "";
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!item || typeof item !== "object") continue;
      const key = String(item.key ?? item.label ?? item.name ?? item.attribute ?? "");
      if (pattern.test(key)) {
        const result = valueText(item.value ?? item.selected_value ?? item.text ?? item.val);
        if (result) return result;
      }
    }
    return "";
  }
  for (const [key, value] of Object.entries(source)) {
    if (pattern.test(key)) {
      const result = valueText(value);
      if (result) return result;
    }
  }
  return "";
}

/**
 * Resolve the customer-facing pack/variant label from both current and legacy
 * product records. Variant labels are preferred over a generic unit so mobile
 * listings can show RAM/storage configurations even when product.unit is blank.
 */
export function getProductUnitLabel(product: any): string {
  if (!product || typeof product !== "object") return "";

  const sources = [
    product.attributes,
    product.specifications,
    product.product_attributes,
    product.additional_attributes,
    product.details,
  ];

  const ram = valueText(
    product.ram ?? product.ram_size ?? product.memory ?? product.memory_size
  ) || sources.map((source) => readAttribute(source, /ram|memory/i)).find(Boolean) || "";
  const storage = valueText(
    product.storage ?? product.storage_size ?? product.internal_storage ?? product.rom
  ) || sources.map((source) => readAttribute(source, /storage|rom/i)).find(Boolean) || "";

  if (ram) {
    const ramLabel = /ram/i.test(ram) ? ram : `${ram} RAM`;
    return storage ? `${ramLabel} / ${storage}` : ramLabel;
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const preferredVariant = variants.find((variant: any) => variant?.is_default || variant?.is_active)
    || variants.find((variant: any) => valueText(variant?.unit ?? variant?.unit_label ?? variant?.pack_size ?? variant?.size))
    || variants[0];
  const variantLabel = valueText(
    preferredVariant?.unit,
    preferredVariant?.quantity_label,
    preferredVariant?.unit_label,
    preferredVariant?.pack_size,
    preferredVariant?.size,
    preferredVariant?.value,
    preferredVariant?.label,
    preferredVariant?.option
  );
  if (variantLabel) return variantLabel;

  const directLabel = valueText(
    product.unit,
    product.quantity_label,
    product.unit_label,
    product.unit_name,
    product.pack_size,
    product.size,
    product.weight,
    product.volume,
    typeof product.quantity === "string" ? product.quantity : ""
  );
  if (directLabel) return directLabel;

  const variantText = valueText(product.variant, product.variant_name, product.variant_label);
  if (variantText) return variantText;

  const fallbackRam = sources.map((source) => readAttribute(source, /ram|memory/i)).find(Boolean) || "";
  const fallbackStorage = sources.map((source) => readAttribute(source, /storage|rom/i)).find(Boolean) || "";
  if (fallbackRam) return fallbackStorage ? `${fallbackRam} RAM / ${fallbackStorage}` : `RAM ${fallbackRam}`;
  return "";
}
