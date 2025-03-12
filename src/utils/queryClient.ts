import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClientRestore, persistQueryClientSubscribe } from "@tanstack/query-persist-client-core";
import { QueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { deserialize, serialize } from "wagmi";
import { structuralSharing } from "wagmi/query";

import handleError from "./handleError";
import type { getActivity } from "./server";

export const persister = createAsyncStoragePersister({ serialize, deserialize, storage: AsyncStorage });
const queryClient = new QueryClient({ defaultOptions: { queries: { structuralSharing } } });

if (typeof window !== "undefined") {
  persistQueryClientRestore({ queryClient, persister, maxAge: Infinity }).catch(handleError);
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
queryClient.setQueryDefaults(["settings", "installments"], {
  initialData: 1,
  retry: false,
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["simulate-purchase", "installments"], {
  initialData: 1,
  retry: false,
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["contacts", "saved"], {
  initialData: undefined,
  retry: false,
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["contacts", "recent"], {
  initialData: undefined,
  retry: false,
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["withdrawal"], {
  queryFn: () => {
    throw new Error("don't refetch");
  },
});
queryClient.setQueryDefaults(["activity", "details"], {
  queryFn: () => {
    throw new Error("don't refetch");
  },
});

export type ActivityItem = Awaited<ReturnType<typeof getActivity>>[number];
export interface Withdraw {
  receiver?: Address;
  market?: Address;
  amount: bigint;
}

export default queryClient;
