import axios from "axios";
import { refreshAccessTokenApi } from "@/api/auth/auth";
import {
  getCustomerToken,
  setCustomerToken,
  removeCustomerToken,
} from "@/utils/tokenKey";

const baseBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const customerAxios = axios.create({
  baseURL: baseBackendUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    timeout: 1000,
  },
});

// -----------------------
// REQUEST INTERCEPTOR
// -----------------------
customerAxios.interceptors.request.use(
  (config) => {
    const token = getCustomerToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      delete config.requireAuthHeader;
    }
    if (typeof window !== "undefined") {
      const hostname = window.location.host;
      config.params = config.params || {};
      config.params.hostname = hostname;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -----------------------
// RESPONSE INTERCEPTOR
// -----------------------
let refreshPromise = null;

customerAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const responseError = error.response;
    const reqUrl = (originalRequest?.url || "").toString();

    if (responseError?.status === 401) {
      const code = responseError?.data?.code;

      if (
        code === "NO_TOKEN" ||
        code === "CUSTOMER_NOT_FOUND" ||
        code === "TOKEN_INVALID" ||
        code === "TOKEN_ERROR"
      ) {
        // console.log("Refresh prevented due to:", code);
        // removeCustomerToken();
        // window.location.assign("/logout");
        // snackbarBus.emit(responseError.data.message, "error");
        return Promise.reject(error);
      }

      if (!originalRequest._retry && code === "TOKEN_EXPIRED") {
        originalRequest._retry = true;

        if (refreshPromise) {
          try {
            const token = await refreshPromise;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return customerAxios(originalRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }

        refreshPromise = refreshAccessTokenApi("customer")
          .then((data) => {
            const newToken = data.accessToken;
            setCustomerToken(newToken);
            return newToken;
          })
          .catch((err) => {
            removeCustomerToken();
            if (!reqUrl.includes("logout")) {
              // window.location.assign("/logout");
            }
            throw err;
          })
          .finally(() => {
            refreshPromise = null;
          });

        try {
          const token = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return customerAxios(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      } else {
        removeCustomerToken();
        if (!reqUrl.includes("logout")) {
          window.location.assign("/logout");
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default customerAxios;
