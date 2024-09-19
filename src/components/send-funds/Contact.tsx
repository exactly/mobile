import type { Address } from "@exactly/common/types";
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
      borderRadius="$r3"
      justifyContent="space-between"
      alignItems="center"
      pressStyle={pressStyle}
      padding="$s2"
      onPress={() => {
        onContactPress(address);
      }}
      onLongPress={() => {
        setStringAsync(address).catch(handleError);
        Alert.alert("Address copied", "The contact's address has been copied to the clipboard.");
      }}
    >
      <XStack alignItems="center" gap="$s2">
        <View
          backgroundColor="$interactiveBaseBrandSoftDefault"
          padding="$s3_5"
          borderRadius="$r_0"
          justifyContent="center"
          alignItems="center"
        >
          <User2 color="$interactiveOnBaseBrandSoft" fontWeight="bold" />
        </View>
        {ens && (
          <Text textAlign="right" subHeadline color="$uiNeutralSecondary">
            {ens}
          </Text>
        )}
      </XStack>
      <Text textAlign="right" subHeadline color="$uiNeutralSecondary">
        {shortenAddress(address, 7, 7)}
      </Text>
    </XStack>
  );
}

const pressStyle = { backgroundColor: "$uiNeutralTertiary", borderRadius: "$r3" };
