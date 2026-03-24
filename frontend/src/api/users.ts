import { API_BASE_URL } from "./config";

export async function getUsers() {
  const res = await fetch(`${API_BASE_URL}/users/`);
  if (!res.ok) throw new Error("Nu pot lua userii");
  return res.json();
}

export async function createUser(data: any, adminToken: string) {
  const res = await fetch(`${API_BASE_URL}/users/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Eroare creare user");
  }

  return res.json();
}