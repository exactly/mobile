import MAX_INSTALLMENTS from "@exactly/common/MAX_INSTALLMENTS";
import { ChevronDown } from "@tamagui/lucide-icons";
import React from "react";
import Animated, {
  CurvedTransition,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { AnimatePresence, Square, XStack, YStack } from "tamagui";

import AnimatedView from "../../shared/AnimatedView";
import Text from "../../shared/Text";

const AnimatedXStack = Animated.createAnimatedComponent(XStack);

interface InstallmentsSelectorProperties {
  value: number;
  onChange: (installments: number) => void;
  onExpand: () => void;
  expanded: boolean;
}

export default function InstallmentsSelector({ value, onChange, onExpand, expanded }: InstallmentsSelectorProperties) {
  const rContainer = useAnimatedStyle(() => {
    return { height: withTiming(expanded ? 140 : 79) };
  });
  return (
    <YStack justifyContent="flex-end" height="100%">
      <AnimatedXStack
        style={rContainer}
        overflow="hidden"
        justifyContent="center"
        paddingHorizontal="$s4_5"
        gap="$s4"
        layout={CurvedTransition.duration(250)}
      >
        <AnimatePresence>
          {!expanded && (
            <AnimatedView alignItems="flex-start" justifyContent="center" flex={1}>
              <Text subHeadline color="$uiNeutralSecondary">
                Set installments
              </Text>
            </AnimatedView>
          )}
        </AnimatePresence>

        <AnimatedXStack gap="$s2" justifyContent="center" minHeight={39} flex={1}>
          <XStack animation="moderate" justifyContent="flex-end" alignItems="center" gap="$s2">
            {Array.from({ length: MAX_INSTALLMENTS }).map((_, index) => {
              return (
                <Installment
                  key={index}
                  index={index}
                  value={value}
                  onChange={onChange}
                  onExpand={onExpand}
                  expanded={expanded}
                />
              );
            })}
          </XStack>
          <Square animation="moderate" rotate={expanded ? "180deg" : "0deg"}>
            <ChevronDown size={ms(20)} color="$uiBrandSecondary" />
          </Square>
        </AnimatedXStack>
      </AnimatedXStack>
    </YStack>
  );
}

interface InstallmentProperties {
  index: number;
  value: number;
  onChange: (installments: number) => void;
  onExpand: () => void;
  expanded: boolean;
}

function Installment({ index, value, onChange, onExpand, expanded }: InstallmentProperties) {
  const rInstallment = useAnimatedStyle(() => {
    const isSelected = index + 1 === value;
    return {
      height: withTiming(expanded ? 100 : 39),
      width: withTiming(expanded ? 39 : isSelected ? 26 : 13.6),
    };
  });

  const dExpanded = useDerivedValue(() => expanded);
  const translateFontAnim = useAnimatedStyle(
    () => ({ fontSize: interpolate(dExpanded.value ? 1 : 0, [1, 0], [28, 20], Extrapolation.CLAMP) }),
    [dExpanded],
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
      onPress={() => {
        if (expanded) {
          onChange(index + 1);
        } else {
          onExpand();
        }
      }}
      style={rInstallment}
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
