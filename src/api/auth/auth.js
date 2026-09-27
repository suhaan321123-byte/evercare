import userAxios from "@/lib/axios/axios";
import { refreshAxios } from "@/lib/axios/refreshAxios";
// import { snackbarBus } from "@/utils/snackbarBus";

export const refreshAccessTokenApi = (sessionType = "user") => {
  return new Promise((resolve, reject) => {
    refreshAxios
      .post(
        "/auth/user_reauth",
        {},
        {
          headers: { "X-Session-Type": sessionType },
        },
      )
      .then((response) => {
        if (response.status !== 200 || !response.data.accessToken) {
          const error = new Error("Refresh token invalid");
          error.response = response;
          reject(error);
        } else {
          resolve(response.data);
        }
      })
      .catch((error) => {
        // snackbarBus.emit(error.response.data.message, "error");

        console.error("Failed to refresh token:", error.response);
        reject(error);
      });
  });
};
