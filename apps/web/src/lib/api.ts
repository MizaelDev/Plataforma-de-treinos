const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const GET_CACHE_TTL_MS = 15_000;
const getCache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

function isCacheableGet(path: string) {
  return !path.startsWith("/payments") && !path.startsWith("/dev");
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PROFESSOR" | "ALUNO";
  organizationId: string;
  studentId?: string;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("academia.token");
}

export function setSession(token: string, user: SessionUser) {
  getCache.clear();
  window.localStorage.setItem("academia.token", token);
  window.localStorage.setItem("academia.user", JSON.stringify(user));
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;

  const user = window.localStorage.getItem("academia.user");
  if (!user) return null;

  try {
    return JSON.parse(user) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  window.localStorage.removeItem("academia.token");
  window.localStorage.removeItem("academia.user");
  getCache.clear();
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const cacheKey = method === "GET" && isCacheableGet(path) ? path : "";
  const cached = cacheKey ? getCache.get(cacheKey) : undefined;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise as Promise<T>;
  }

  if (method !== "GET") {
    getCache.clear();
  }

  const request = requestApi<T>(path, init);

  if (cacheKey) {
    getCache.set(cacheKey, {
      expiresAt: Date.now() + GET_CACHE_TTL_MS,
      promise: request
    });
    request.catch(() => getCache.delete(cacheKey));
  }

  return request;
}

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Erro inesperado." }));

    if (response.status === 401) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    const issueMessages = Array.isArray(payload.issues)
      ? payload.issues
          .map((issue: { field?: string; message?: string }) => [issue.field, issue.message].filter(Boolean).join(": "))
          .join(" ")
      : "";

    throw new Error([payload.message ?? "Erro inesperado.", issueMessages].filter(Boolean).join(" "));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
