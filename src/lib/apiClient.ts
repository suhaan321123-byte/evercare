import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";
import { clearCustomerSession, getCustomerSession, setCustomerSession } from "@/lib/customerAuth";
import { getBackendBaseUrl } from "@/lib/backendUrl";

type ApiErrorPayload = {
  message?: string;
  error?: string;
  code?: string;
};

function getErrorMessage(err: unknown) {
  if (!err) return "Request failed";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return "Request failed";
}

function getAxiosErrorMessage(err: AxiosError<ApiErrorPayload>) {
  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    "Request failed"
  );
}
const currentDomain = "https://evercare.app.colaber.in";

function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

const refreshClient = axios.create({
  baseURL: getBackendBaseUrl(),
  timeout: 20000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

class ApiClient {
  private axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: getBackendBaseUrl(),
      timeout: 20000,
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });

    this.axios.interceptors.request.use((config) => {
      const session = getCustomerSession();
      const token = session?.token ? String(session.token) : "";
      if (token) {
        config.headers = AxiosHeaders.from(config.headers);
        config.headers.set("Authorization", `Bearer ${token}`);
      }
      config.headers["X-domain-name"] = currentDomain;
      return config;
    });

    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const responseError = error.response;
        const reqUrl = String(originalRequest?.url || "");

        if (responseError?.status === 401) {
          const code = String(responseError?.data?.code || "");
          if (
            code === "NO_TOKEN" ||
            code === "TOKEN_INVALID" ||
            code === "TOKEN_ERROR" ||
            code === "CUSTOMER_NOT_FOUND"
          ) {
            clearCustomerSession();
            // if (typeof window !== "undefined" && !reqUrl.includes("logout")) {
            //   window.location.assign("/checkout-login");
            // }
            return Promise.reject(error);
          }

          if (!originalRequest?._retry && code === "TOKEN_EXPIRED") {
            originalRequest._retry = true;

            try {
              const refreshResponse = await refreshClient.post(
                "/auth/user_reauth",
                {},
                {
                  headers: { "X-Session-Type": "customer" },
                },
              );

              const newToken = String(refreshResponse?.data?.accessToken || "");
              if (!newToken) {
                throw new Error("Refresh token invalid");
              }

              const currentSession = getCustomerSession();
              setCustomerSession(
                currentSession
                  ? {
                      ...currentSession,
                      token: newToken,
                    }
                  : {
                      token: newToken,
                      createdAt: Date.now(),
                    },
              );

              originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
              originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
              return this.axios.request(originalRequest);
            } catch (refreshError) {
              clearCustomerSession();
              // if (typeof window !== "undefined" && !reqUrl.includes("logout")) {
              //   window.location.assign("/checkout-login");
              // }
              return Promise.reject(refreshError);
            }
          }

          clearCustomerSession();
          // if (typeof window !== "undefined" && !reqUrl.includes("logout")) {
          //   window.location.assign("/checkout-login");
          // }
        }

        return Promise.reject(error);
      },
    );
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    try {
      const res = await this.axios.request<T>(config);
      return res.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ApiErrorPayload>;
        const error = new Error(getAxiosErrorMessage(axiosError)) as Error & {
          code?: string;
          status?: number;
        };
        error.code = axiosError.response?.data?.code;
        error.status = axiosError.response?.status;
        throw error;
      }
      throw new Error(getErrorMessage(err));
    }
  }

  get<T = unknown>(
    url: string,
    opts?: { query?: Record<string, string | number | boolean | undefined> },
  ) {
    const params = opts?.query;
    return this.request<T>({
      method: "GET",
      url: isAbsoluteUrl(url) ? url : url,
      params,
    });
  }

  post<T = unknown, B = unknown>(
    url: string,
    body?: B,
    opts?: { query?: Record<string, string | number | boolean | undefined> },
  ) {
    const params = opts?.query;
    return this.request<T>({
      method: "POST",
      url: isAbsoluteUrl(url) ? url : url,
      data: body,
      params,
    });
  }
}

export const apiClient = new ApiClient();
