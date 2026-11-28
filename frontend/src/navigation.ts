type BackRouter = {
  canGoBack?: () => boolean;
  back: () => void;
  replace: (href: any) => void;
};

/**
 * Uses normal in-app history when it exists. Direct links and refreshed pages
 * have no previous screen, so return to the current role's own dashboard.
 */
export function safeGoBack(router: BackRouter, fallbackRoute: string) {
  try {
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // Use the role dashboard fallback when navigation history is unavailable.
  }

  router.replace(fallbackRoute as any);
}
