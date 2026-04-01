import { api } from "@/lib/axios";

export type UserRole = "employee" | "mechanic";

export type UserItem = {
  id: number;
  full_name: string;
  shift_number: string | null;
  unique_code: string;
  is_active: boolean;
  role: UserRole;
};

export type CreateUserPayload = {
  full_name: string;
  shift_number: string | null;
  pin: string;
  role: UserRole;
};

export type ResetUserPinPayload = {
  new_pin: string;
};

export async function listUsers(activeOnly = false) {
  const { data } = await api.get<UserItem[]>("/users", {
    params: { active_only: activeOnly },
  });
  return data;
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await api.post<UserItem>("/users", payload);
  return data;
}

export async function activateUser(userId: number) {
  const { data } = await api.patch<UserItem>(`/users/${userId}/activate`);
  return data;
}

export async function deactivateUser(userId: number) {
  const { data } = await api.patch<UserItem>(`/users/${userId}/deactivate`);
  return data;
}

export async function resetUserPin(
  userId: number,
  payload: ResetUserPinPayload
) {
  const { data } = await api.patch<UserItem>(`/users/${userId}/reset-pin`, payload);
  return data;
}