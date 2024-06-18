import request from "./request.ts";
import type { CreateUserRequest, User } from "./types.ts";
import { paginated, responseData, user as userSchema } from "./types.ts";

export async function getUser(userId: User["id"]) {
  return request<{ data: User }>(`/users/v1/${userId}`, { method: "GET" }, responseData(userSchema));
}

export async function getUserByEmail(email: User["email"]) {
  const response = await request<{ data: User[] }>(
    `/users/v1/?filter[email]=${email}`,
    { method: "GET" },
    paginated(userSchema),
  );
  return response.data[0];
}

export async function getUserByCredentialID(credentialId: string) {
  return getUserByEmail(`${credentialId}@exactly.account`);
}

export async function createUser(user: CreateUserRequest) {
  return request<{ data: User }>("/users/v1", { method: "POST", body: user }, responseData(userSchema));
}
