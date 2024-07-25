import { QueryClient } from "@tanstack/react-query";

import loadPasskey from "./loadPasskey";

const queryClient = new QueryClient();
queryClient.setQueryDefaults(["passkey"], {
  retry: false,
  staleTime: Infinity,
  queryFn: loadPasskey,
});
export default queryClient;
