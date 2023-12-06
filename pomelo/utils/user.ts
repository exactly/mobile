import request from "./request.js";
import type { CreateUserRequest, User } from "./types.js";
import { user as userSchema } from "./types.js";

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
