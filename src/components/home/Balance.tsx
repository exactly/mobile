import { previewerAddress } from "@exactly/common/generated/chain";
import { ChevronDown } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { Accordion, Square, View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import AssetList from "./AssetList";
import { useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";

export default function Balance() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
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
    <View display="flex" justifyContent="center" backgroundColor="$backgroundSoft" gap="$s8">
      <View display="flex" flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text
          fontSize={ms(15)}
          lineHeight={ms(21)}
          fontWeight="bold"
          color="$uiNeutralSecondary"
          textAlign="center"
          width="100%"
        >
          Balance
        </Text>
      </View>
      <Accordion overflow="hidden" type="multiple" borderRadius="$r3" padding="$s4" defaultValue={["balance"]}>
        <Accordion.Item value="balance" flex={1}>
          <Accordion.Trigger
            unstyled
            flexDirection="row"
            justifyContent="center"
            backgroundColor="transparent"
            borderWidth={0}
            alignItems="center"
            gap="$s3"
          >
            {({ open }: { open: boolean }) => {
              return (
                <>
                  <Text
                    sensitive
                    textAlign="center"
                    fontFamily="$mono"
                    fontSize={ms(40)}
                    fontWeight="bold"
                    overflow="hidden"
                  >
                    {(Number(usdBalance) / 1e18).toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </Text>
                  <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                    <ChevronDown size={ms(24)} color="$interactiveTextBrandDefault" />
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
