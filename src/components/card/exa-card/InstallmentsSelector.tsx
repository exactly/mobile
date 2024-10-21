import MAX_INSTALLMENTS from "@exactly/common/MAX_INSTALLMENTS";
import { ChevronDown } from "@tamagui/lucide-icons";
import React, { useEffect, useState } from "react";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { Square, XStack, YStack } from "tamagui";

import AnimatedView from "../../shared/AnimatedView";
import Text from "../../shared/Text";

export default function InstallmentsSelector({
  value,
  isCredit,
  onChange,
}: {
  value: number;
  isCredit: boolean;
  onChange: (installments: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function toggleExpanded() {
    setExpanded((previous) => !previous);
  }

  const rContainer = useAnimatedStyle(() => {
    return {
      height: withTiming(isCredit && expanded ? 160 : isCredit && !expanded ? 99 : 0),
      marginTop: withTiming(isCredit ? -20 : 0),
    };
  }, [expanded, isCredit]);

  const rOther = useAnimatedStyle(() => {
    return { height: withTiming(isCredit && expanded ? 140 : isCredit && !expanded ? 79 : 0) };
  }, [expanded, isCredit]);

  useEffect(() => {
    if (!isCredit) {
      setExpanded(false);
    }
  }, [expanded, isCredit]);

  return (
    <AnimatedYStack
      zIndex={1}
      backgroundColor="transparent"
      borderColor="$borderNeutralSoft"
      borderRadius="$r4"
      borderWidth={isCredit ? 1 : 0}
      borderTopLeftRadius={0}
      borderTopRightRadius={0}
      onPress={toggleExpanded}
      style={rContainer}
    >
      <AnimatedYStack justifyContent="flex-end" height="100%">
        <AnimatedXStack style={rOther} overflow="hidden" justifyContent="center" paddingHorizontal="$s4_5" gap="$s4">
          {!expanded && (
            <AnimatedView alignItems="flex-start" justifyContent="center" flex={1} entering={FadeIn} exiting={FadeOut}>
              <Text subHeadline color="$uiNeutralSecondary">
                Set installments
              </Text>
            </AnimatedView>
          )}
          <AnimatedXStack gap="$s2" justifyContent="center" minHeight={39} flex={1}>
            <XStack animation="moderate" justifyContent="flex-end" alignItems="center" gap="$s2">
              {Array.from({ length: MAX_INSTALLMENTS }).map((_, index) => {
                return (
                  <Installment
                    key={index}
                    index={index}
                    value={value}
                    onChange={onChange}
                    expanded={expanded}
                    onPress={toggleExpanded}
                  />
                );
              })}
            </XStack>
            <Square animation="moderate" rotate={expanded ? "180deg" : "0deg"}>
              <ChevronDown size={ms(20)} color="$uiBrandSecondary" />
            </Square>
          </AnimatedXStack>
        </AnimatedXStack>
      </AnimatedYStack>
    </AnimatedYStack>
  );
}

function Installment({
  index,
  value,
  onChange,
  onPress,
  expanded,
}: {
  index: number;
  value: number;
  onChange: (installments: number) => void;
  onPress: () => void;
  expanded: boolean;
}) {
  const rInstallment = useAnimatedStyle(() => {
    const isSelected = index + 1 === value;
    return {
      height: withTiming(expanded ? 100 : 39),
      width: withTiming(expanded ? 39 : isSelected ? 26 : 13.6),
    };
  });

  const translateFontAnim = useAnimatedStyle(
    () => ({ fontSize: withTiming(interpolate(expanded ? 1 : 0, [1, 0], [28, 20], Extrapolation.CLAMP)) }),
    [expanded],
  );
  return (
    <AnimatedView
      key={index}
      hitSlop={ms(10)}
      minHeight={39}
      minWidth={13.6}
      backgroundColor={index + 1 > value ? "$backgroundSoft" : "$interactiveBaseBrandSoftDefault"}
      borderRadius={expanded ? "$r3" : "$r2"}
      justifyContent="center"
      alignItems="center"
      borderWidth={1}
      borderColor={index + 1 > value ? "$interactiveBaseBrandSoftDefault" : "transparent"}
      style={rInstallment}
      onPress={() => {
        if (!expanded) onPress();
        if (expanded && index + 1 !== value) {
          onChange(index + 1);
        }
      }}
    >
      <AnimatedView animation="moderate" opacity={index + 1 === value ? 1 : expanded ? 0.5 : 0}>
        <Animated.Text style={translateFontAnim}>
          <Text emphasized color={index + 1 > value ? "$uiBrandTertiary" : "$interactiveOnBaseBrandSoft"}>
            {index + 1}
          </Text>
        </Animated.Text>
      </AnimatedView>
    </AnimatedView>
  );
}

const AnimatedXStack = Animated.createAnimatedComponent(XStack);
const AnimatedYStack = Animated.createAnimatedComponent(YStack);
