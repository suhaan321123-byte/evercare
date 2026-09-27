export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-V48NPN8LH2";

export const GA_ALLOWED_HOSTS = (
  process.env.NEXT_PUBLIC_GA_ALLOWED_HOSTS || "evercare.app.colaber.in"
)
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

type AnalyticsValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | AnalyticsValue[]
  | { [key: string]: AnalyticsValue };
type AnalyticsEventParams = Record<string, AnalyticsValue>;
type AnalyticsItem = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const isBrowser = () => typeof window !== "undefined";

const isAnalyticsHostAllowed = () => {
  if (!isBrowser()) return false;

  return GA_ALLOWED_HOSTS.includes(window.location.hostname.toLowerCase());
};

const isAnalyticsEnabled = () =>
  process.env.NODE_ENV === "production" &&
  Boolean(GA_MEASUREMENT_ID) &&
  isAnalyticsHostAllowed();

export function pageView(path: string, title?: string) {
  if (!isAnalyticsEnabled() || typeof window.gtag !== "function") return;

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title || document.title,
  });
}

export function trackEvent(eventName: string, params: AnalyticsEventParams = {}) {
  if (!isAnalyticsEnabled() || typeof window.gtag !== "function") return;

  window.gtag("event", eventName, params);
}

export function trackSelectItem(params: AnalyticsEventParams) {
  trackEvent("select_item", params);
}

export function trackViewItem(params: AnalyticsEventParams) {
  trackEvent("view_item", params);
}

export function trackViewProduct(params: {
  itemId: string;
  itemName: string;
  itemCategory?: string;
  price?: number;
  currency?: string;
}) {
  const item: AnalyticsItem = {
    item_id: params.itemId,
    item_name: params.itemName,
    item_category: params.itemCategory,
    price: params.price,
  };

  trackEvent("view_item", {
    currency: params.currency || "INR",
    value: params.price,
    item_id: params.itemId,
    item_name: params.itemName,
    item_category: params.itemCategory,
    items: [item],
  });
}

export function trackAddToCart(params: AnalyticsEventParams) {
  trackEvent("add_to_cart", params);
}

export function trackRemoveFromCart(params: AnalyticsEventParams) {
  trackEvent("remove_from_cart", params);
}

export function trackBeginCheckout(params: AnalyticsEventParams) {
  trackEvent("begin_checkout", params);
}

export function trackCheckoutProgress(params: AnalyticsEventParams) {
  trackEvent("checkout_progress", params);
}

export function trackPurchase(params: AnalyticsEventParams) {
  trackEvent("purchase", params);
}
