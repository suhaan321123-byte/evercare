// utils/tokenKey.js

/**
 * Get the base site name from hostname (first part before ".")
 * Example: "ryahoo.localhost" -> "ryahoo"
 *          "foodie.example.com" -> "foodie"
 */
function getSiteName() {
  if (typeof window === "undefined") return "default";
  const parts = window.location.hostname.split(".");
  return parts[0]; // Take only the first part of hostname
}

export function getCustomerTokenKey() {
  return `${getSiteName()}_accessToken`;
}

export function getCustomerToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getCustomerTokenKey());
}

export function setCustomerToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getCustomerTokenKey(), token);
}

export function removeCustomerToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getCustomerTokenKey());
}
