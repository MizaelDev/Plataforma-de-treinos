const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

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
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
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
