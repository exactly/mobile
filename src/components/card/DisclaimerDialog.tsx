import { CreditCard, SquareArrowOutUpRight } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { AlertDialog, XStack, YStack } from "tamagui";

import handleError from "../../utils/handleError";
import useIntercom from "../../utils/useIntercom";
import Button from "../shared/Button";
import Text from "../shared/Text";

export default function DisclaimerDialog({
  open,
  onActionPress,
  onClose,
}: {
  open: boolean;
  onActionPress: () => void;
  onClose: () => void;
}) {
  const { presentArticle } = useIntercom();
  return (
    <AlertDialog open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          onPress={onClose}
          key="overlay"
          backgroundColor="black"
          opacity={0.5}
          animation="quicker"
          enterStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
          exitStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
        />
        <AlertDialog.Content
          key="content"
          animation={["quicker", { opacity: { overshootClamping: true } }]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }} // eslint-disable-line react-native/no-inline-styles
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }} // eslint-disable-line react-native/no-inline-styles
          x={0}
          y={0}
          scale={1}
          opacity={1}
          borderWidth={0}
          margin="$s5"
        >
          <YStack backgroundColor="$backgroundSoft" borderRadius="$r6" padding="$s5" paddingTop="$s5" gap="$s5">
            <XStack alignItems="center" gap="$s3" justifyContent="flex-start">
              <AlertDialog.Title>
                <Text emphasized headline>
                  Disclaimer
                </Text>
              </AlertDialog.Title>
            </XStack>
            <YStack gap="$s6">
              <YStack gap="$s5">
                <Text secondary caption textAlign="justify">
                  The Exa Card is issued by Third National pursuant to a license from Visa. Any credit issued by Exa
                  Protocol subject to its separate terms and conditions. Third National is not a party to any agreement
                  with Exa Protocol and is not responsible for any loan or credit arrangement between user and Exa
                  Protocol.
                </Text>

                <XStack
                  justifyContent="center"
                  alignItems="center"
                  gap="$s3"
                  onPress={() => {
                    presentArticle("10707672").catch(handleError);
                  }}
                >
                  <Text textDecorationLine="underline" caption color="$uiNeutralSecondary">
                    Exa Card Terms & Conditions
                  </Text>
                  <SquareArrowOutUpRight size={ms(16)} color="$uiNeutralSecondary" />
                </XStack>
                <Text secondary caption textAlign="center">
                  By continuing, you agree to both the disclaimer above and the Exa Card Terms & Conditions.
                </Text>
              </YStack>
              <YStack gap="$s4" alignItems="center">
                <XStack>
                  <Button
                    onPress={onActionPress}
                    contained
                    main
                    spaced
                    fullwidth
                    iconAfter={<CreditCard strokeWidth={3} color="$interactiveOnBaseBrandDefault" />}
                  >
                    Continue
                  </Button>
                </XStack>
                <Pressable onPress={onClose} hitSlop={ms(15)}>
                  <Text emphasized numberOfLines={1} adjustsFontSizeToFit color="$interactiveOnBaseBrandSoft">
                    Cancel
                  </Text>
                </Pressable>
              </YStack>
            </YStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
