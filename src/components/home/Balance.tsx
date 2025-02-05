import { previewerAddress } from "@exactly/common/generated/chain";
import { ChevronDown } from "@tamagui/lucide-icons";
import { Skeleton } from "moti/skeleton";
import React from "react";
import { Appearance } from "react-native";
import { ms } from "react-native-size-matters";
import { Accordion, Square, View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import AssetList from "./AssetList";
import { useReadPreviewerExactly } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import AssetLogo from "../shared/AssetLogo";
import Text from "../shared/Text";

export default function Balance({ usdBalance }: { usdBalance: bigint }) {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({ address: previewerAddress, args: [address ?? zeroAddress] });
  const symbols = markets
    ?.map(({ symbol, floatingDepositAssets }) => ({
      floatingDepositAssets,
      symbol: symbol.slice(3) === "WETH" ? "ETH" : symbol.slice(3),
    }))
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0)
    .map(({ symbol }) => symbol);

  return (
    <View
      display="flex"
      justifyContent="center"
      borderWidth={1}
      borderColor="$borderNeutralSoft"
      backgroundColor="$backgroundSoft"
      borderRadius="$r3"
      paddingVertical="$s3_5"
      paddingHorizontal="$s4_5"
    >
      <Accordion type="multiple" defaultValue={undefined}>
        <Accordion.Item value="balance" flex={1}>
          <Accordion.Trigger
            disabled={usdBalance === 0n}
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
                <View
                  display="flex"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  width="100%"
                  gap="$s3_5"
                >
                  <View>
                    <Text color="$uiNeutralSecondary" emphasized footnote>
                      YOUR ASSETS
                    </Text>
                  </View>
                  <View flexDirection="row" alignItems="center" gap="$s3">
                    {symbols ? (
                      <Text
                        sensitive
                        textAlign="center"
                        fontFamily="$mono"
                        emphasized
                        subHeadline
                        overflow="hidden"
                        maxFontSizeMultiplier={1}
                      >
                        {(Number(usdBalance) / 1e18).toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          currencyDisplay: "narrowSymbol",
                        })}
                      </Text>
                    ) : (
                      <Skeleton height={ms(20)} width={ms(100)} colorMode={Appearance.getColorScheme() ?? "light"} />
                    )}
                    <View flexDirection="row">
                      {symbols ? (
                        symbols.map((symbol, index) => (
                          <View key={symbol} marginRight={index < symbols.length - 1 ? ms(-8) : 0} zIndex={index}>
                            <AssetLogo
                              uri={assetLogos[symbol as keyof typeof assetLogos]}
                              width={ms(16)}
                              height={ms(16)}
                            />
                          </View>
                        ))
                      ) : (
                        <Skeleton
                          radius="round"
                          colorMode={Appearance.getColorScheme() ?? "light"}
                          height={ms(16)}
                          width={ms(16)}
                        />
                      )}
                    </View>
                    {usdBalance !== 0n && (
                      <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                        <ChevronDown size={ms(24)} color="$interactiveTextBrandDefault" />
                      </Square>
                    )}
                  </View>
                </View>
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
