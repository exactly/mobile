import chain from "@exactly/common/generated/chain";
import { ExternalLink, X } from "@tamagui/lucide-icons";
import { format, isAfter } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Square, styled, useTheme, XStack, YStack } from "tamagui";

import assetLogos from "../../utils/assetLogos";
import handleError from "../../utils/handleError";
import AssetLogo from "../shared/AssetLogo";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Failure({
  usdAmount,
  amount,
  currency,
  maturity,
  hash,
}: {
  usdAmount: number;
  amount: number;
  currency: string;
  maturity: string;
  hash?: string;
}) {
  const theme = useTheme();
  return (
    <View fullScreen backgroundColor="$backgroundSoft">
      <StyledGradient
        locations={[0.5, 1]}
        position="absolute"
        top={0}
        left={0}
        right={0}
        height={220}
        opacity={0.2}
        colors={[theme.uiErrorSecondary.val, theme.backgroundSoft.val]}
      />
      <SafeView backgroundColor="transparent">
        <View fullScreen padded>
          <View fullScreen>
            <ScrollView
              fullscreen
              showsVerticalScrollIndicator={false}
              stickyHeaderIndices={[0]}
              // eslint-disable-next-line react-native/no-inline-styles
              contentContainerStyle={{
                flexGrow: 1,
                flexDirection: "column",
                justifyContent: "space-between",
              }}
              stickyHeaderHiddenOnScroll
            >
              <View flex={1}>
                <YStack gap="$s7" paddingBottom="$s9">
                  <XStack justifyContent="center" alignItems="center">
                    <Square borderRadius="$r4" backgroundColor="$interactiveBaseErrorSoftDefault" size={ms(80)}>
                      <X size={ms(48)} color="$uiErrorSecondary" strokeWidth={2} />
                    </Square>
                  </XStack>
                  <YStack gap="$s4_5" justifyContent="center" alignItems="center">
                    <Text secondary body>
                      Failed&nbsp;
                      <Text
                        emphasized
                        primary
                        body
                        color={
                          isAfter(new Date(Number(maturity) * 1000), new Date())
                            ? "$uiNeutralPrimary"
                            : "$uiErrorSecondary"
                        }
                      >
                        {`Due ${format(new Date(Number(maturity) * 1000), "MMM dd, yyyy")}`}
                      </Text>
                    </Text>
                    <Text title primary color="$uiNeutralPrimary">
                      {Number(usdAmount).toLocaleString(undefined, {
                        style: "currency",
                        currency: "USD",
                        currencyDisplay: "narrowSymbol",
                      })}
                    </Text>
                    <XStack gap="$s2" alignItems="center">
                      <Text emphasized secondary subHeadline>
                        {Number(amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                      </Text>
                      <Text emphasized secondary subHeadline>
                        &nbsp;{currency}&nbsp;
                      </Text>
                      <AssetLogo uri={assetLogos[currency as keyof typeof assetLogos]} width={ms(16)} height={ms(16)} />
                    </XStack>
                  </YStack>
                </YStack>
              </View>
              <View flex={2} justifyContent="flex-end">
                <YStack alignItems="center" gap="$s4">
                  <Button
                    onPress={() => {
                      openBrowserAsync(`${chain.blockExplorers?.default.url}/tx/${hash}`).catch(handleError);
                    }}
                    contained
                    main
                    spaced
                    fullwidth
                    iconAfter={<ExternalLink color="$interactiveOnBaseBrandDefault" />}
                  >
                    View on explorer
                  </Button>

                  <Pressable
                    onPress={() => {
                      router.replace("/payments");
                    }}
                  >
                    <Text emphasized footnote color="$uiBrandSecondary">
                      Close
                    </Text>
                  </Pressable>
                </YStack>
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeView>
    </View>
  );
}

const StyledGradient = styled(LinearGradient, {});
