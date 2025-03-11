import { ArrowRight, X } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Sheet, YStack } from "tamagui";

import VerifyIdentity from "../../assets/images/verify-identity.svg";
import handleError from "../../utils/handleError";
import useIntercom from "../../utils/useIntercom";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function VerificationFailure({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { present } = useIntercom();
  return (
    <Sheet
      open={open}
      dismissOnSnapToBottom
      unmountChildrenWhenHidden
      forceRemoveScrollEnabled={open}
      animation="moderate"
      dismissOnOverlayPress
      onOpenChange={onClose}
      snapPointsMode="fit"
      zIndex={100_000}
      modal
    >
      <Sheet.Overlay
        backgroundColor="#00000090"
        animation="quicker"
        enterStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
        exitStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
      />
      <Sheet.Handle />
      <Sheet.Frame>
        <SafeView paddingTop={0} fullScreen borderTopLeftRadius="$r4" borderTopRightRadius="$r4">
          <View position="absolute" top="$s5" right="$s5" zIndex={100_000}>
            <Pressable onPress={onClose} hitSlop={ms(15)}>
              <X size={ms(25)} color="$uiNeutralSecondary" />
            </Pressable>
          </View>
          <ScrollView>
            <View fullScreen flex={1}>
              <YStack flex={1} padding="$s4">
                <YStack flex={1} justifyContent="center" gap="$s4">
                  <View width="100%" aspectRatio={1} justifyContent="center" alignItems="center">
                    <View width="100%" height="100%" justifyContent="center" alignItems="center">
                      <VerifyIdentity width="100%" height="100%" />
                    </View>
                  </View>
                </YStack>
                <YStack gap="$s4_5">
                  <Text emphasized textAlign="center" color="$interactiveTextBrandDefault" title>
                    We couldn&apos;t verify your identity{/* cspell:ignore couldn */}
                  </Text>
                  <Text color="$uiNeutralPlaceholder" footnote textAlign="center">
                    This may be due to missing or incorrect information. Please contact support to resolve it.
                  </Text>
                  <Button
                    flexBasis={ms(60)}
                    onPress={() => {
                      present().catch(handleError);
                    }}
                    contained
                    main
                    spaced
                    fullwidth
                    iconAfter={<ArrowRight strokeWidth={2.5} color="$interactiveOnBaseBrandDefault" />}
                  >
                    Contact support
                  </Button>
                </YStack>
              </YStack>
            </View>
          </ScrollView>
        </SafeView>
      </Sheet.Frame>
    </Sheet>
  );
}
