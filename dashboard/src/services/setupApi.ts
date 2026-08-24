import axios from "axios";

let initialized = false;

const USER_ID_KEY = "userId";
const USER_ROLE_KEY = "userRole";

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
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

export function getCurrentUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function getCurrentUserRole(): string | null {
  return localStorage.getItem(USER_ROLE_KEY);
}

export function isCurrentUserAdmin(): boolean {
  return String(getCurrentUserRole() || "").toUpperCase() === "ADMIN";
}

export function persistSession(token: string, user?: { _id?: string; role?: string }) {
  localStorage.setItem("token", token);
  if (user?._id) localStorage.setItem(USER_ID_KEY, String(user._id));
  if (user?.role) localStorage.setItem(USER_ROLE_KEY, String(user.role));
}

/** Session valide + rôle Admin (UX dashboard). Backend reste l'autorité. */
export async function validateSession(): Promise<boolean> {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const res = await axios.get(`${getApiUrl()}/utilisateur/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200 || res.data?.valid !== true) {
      clearSession();
      return false;
    }
    if (res.data?.userId) {
      localStorage.setItem(USER_ID_KEY, String(res.data.userId));
    }
    if (res.data?.role) {
      localStorage.setItem(USER_ROLE_KEY, String(res.data.role));
    }
    // STAB-11 : dashboard réservé Admin (UX) — le backend refuse déjà les routes admin
    if (String(res.data?.role || "").toUpperCase() !== "ADMIN") {
      clearSession();
      return false;
    }
    return true;
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
