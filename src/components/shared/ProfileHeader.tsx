import { Eye, EyeOff, Settings } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Image, styled } from "tamagui";
import { useAccount, useConnect } from "wagmi";

import AddressDialog from "./AddressDialog";
import alchemyConnector from "../../utils/alchemyConnector";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import Text from "../shared/Text";
import View from "../shared/View";

const OnlineIndicator = styled(View, {
  width: 12,
  height: 12,
  borderRadius: 100,
  backgroundColor: "$uiBrandPrimary",
  position: "absolute",
  right: -2,
  top: -2,
  borderWidth: 2,
  borderColor: "$borderBrandSoft",
  zIndex: 1,
});

function settings() {
  router.push("/settings");
}

export default function ProfileHeader() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  const [alertShown, setAlertShown] = useState(false);
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  function toggle() {
    queryClient.setQueryData(["settings", "sensitive"], !hidden);
  }
  function copy() {
    if (!address) return;
    setStringAsync(address).catch(handleError);
    Alert.alert("Copied", "Your address has been copied to the clipboard.");
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
            {isConnected && <OnlineIndicator />}
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
                <Text fontSize={ms(17)} lineHeight={ms(23)}>
                  {shortenAddress(address, 6, 4).toLowerCase()}
                </Text>
              </View>
            </Pressable>
          )}

          <AddressDialog open={alertShown} onActionPress={copy} />
        </View>

        <View display="flex" flexDirection="row" alignItems="center" gap={16}>
          <Pressable onPress={toggle} hitSlop={ms(15)}>
            {hidden ? <Eye color="$uiNeutralPrimary" /> : <EyeOff color="$uiNeutralPrimary" />}
          </Pressable>
          <Pressable onPress={settings} hitSlop={ms(15)}>
            <Settings color="$uiNeutralPrimary" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
