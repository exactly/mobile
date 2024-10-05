import type { ClientWithAlchemyMethods } from "@alchemy/aa-alchemy";
import type { SmartAccountClient, SmartContractAccount } from "@alchemy/aa-core";
import type { Passkey } from "@exactly/common/validation";

import chain from "@exactly/common/generated/chain";
import { type Chain, getAddress, SwitchChainError, type Transport } from "viem";
import { ChainNotConfiguredError, createConnector } from "wagmi";

import createAccountClient from "./accountClient";
import createPasskey from "./createPasskey";
import handleError from "./handleError";
import publicClient from "./publicClient";
import queryClient from "./queryClient";

export let accountClient:
  | SmartAccountClient<Transport, Chain, SmartContractAccount<"WebauthnAccount", "0.6.0">>
  | undefined;

export default createConnector<ClientWithAlchemyMethods | SmartAccountClient>(({ emitter }) => ({
  async connect({ chainId, isReconnecting } = {}) {
    if (chainId && chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
    try {
      const passkey = queryClient.getQueryData<Passkey>(["passkey"]);
      if (!passkey && isReconnecting) throw new Error("missing passkey");
      accountClient ??= await createAccountClient(passkey ?? (await createPasskey()));
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
  async getAccounts() {
    const passkey = queryClient.getQueryData<Passkey>(["passkey"]);
    if (!passkey) return [];
    accountClient ??= await createAccountClient(passkey);
    return [accountClient.account.address];
  },
  getChainId: () => Promise.resolve(chain.id),
  getProvider({ chainId } = {}) {
    if (chainId && chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
    return Promise.resolve(accountClient ?? publicClient);
  },
  id: "alchemy" as const,
  async isAuthorized() {
    const accounts = await this.getAccounts();
    return accounts.length > 0;
  },
  name: "Alchemy" as const,
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
  switchChain({ chainId }) {
    if (chainId !== chain.id) throw new SwitchChainError(new ChainNotConfiguredError());
    return Promise.resolve(chain);
  },
  type: "alchemy" as const,
}));
