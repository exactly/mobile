import { optimism } from "@alchemy/aa-core";
import { getRoutes, getStepTransaction } from "@lifi/sdk";
import { captureException } from "@sentry/react-native";
import { ArrowLeft } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import ContractUtils from "../../components/settings/ContractUtils";
import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";

export default function Beta() {
  const { canGoBack } = useRouter();
  const { data: routes } = useQuery({
    queryKey: ["lifi", "swap"],
    queryFn: async () => {
      const lifi = await getRoutes({
        fromChainId: optimism.id,
        toChainId: optimism.id,
        fromTokenAddress: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
        toTokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        fromAddress: "0x261968232C3541758Ee8d47a59FC275f1D55deA4",
        fromAmount: "40000",
      });
      const [route] = lifi.routes;
      if (!route) {
        captureException(new Error("bad route"), { contexts: { lifi: { ...lifi } } });
        return;
      }
      return Promise.all(route.steps.map((step) => getStepTransaction(step)));
    },
  });
  useEffect(() => {
    if (!routes) return;
    console.log(...routes); // eslint-disable-line no-console -- // TODO remove
  }, [routes]);
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
