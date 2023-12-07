import request from "./common";
import type { CreateUserRequest, User } from "./types";
import { user as userSchema } from "./types";

export async function getUser(userId: User["id"]) {
  try {
    return request<User>(`/users/v1/${userId}`, { method: "GET" }, userSchema);
  } catch {
    // couldn't find user, return undefined
  }
}

export function createUser(user: CreateUserRequest) {
  return request<User>("/users/v1", { method: "POST", body: user }, userSchema);
}
