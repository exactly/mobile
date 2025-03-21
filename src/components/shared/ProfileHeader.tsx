import { exaPreviewerAddress } from "@exactly/common/generated/chain";
import shortenHex from "@exactly/common/shortenHex";
import { Eye, EyeOff, Settings, ClockArrowUp } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { useQuery } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Image } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount, useConnect } from "wagmi";

import AddressDialog from "./AddressDialog";
import StatusIndicator from "./StatusIndicator";
import { useReadExaPreviewerPendingProposals } from "../../generated/contracts";
import alchemyConnector from "../../utils/alchemyConnector";
import queryClient from "../../utils/queryClient";
import reportError from "../../utils/reportError";
import Text from "../shared/Text";
import View from "../shared/View";

function settings() {
  router.push("/settings");
}

export default function ProfileHeader() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  const [alertShown, setAlertShown] = useState(false);
  const toast = useToastController();
  const { data: pendingProposals, isFetching: pendingProposalsFetching } = useReadExaPreviewerPendingProposals({
    address: exaPreviewerAddress,
    args: [address ?? zeroAddress],
    query: {
      enabled: !!address,
      gcTime: 0,
      refetchInterval: 30_000,
    },
  });
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  function toggle() {
    queryClient.setQueryData(["settings", "sensitive"], !hidden);
  }
  function copy() {
    if (!address) return;
    setStringAsync(address).catch(reportError);
    toast.show("Account address copied!", {
      native: true,
      duration: 1000,
      burntOptions: { haptic: "success" },
    });
    setAlertShown(false);
  }
  return (
    <View padded backgroundColor="$backgroundSoft">
      <View display="flex" flexDirection="row" justifyContent="space-between">
        <View display="flex" flexDirection="row" alignItems="center" gap={8}>
          <View
            position="relative"
            onPress={() => {
              connect({ connector: alchemyConnector });
            }}
          >
            {isConnected && <StatusIndicator type="online" />}
            <Image
              source={{ uri: "https://avatars.githubusercontent.com/u/83888950?s=200&v=4" }}
              alt="Profile picture"
              width={ms(32)}
              height={ms(32)}
              borderRadius="$r_0"
            />
          </View>
          {address && (
            <Pressable
              onPress={() => {
                setAlertShown(true);
              }}
              hitSlop={ms(15)}
            >
              <View display="flex" flexDirection="row" alignItems="flex-start">
                <Text fontSize={ms(17)} lineHeight={ms(23)} fontFamily="$mono">
                  {hidden ? "0x..." : shortenHex(address).toLowerCase()}
                </Text>
              </View>
            </Pressable>
          )}
          <AddressDialog
            open={alertShown}
            onActionPress={copy}
            onClose={() => {
              setAlertShown(false);
            }}
          />
        </View>
        <View display="flex" flexDirection="row" alignItems="center" gap={16}>
          <Pressable onPress={toggle} hitSlop={ms(15)}>
            {hidden ? <EyeOff color="$uiNeutralPrimary" /> : <Eye color="$uiNeutralPrimary" />}
          </Pressable>
          {pendingProposals && pendingProposals.length > 0 && (
            <Pressable
              disabled={pendingProposalsFetching}
              onPress={() => {
                router.push("/pending-proposals");
              }}
              hitSlop={ms(15)}
            >
              <StatusIndicator type="notification" />
              <ClockArrowUp color="$uiNeutralPrimary" />
            </Pressable>
          )}
          <Pressable onPress={settings} hitSlop={ms(15)}>
            <Settings color="$uiNeutralPrimary" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
