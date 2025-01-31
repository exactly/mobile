import "../mocks/auth";
import "../mocks/database";
import "../mocks/deployments";
import "../mocks/sentry";

import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { zeroHash, padHex, zeroAddress } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import app from "../../api/card";
import database, { cards, credentials } from "../../database";
import deriveAddress from "../../utils/deriveAddress";
import * as panda from "../../utils/panda";
import * as persona from "../../utils/persona";

const personaTemplate = {
  id: "inquiry-id",
  type: "inquiry",
  attributes: {
    status: "approved",
    "name-middle": null,
    "reference-id": "ref-id",
    "name-first": "First",
    "name-last": "Last",
    "email-address": "email@example.com",
    "phone-number": "1234567890",
  },
} as const;

const panTemplate = {
  encryptedPan: { iv: "xfQikHU/pxVSniCKKKyv8w==", data: "VUPy5u3xdg6fnvT/ZmrE1Lev28SVRjLTTTJEaO9X7is=" },
  encryptedCvc: { iv: "TnHuny8FHZ4lkdm1f622Dg==", data: "SRg1oMmouzr7v4FrVBURcWE9Yw==" }, // cspell:disable-line
} as const;

const cardTemplate = {
  id: "543c1771-beae-4f26-b662-44ea48b40dc6",
  userId: "2cf0c886-f7c0-40f3-a8cd-3c4ab3997b66",
  type: "virtual",
  status: "active",
  limit: { amount: 5000, frequency: "per24HourPeriod" },
  last4: "7394",
  expirationMonth: "9",
  expirationYear: "2029",
} as const;

const appClient = testClient(app);

describe("authenticated", () => {
  const bob = privateKeyToAddress(padHex("0xb0b"));
  const account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(bob), y: zeroHash });
  const captureException = vi.spyOn(sentry, "captureException");

  beforeAll(async () => {
    await database.insert(credentials).values([
      {
        id: account,
        publicKey: new Uint8Array(),
        account,
        factory: zeroAddress,
        pandaId: "2cf0c886-f7c0-40f3-a8cd-3c4ab3997b66",
      },
    ]);
  });

  afterEach(() => {
    captureException.mockClear();
  });

  it("returns 403 kyc not done", async () => {
    vi.spyOn(persona, "getInquiry").mockResolvedValueOnce(undefined); // eslint-disable-line unicorn/no-useless-undefined
    const response = await appClient.index.$get(
      { query: { credentialId: "card" } },
      { headers: { "test-credential-id": account } },
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 card not found", async () => {
    vi.spyOn(persona, "getInquiry").mockResolvedValueOnce(personaTemplate);
    const response = await appClient.index.$get(
      { query: { credentialId: "card" } },
      { headers: { "test-credential-id": account } },
    );

    expect(response.status).toBe(404);
  });

  it("returns panda card", async () => {
    await database
      .insert(cards)
      .values([{ id: "543c1771-beae-4f26-b662-44ea48b40dc6", credentialId: account, lastFour: "1234" }]);
    vi.spyOn(persona, "getInquiry").mockResolvedValueOnce(personaTemplate);
    vi.spyOn(panda, "getSecrets").mockResolvedValueOnce(panTemplate);
    vi.spyOn(panda, "getCard").mockResolvedValueOnce(cardTemplate);

    vi.spyOn(panda, "isPanda").mockResolvedValueOnce(true);

    const response = await appClient.index.$get(
      { query: { credentialId: "card" } },
      { headers: { "test-credential-id": account, SessionID: "fakeSession" } },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toStrictEqual({
      ...panTemplate,
      displayName: "First Last",
      expirationMonth: "9",
      expirationYear: "2029",
      lastFour: "1234",
      mode: 1,
      provider: "panda",
      status: "ACTIVE",
    });
  });

  it("creates a panda card", async () => {
    const foo = privateKeyToAddress(padHex("0xf00"));
    await database
      .insert(credentials)
      .values([{ id: foo, publicKey: new Uint8Array(), account: foo, factory: zeroAddress, pandaId: "anyPanda" }]);
    vi.spyOn(panda, "createCard").mockResolvedValueOnce({ ...cardTemplate, id: "createCard" });

    vi.spyOn(persona, "getInquiry").mockResolvedValueOnce(personaTemplate);

    const response = await appClient.index.$post({ header: { "test-credential-id": foo } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toStrictEqual({
      status: "active",
      lastFour: "7394",
    });
  });
});
