
import axios from "axios";
import { refreshAccessTokenApi } from "@/api/auth/auth";
// import { snackbarBus } from "@/utils/snackbarBus";

const baseBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const userAxios = axios.create({
  baseURL: baseBackendUrl,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let currentDomain = "evercare-two.vercel.app";
export const setCurrentDomainInAxios = (domain = "") => {
  if (domain !== "" && domain !== currentDomain) {
    currentDomain = domain;
  }
};

// -----------------------
// REQUEST INTERCEPTOR
// -----------------------
userAxios.interceptors.request.use(
  (config) => {
    let token = null;

    if (typeof window !== "undefined") {
      token = localStorage.getItem("userAccessToken");
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (token) {
      delete config.requireAuthHeader;
    }
    config.headers["X-domain-name"] = currentDomain;
    return config;
  },
  (error) => Promise.reject(error)
);

// -----------------------
// RESPONSE INTERCEPTOR (Promise-based refresh)
// -----------------------
let refreshPromise = null;

userAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const responseError = error.response;
    const reqUrl = (originalRequest?.url || "").toString();

    if (responseError?.status === 401) {
      const code = responseError?.data?.code;
      if (
        code === "NO_TOKEN" ||
        code === "ACCOUNT_INACTIVE" ||
        code === "USER_NOT_FOUND" ||
        code === "TOKEN_INVALID" ||
        code === "TOKEN_ERROR"
      ) {
        // console.log("Refresh prevented due to:", code);
        // snackbarBus.emit(responseError.data.message, "error");
        localStorage.removeItem("userAccessToken");
        window.location.assign("/logout");
        return Promise.reject(error);
      }
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        if (refreshPromise) {
          try {
            const token = await refreshPromise;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return userAxios(originalRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }

        refreshPromise = refreshAccessTokenApi()
          .then((data) => {
            const newToken = data.accessToken;
            localStorage.setItem("userAccessToken", newToken);
            return newToken;
          })
          .catch((err) => {
            localStorage.removeItem("userAccessToken");
            if (!reqUrl.includes("logout")) {
              window.location.assign("/logout");
            }
            throw err;
          })
          .finally(() => {
            refreshPromise = null;
          });

        try {
          const token = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return userAxios(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      } else {
        // Second 401, logout user
        localStorage.removeItem("userAccessToken");
        window.location.assign("/logout");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default userAxios;
