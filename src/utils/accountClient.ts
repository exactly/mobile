import type { Passkey } from "@exactly/common/validation";

import { standardExecutor } from "@alchemy/aa-accounts";
import { alchemyGasManagerMiddleware } from "@alchemy/aa-alchemy";
import {
  createSmartAccountClient,
  deepHexlify,
  getEntryPoint,
  resolveProperties,
  toSmartContractAccount,
} from "@alchemy/aa-core";
import accountInitCode from "@exactly/common/accountInitCode";
import alchemyGasPolicyId from "@exactly/common/alchemyGasPolicyId";
import domain from "@exactly/common/domain";
import chain from "@exactly/common/generated/chain";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnParser } from "@peculiar/asn1-schema";
import { setUser } from "@sentry/react-native";
import { base64URLStringToBuffer, bufferToBase64URLString } from "@simplewebauthn/browser";
import { Platform } from "react-native";
import { get } from "react-native-passkeys";
import {
  bytesToBigInt,
  bytesToHex,
  custom,
  encodeAbiParameters,
  encodePacked,
  hashMessage,
  type Hex,
  hexToBytes,
  maxUint256,
} from "viem";

import publicClient from "./publicClient";

export default async function createAccountClient({ credentialId, factory, x, y }: Passkey) {
  const transport = custom(publicClient);
  const account = await toSmartContractAccount({
    chain,
    entryPoint: getEntryPoint(chain, { version: "0.6.0" }),
    getAccountInitCode: () => Promise.resolve(accountInitCode({ factory, x, y })),
    getDummySignature: () => "0x",
    signMessage: () => Promise.resolve("0x..."), // TODO implement
    signTypedData: () => Promise.resolve("0x..."), // TODO implement
    async signUserOperationHash(uoHash) {
      const credential = await get({
        allowCredentials: Platform.OS === "android" ? [] : [{ id: credentialId, type: "public-key" }], // HACK fix android credential filtering
        challenge: bufferToBase64URLString(hexToBytes(hashMessage({ raw: uoHash }), { size: 32 })),
        rpId: domain,
        userVerification: "preferred",
      });
      if (!credential) throw new Error("no credential");
      const response = credential.response;
      const clientDataJSON = new TextDecoder().decode(base64URLStringToBuffer(response.clientDataJSON));
      const typeIndex = BigInt(clientDataJSON.indexOf('"type":"'));
      const challengeIndex = BigInt(clientDataJSON.indexOf('"challenge":"'));
      const authenticatorData = bytesToHex(new Uint8Array(base64URLStringToBuffer(response.authenticatorData)));
      const signature = AsnParser.parse(base64URLStringToBuffer(response.signature), ECDSASigValue);
      const r = bytesToBigInt(new Uint8Array(signature.r));
      let s = bytesToBigInt(new Uint8Array(signature.s));
      if (s > P256_N / 2n) s = P256_N - s; // pass malleability guard
      return webauthn({ authenticatorData, challengeIndex, clientDataJSON, r, s, typeIndex });
    },
    source: "WebauthnAccount" as const,
    transport,
    ...standardExecutor,
  });
  setUser({ id: account.address });
  return createSmartAccountClient({
    account,
    chain,
    transport,
    ...alchemyGasManagerMiddleware(publicClient, { policyId: alchemyGasPolicyId }),
    async customMiddleware(userOp) {
      if ((await userOp.signature) === "0x") {
        // dynamic dummy signature
        userOp.signature = webauthn({
          authenticatorData: "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000",
          challengeIndex: 23n,
          clientDataJSON: `{"type":"webauthn.get","challenge":"${bufferToBase64URLString(
            hexToBytes(hashMessage({ raw: deepHexlify(await resolveProperties(userOp)) as Hex }), { size: 32 }),
          )}","origin":"https://web.exactly.app","crossOrigin":false}`,
          r: maxUint256,
          s: P256_N / 2n,
          typeIndex: 1n,
        });
      }
      return userOp;
    },
  });
}

const P256_N = 0xff_ff_ff_ff_00_00_00_00_ff_ff_ff_ff_ff_ff_ff_ff_bc_e6_fa_ad_a7_17_9e_84_f3_b9_ca_c2_fc_63_25_51n;

function webauthn({
  authenticatorData,
  challengeIndex,
  clientDataJSON,
  r,
  s,
  typeIndex,
}: {
  authenticatorData: Hex;
  challengeIndex: bigint;
  clientDataJSON: string;
  r: bigint;
  s: bigint;
  typeIndex: bigint;
}) {
  return encodePacked(
    ["uint8", "bytes"],
    [
      0,
      encodeAbiParameters(
        [
          {
            components: [
              { name: "authenticatorData", type: "bytes" },
              { name: "clientDataJSON", type: "string" },
              { name: "challengeIndex", type: "uint256" },
              { name: "typeIndex", type: "uint256" },
              { name: "r", type: "uint256" },
              { name: "s", type: "uint256" },
            ],
            type: "tuple",
          },
        ],
        [{ authenticatorData, challengeIndex, clientDataJSON, r, s, typeIndex }],
      ),
    ],
  );
}
