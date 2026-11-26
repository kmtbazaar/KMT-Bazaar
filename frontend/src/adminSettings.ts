import AsyncStorage from "@react-native-async-storage/async-storage";

export type AdminThemeMode = "day" | "night" | "system";

export type AdminQuickAction = {
  icon: string;
  label: string;
  path: string;
  color: string;
};

export type AdminSettings = {
  themeMode: AdminThemeMode;
  quickActionOrder: string[];
  hiddenQuickActions: string[];
};

export const ADMIN_SETTINGS_KEY = "kmt_admin_settings_v1";

export const DEFAULT_ADMIN_ACTIONS: AdminQuickAction[] = [
  { icon: "package-variant", label: "Products", path: "/admin/products", color: "#8B5CF6" },
  { icon: "tag-multiple-outline", label: "Categories", path: "/admin/categories", color: "#EC4899" },
  { icon: "tools", label: "Daily Services", path: "/admin/daily-services", color: "#38BDF8" },
  { icon: "image-multiple-outline", label: "Banners", path: "/admin/banners", color: "#38BDF8" },
  { icon: "briefcase-account-outline", label: "Roojgar", path: "/admin/roojgar", color: "#5A3825" },
];

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  themeMode: "day",
  quickActionOrder: DEFAULT_ADMIN_ACTIONS.map((item) => item.label),
  hiddenQuickActions: [],
};

export async function loadAdminSettings(): Promise<AdminSettings> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) return DEFAULT_ADMIN_SETTINGS;

    const parsed = JSON.parse(raw) || {};
    const validLabels = new Set(DEFAULT_ADMIN_ACTIONS.map((item) => item.label));
    const storedOrder = Array.isArray(parsed.quickActionOrder)
      ? parsed.quickActionOrder.filter((label: any) => validLabels.has(label))
      : [];

    const order = [
      ...storedOrder,
      ...DEFAULT_ADMIN_ACTIONS
        .map((item) => item.label)
        .filter((label) => !storedOrder.includes(label)),
    ];

    const hidden = Array.isArray(parsed.hiddenQuickActions)
      ? parsed.hiddenQuickActions.filter((label: any) => validLabels.has(label))
      : [];

    const themeMode =
      parsed.themeMode === "night" || parsed.themeMode === "system"
        ? parsed.themeMode
        : "day";

    return {
      themeMode,
      quickActionOrder: order,
      hiddenQuickActions: hidden,
    };
  } catch {
    return DEFAULT_ADMIN_SETTINGS;
  }
}

export async function saveAdminSettings(settings: AdminSettings) {
  await AsyncStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
}
