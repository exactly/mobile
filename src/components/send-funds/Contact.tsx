import type { Address } from "@exactly/common/validation";

import { User2 } from "@tamagui/lucide-icons";
import { setStringAsync } from "expo-clipboard";
import React from "react";
import { Alert } from "react-native";
import { XStack } from "tamagui";

import handleError from "../../utils/handleError";
import shortenAddress from "../../utils/shortenAddress";
import Text from "../shared/Text";
import View from "../shared/View";

interface ContactProperties {
  contact: { address: Address; ens: string };
  onContactPress: (address: Address) => void;
}

export default function Contact({ contact: { address, ens }, onContactPress }: ContactProperties) {
  return (
    <XStack
      alignItems="center"
      borderRadius="$r3"
      justifyContent="space-between"
      onLongPress={() => {
        setStringAsync(address).catch(handleError);
        Alert.alert("Address copied", "The contact's address has been copied to the clipboard.");
      }}
      onPress={() => {
        onContactPress(address);
      }}
      padding="$s2"
      pressStyle={pressStyle}
    >
      <XStack alignItems="center" gap="$s2">
        <View
          alignItems="center"
          backgroundColor="$interactiveBaseBrandSoftDefault"
          borderRadius="$r_0"
          justifyContent="center"
          padding="$s3_5"
        >
          <User2 color="$interactiveOnBaseBrandSoft" fontWeight="bold" />
        </View>
        {ens && (
          <Text color="$uiNeutralSecondary" subHeadline textAlign="right">
            {ens}
          </Text>
        )}
      </XStack>
      <Text color="$uiNeutralSecondary" subHeadline textAlign="right">
        {shortenAddress(address, 7, 7)}
      </Text>
    </XStack>
  );
}

const pressStyle = { backgroundColor: "$uiNeutralTertiary", borderRadius: "$r3" };
