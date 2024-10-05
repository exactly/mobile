import { previewerAddress } from "@exactly/common/generated/chain";
import { ChevronDown } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { Accordion, Square, View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";
import AssetList from "./AssetList";

export default function Balance() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    account: address,
    address: previewerAddress,
    args: [address ?? zeroAddress],
  });
  let usdBalance = 0n;
  if (markets) {
    for (const market of markets) {
      if (market.floatingDepositAssets > 0n) {
        usdBalance += (market.floatingDepositAssets * market.usdPrice) / 10n ** BigInt(market.decimals);
      }
    }
  }
  return (
    <View backgroundColor="$backgroundSoft" display="flex" gap="$s4" justifyContent="center">
      <View alignItems="center" display="flex" flexDirection="row" justifyContent="space-between">
        <Text
          color="$uiNeutralSecondary"
          fontSize={ms(15)}
          fontWeight="bold"
          lineHeight={ms(21)}
          textAlign="center"
          width="100%"
        >
          Assets
        </Text>
      </View>
      <Accordion borderRadius="$r3" defaultValue={["balance"]} overflow="hidden" padding="$s4" type="multiple">
        <Accordion.Item flex={1} value="balance">
          <Accordion.Trigger
            alignItems="center"
            backgroundColor="transparent"
            borderWidth={0}
            flexDirection="row"
            gap="$s3"
            justifyContent="center"
            unstyled
          >
            {({ open }: { open: boolean }) => {
              return (
                <>
                  <Text
                    fontFamily="$mono"
                    fontSize={ms(40)}
                    fontWeight="bold"
                    overflow="hidden"
                    sensitive
                    textAlign="center"
                  >
                    {(Number(usdBalance) / 1e18).toLocaleString(undefined, {
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                      style: "currency",
                    })}
                  </Text>
                  <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                    <ChevronDown color="$interactiveTextBrandDefault" size={ms(24)} />
                  </Square>
                </>
              );
            }}
          </Accordion.Trigger>
          <Accordion.HeightAnimator animation="quick">
            <Accordion.Content exitStyle={exitStyle} gap="$s4" paddingTop="$s4">
              <AssetList />
            </Accordion.Content>
          </Accordion.HeightAnimator>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}

const exitStyle = { opacity: 0 };
