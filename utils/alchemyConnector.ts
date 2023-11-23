import { getDefaultLightAccountFactoryAddress, LightSmartContractAccount } from "@alchemy/aa-accounts";
import type { AlchemyProvider } from "@alchemy/aa-alchemy";
import { LocalAccountSigner } from "@alchemy/aa-core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeyClient } from "@turnkey/http";
import { createAccount } from "@turnkey/viem";
import { WebauthnStamper } from "@turnkey/webauthn-stamper";
import { getAddress, SwitchChainError } from "viem";
import { ChainNotConfiguredError, createConnector, normalizeChainId } from "wagmi";

import handleError from "./handleError";
import {
  alchemyGasPolicyId,
  chain,
  rpId,
  turnkeyAPIPrivateKey,
  turnkeyAPIPublicKey,
  turnkeyOrganizationId,
} from "../utils/constants";

export default function alchemyConnector(provider: AlchemyProvider) {
  let account: LightSmartContractAccount | undefined;
  let turnkeyClient: TurnkeyClient | undefined;

  return createConnector<
    AlchemyProvider,
    {
      loadStore: () => Promise<{ signWith?: string; subOrganizationId?: string }>;
      getAccount: (signWith: string, subOrganizationId: string) => Promise<LightSmartContractAccount>;
      getTurnkeyClient: () => TurnkeyClient;
    }
  >((config) => ({
    id: "alchemy",
    name: "Alchemy",
    async setup() {
      if (typeof window === "undefined") return;
      const store = await this.loadStore();
      if (!store.signWith || !store.subOrganizationId) return;
      account = await this.getAccount(store.signWith, store.subOrganizationId);
      config.emitter.emit("connect", { accounts: [await account.getAddress()], chainId: chain.id });
    },
    async connect({ chainId, isReconnecting } = {}) {
      if (chainId && chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
      provider.on("accountsChanged", this.onAccountsChanged);
      provider.on("chainChanged", this.onChainChanged);
      provider.on("disconnect", this.onDisconnect);

      let signWith: string;
      let subOrganizationId: string;
      try {
        if (!isReconnecting) throw new Error("new connection");
        const store = await this.loadStore();
        if (!store.signWith || !store.subOrganizationId) throw new Error("no account");
        signWith = store.signWith;
        subOrganizationId = store.subOrganizationId;
      } catch {
        const { organizationId } = await this.getTurnkeyClient().getWhoami({ organizationId: turnkeyOrganizationId });
        const client = new TurnkeyClient(
          { baseUrl: "https://api.turnkey.com" },
          new ApiKeyStamper({ apiPublicKey: turnkeyAPIPublicKey, apiPrivateKey: turnkeyAPIPrivateKey }),
        );
        const {
          wallets: [wallet],
        } = await client.getWallets({ organizationId });
        if (!wallet) throw new Error("no wallet");
        const { accounts } = await client.getWalletAccounts({ organizationId, walletId: wallet.walletId });
        const walletAccount = accounts.find(({ curve }) => curve === "CURVE_SECP256K1");
        if (!walletAccount) throw new Error("no ethereum account");
        signWith = walletAccount.address;
        subOrganizationId = organizationId;
        AsyncStorage.setItem("account.store", JSON.stringify({ signWith, subOrganizationId })).catch(handleError);
      }

      account = await this.getAccount(signWith, subOrganizationId);
      return { accounts: [getAddress(await account.getAddress())], chainId: chain.id };
    },
    disconnect() {
      account = undefined;
      provider.disconnect();
      provider.removeListener("accountsChanged", this.onAccountsChanged);
      provider.removeListener("chainChanged", this.onChainChanged);
      provider.removeListener("disconnect", this.onDisconnect);
      return Promise.resolve();
    },
    async getAccounts() {
      return account ? [getAddress(await account.getAddress())] : [];
    },
    getChainId() {
      return Promise.resolve(chain.id);
    },
    getProvider() {
      return Promise.resolve(provider);
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
      config.emitter.emit("change", { chainId: normalizeChainId(chainId) });
    },
    onDisconnect(error) {
      config.emitter.emit("disconnect");
      account = undefined;
      provider.removeListener("accountsChanged", this.onAccountsChanged);
      provider.removeListener("chainChanged", this.onChainChanged);
      provider.removeListener("disconnect", this.onDisconnect);
      handleError(error);
    },
    async loadStore() {
      const json = await AsyncStorage.getItem("account.store");
      if (!json) return { signWith: undefined, subOrganizationId: undefined };
      return JSON.parse(json) as { signWith?: string; subOrganizationId?: string };
    },
    async getAccount(signWith: string, subOrganizationId: string) {
      const owner = new LocalAccountSigner(
        await createAccount({
          client: this.getTurnkeyClient(),
          organizationId: subOrganizationId,
          ethereumAddress: signWith,
          signWith,
        }),
      );
      account = provider.connect(
        (rpcClient) =>
          new LightSmartContractAccount({
            factoryAddress: getDefaultLightAccountFactoryAddress(chain),
            rpcClient,
            chain,
            owner,
          }),
      ).account;
      provider.withAlchemyGasManager({ policyId: alchemyGasPolicyId });
      return account;
    },
    getTurnkeyClient() {
      turnkeyClient ??= new TurnkeyClient({ baseUrl: "https://api.turnkey.com" }, new WebauthnStamper({ rpId }));
      return turnkeyClient;
    },
  }));
}
