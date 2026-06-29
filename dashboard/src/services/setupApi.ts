import axios from "axios";

let initialized = false;

export function getApiUrl() {
  return process.env.REACT_APP_API_URL || "http://localhost:3000/api";
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}

export function clearSession() {
  localStorage.removeItem("token");
}

/** Vérifie que le JWT en localStorage est encore valide côté backend. */
export async function validateSession(): Promise<boolean> {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const res = await axios.get(`${getApiUrl()}/utilisateur/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status === 200 && res.data?.valid === true;
  } catch {
    clearSession();
    return false;
  }
}

/** Injecte le JWT sur toutes les requêtes axios du dashboard. */
export function setupApiClient() {
  if (initialized) return;
  initialized = true;

  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      const url = String(error.config?.url ?? "");

      if (status === 401 && !url.includes("/login")) {
        clearSession();
      }

      return Promise.reject(error);
    },
  );
}
