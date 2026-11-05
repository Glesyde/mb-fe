import axios from "axios";

// Fallback to the production domain if the environment variable isn't found
export const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL
// ||
// "https://api-his.Medbookiehospitals.com";

console.debug("[AUTH_DEBUG] API Base URL:", BASE_URL);

/**
 * Production API Engine for MedCore HIS
 * Configured for HttpOnly Cookie Authentication
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Request Interceptor for logging
apiClient.interceptors.request.use((config) => {
  console.debug(
    `[AUTH_DEBUG] Request: ${config.method?.toUpperCase()} ${config.url}`,
  );
  return config;
});

// Response Interceptor: Handle 401 Unauthorized with Cookie Refresh logic
apiClient.interceptors.response.use(
  (response) => {
    console.debug(
      `[AUTH_DEBUG] Response Success: ${response.config.url}`,
      response.data,
    );
    return response;
  },
  async (error) => {
    console.error(
      `[AUTH_DEBUG] Response Error: ${error.config?.url}`,
      error.response?.status,
      error.response?.data,
    );

    const originalRequest = error.config;

    // Handle session expiry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.debug("[AUTH_DEBUG] Attempting session refresh...");

      try {
        await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        console.debug(
          "[AUTH_DEBUG] Refresh successful, retrying original request",
        );
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("[AUTH_DEBUG] Refresh failed, clearing session");
        // If refresh fails, session is completely dead
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
