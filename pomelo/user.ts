import request from "./common";
import type { CreateUserRequest, User } from "./types";

export async function getUser(userId: User["id"]) {
  try {
    return request<User>("GET", `/users/v1/${userId}`);
  } catch {
    // couldn't find user, return undefined
  }
}

export function createUser(user: CreateUserRequest) {
  return request<User>("POST", "/users/v1", user);
}
