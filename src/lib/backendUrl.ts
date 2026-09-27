export function getBackendBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_COLABER_API_BASE_URL ||
    "";
  return String(fromEnv || "https://backbin.colaber.in").replace(/\/$/, "");
}
