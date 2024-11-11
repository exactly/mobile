import { ArrowRightLeft } from "@tamagui/lucide-icons";
import React, { useState } from "react";
import { ms } from "react-native-size-matters";
import { AnimatePresence, Square, XStack, YStack } from "tamagui";

import Text from "../../shared/Text";
import View from "../../shared/View";

const sharedHeight = 51;

export default function ModeSelector({
  isCredit,
  disabled,
  frozen,
}: {
  isCredit: boolean;
  disabled: boolean;
  frozen: boolean;
}) {
  const [switcherWidth, setSwitcherWidth] = useState(0);
  return (
    <YStack
      backgroundColor={
        disabled || frozen ? "$uiNeutralTertiary" : isCredit ? "$cardCreditBackground" : "$cardDebitBackground"
      }
      height={71}
      width="100%"
      justifyContent="flex-end"
      borderRadius="$r4"
    >
      <XStack alignItems="center" width="100%" gap="$s4">
        <View flex={1} justifyContent="center" alignItems="center" height={sharedHeight}>
          <Text
            emphasized
            subHeadline
            color={
              disabled || frozen ? "$interactiveOnDisabled" : isCredit ? "$cardCreditText" : "$cardDebitInteractive"
            }
            maxFontSizeMultiplier={1}
          >
            CREDIT MODE
          </Text>
        </View>
        <View width={20} flex={0} height={sharedHeight} alignItems="center" justifyContent="center">
          <Square animation="moderate" rotate={isCredit ? "360deg" : "0deg"}>
            <ArrowRightLeft
              color={
                disabled || frozen
                  ? "$interactiveOnDisabled"
                  : isCredit
                    ? "$cardCreditInteractive"
                    : "$cardDebitInteractive"
              }
              size={ms(20)}
            />
          </Square>
        </View>
        <View flex={1} justifyContent="center" alignItems="center" height={sharedHeight}>
          <Text
            emphasized
            subHeadline
            color={
              disabled || frozen ? "$interactiveOnDisabled" : isCredit ? "$cardCreditInteractive" : "$cardDebitText"
            }
            maxFontSizeMultiplier={1}
          >
            DEBIT MODE
          </Text>
        </View>
        <View
          position="absolute"
          left={0}
          right={0}
          top={0}
          bottom={0}
          zIndex={-1}
          onLayout={(event) => {
            setSwitcherWidth(event.nativeEvent.layout.width);
          }}
          height={sharedHeight}
        >
          <AnimatePresence exitBeforeEnter>
            {switcherWidth > 0 && (
              <View
                width={switcherWidth / 2 - 20}
                animation="moderate"
                borderRadius="$r2"
                height={sharedHeight}
                enterStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
                transform={[{ translateX: isCredit ? 0 : switcherWidth / 2 + 20 }]}
                overflow="hidden"
                padding="$s2"
              >
                <View
                  backgroundColor={
                    disabled || frozen
                      ? "$interactiveDisabled"
                      : isCredit
                        ? "$cardCreditInteractive"
                        : "$cardDebitInteractive"
                  }
                  width="100%"
                  height="100%"
                  borderRadius="$r3"
                />
              </View>
            )}
          </AnimatePresence>
        </View>
      </XStack>
    </YStack>
  );
}
