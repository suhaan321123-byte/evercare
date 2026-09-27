export type CustomerSession = {
  token?: string;
  customerId?: string;
  email?: string;
  name?: string;
  image?: string;
  createdAt: number;
  [key: string]: any; // allows any extra fields
};


const STORAGE_KEY = "ecom:customerSession:v1";

export function getCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerSession;
    if (!parsed || typeof parsed !== "object") return null;
    // if (typeof parsed.createdAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCustomerSession(next: CustomerSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (!next) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota/private mode errors.
  }
}

export function clearCustomerSession() {
  setCustomerSession(null);
}

export function decodeBase64UrlJson<T = unknown>(value: string): T {
  const raw = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = raw.padEnd(Math.ceil(raw.length / 4) * 4, "=");
  const json = atob(padded);
  return JSON.parse(json) as T;
}
