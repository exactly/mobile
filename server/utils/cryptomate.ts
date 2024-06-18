if (!process.env.CRYPTOMATE_URL || !process.env.CRYPTOMATE_API_KEY) throw new Error("missing cryptomate vars");
const baseURL = process.env.CRYPTOMATE_URL;
const apiKey = process.env.CRYPTOMATE_API_KEY;

// eslint-disable-next-line import/prefer-default-export
export function createCard(name: string) {
  return request("/card", { card_holder_name: name, approval_method: "WEBHOOK" });
}

async function request<T = unknown>(
  url: `/${string}`,
  body?: unknown,
  method: "GET" | "POST" = body === undefined ? "GET" : "POST",
) {
  const response = await fetch(`${baseURL}${url}`, {
    method,
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${String(response.status)} ${await response.text()}`);
  return response.json() as Promise<T>;
}
