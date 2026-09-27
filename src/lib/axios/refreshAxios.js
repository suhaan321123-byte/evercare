import axios from "axios";

const baseBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const rolePath = "/";

export const refreshAxios = axios.create({
  baseURL: `${baseBackendUrl}${rolePath}`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});