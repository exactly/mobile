import { WAD } from "@exactly/lib";
import { getRoutes } from "@lifi/sdk";
import { ArrowLeft } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useRouter } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";
import { optimism } from "viem/chains";

import ContractUtils from "../../components/settings/ContractUtils";
import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";

export default function Beta() {
  const { canGoBack } = useRouter();
  useQuery({
    queryKey: ["lifi", "routes"],
    queryFn: () =>
      getRoutes({
        fromChainId: optimism.id,
        toChainId: optimism.id,
        fromTokenAddress: "0x4200000000000000000000000000000000000006",
        toTokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        fromAmount: String(WAD),
      }),
  });
  return (
    <SafeView fullScreen tab>
      <View fullScreen padded gap="$s5">
        <View flexDirection="row" gap="$s3" justifyContent="space-around" alignItems="center">
          <View position="absolute" left={0}>
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
              </Pressable>
            )}
          </View>
          <Text emphasized subHeadline color="$uiNeutralPrimary">
            Beta
          </Text>
        </View>
        <ScrollView flex={1}>
          <View gap="$s3">
            <ContractUtils />
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
