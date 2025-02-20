import "../mocks/auth";
import "../mocks/database";
import "../mocks/deployments";
import "../mocks/sentry";

import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { zeroHash, padHex, zeroAddress } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import app from "../../api/kyc";
import database, { credentials } from "../../database";
import deriveAddress from "../../utils/deriveAddress";
import * as persona from "../../utils/persona";

const appClient = testClient(app);

describe("authenticated", () => {
  const bob = privateKeyToAddress(padHex("0xb0b"));
  const account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(bob), y: zeroHash });
  vi.spyOn(sentry, "captureException");

  beforeAll(async () => {
    await database.insert(credentials).values([
      {
        id: account,
        publicKey: new Uint8Array(),
        account,
        factory: zeroAddress,
        pandaId: "pandaId",
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok kyc approved without template", async () => {
    const getInquiry = vi.spyOn(persona, "getInquiry").mockResolvedValueOnce(personaTemplate);
    const response = await appClient.index.$get(
      { query: {} },
      { headers: { "test-credential-id": account, SessionID: "fakeSession" } },
    );

    expect(getInquiry).toHaveBeenCalledWith(account, "itmpl_8uim4FvD5P3kFpKHX37CW817"); //cspell:disable-line
    await expect(response.json()).resolves.toBe("ok");
    expect(response.status).toBe(200);
  });

  it("resumes inquiry with template", async () => {
    const templateId = persona.templates.panda;
    const getInquiry = vi.spyOn(persona, "getInquiry").mockResolvedValueOnce({
      ...personaTemplate,
      attributes: { ...personaTemplate.attributes, status: "pending" },
    });
    const resumeInquiry = vi.spyOn(persona, "resumeInquiry").mockResolvedValueOnce(resumeTemplate);

    const response = await appClient.index.$get(
      { query: { templateId } },
      { headers: { "test-credential-id": account, SessionID: "fakeSession" } },
    );

    expect(getInquiry).toHaveBeenCalledWith(account, templateId);
    expect(resumeInquiry).toHaveBeenCalledWith(resumeTemplate.data.id);
    await expect(response.json()).resolves.toStrictEqual({
      inquiryId: resumeTemplate.data.id,
      sessionToken: resumeTemplate.meta["session-token"],
    });
    expect(response.status).toBe(200);
  });

  it("returns OTL link", async () => {
    const link = "https://new-url.com";
    const generateOTL = vi.spyOn(persona, "generateOTL").mockResolvedValueOnce({
      ...OTLTemplate,
      meta: { ...OTLTemplate.meta, "one-time-link": link },
    });
    let templateId;
    const getInquiry = vi.spyOn(persona, "getInquiry").mockResolvedValueOnce(templateId);
    const createInquiry = vi.spyOn(persona, "createInquiry").mockResolvedValueOnce(OTLTemplate);

    const response = await appClient.index.$post(
      { json: {} },
      { headers: { "test-credential-id": account, SessionID: "fakeSession" } },
    );

    expect(getInquiry).toHaveBeenCalledWith(account, persona.templates.cryptomate);
    expect(createInquiry).toHaveBeenCalledWith(account);
    expect(generateOTL).toHaveBeenCalledWith(resumeTemplate.data.id);
    await expect(response.json()).resolves.toBe(link);
    expect(response.status).toBe(200);
  });

  it("returns OTL link when resume inquiry", async () => {
    const templateId = "template";
    const link = "https://resume-url.com";
    const generateOTL = vi.spyOn(persona, "generateOTL").mockResolvedValueOnce({
      ...OTLTemplate,
      meta: { ...OTLTemplate.meta, "one-time-link": link },
    });

    const getInquiry = vi.spyOn(persona, "getInquiry").mockResolvedValueOnce({
      ...personaTemplate,
      attributes: { ...personaTemplate.attributes, status: "created" },
    });
    const response = await appClient.index.$post(
      { json: { templateId } },
      { headers: { "test-credential-id": account, SessionID: "fakeSession" } },
    );

    expect(getInquiry).toHaveBeenCalledWith(account, templateId);
    expect(generateOTL).toHaveBeenCalledWith(resumeTemplate.data.id);
    await expect(response.json()).resolves.toBe(link);
    expect(response.status).toBe(200);
  });
});

const personaTemplate = {
  id: "test-id",
  type: "inquiry" as const,
  attributes: {
    status: "approved" as const,
    "reference-id": "ref-123",
    "name-first": "John",
    "name-middle": null,
    "name-last": "Doe",
    "email-address": "john@example.com",
    "phone-number": "+1234567890",
  },
} as const;

const resumeTemplate = {
  data: {
    id: "test-id",
    type: "inquiry" as const,
    attributes: {
      status: "approved" as const,
      fields: {
        "name-first": { type: "string", value: "John" },
        "name-middle": { type: "string", value: null },
        "name-last": { type: "string", value: "Doe" },
        "email-address": { type: "string", value: "john@example.com" },
        "phone-number": { type: "string", value: "+1234567890" },
      },
      "reference-id": "ref-123",
    },
  },
  meta: {
    "session-token": "fakeSession",
  },
} as const;

const OTLTemplate = {
  data: {
    attributes: {
      status: "created",
      "reference-id": "ref-123",
    },
    id: "test-id",
    type: "inquiry",
  },
  meta: {
    "one-time-link": "a link",
    "one-time-link-short": "",
  },
} as const;
