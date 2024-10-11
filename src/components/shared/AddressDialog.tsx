import chain from "@exactly/common/generated/chain";
import React from "react";
import { ms } from "react-native-size-matters";
import { AlertDialog, XStack, YStack } from "tamagui";

import Button from "./Button";
import Text from "./Text";
import View from "./View";
import OptimismImage from "../../assets/images/optimism.svg";

export default function AddressDialog({ open, onActionPress }: { open: boolean; onActionPress: () => void }) {
  return (
    <AlertDialog open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
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
          margin="$s3"
        >
          <YStack
            backgroundColor="$interactiveBaseErrorSoftDefault"
            borderRadius="$r6"
            padding="$s5"
            paddingTop="$s5"
            gap="$s3"
          >
            <XStack alignItems="center" gap="$s3" justifyContent="flex-start">
              <View alignItems="center" justifyContent="center">
                <OptimismImage height={ms(24)} width={ms(24)} />
              </View>
              <AlertDialog.Title fontWeight="bold" fontSize={ms(24)} color="$interactiveOnBaseErrorSoft">
                Warning
              </AlertDialog.Title>
            </XStack>
            <YStack gap="$s4">
              <AlertDialog.Description
                fontSize={ms(15)}
                fontWeight="regular"
                textAlign="justify"
                color="$interactiveOnBaseErrorSoft"
              >
                Funds sent to a network different from&nbsp;
                <Text fontWeight="bold" color="$interactiveOnBaseErrorSoft">
                  {chain.name}
                </Text>
                &nbsp;will be lost&nbsp;
                <Text fontWeight="bold" color="$interactiveOnBaseErrorSoft">
                  forever.
                </Text>
              </AlertDialog.Description>
              <XStack gap="$3" justifyContent="flex-end">
                <AlertDialog.Action asChild flex={1}>
                  <Button danger size={ms(50)} onPress={onActionPress}>
                    I understand
                  </Button>
                </AlertDialog.Action>
              </XStack>
            </YStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
