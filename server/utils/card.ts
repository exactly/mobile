import request from "./request.js";
import type { Card, CreateCardRequest, Paginated, User } from "./types.js";
import { card as cardSchema, paginated, responseData } from "./types.js";

export function getCard(id: Card["id"]) {
  return request(`/cards/v1/${id}`, { method: "GET" }, cardSchema);
}

export async function getCardsByUserID(userId: User["id"]) {
  const response = await request<Paginated<typeof cardSchema>>(
    `/cards/v1?filter[user_id]=${userId}`,
    { method: "GET" },
    paginated(cardSchema),
  );
  return response.data;
}

export function createCard(card: CreateCardRequest) {
  return request<{ data: Card }>(
    "/cards/v1",
    {
      method: "POST",
      body: card,
      headers: {
        "x-idempotency-key": card.user_id, // TODO use a real idempotency key
      },
    },
    responseData(cardSchema),
  );
}
