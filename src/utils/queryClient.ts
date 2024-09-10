import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClientRestore, persistQueryClientSubscribe } from "@tanstack/query-persist-client-core";
import { QueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { deserialize, serialize } from "wagmi";
import { structuralSharing } from "wagmi/query";

import handleError from "./handleError";

export const persister = createAsyncStoragePersister({ serialize, deserialize, storage: AsyncStorage });
const queryClient = new QueryClient({ defaultOptions: { queries: { structuralSharing } } });

if (typeof window !== "undefined") {
  persistQueryClientRestore({ queryClient, persister }).catch(handleError);
  persistQueryClientSubscribe({ queryClient, persister });
}

queryClient.setQueryDefaults(["passkey"], {
  retry: false,
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["settings", "theme"], {
  initialData: undefined,
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["settings", "sensitive"], {
  initialData: false,
  retry: false,
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["settings", "alertShown"], {
  initialData: true,
  retry: false,
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["auth"], { retry: false, staleTime: 24 * 60 * 60_000, gcTime: 24 * 60 * 60_000 });
queryClient.setQueryDefaults(["withdrawal"], { structuralSharing: false });

export default queryClient;

export interface Withdraw {
  receiver?: Address;
  market?: Address;
  amount: bigint;
}
