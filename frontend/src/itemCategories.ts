export const ITEM_CATEGORY_PRESETS: Record<string, string[]> = {
  "cat-fashion": [
    "T-Shirts",
    "Shirts",
    "Jeans",
    "Trousers",
    "Dresses",
    "Footwear",
    "Accessories",
  ],
  "cat-grocery": [
    "Fruits & Vegetables",
    "Atta & Rice",
    "Dal & Pulses",
    "Oil & Ghee",
    "Dairy",
    "Snacks",
    "Beverages",
  ],
  "cat-food": [
    "North Indian",
    "South Indian",
    "Chinese",
    "Fast Food",
    "Biryani",
    "Desserts",
    "Beverages",
  ],
  "cat-electronics": [
    "Mobiles",
    "Laptops",
    "Audio",
    "TV & Entertainment",
    "Accessories",
    "Smart Home",
  ],
  "cat-medicine": [
    "Prescription",
    "OTC Medicines",
    "Vitamins",
    "Personal Care",
    "Baby Care",
    "First Aid",
  ],
};

export function getItemCategoryOptions(
  categoryId: string,
  categories: any[] = []
): string[] {
  const direct = ITEM_CATEGORY_PRESETS[categoryId];
  if (direct) return direct;

  const categoryName = String(
    categories.find((category) => category?.id === categoryId)?.name || ""
  ).toLowerCase();

  if (categoryName.includes("fashion") || categoryName.includes("cloth")) {
    return ITEM_CATEGORY_PRESETS["cat-fashion"];
  }
  if (categoryName.includes("grocery")) {
    return ITEM_CATEGORY_PRESETS["cat-grocery"];
  }
  if (categoryName.includes("food")) {
    return ITEM_CATEGORY_PRESETS["cat-food"];
  }
  if (categoryName.includes("electronic")) {
    return ITEM_CATEGORY_PRESETS["cat-electronics"];
  }
  if (categoryName.includes("medicine") || categoryName.includes("pharmacy")) {
    return ITEM_CATEGORY_PRESETS["cat-medicine"];
  }

  return ["General"];
}
