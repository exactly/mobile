import { standardExecutor } from "@alchemy/aa-accounts";
import { type ClientWithAlchemyMethods, alchemyGasManagerMiddleware } from "@alchemy/aa-alchemy";
import {
  type SmartAccountClient,
  type SmartContractAccount,
  createSmartAccountClient,
  deepHexlify,
  getEntryPoint,
  resolveProperties,
  toSmartContractAccount,
} from "@alchemy/aa-core";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnParser } from "@peculiar/asn1-schema";
import { base64URLStringToBuffer, bufferToBase64URLString } from "@simplewebauthn/browser";
import { get } from "react-native-passkeys";
import {
  type Chain,
  type Hex,
  SwitchChainError,
  type Transport,
  bytesToBigInt,
  bytesToHex,
  custom,
  encodeAbiParameters,
  encodePacked,
  getAddress,
  hashMessage,
  hexToBytes,
  maxUint256,
} from "viem";
import { ChainNotConfiguredError, createConnector } from "wagmi";

import accountInitCode from "@exactly/common/accountInitCode";
import alchemyGasPolicyId from "@exactly/common/alchemyGasPolicyId";
import chain from "@exactly/common/chain";
import rpId from "@exactly/common/rpId";
import type { Passkey } from "@exactly/common/types";

import createPasskey from "./createPasskey.js";
import handleError from "./handleError.js";
import loadPasskey from "./loadPasskey.js";

alchemyConnector.type = "alchemy" as const;
export default function alchemyConnector(publicClient: ClientWithAlchemyMethods) {
  let accountClient: SmartAccountClient<Transport, Chain, SmartContractAccount<"WebauthnAccount", "0.6.0">> | undefined;

  async function createAccountClient({ credentialId, x, y }: Passkey) {
    const transport = custom(publicClient);
    return createSmartAccountClient({
      chain,
      transport,
      account: await toSmartContractAccount({
        chain,
        transport,
        source: "WebauthnAccount" as const,
        entryPoint: getEntryPoint(chain, { version: "0.6.0" }),
        getAccountInitCode: () => Promise.resolve(accountInitCode({ x, y })),
        getDummySignature: () => "0x",
        async signUserOperationHash(uoHash) {
          const credential = await get({
            rpId,
            challenge: bufferToBase64URLString(hexToBytes(hashMessage({ raw: uoHash }), { size: 32 })),
            allowCredentials: [{ id: credentialId, type: "public-key" }],
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
          return webauthn({ authenticatorData, clientDataJSON, challengeIndex, typeIndex, r, s });
        },
        signMessage: ({ message }) => Promise.resolve("0x..."), // TODO implement
        signTypedData: (typedData) => Promise.resolve("0x..."), // TODO implement
        ...standardExecutor,
      }),
      ...alchemyGasManagerMiddleware(publicClient, { policyId: alchemyGasPolicyId }),
      async customMiddleware(userOp) {
        if ((await userOp.signature) === "0x") {
          // dynamic dummy signature
          userOp.signature = webauthn({
            authenticatorData: "0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000",
            clientDataJSON: `{"type":"webauthn.get","challenge":"${bufferToBase64URLString(
              hexToBytes(hashMessage({ raw: deepHexlify(await resolveProperties(userOp)) as Hex }), { size: 32 }),
            )}","origin":"https://web.exactly.app","crossOrigin":false}`,
            typeIndex: 1n,
            challengeIndex: 23n,
            r: maxUint256,
            s: P256_N / 2n,
          });
        }
        return userOp;
      },
    });
  }

  return createConnector<SmartAccountClient | ClientWithAlchemyMethods>(({ emitter }) => ({
    id: "alchemy" as const,
    name: "Alchemy" as const,
    type: alchemyConnector.type,
    async getAccounts() {
      try {
        accountClient ??= await createAccountClient(await loadPasskey());
        return [accountClient.account.address];
      } catch {
        return [];
      }
    },
    async isAuthorized() {
      const accounts = await this.getAccounts();
      return accounts.length > 0;
    },
    async connect({ chainId, isReconnecting } = {}) {
      if (chainId && chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
      try {
        accountClient ??= await createAccountClient(
          await loadPasskey().catch((error: unknown) => {
            if (isReconnecting) throw error;
            return createPasskey();
          }),
        );
      } catch (error: unknown) {
        handleError(error);
        throw error;
      }
      return { accounts: [accountClient.account.address], chainId: chain.id };
    },
    disconnect() {
      accountClient = undefined;
      return Promise.resolve();
    },
    switchChain({ chainId }) {
      if (chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
      return Promise.resolve(chain);
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) this.onDisconnect();
      else emitter.emit("change", { accounts: accounts.map((a) => getAddress(a)) });
    },
    onChainChanged(chainId) {
      if (Number(chainId) !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
      emitter.emit("change", { chainId: Number(chainId) });
    },
    onDisconnect(error) {
      emitter.emit("disconnect");
      accountClient = undefined;
      if (error) handleError(error);
    },
    getProvider({ chainId } = {}) {
      if (chainId && chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
      return Promise.resolve(accountClient ?? publicClient);
    },
    getChainId: () => Promise.resolve(chain.id),
  }));
}

const P256_N = 0xff_ff_ff_ff_00_00_00_00_ff_ff_ff_ff_ff_ff_ff_ff_bc_e6_fa_ad_a7_17_9e_84_f3_b9_ca_c2_fc_63_25_51n;

function webauthn({
  authenticatorData,
  clientDataJSON,
  challengeIndex,
  typeIndex,
  r,
  s,
}: {
  authenticatorData: Hex;
  clientDataJSON: string;
  challengeIndex: bigint;
  typeIndex: bigint;
  r: bigint;
  s: bigint;
}) {
  return encodePacked(
    ["uint8", "bytes"],
    [
      0,
      encodeAbiParameters(
        [
          {
            type: "tuple",
            components: [
              { type: "bytes", name: "authenticatorData" },
              { type: "string", name: "clientDataJSON" },
              { type: "uint256", name: "challengeIndex" },
              { type: "uint256", name: "typeIndex" },
              { type: "uint256", name: "r" },
              { type: "uint256", name: "s" },
            ],
          },
        ],
        [{ authenticatorData, clientDataJSON, challengeIndex, typeIndex, r, s }],
      ),
    ],
  );
}
