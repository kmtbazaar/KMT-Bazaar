export type ProductFieldFlags = {
  show_variants: boolean;
  show_colors: boolean;
  show_description: boolean;
};
export type ProductCategoryConfig = ProductFieldFlags & {
  variantLabel: string;
  variantOptions: string[];
  colorLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
};
export function getDefaultProductFieldFlags(categoryName: string): ProductFieldFlags {
  const name = String(categoryName || "").trim().toLowerCase();
  if (/(grocery|kirana|supermarket|daily needs|provision|food grain|general store)/.test(name)) return { show_variants: true, show_colors: false, show_description: false };
  if (/(medicine|medicines|pharmacy|chemist|drugstore)/.test(name)) return { show_variants: true, show_colors: false, show_description: true };
  if (/(restaurant|food|cafe|bakery|sweet|snack|meal|fast food)/.test(name)) return { show_variants: true, show_colors: false, show_description: true };
  if (/(mobile|smartphone|laptop|computer|tablet|electronics|electronic|gadget|television)/.test(name)) return { show_variants: true, show_colors: true, show_description: true };
  if (/(clothing|fashion|apparel|garment|wear|shirt|jeans|textile)/.test(name)) return { show_variants: true, show_colors: true, show_description: true };
  if (/(footwear|shoe|shoes|sandal|slipper)/.test(name)) return { show_variants: true, show_colors: true, show_description: true };
  if (/(beauty|cosmetic|personal care|skin care|skincare|makeup)/.test(name)) return { show_variants: true, show_colors: true, show_description: true };
  if (/(furniture|home|decor|appliance|interior)/.test(name)) return { show_variants: true, show_colors: true, show_description: true };
  if (/(book|stationery|office)/.test(name)) return { show_variants: true, show_colors: false, show_description: true };
  return { show_variants: false, show_colors: false, show_description: false };
}
export function getProductCategoryConfig(category: any): ProductCategoryConfig {
  const name = String(category?.name || "").trim().toLowerCase();
  const defaults = getDefaultProductFieldFlags(name);
  const saved = category?.product_fields && typeof category.product_fields === "object" ? category.product_fields : {};
  const flags: ProductFieldFlags = {
    show_variants: typeof saved.show_variants === "boolean" ? saved.show_variants : defaults.show_variants,
    show_colors: typeof saved.show_colors === "boolean" ? saved.show_colors : defaults.show_colors,
    show_description: typeof saved.show_description === "boolean" ? saved.show_description : defaults.show_description,
  };
  let variantLabel = "Product option", variantOptions: string[] = [], colorLabel = "Colour";
  let descriptionLabel = "Product details", descriptionPlaceholder = "Add useful product details";
  if (/(mobile|smartphone|laptop|computer|tablet|electronics|electronic|gadget|television)/.test(name)) {
    variantLabel = "RAM / Storage / Model";
    variantOptions = ["4 GB / 64 GB", "6 GB / 128 GB", "8 GB / 128 GB", "8 GB / 256 GB", "12 GB / 256 GB"];
    descriptionLabel = "Specifications & features"; descriptionPlaceholder = "Add model details, processor, display and key specifications";
  } else if (/(clothing|fashion|apparel|garment|wear|shirt|jeans|textile)/.test(name)) {
    variantLabel = "Clothing size"; variantOptions = ["XS", "S", "M", "L", "XL", "XXL"];
    descriptionLabel = "Fabric & product details"; descriptionPlaceholder = "Add fabric, fit, care and product details";
  } else if (/(footwear|shoe|shoes|sandal|slipper)/.test(name)) {
    variantLabel = "Shoe size"; variantOptions = ["UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"];
    descriptionLabel = "Material & product details"; descriptionPlaceholder = "Add material, fit and care information";
  } else if (/(grocery|kirana|supermarket|daily needs|provision|food grain|general store)/.test(name)) {
    variantLabel = "Pack size / Weight"; variantOptions = ["250 g", "500 g", "1 kg", "2 kg", "5 kg", "10 kg", "1 pc", "1 L"];
    descriptionLabel = "Product information"; descriptionPlaceholder = "Add brand, origin or other essential product information";
  } else if (/(medicine|medicines|pharmacy|chemist|drugstore)/.test(name)) {
    variantLabel = "Pack / Strength"; variantOptions = ["10 tablets", "15 tablets", "30 tablets", "60 tablets", "100 ml", "200 ml", "1 bottle"];
    descriptionLabel = "Active ingredients & product information"; descriptionPlaceholder = "Add active ingredients, pack information and product details";
  } else if (/(restaurant|food|cafe|bakery|sweet|snack|meal|fast food)/.test(name)) {
    variantLabel = "Portion / Serving"; variantOptions = ["Half", "Full", "Regular", "Large", "Single", "Combo"];
    descriptionLabel = "Ingredients & food details"; descriptionPlaceholder = "Add ingredients, preparation style and serving details";
  } else if (/(beauty|cosmetic|personal care|skin care|skincare|makeup)/.test(name)) {
    variantLabel = "Volume / Net weight"; variantOptions = ["15 ml", "30 ml", "50 ml", "100 ml", "200 ml", "250 g", "500 g"];
    colorLabel = "Shade"; descriptionLabel = "Ingredients & product details"; descriptionPlaceholder = "Add ingredients, shade or usage information";
  } else if (/(furniture|home|decor|appliance|interior)/.test(name)) {
    variantLabel = "Size / Dimensions / Model"; descriptionLabel = "Material & specifications"; descriptionPlaceholder = "Add dimensions, material, care and warranty details";
  } else if (/(book|stationery|office)/.test(name)) {
    variantLabel = "Edition / Format / Pack"; variantOptions = ["Paperback", "Hardcover", "1 pc", "Pack of 5", "Pack of 10", "Pack of 20"];
    descriptionLabel = "Author & product details"; descriptionPlaceholder = "Add author, edition, language or product details";
  }
  return { ...flags, variantLabel, variantOptions, colorLabel, descriptionLabel, descriptionPlaceholder };
}