export type ProductAttributeField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

export type ProductCategorySchema = {
  show_variants: boolean;
  show_colors: boolean;
  show_description: boolean;
  requires_color: boolean;
  requires_color_images: boolean;
  variant_label: string;
  variant_options: string[];
  color_label: string;
  description_label: string;
  description_placeholder: string;
  product_attributes: ProductAttributeField[];
};

export type ProductCategoryConfig = ProductCategorySchema & {
  showVariants: boolean;
  showColors: boolean;
  showDescription: boolean;
  requiresColor: boolean;
  requiresColorImages: boolean;
  variantLabel: string;
  variantOptions: string[];
  colorLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  productAttributes: ProductAttributeField[];
  variantDescriptionsEnabled: boolean;
};

const field = (label: string, required = false): ProductAttributeField => ({
  key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  label,
  placeholder: label,
  required,
});

export function normalizeProductAttributeFields(raw: any): ProductAttributeField[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.map((item: any) => {
    const label = String(typeof item === "string" ? item : item?.label || "").trim();
    const key = String(typeof item === "object" && item?.key ? item.key : label)
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    return { key, label, placeholder: String(item?.placeholder || label), required: !!item?.required };
  }).filter((item) => {
    if (!item.label || !item.key || seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  }).slice(0, 24);
}

export function getDefaultProductFieldSchema(categoryName: string, productContext = ""): ProductCategorySchema {
  const name = String(categoryName || "").trim().toLowerCase();
  const isJeansProduct = /\b(jeans|denim|trousers?|pants?)\b/.test(`${name} ${String(productContext || "").toLowerCase()}`);
  if (/(mobile|mobiles|smartphone|smart phone|cell phone|mobile phone|android|iphone)/.test(name)) {
    return {
      show_variants: true, show_colors: true, show_description: true,
      requires_color: true, requires_color_images: true,
      variant_label: "RAM / Storage",
      variant_options: ["4 GB / 64 GB", "4 GB / 128 GB", "6 GB / 128 GB", "8 GB / 128 GB", "8 GB / 256 GB", "12 GB / 256 GB", "12 GB / 512 GB"],
      color_label: "Colour",
      description_label: "Product overview",
      description_placeholder: "Describe the phone's key features and what is included.",
      product_attributes: [field("Brand", true), field("Model", true), field("Processor"), field("Display"), field("Rear camera"), field("Front camera"), field("Battery"), field("Operating system"), field("Warranty")],
    };
  }
  if (/(electronics|electronic|laptop|computer|tablet|gadget|television|tv|appliance)/.test(name)) {
    return {
      show_variants: true, show_colors: true, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: "Model / Configuration",
      variant_options: ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"],
      color_label: "Colour",
      description_label: "Specifications & features",
      description_placeholder: "Add the main specifications, compatibility and warranty information.",
      product_attributes: [field("Brand"), field("Model"), field("Processor"), field("Display / Size"), field("Connectivity"), field("Warranty")],
    };
  }
  if (/(clothing|fashion|apparel|garment|wear|shirt|jeans|textile|kurta|dress)/.test(name)) {
    return {
      show_variants: true, show_colors: true, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: isJeansProduct ? "Waist size (inches)" : "Clothing size",
      variant_options: isJeansProduct
        ? ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46"]
        : ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
      color_label: "Colour",
      description_label: "Fabric & fit details",
      description_placeholder: "Describe fabric, fit, pattern, care and styling details.",
      product_attributes: [field("Brand"), field("Fabric"), field("Fit"), field("Pattern"), field("Sleeve / Neck"), field("Occasion"), field("Care instructions")],
    };
  }
  if (/(footwear|shoe|shoes|sandal|slipper|sneaker)/.test(name)) {
    return {
      show_variants: true, show_colors: true, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: "Shoe size (UK)",
      variant_options: ["UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"],
      color_label: "Colour",
      description_label: "Material & fit details",
      description_placeholder: "Describe the material, fit, care and sole details.",
      product_attributes: [field("Brand"), field("Upper material"), field("Sole material"), field("Closure"), field("Ideal for"), field("Care instructions")],
    };
  }
  if (/(grocery|kirana|supermarket|daily needs|provision|food grain|general store|staple|dairy)/.test(name)) {
    return {
      show_variants: true, show_colors: false, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: "Pack size / Weight / Volume",
      variant_options: ["100 g", "200 g", "250 g", "500 g", "1 kg", "2 kg", "5 kg", "10 kg", "100 ml", "250 ml", "500 ml", "1 L", "1 pc"],
      color_label: "Colour",
      description_label: "Product information",
      description_placeholder: "Add brand, ingredients, storage or expiry information where relevant.",
      product_attributes: [field("Brand"), field("Product type / Flavour"), field("Ingredients"), field("Shelf life"), field("Storage instructions")],
    };
  }
  if (/(medicine|medicines|pharmacy|chemist|drugstore)/.test(name)) {
    return {
      show_variants: true, show_colors: false, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: "Pack size / Strength",
      variant_options: ["10 tablets", "15 tablets", "30 tablets", "60 tablets", "100 ml", "200 ml", "1 bottle"],
      color_label: "Colour",
      description_label: "Composition & pack information",
      description_placeholder: "Enter the label information and pack details exactly as printed.",
      product_attributes: [field("Brand"), field("Composition"), field("Dosage form"), field("Pack contents"), field("Manufacturer"), field("Expiry")],
    };
  }
  if (/(restaurant|food|cafe|bakery|sweet|snack|meal|fast food|restaurant food)/.test(name)) {
    return {
      show_variants: true, show_colors: false, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: "Portion / Serving",
      variant_options: ["Half", "Full", "Regular", "Large", "Single", "Combo"],
      color_label: "Colour",
      description_label: "Ingredients & food details",
      description_placeholder: "Describe ingredients, preparation style and serving information.",
      product_attributes: [field("Cuisine / Type"), field("Main ingredients"), field("Vegetarian / Non-vegetarian"), field("Allergen information"), field("Serving details")],
    };
  }
  if (/(beauty|cosmetic|personal care|skin care|skincare|makeup|perfume)/.test(name)) {
    return {
      show_variants: true, show_colors: true, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: "Shade / Net quantity",
      variant_options: ["15 ml", "30 ml", "50 ml", "100 ml", "200 ml", "250 g", "500 g"],
      color_label: "Shade",
      description_label: "Ingredients & usage details",
      description_placeholder: "Add ingredients, shade, skin/hair type and usage information from the label.",
      product_attributes: [field("Brand"), field("Product type"), field("Skin / Hair type"), field("Ingredients"), field("Net quantity"), field("Expiry")],
    };
  }
  if (/(furniture|home|decor|interior|mattress|bedding)/.test(name)) {
    return {
      show_variants: true, show_colors: true, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: "Size / Dimensions / Model",
      variant_options: ["Single", "Double", "Queen", "King", "Small", "Medium", "Large"],
      color_label: "Colour / Finish",
      description_label: "Material & specifications",
      description_placeholder: "Describe dimensions, material, finish, assembly and warranty.",
      product_attributes: [field("Brand"), field("Material"), field("Dimensions"), field("Finish"), field("Assembly required"), field("Warranty")],
    };
  }
  if (/(book|stationery|office|school supplies)/.test(name)) {
    return {
      show_variants: true, show_colors: false, show_description: true,
      requires_color: false, requires_color_images: false,
      variant_label: "Edition / Format / Pack",
      variant_options: ["Paperback", "Hardcover", "1 pc", "Pack of 5", "Pack of 10", "Pack of 20"],
      color_label: "Colour",
      description_label: "Author & product details",
      description_placeholder: "Add author, publisher, edition, language and other relevant details.",
      product_attributes: [field("Author"), field("Publisher"), field("Language"), field("Edition"), field("Pages / Quantity")],
    };
  }
  return {
    show_variants: false, show_colors: false, show_description: true,
    requires_color: false, requires_color_images: false,
    variant_label: "Product option",
    variant_options: [],
    color_label: "Colour",
    description_label: "Product details",
    description_placeholder: "Add useful product details.",
    product_attributes: [],
  };
}

/** Kept for existing callers; new category screens should use getDefaultProductFieldSchema. */
export function getDefaultProductFieldFlags(categoryName: string) {
  const schema = getDefaultProductFieldSchema(categoryName);
  return {
    show_variants: schema.show_variants,
    show_colors: schema.show_colors,
    show_description: schema.show_description,
  };
}

export function getProductCategoryConfig(category: any, productContext = ""): ProductCategoryConfig {
  const name = String(category?.name || "").trim().toLowerCase();
  const isClothingCategory = /(clothing|fashion|apparel|garment|wear|shirt|jeans|textile|kurta|dress)/.test(name);
  const isJeansProduct = isClothingCategory && /\\b(jeans|denim|trousers?|pants?)\\b/.test(`${name} ${String(productContext || "").toLowerCase()}`);
  const defaults = getDefaultProductFieldSchema(name, productContext);
  const saved = category?.product_fields && typeof category.product_fields === "object" ? category.product_fields : {};
  const requiresColor = typeof saved.requires_color === "boolean" ? saved.requires_color : defaults.requires_color;
  const showColors = isClothingCategory || requiresColor || (typeof saved.show_colors === "boolean" ? saved.show_colors : defaults.show_colors);
  const variantOptions = isJeansProduct
    ? defaults.variant_options
    : Array.isArray(saved.variant_options)
      ? saved.variant_options.map((value: any) => String(value || "").trim()).filter(Boolean).slice(0, 60)
      : defaults.variant_options;
  const productAttributes = saved.product_attributes !== undefined
    ? normalizeProductAttributeFields(saved.product_attributes)
    : defaults.product_attributes;
  const schema: ProductCategorySchema = {
    ...defaults,
    ...saved,
    show_variants: isClothingCategory ? true : (typeof saved.show_variants === "boolean" ? saved.show_variants : defaults.show_variants),
    show_colors: showColors,
    show_description: typeof saved.show_description === "boolean" ? saved.show_description : defaults.show_description,
    requires_color: requiresColor,
    requires_color_images: typeof saved.requires_color_images === "boolean" ? saved.requires_color_images : defaults.requires_color_images,
    variant_label: isJeansProduct ? defaults.variant_label : String(saved.variant_label || defaults.variant_label),
    variant_options: variantOptions,
    color_label: String(saved.color_label || defaults.color_label),
    description_label: String(saved.description_label || defaults.description_label),
    description_placeholder: String(saved.description_placeholder || defaults.description_placeholder),
    product_attributes: productAttributes,
  };
  return {
    ...schema,
    showVariants: schema.show_variants,
    showColors: schema.show_colors,
    showDescription: schema.show_description,
    requiresColor: schema.requires_color,
    requiresColorImages: schema.requires_color_images,
    variantLabel: schema.variant_label,
    variantOptions: schema.variant_options,
    colorLabel: schema.color_label,
    descriptionLabel: schema.description_label,
    descriptionPlaceholder: schema.description_placeholder,
    productAttributes: schema.product_attributes,
    variantDescriptionsEnabled: schema.show_variants,
  };
}
