import { ChevronRight } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";

import MiniCardExa from "../../assets/images/mini-card-exa.svg";
import MiniCardVisa from "../../assets/images/mini-card-visa.svg";
import { getCard } from "../../utils/server";
import Text from "../shared/Text";
import View from "../shared/View";

export default function CardStatus() {
  const { data: card } = useQuery({ queryKey: ["card", "details"], queryFn: getCard });
  const { data: cardDetails } = useQuery({
    queryKey: ["card", "details"],
    queryFn: getCard,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  const frozen = cardDetails?.status === "FROZEN";
  const isCredit = card ? card.mode > 0 : false;
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
          <MiniCardExa preserveAspectRatio="xMaxYMid" height="100%" width="100%" shouldRasterizeIOS />
        </View>
        <View height="100%" width="50%">
          <MiniCardVisa preserveAspectRatio="xMaxYMid" height="100%" width="100%" shouldRasterizeIOS />
        </View>
      </View>
      <View
        borderColor={frozen ? "$borderNeutralDisabled" : isCredit ? "$cardCreditBorder" : "$cardDebitBorder"}
        borderRadius="$r4"
        borderWidth={1}
        borderTopLeftRadius={0}
        borderTopRightRadius={0}
        marginTop={-20}
      >
        <YStack
          backgroundColor={frozen ? "$uiNeutralTertiary" : isCredit ? "$cardCreditBackground" : "$cardDebitBackground"}
          height={71}
          width="100%"
          justifyContent="flex-end"
          borderRadius="$r4"
        >
          <XStack alignItems="center" height={51} justifyContent="space-around" width="100%" gap="$s4">
            <View
              justifyContent="center"
              alignItems="center"
              backgroundColor={isCredit ? "$cardCreditInteractive" : "$cardDebitInteractive"}
              borderRadius="$r2"
              paddingVertical="$s1"
              paddingHorizontal="$s2"
            >
              <Text
                emphasized
                color={frozen ? "$interactiveOnDisabled" : isCredit ? "$cardCreditText" : "$cardDebitText"}
                maxFontSizeMultiplier={1}
              >
                {isCredit ? "CREDIT MODE ENABLED" : "DEBIT MODE ENABLED"}
              </Text>
            </View>
            <View flexDirection="row" gap="$s1" alignItems="center">
              <Text
                fontSize={ms(13)}
                color={isCredit ? "$cardCreditInteractive" : "$cardDebitInteractive"}
                emphasized
                footnote
                fontWeight="bold"
              >
                Go to Card
              </Text>
              <ChevronRight
                size={ms(16)}
                color={isCredit ? "$cardCreditInteractive" : "$cardDebitInteractive"}
                fontWeight="bold"
              />
            </View>
          </XStack>
        </YStack>
      </View>
    </Pressable>
  );
}
