import axios, { type AxiosError } from "axios";



let initialized = false;



const USER_ID_KEY = "userId";

const USER_ROLE_KEY = "userRole";

const USER_NOM_KEY = "userNom";

const USER_PRENOM_KEY = "userPrenom";

const USER_EMAIL_KEY = "userEmail";



export function getApiUrl() {

  return process.env.REACT_APP_API_URL || "http://localhost:3000/api";

}



function normalizedApiBase(): string {

  return getApiUrl().replace(/\/$/, "");

}



/** Ne pas envoyer le JWT vers Cloudinary, cartes, médias ou APIs tierces. */

export function isInternalSoutraliApiUrl(requestUrl: string, apiBase = normalizedApiBase()): boolean {

  if (!requestUrl || !apiBase) return false;

  try {

    const base = new URL(apiBase.endsWith("/") ? apiBase : `${apiBase}/`);

    let resolved: URL;

    if (/^https?:\/\//i.test(requestUrl)) {

      resolved = new URL(requestUrl);

    } else {

      const rel = String(requestUrl).replace(/^\//, "");

      resolved = new URL(rel, base);

    }

    const basePath = base.pathname.replace(/\/$/, "") || "/api";

    return resolved.origin === base.origin && resolved.pathname.startsWith(basePath);

  } catch {

    return false;

  }

}



/** Instance Axios dédiée — intercepteurs JWT uniquement ici (pas sur axios global). */

export const apiClient = axios.create({

  baseURL: normalizedApiBase(),

});



/** API interne publique (login, etc.) — pas de JWT, pas de clearSession sur 401. */

export const publicApiClient = axios.create({

  baseURL: normalizedApiBase(),

});



export function isApiClientError(err: unknown): err is AxiosError {

  return axios.isAxiosError(err);

}



/** @deprecated Préférer apiClient ; conservé pour compatibilité ponctuelle. */

export function getAuthHeaders(): Record<string, string> {

  const token = localStorage.getItem("token");

  return token ? { Authorization: `Bearer ${token}` } : {};

}



export function isAuthenticated(): boolean {

  return !!localStorage.getItem("token");

}



export async function clearSession() {

  const token = localStorage.getItem("token");



  if (token) {

    try {

      await apiClient.post("/logout", {});

    } catch (error) {

      console.warn("⚠️ Erreur lors de la déconnexion backend:", error);

    }

  }



  localStorage.removeItem("token");

  localStorage.removeItem(USER_ID_KEY);

  localStorage.removeItem(USER_ROLE_KEY);

  localStorage.removeItem(USER_NOM_KEY);

  localStorage.removeItem(USER_PRENOM_KEY);

  localStorage.removeItem(USER_EMAIL_KEY);

}



export function getStoredUserIdentity(): { nom: string; prenom: string; email: string } {

  return {

    nom: localStorage.getItem(USER_NOM_KEY) || "",

    prenom: localStorage.getItem(USER_PRENOM_KEY) || "",

    email: localStorage.getItem(USER_EMAIL_KEY) || "",

  };

}



export function persistUserIdentity(identity: { nom?: string; prenom?: string; email?: string }) {

  if (identity.nom != null) localStorage.setItem(USER_NOM_KEY, String(identity.nom));

  if (identity.prenom != null) localStorage.setItem(USER_PRENOM_KEY, String(identity.prenom));

  if (identity.email != null) localStorage.setItem(USER_EMAIL_KEY, String(identity.email));

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



export function persistSession(

  token: string,

  user?: { _id?: string; role?: string; nom?: string; prenom?: string; email?: string },

) {

  localStorage.setItem("token", token);

  if (user?._id) localStorage.setItem(USER_ID_KEY, String(user._id));

  if (user?.role) localStorage.setItem(USER_ROLE_KEY, String(user.role));

  persistUserIdentity({

    nom: user?.nom,

    prenom: user?.prenom,

    email: user?.email,

  });

}



export async function validateSession(): Promise<boolean> {

  const token = localStorage.getItem("token");

  if (!token) return false;



  try {

    const res = await apiClient.get("/utilisateur/profile");

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



export function setupApiClient() {

  if (initialized) return;

  initialized = true;



  apiClient.interceptors.request.use((config) => {

    const fullUrl = axios.getUri({

      ...config,

      baseURL: config.baseURL ?? normalizedApiBase(),

    });



    if (!isInternalSoutraliApiUrl(fullUrl)) {

      return config;

    }



    const token = localStorage.getItem("token");

    if (token) {

      config.headers = config.headers ?? {};

      config.headers.Authorization = `Bearer ${token}`;

    }

    return config;

  });



  apiClient.interceptors.response.use(

    (response) => response,

    (error) => {

      const status = error.response?.status;

      const url = String(error.config?.url ?? "");

      const fullUrl = axios.getUri({

        ...error.config,

        baseURL: error.config?.baseURL ?? normalizedApiBase(),

      });



      if (

        status === 401 &&

        isInternalSoutraliApiUrl(fullUrl) &&

        !url.includes("/login") &&

        !fullUrl.includes("/login")

      ) {

        clearSession();

      }



      return Promise.reject(error);

    },

  );

}


