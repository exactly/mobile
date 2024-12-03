import "../mocks/database";
import "../mocks/sentry";
import "../mocks/persona";

import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { padHex, zeroAddress, zeroHash } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { beforeAll, describe, expect, inject, it, vi } from "vitest";

import database, { credentials } from "../../database";
import app from "../../hooks/persona";
import deriveAddress from "../../utils/deriveAddress";
import * as panda from "../../utils/panda";

const appClient = testClient(app);

const personaPayload = {
  header: { "persona-signature": "t=1733865120,v1=debbacfe1b0c5f8797a1d68e8428fba435aa4ca3b5d9a328c3c96ee4d04d84df" },
  json: {
    data: {
      type: "event",
      id: "evt_nbYaPYyaDyKnPZc2ube6bbbbbbbb",
      attributes: {
        name: "inquiry.approved",
        createdAt: "2024-12-13T14:50:57.553Z",
        redactedAt: null,
        context: {
          inquiryPreviousStepName: "phone_a7cc55_confirmation",
          inquiryNextStepName: "success_397a55",
        },
        payload: {
          data: {
            type: "inquiry",
            id: "inq_xzMHQeuAt7KuxVMPNvowpYWJ6eee",
            attributes: {
              status: "approved",
              referenceId: "reference-123",
              note: null,
              behaviors: {
                requestSpoofAttempts: 0,
                userAgentSpoofAttempts: 0,
                distractionEvents: 0,
                hesitationBaseline: 0,
                hesitationCount: 0,
                hesitationTime: 0,
                shortcutCopies: 0,
                shortcutPastes: 0,
                autofillCancels: 0,
                autofillStarts: 0,
                devtoolsOpen: false,
                completionTime: 402.488_082_249,
                hesitationPercentage: null,
                behaviorThreatLevel: "low",
              },
              tags: [],
              creator: "API",
              reviewerComment: null,
              updatedAt: "2024-12-13T14:50:57.000Z",
              createdAt: "2024-12-13T14:44:11.000Z",
              startedAt: "2024-12-13T14:45:46.000Z",
              completedAt: "2024-12-13T14:50:53.000Z",
              failedAt: null,
              markedForReviewAt: null,
              decisionedAt: "2024-12-13T14:50:57.000Z",
              expiredAt: null,
              redactedAt: null,
              previousStepName: "phone_a7d81_confirmation",
              nextStepName: "success_397a93",
              nameFirst: "TTTT HHHHH",
              nameMiddle: null,
              nameLast: "LLLL",
              birthdate: "1990-11-20",
              addressStreet1: "3A., No. 7, Ayi. 5, Ln. 34, Danyrony St.",
              addressStreet2: null,
              addressCity: "Shalon Dyst.",
              addressSubdivision: "New Taipei City",
              addressSubdivisionAbbr: null,
              addressPostalCode: "238000",
              addressPostalCodeAbbr: "238000",
              socialSecurityNumber: null,
              identificationNumber: "333333333",
              emailAddress: "a444q444s007@gmail.com",
              phoneNumber: "+886 999 999 999",
              fields: {
                cryptoWalletAddress: {
                  type: "string",
                  value: null,
                },
                currentGovernmentId: {
                  type: "government_id",
                  value: {
                    id: "doc_yc294YWhCZi7YKxPnoxCGMmCH111",
                    type: "Document::GovernmentId",
                  },
                },
                selectedCountryCode: {
                  type: "string",
                  value: "TW",
                },
                selectedIdClass: {
                  type: "string",
                  value: "pp",
                },
                "addressStreet-1": {
                  type: "string",
                  value: "3A., No. 7, Ayi. 5, Ln. 34, Danyrony St.",
                },
                "addressStreet-2": {
                  type: "string",
                  value: null,
                },
                addressCity: {
                  type: "string",
                  value: "Shalon Dyst.",
                },
                addressSubdivision: {
                  type: "string",
                  value: "New Taipei City",
                },
                addressPostalCode: {
                  type: "string",
                  value: "238000",
                },
                addressCountryCode: {
                  type: "string",
                  value: "TW",
                },
                birthdate: {
                  type: "date",
                  value: "1990-11-20",
                },
                emailAddress: {
                  type: "string",
                  value: "a444q444s007@gmail.com",
                },
                identificationClass: {
                  type: "string",
                  value: "pp",
                },
                identificationNumber: {
                  type: "string",
                  value: "333333333",
                },
                nameFirst: {
                  type: "string",
                  value: "TTTT HHHHH",
                },
                nameMiddle: {
                  type: "string",
                  value: null,
                },
                nameLast: {
                  type: "string",
                  value: "LLLL",
                },
                phoneNumber: {
                  type: "string",
                  value: "+886 999 999 999",
                },
                currentSelfie: {
                  type: "selfie",
                  value: {
                    id: "self_3rX4tDMpauxT1KC7CjUXy42mCLss",
                    type: "Selfie::ProfileAndCenter",
                  },
                },
                collectedEmailAddress: {
                  type: "string",
                  value: null,
                },
                "newStepInputAddress-2": {
                  type: "string",
                  value: null,
                },
                "newStepInputAddress-3": {
                  type: "string",
                  value: null,
                },
                "newStepInputAddress-4": {
                  type: "string",
                  value: null,
                },
                "newStepInputAddress-5": {
                  type: "string",
                  value: null,
                },
                "newStepInputAddress-6": {
                  type: "string",
                  value: null,
                },
                inputSelect: {
                  type: "choices",
                  value: "m",
                },
                illegalActivites: {
                  type: "choices",
                  value: "No",
                },
              },
            },
            relationships: {
              account: {
                data: {
                  type: "account",
                  id: "act_VoqJEhDYvmdMcAfm7UK",
                },
              },
              template: {
                data: null,
              },
              inquiryTemplate: {
                data: {
                  type: "inquiry-template",
                  id: "itmpl_8uim4FvD57CW817",
                },
              },
              inquiryTemplateVersion: {
                data: {
                  type: "inquiry-template-version",
                  id: "itmplv_Rxvwxwo298U4zcG",
                },
              },
              transaction: {
                data: null,
              },
              reviewer: {
                data: {
                  type: "workflow-run",
                  id: "wfr_k899djEZgjcygkCqffQJ7",
                },
              },
              reports: {
                data: [
                  {
                    type: "report/watchlist",
                    id: "rep_DWQh673i2WiJc4a4Aq",
                  },
                  {
                    type: "report/politically-exposed-person",
                    id: "rep_edsffzFnw498JihArd",
                  },
                ],
              },
              verifications: {
                data: [
                  {
                    type: "verification/government-id",
                    id: "ver_jsgwoJcJUGiy3eY",
                  },
                  {
                    type: "verification/selfie",
                    id: "ver_VybpFAAKrswHSUv",
                  },
                  {
                    type: "verification/email-address",
                    id: "ver_3j81WVFuxNERxVK",
                  },
                  {
                    type: "verification/phone-number",
                    id: "ver_r5iA1aT1bP8sdCHpBwz",
                  },
                  {
                    type: "verification/phone-number",
                    id: "ver_TDkgxHbdX3ARYHdJb3F",
                  },
                ],
              },
              sessions: {
                data: [
                  {
                    type: "inquiry-session",
                    id: "iqse_ah5RCvCT2K6EixEEYKHKA84",
                  },
                ],
              },
              documents: {
                data: [
                  {
                    type: "document/government-id",
                    id: "doc_yc294YWhCZi7YKxPnoxCGMmCHMh1",
                  },
                ],
              },
              selfies: {
                data: [
                  {
                    type: "selfie/profile-and-center",
                    id: "self_3rX4tDMpauxT1KC7CjUXy42ms",
                  },
                ],
              },
            },
          },
          included: [
            {
              type: "inquiry-session",
              id: "",
              attributes: {
                status: "active",
                createdAt: "2024-12-16T16:02:29.000Z",
                startedAt: "2024-12-16T16:02:29.000Z",
                expiredAt: null,
                ipAddress: "181.94.178.50",
                userAgent: "Persona/1.0 (iOS) Inquiry/2.22.5",
                osName: "iOS",
                osFullVersion: "18.1.1",
                deviceType: "smartphone",
                deviceName: "Apple iPhone14,2",
                browserName: null,
                browserFullVersion: null,
                mobileSdkName: "Inquiry",
                mobileSdkFullVersion: "2.22.5",
                deviceHandoffMethod: null,
                isProxy: false,
                isTor: false,
                isDatacenter: false,
                isVpn: false,
                threatLevel: "low",
                countryCode: "AR",
                countryName: "Argentina",
                regionCode: "X",
                regionName: "Cxra",
                latitude: -21.429,
                longitude: -24.1756,
                gpsLatitude: null,
                gpsLongitude: null,
                gpsPrecision: null,
              },
              relationships: {
                inquiry: {
                  data: {
                    type: "inquiry",
                    id: "inq_sA4NcQqdhQ9jQPHC",
                  },
                },
                device: {
                  data: {
                    type: "device",
                    id: "dev_N8Dw7DRzTkLE7",
                  },
                },
                network: {
                  data: {
                    type: "network",
                    id: "net_oyWoM9cJAp7A",
                  },
                },
              },
            },
            {
              type: "verification/government-id",
              id: "",
              attributes: {
                status: "passed",
                createdAt: "2024-12-16T16:03:35.000Z",
                createdAtTs: 1_734_365_015,
                submittedAt: "2024-12-16T16:03:36.000Z",
                submittedAtTs: 1_734_365_016,
                completedAt: "2024-12-16T16:03:43.000Z",
                completedAtTs: 1_734_365_023,
                countryCode: "AR",
                entityConfidenceScore: 99,
                idClass: "dl",
                captureMethod: "auto",
                nameFirst: " ",
                nameMiddle: null,
                nameLast: "",
                nameSuffix: null,
                birthdate: "2004-01-29",
                addressStreet1: "VALPA247",
                addressStreet2: null,
                addressCity: "",
                addressSubdivision: "",
                addressPostalCode: null,
                issuingAuthority: null,
                issuingSubdivision: null,
                nationality: null,
                documentNumber: null,
                visaStatus: null,
                issueDate: "",
                expirationDate: "",
                designations: [],
                birthplace: null,
                endorsements: null,
                height: null,
                sex: null,
                restrictions: null,
                vehicleClass: null,
                identificationNumber: "",
                checks: [
                  {
                    name: "id_aamva_database_lookup",
                    status: "not_applicable",
                    reasons: ["disabled_by_check_config"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_account_comparison",
                    status: "not_applicable",
                    reasons: ["missing_properties"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_age_comparison",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_age_inconsistency_detection",
                    status: "not_applicable",
                    reasons: ["disabled_by_check_config"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_attribute_comparison",
                    status: "not_applicable",
                    reasons: ["missing_properties"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_barcode_detection",
                    status: "not_applicable",
                    reasons: ["unsupported_country"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_barcode_inconsistency_detection",
                    status: "not_applicable",
                    reasons: ["unsupported_country"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_blur_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_color_inconsistency_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_compromised_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_disallowed_country_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {
                      countryCode: "AR",
                      selectedCountryCode: "AR",
                    },
                  },
                  {
                    name: "id_disallowed_type_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {
                      countryCode: "AR",
                      detectedIdClass: "dl",
                      detectedIdDesignations: [],
                      disallowedIdDesignations: [],
                      selectedIdClasses: ["dl"],
                    },
                  },
                  {
                    name: "id_double_side_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_electronic_replica_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_entity_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_expired_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_extraction_inconsistency_detection",
                    status: "not_applicable",
                    reasons: ["unsupported_country"],
                    requirement: "not_required",
                    metadata: {
                      checkRequirements: [],
                    },
                  },
                  {
                    name: "id_extracted_properties_detection",
                    status: "not_applicable",
                    reasons: ["no_required_properties"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_fabrication_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_glare_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_handwriting_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_inconsistent_repeat_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_inquiry_comparison",
                    status: "not_applicable",
                    reasons: ["missing_properties"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_mrz_detection",
                    status: "not_applicable",
                    reasons: [],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_mrz_inconsistency_detection",
                    status: "not_applicable",
                    reasons: ["mrz_not_found"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_number_format_inconsistency_detection",
                    status: "not_applicable",
                    reasons: ["unsupported_country"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_paper_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_po_box_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_portrait_clarity_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_portrait_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_public_figure_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_real_id_detection",
                    status: "not_applicable",
                    reasons: ["disabled_by_check_config"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_repeat_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_selfie_comparison",
                    status: "not_applicable",
                    reasons: ["no_selfie"],
                    requirement: "required",
                    metadata: {},
                  },
                  {
                    name: "id_tamper_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_unprocessable_submission_detection",
                    status: "passed",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_valid_dates_detection",
                    status: "not_applicable",
                    reasons: [],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_video_quality_detection",
                    status: "not_applicable",
                    reasons: ["disabled"],
                    requirement: "not_required",
                    metadata: {},
                  },
                  {
                    name: "id_experimental_model_detection",
                    status: "not_applicable",
                    reasons: ["not_enabled"],
                    requirement: "not_required",
                    metadata: {},
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
} as const;

describe("with reference", () => {
  const bob = privateKeyToAddress(padHex("0xb0b"));
  const account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(bob), y: zeroHash });

  beforeAll(async () => {
    await database
      .insert(credentials)
      .values([{ id: account, publicKey: new Uint8Array(), account, factory: zeroAddress }]);
  });

  it("creates a panda account", async () => {
    const id = "panda-id";
    vi.spyOn(panda, "createUser").mockResolvedValueOnce({ id });
    const response = await appClient.index.$post({
      ...personaPayload,
      json: {
        ...personaPayload.json,
        data: {
          ...personaPayload.json.data,
          attributes: {
            ...personaPayload.json.data.attributes,
            payload: {
              ...personaPayload.json.data.attributes.payload,
              data: {
                ...personaPayload.json.data.attributes.payload.data,
                attributes: { ...personaPayload.json.data.attributes.payload.data.attributes, referenceId: account },
              },
              included: [...personaPayload.json.data.attributes.payload.included],
            },
          },
        },
      },
    });
    const p = await database.query.credentials.findFirst({
      where: eq(credentials.id, account),
      columns: { pandaId: true },
    });

    expect(p?.pandaId).toBe(id);

    expect(response.status).toBe(200);
  });
});
