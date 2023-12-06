import request from "./request.js";
import type { Card, CreateCardRequest, Paginated, User } from "./types.js";
import { card as cardSchema, paginated } from "./types.js";

export function getCard(id: Card["id"]) {
  return request(`/cards/v1/${id}`, { method: "GET" }, cardSchema);
}

export function getCardByUserID(userId: User["id"]) {
  return request<Paginated<typeof cardSchema>>(
    `/cards/v1?filter[user_id]=${userId}`,
    { method: "GET" },
    paginated(cardSchema),
  );
}

export function createCard(card: CreateCardRequest) {
  return request<Card>(
    "/cards/v1",
    {
      method: "POST",
      body: card,
      headers: {
        "x-idempotency-key": card.user_id, // TODO use a real idempotency key
      },
    },
    cardSchema,
  );
}
