import { getDefaultLightAccountFactoryAddress, LightSmartContractAccount } from "@alchemy/aa-accounts";
import { AlchemyProvider, type AlchemyProviderConfig } from "@alchemy/aa-alchemy";
import { LocalAccountSigner } from "@alchemy/aa-core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeyClient } from "@turnkey/http";
import { createAccount } from "@turnkey/viem";
import { WebauthnStamper } from "@turnkey/webauthn-stamper";
import { Connector, normalizeChainId } from "@wagmi/connectors";
import { createWalletClient, custom, getAddress } from "viem";

import {
  alchemyAPIKey,
  alchemyGasPolicyId,
  chain,
  rpId,
  turnkeyAPIPrivateKey,
  turnkeyAPIPublicKey,
  turnkeyOrganizationId,
} from "../utils/constants";

export default class AlchemyConnector extends Connector<
  AlchemyProvider,
  {
    provider: AlchemyProviderConfig;
    paymaster: Parameters<typeof AlchemyProvider.prototype.withAlchemyGasManager>[0];
  }
> {
  readonly id = "alchemy";
  readonly name = "Alchemy";
  readonly ready = true;

  #provider?: AlchemyProvider;
  #account?: LightSmartContractAccount;
  #turnkeyClient?: TurnkeyClient;

  constructor() {
    super({
      chains: [chain],
      options: { provider: { apiKey: alchemyAPIKey, chain }, paymaster: { policyId: alchemyGasPolicyId } },
    });
  }

  async connect({ chainId }: { chainId?: number } = {}) {
    if (chainId && chainId !== chain.id) throw new Error("unsupported chain");

    const provider = await this.getProvider();
    provider.on("accountsChanged", this.onAccountsChanged);
    provider.on("chainChanged", this.onChainChanged);
    provider.on("disconnect", this.onDisconnect);
    this.emit("message", { type: "connecting" });

    let signWith: string;
    let subOrganizationId: string;
    try {
      const json = await AsyncStorage.getItem("account.store");
      if (!json) throw new Error("no store");
      const store = JSON.parse(json) as { signWith?: string; subOrganizationId?: string };
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
      const account = accounts.find(({ curve }) => curve === "CURVE_SECP256K1");
      if (!account) throw new Error("no ethereum account");
      signWith = account.address;
      subOrganizationId = organizationId;
    }

    const owner = new LocalAccountSigner(
      await createAccount({
        client: this.getTurnkeyClient(),
        organizationId: subOrganizationId,
        ethereumAddress: signWith,
        signWith,
      }),
    );
    this.#account = provider.connect(
      (rpcClient) =>
        new LightSmartContractAccount({
          factoryAddress: getDefaultLightAccountFactoryAddress(chain),
          rpcClient,
          chain,
          owner,
        }),
    ).account;
    provider.withAlchemyGasManager(this.options.paymaster);
    return { account: getAddress(await this.#account.getAddress()), chain: { id: chain.id, unsupported: false } };
  }

  async getWalletClient({ chainId }: { chainId?: number } = {}) {
    if (chainId && chainId !== chain.id) throw new Error("unsupported chain");
    const [provider, account] = await Promise.all([this.getProvider(), this.getAccount()]);
    return createWalletClient({ account, chain, transport: custom(provider) });
  }

  disconnect() {
    this.#provider?.disconnect();
    this.#provider?.removeListener("accountsChanged", this.onAccountsChanged);
    this.#provider?.removeListener("chainChanged", this.onChainChanged);
    this.#provider?.removeListener("disconnect", this.onDisconnect);
    this.#account = undefined;
    return Promise.resolve();
  }

  getChainId() {
    return Promise.resolve(chain.id);
  }

  getAccount() {
    if (!this.#account) throw new Error("not connected");
    return this.#account.getAddress();
  }

  isAuthorized() {
    return Promise.resolve(!!this.#account);
  }

  getProvider() {
    this.#provider ??= new AlchemyProvider(this.options.provider);
    return Promise.resolve(this.#provider);
  }

  protected getTurnkeyClient() {
    this.#turnkeyClient ??= new TurnkeyClient({ baseUrl: "https://api.turnkey.com" }, new WebauthnStamper({ rpId }));
    return this.#turnkeyClient;
  }

  protected onAccountsChanged = (accounts: string[]) => {
    if (accounts[0]) this.emit("change", { account: getAddress(accounts[0]) });
    else this.emit("disconnect");
  };

  protected onChainChanged = (chainId: number | string) => {
    const id = normalizeChainId(chainId);
    const unsupported = this.isChainUnsupported(id);
    this.emit("change", { chain: { id, unsupported } });
  };

  protected onDisconnect = () => {
    this.#account = undefined;
    this.emit("disconnect");
  };
}
