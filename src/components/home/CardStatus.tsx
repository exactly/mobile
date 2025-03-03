import { ChevronRight } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";

import MiniCardExa from "../../assets/images/mini-card-exa.svg";
import MiniCardVisa from "../../assets/images/mini-card-visa.svg";
import { getCard } from "../../utils/server";
import Text from "../shared/Text";
import View from "../shared/View";

export default function CardStatus() {
  const { data: card } = useQuery({ queryKey: ["card", "details"], queryFn: getCard });
  if (!card) return null;
  const isFrozen = card.status === "FROZEN";
  return (
    <Pressable
      hitSlop={ms(15)}
      onPress={() => {
        router.push("/card");
      }}
    >
      <View
        zIndex={2}
        backgroundColor="black"
        borderRadius="$r4"
        display="flex"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        overflow="hidden"
        height={88}
      >
        <View paddingLeft="$s5" height="100%" width="25%">
          <MiniCardExa
            width="100%"
            height="100%"
            preserveAspectRatio="xMaxYMid"
            {...(Platform.OS === "web" ? undefined : { shouldRasterizeIOS: true })}
          />
        </View>
        <View height="100%" width="50%">
          <MiniCardVisa
            width="100%"
            height="100%"
            preserveAspectRatio="xMaxYMid"
            {...(Platform.OS === "web" ? undefined : { shouldRasterizeIOS: true })}
          />
        </View>
      </View>
      <View
        borderColor={isFrozen ? "$borderNeutralDisabled" : "$borderNeutralSoft"}
        borderRadius="$r4"
        borderWidth={1}
        borderTopLeftRadius={0}
        borderTopRightRadius={0}
        marginTop={-20}
      >
        <YStack
          backgroundColor={isFrozen ? "$uiNeutralTertiary" : "$backgroundSoft"}
          height={71}
          width="100%"
          justifyContent="flex-end"
          borderRadius="$r4"
        >
          <XStack alignItems="center" height={51} justifyContent="space-between" width="100%" paddingHorizontal="$s4">
            <View
              justifyContent="center"
              alignItems="center"
              backgroundColor={isFrozen ? "$interactiveDisabled" : "$interactiveBaseSuccessDefault"}
              borderRadius="$r2"
              paddingVertical="$s1"
              paddingHorizontal="$s2"
            >
              <Text
                emphasized
                color={isFrozen ? "$interactiveOnDisabled" : "$interactiveOnBaseSuccessDefault"}
                maxFontSizeMultiplier={1}
              >
                {`CARD ${isFrozen ? "FROZEN" : "ENABLED"}`}
              </Text>
            </View>
            <View flexDirection="row" gap="$s1" alignItems="center">
              <Text fontSize={ms(13)} color="$interactiveBaseBrandDefault" emphasized footnote>
                View card
              </Text>
              <ChevronRight size={ms(16)} color="$interactiveBaseBrandDefault" fontWeight="bold" />
            </View>
          </XStack>
        </YStack>
      </View>
    </Pressable>
  );
}
