import React from "react";
import { useAccount } from "wagmi";

import Home from "./home";
import Welcome from "./welcome";

export default function Index() {
  const { isConnecting, isReconnecting, isDisconnected } = useAccount();

  if (isConnecting || isReconnecting) return "loading";

  if (isDisconnected) return <Welcome />;
  return <Home />;
}
