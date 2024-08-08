import { BellRing, EyeOff, Settings } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Image, styled } from "tamagui";
import { useAccount, useConnect } from "wagmi";

import shortenAddress from "../../utils/shortenAddress";
import { useTheme } from "../context/ThemeProvider";
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

export default function ProfileHeader() {
  const { toggle } = useTheme();
  const { address } = useAccount();
  const {
    connect,
    connectors: [connector],
  } = useConnect();
  const { isConnected } = useAccount();
  return (
    <View padded>
      <View display="flex" flexDirection="row" justifyContent="space-between">
        <View display="flex" flexDirection="row" alignItems="center" gap={8}>
          <View
            position="relative"
            onPress={() => {
              if (connector) connect({ connector });
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
            <View display="flex" flexDirection="row" alignItems="flex-start">
              <Text fontSize={ms(17)} lineHeight={ms(23)}>
                {shortenAddress(address, 6, 4).toLowerCase()}
              </Text>
            </View>
          )}
        </View>
        <View display="flex" flexDirection="row" alignItems="center" gap={16}>
          <EyeOff color="$uiNeutralPrimary" />
          <BellRing color="$uiNeutralPrimary" />
          <Pressable onPress={toggle}>
            <Settings color="$uiNeutralPrimary" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
