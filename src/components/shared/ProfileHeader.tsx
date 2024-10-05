import { Eye, EyeOff, Settings } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { setStringAsync } from "expo-clipboard";
import { router } from "expo-router";
import React from "react";
import { Alert, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Image, styled } from "tamagui";
import { useAccount, useConnect } from "wagmi";

import alchemyConnector from "../../utils/alchemyConnector";
import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import Text from "../shared/Text";
import View from "../shared/View";

const OnlineIndicator = styled(View, {
  backgroundColor: "$uiBrandPrimary",
  borderColor: "$borderBrandSoft",
  borderRadius: 100,
  borderWidth: 2,
  height: 12,
  position: "absolute",
  right: -2,
  top: -2,
  width: 12,
  zIndex: 1,
});

function settings() {
  router.push("/settings");
}

export default function ProfileHeader() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  function toggle() {
    queryClient.setQueryData(["settings", "sensitive"], !hidden);
  }
  function copy() {
    if (!address) return;
    setStringAsync(address).catch(handleError);
    Alert.alert("Address Copied", "Your wallet address has been copied to the clipboard.");
  }
  return (
    <View backgroundColor="$backgroundSoft" padded>
      <View display="flex" flexDirection="row" justifyContent="space-between">
        <View alignItems="center" display="flex" flexDirection="row" gap={8}>
          <View
            onPress={() => {
              connect({ connector: alchemyConnector });
            }}
            position="relative"
          >
            {isConnected && <OnlineIndicator />}
            <Image
              alt="Profile picture"
              borderRadius="$r_0"
              height={ms(32)}
              source={{ uri: "https://avatars.githubusercontent.com/u/83888950?s=200&v=4" }}
              width={ms(32)}
            />
          </View>
          {address && (
            <Pressable hitSlop={ms(15)} onPress={copy}>
              <View alignItems="flex-start" display="flex" flexDirection="row">
                <Text fontSize={ms(17)} lineHeight={ms(23)}>
                  {shortenAddress(address, 6, 4).toLowerCase()}
                </Text>
              </View>
            </Pressable>
          )}
        </View>
        <View alignItems="center" display="flex" flexDirection="row" gap={16}>
          <Pressable hitSlop={ms(15)} onPress={toggle}>
            {hidden ? <Eye color="$uiNeutralPrimary" /> : <EyeOff color="$uiNeutralPrimary" />}
          </Pressable>
          <Pressable hitSlop={ms(15)} onPress={settings}>
            <Settings color="$uiNeutralPrimary" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
