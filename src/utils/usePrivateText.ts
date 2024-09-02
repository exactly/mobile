import { useQuery } from "@tanstack/react-query";

import queryClient from "./queryClient";

export default function usePrivateText() {
  const { data: hidden } = useQuery<boolean>({ queryKey: ["privateText"] });
  function toggle() {
    queryClient.setQueryData(["privateText"], !hidden);
  }
  return { hidden, toggle };
}
