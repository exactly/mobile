import React from "react";
import { ms } from "react-native-size-matters";
import { XStack, Image } from "tamagui";

import assetLogos from "../../utils/assetLogos";
import Text from "../shared/Text";
import View from "../shared/View";

interface ValuesProperties {
  amount: bigint;
  assetName?: string;
  usdValue: bigint;
}

export default function Values({ amount, assetName, usdValue }: ValuesProperties) {
  return (
    <View alignItems="center" justifyContent="center">
      <View alignItems="center" gap="$s3_5">
        <XStack alignItems="center" gap="$s3">
          <Image
            source={{
              uri: assetLogos[assetName as keyof typeof assetLogos],
            }}
            width={ms(32)}
            height={ms(32)}
            borderRadius="$r_0"
          />
          <Text title color="$uiNeutralPrimary">
            {(Number(amount) / 1e18).toString()} {assetName}
          </Text>
        </XStack>
        <Text body color="$uiNeutralSecondary">
          {(Number(usdValue) / 1e18).toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
          })}
        </Text>
      </View>
    </View>
  );
}
