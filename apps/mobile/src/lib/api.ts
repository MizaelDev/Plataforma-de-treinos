const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333";

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? "Falha no login.");
  return payload as { token: string; user: { name: string; role: string } };
}

export async function getStudentDashboard(token: string) {
  const response = await fetch(`${API_URL}/dashboard/student`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? "Falha ao carregar dashboard.");
  return payload;
}
