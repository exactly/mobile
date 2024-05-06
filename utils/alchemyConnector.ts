import { standardExecutor } from "@alchemy/aa-accounts";
import type { ClientWithAlchemyMethods } from "@alchemy/aa-alchemy";
import { getEntryPoint, toSmartContractAccount, type SmartContractAccount } from "@alchemy/aa-core";
import { p256 } from "@noble/curves/p256";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  bytesToBigInt,
  bytesToHex,
  concatHex,
  custom,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  hashMessage,
  hexToBytes,
  SwitchChainError,
} from "viem";
import { ChainNotConfiguredError, createConnector } from "wagmi";
import deployments from "webauthn-owner-plugin/broadcast/Deploy.s.sol/11155420/run-1716346701.json";

import base64URLDecode from "./base64URLDecode";
import handleError from "./handleError";
import { alchemyGasPolicyId, chain, rpId } from "../utils/constants";

alchemyConnector.type = "alchemy" as const;

export default function alchemyConnector(client: ClientWithAlchemyMethods) {
  let account: SmartContractAccount | undefined;

  return createConnector<
    ClientWithAlchemyMethods,
    {
      loadStore: () => Promise<PublicKey | undefined>;
      getAccount: (publicKey: PublicKey) => Promise<SmartContractAccount>;
    }
  >((config) => ({
    id: "alchemy",
    name: "Alchemy",
    type: alchemyConnector.type,
    async setup() {
      if (typeof window === "undefined") return;
      const publicKey = await this.loadStore();
      if (!publicKey) return;
      account = await this.getAccount(publicKey);
      config.emitter.emit("connect", { accounts: [account.address], chainId: chain.id });
    },
    async connect({ chainId, isReconnecting } = {}) {
      if (chainId && chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());

      let publicKey: PublicKey;
      try {
        if (!isReconnecting) throw new Error("new connection");
        const store = await this.loadStore();
        if (!store) throw new Error("no account");
        publicKey = store;
      } catch {
        throw new Error("not implemented"); // TODO retrieve public key from server via credentialId
      }

      account = await this.getAccount(publicKey);
      return { accounts: [account.address], chainId: chain.id };
    },
    disconnect() {
      account = undefined;
      return Promise.resolve();
    },
    getAccounts() {
      return Promise.resolve(account ? [account.address] : []);
    },
    getChainId() {
      return Promise.resolve(chain.id);
    },
    getProvider() {
      return Promise.resolve(client);
    },
    isAuthorized() {
      return Promise.resolve(!!account);
    },
    switchChain({ chainId }) {
      if (chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
      return Promise.resolve(chain);
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) this.onDisconnect();
      else config.emitter.emit("change", { accounts: accounts.map((a) => getAddress(a)) });
    },
    onChainChanged(chainId) {
      config.emitter.emit("change", { chainId: Number(chainId) });
    },
    onDisconnect(error) {
      config.emitter.emit("disconnect");
      account = undefined;
      handleError(error);
    },
    async loadStore() {
      const json = await AsyncStorage.getItem("account.store");
      if (!json) return;
      const { credentialId, x, y } = JSON.parse(json) as PublicKey;
      if (!credentialId || !x || !y) return;
      return { credentialId, x, y };
    },
    getAccount({ credentialId, x, y }: PublicKey) {
      return toSmartContractAccount({
        chain,
        source: "WebauthnAccount",
        transport: custom(client),
        entryPoint: getEntryPoint(chain, { version: "0.6.0" }),
        getAccountInitCode() {
          if (!deployments.transactions[2]) throw new Error("no factory deployment found");
          return Promise.resolve(
            concatHex([
              deployments.transactions[2].contractAddress as `0x${string}`,
              encodeFunctionData({
                abi: [
                  {
                    type: "function",
                    name: "createAccount",
                    inputs: [
                      { type: "uint256" },
                      { type: "tuple[]", components: [{ type: "uint256" }, { type: "uint256" }] },
                    ],
                  },
                ],
                args: [0, [[x, y]]],
              }),
            ]),
          );
        },
        getDummySignature: () =>
          "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000170000000000000000000000000000000000000000000000000000000000000001ed5ceca76138d2343d904fceda12f81765ebde445fbb03a77ca39bf0420202af15327ecdfec88bfe1b53cabfa4fb27eef85ead50e75676043911dd1450d8c0a6000000000000000000000000000000000000000000000000000000000000002549960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008a7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a226868774f387a34383459445946416a453179777a7749346952736e365853533738736862786c5464784e73222c226f726967696e223a2268747470733a2f2f7369676e2e636f696e626173652e636f6d222c2263726f73734f726967696e223a66616c73657d00000000000000000000000000000000000000000000",
        async signUserOperationHash(uoHash) {
          const credential = (await navigator.credentials.get({
            publicKey: {
              rpId,
              challenge: hexToBytes(hashMessage({ raw: uoHash }), { size: 32 }),
              allowCredentials: [{ id: base64URLDecode(credentialId), type: "public-key" }],
              userVerification: "required",
            },
          })) as PublicKeyCredential | null;
          if (!credential) throw new Error("no credential");
          const response = credential.response as AuthenticatorAssertionResponse;
          const sig = new Uint8Array(response.signature);
          let offset = 2;
          const rLength = sig[offset + 1];
          if (rLength === undefined) throw new Error("invalid signature");
          const r = bytesToBigInt(sig.slice(offset + 2, offset + 2 + rLength));
          offset += 2 + rLength;
          const sLength = sig[offset + 1];
          if (sLength === undefined) throw new Error("invalid signature");
          let s = bytesToBigInt(sig.slice(offset + 2, offset + 2 + sLength));
          if (s > p256.CURVE.n / 2n) s = p256.CURVE.n - s;
          const decoder = new TextDecoder();
          const clientDataJSON = decoder.decode(response.clientDataJSON);
          const typeIndex = BigInt(clientDataJSON.indexOf('"type":"'));
          const challengeIndex = BigInt(clientDataJSON.indexOf('"challenge":"'));
          const authenticatorData = bytesToHex(new Uint8Array(response.authenticatorData));
          const webauthn = encodeAbiParameters(
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
          );
          return encodeAbiParameters(
            [{ type: "tuple", components: [{ type: "uint256" }, { type: "bytes" }] }],
            [[0n, webauthn]],
          );
        },
        signMessage: ({ message }) => Promise.resolve("0x..."),
        signTypedData: (typedData) => Promise.resolve("0x..."),
        ...standardExecutor,
      });
    },
  }));
}

type PublicKey = { credentialId: string; x: string; y: string };
