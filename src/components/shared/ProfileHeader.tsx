import { BellRinging, EyeClosed, Gear } from "phosphor-react-native";
import React from "react";
import { ms } from "react-native-size-matters";
import { View, Text, Image, useTheme, styled } from "tamagui";

const OnlineIndicator = styled(View, {
  width: 12,
  height: 12,
  borderRadius: 100,
  backgroundColor: "$textBrandPrimary",
  position: "absolute",
  right: -2,
  top: -2,
  borderWidth: 2,
  borderColor: "$borderBrandSoft",
  zIndex: 1,
});

const domainMatcher = /\..*/;

const ProfileHeader = () => {
  const theme = useTheme();
  const fullAddress = "0xfrdc.exa.eth";

  // TODO move elsewhere and export as util?
  const {
    name,
    domain,
  }: {
    name: string;
    domain: string;
  } = {
    name: fullAddress.split(".")[0] || "",
    domain: fullAddress.match(domainMatcher)?.[0] || "",
  };

  return (
    <View paddingVertical={ms(10)}>
      <View display="flex" flexDirection="row" justifyContent="space-between">
        <View display="flex" flexDirection="row" alignItems="center" gap={8}>
          <View position="relative">
            <OnlineIndicator />
            <Image
              source={{ uri: "https://avatars.githubusercontent.com/u/83888950?s=200&v=4" }}
              alt="Profile picture"
              width={32}
              height={32}
              borderRadius={100}
            />
          </View>

          <View display="flex" flexDirection="row" alignItems="flex-start">
            <Text fontSize={17} color={theme.textPrimary} lineHeight={23}>
              {name}
            </Text>
            <Text fontSize={17} color={theme.textSecondary} lineHeight={23}>
              {domain}
            </Text>
          </View>
        </View>
        <View display="flex" flexDirection="row" alignItems="center" gap={16}>
          <EyeClosed />
          <BellRinging />
          <Gear />
        </View>
      </View>
    </View>
  );
};

export default ProfileHeader;
