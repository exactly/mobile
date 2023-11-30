import request from "./request.js";
import type { Card, CreateCardRequest, Paginated, User } from "./types.js";

export function getCard(id: Card["id"]) {
  return request<Card>("GET", `/cards/v1/${id}`);
}

export function getCardByUserID(userId: User["id"]) {
  return request<Paginated<Card>>("GET", `/cards/v1?filter[user_id]=${userId}`);
}

export function createCard(card: CreateCardRequest) {
  return request<Card>("POST", "/cards/v1", card, {
    "x-idempotency-key": card.user_id, // TODO use a real idempotency key
  });
}
