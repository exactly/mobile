import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import { borrowLimit, withdrawLimit } from "@exactly/lib";
import { ChevronRight, Dot, Loader, LockKeyhole, Snowflake } from "@tamagui/lucide-icons";
import React from "react";
import { Platform } from "react-native";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { AnimatePresence, XStack, YStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import Card from "../../../assets/images/card.svg";
import { useReadPreviewerExactly } from "../../../generated/contracts";
import AnimatedView from "../../shared/AnimatedView";
import Text from "../../shared/Text";
import View from "../../shared/View";

export default function CardContents({
  isCredit,
  disabled,
  frozen,
  revealing,
  lastFour,
}: {
  isCredit: boolean;
  disabled: boolean;
  frozen: boolean;
  revealing: boolean;
  lastFour?: string;
}) {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  const rotation = useSharedValue(0);
  const rStyle = useAnimatedStyle(() => {
    rotation.value += 1;
    const rotationValue = `${(rotation.value % 360).toString()}deg`;
    return { transform: [{ rotate: rotationValue }] };
  });
  return (
    <XStack
      height={160}
      animation="moderate"
      animateOnly={["opacity"]}
      justifyContent="space-between"
      padding="$s4"
      opacity={disabled ? 0.5 : 1}
    >
      <YStack height="100%" justifyContent="space-between" alignItems="flex-start">
        <AnimatePresence exitBeforeEnter>
          {disabled ? (
            <LockKeyhole size={ms(40)} strokeWidth={2} color="white" />
          ) : revealing ? (
            <AnimatedView style={rStyle}>
              <Loader size={ms(40)} strokeWidth={2} color="white" />
            </AnimatedView>
          ) : frozen ? (
            <Snowflake size={ms(40)} strokeWidth={2} color="white" />
          ) : isCredit ? (
            <View
              key="credit"
              animation="moderate"
              enterStyle={{ opacity: 0, transform: [{ translateX: -100 }] }} // eslint-disable-line react-native/no-inline-styles
              exitStyle={{ opacity: 0, transform: [{ translateX: -100 }] }} // eslint-disable-line react-native/no-inline-styles
              transform={[{ translateX: 0 }]}
            >
              <Text sensitive color="white" title maxFontSizeMultiplier={1}>
                {(markets ? Number(borrowLimit(markets, marketUSDCAddress)) / 1e6 : 0).toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  currencyDisplay: "narrowSymbol",
                })}
              </Text>
              <View
                animation="moderate"
                enterStyle={{ opacity: 0, transform: [{ translateX: 25 }] }} // eslint-disable-line react-native/no-inline-styles
                exitStyle={{ opacity: 0, transform: [{ translateX: 25 }] }} // eslint-disable-line react-native/no-inline-styles
                transform={[{ translateX: 0 }]}
              >
                <Text color="white" emphasized caption maxFontSizeMultiplier={1}>
                  CREDIT LIMIT
                </Text>
              </View>
            </View>
          ) : (
            <View
              key="debit"
              animation="moderate"
              enterStyle={{ opacity: 0, transform: [{ translateX: 100 }] }} // eslint-disable-line react-native/no-inline-styles
              exitStyle={{ opacity: 0, transform: [{ translateX: 100 }] }} // eslint-disable-line react-native/no-inline-styles
              transform={[{ translateX: 0 }]}
            >
              <Text sensitive color="white" title maxFontSizeMultiplier={1}>
                {(markets ? Number(withdrawLimit(markets, marketUSDCAddress)) / 1e6 : 0).toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  currencyDisplay: "narrowSymbol",
                })}
              </Text>
              <View
                animation="moderate"
                enterStyle={{ opacity: 0, transform: [{ translateX: -25 }] }} // eslint-disable-line react-native/no-inline-styles
                exitStyle={{ opacity: 0, transform: [{ translateX: -25 }] }} // eslint-disable-line react-native/no-inline-styles
                transform={[{ translateX: 0 }]}
              >
                <Text color="white" emphasized caption maxFontSizeMultiplier={1}>
                  DEBIT LIMIT
                </Text>
              </View>
            </View>
          )}
        </AnimatePresence>
        <XStack gap="$s2" alignItems="center" justifyContent="flex-start">
          <XStack gap="$s1">
            {Array.from({ length: 4 }).map((_, index) => (
              <Dot key={index} color="white" size={ms(10)} strokeWidth={10} />
            ))}
          </XStack>
          <Text color="white" callout fontFamily="$mono" letterSpacing={2} maxFontSizeMultiplier={1}>
            {lastFour}
          </Text>
          <ChevronRight size={ms(20)} strokeWidth={2} color="white" />
        </XStack>
      </YStack>
      <XStack animation="moderate" position="absolute" right={0} left={0} top={0} bottom={0} justifyContent="flex-end">
        <Card
          width="50%"
          height="100%"
          preserveAspectRatio="xMaxYMid"
          {...(Platform.OS === "web" ? undefined : { shouldRasterizeIOS: true })}
        />
      </XStack>
    </XStack>
  );
}
