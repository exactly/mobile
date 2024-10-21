import { previewerAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { ArrowLeft, ArrowRight, User, UserMinus, UserPlus } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Avatar, ScrollView, XStack } from "tamagui";
import { parse } from "valibot";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import queryClient, { type Withdraw } from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import AssetSelector from "../shared/AssetSelector";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function AssetSelection() {
  const { canGoBack } = router;
  const { address } = useAccount();
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const [selectedMarket, setSelectedMarket] = useState<Address | undefined>();
  const { data: savedContacts } = useQuery<{ address: Address; ens: string }[] | undefined>({
    queryKey: ["contacts", "saved"],
  });
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  const positions = markets
    ?.map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
    }))
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0);

  const handleSubmit = () => {
    if (selectedMarket) {
      queryClient.setQueryData<Withdraw>(["withdrawal"], (old) => {
        return old ? { ...old, market: selectedMarket } : { market: selectedMarket, amount: 0n };
      });
      router.push("/send-funds/amount");
    }
  };

  const hasContact = savedContacts?.find((contact) => contact.address === withdraw?.receiver);

  return (
    <SafeView fullScreen>
      <View gap={ms(20)} fullScreen padded>
        <View flexDirection="row" gap={ms(10)} justifyContent="space-around" alignItems="center">
          <View position="absolute" left={0}>
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
              </Pressable>
            )}
          </View>
          <Text emphasized color="$uiNeutralPrimary" fontSize={ms(15)}>
            Choose asset
          </Text>
        </View>
        <ScrollView flex={1}>
          <View flex={1} gap="$s5">
            {withdraw?.receiver && (
              <XStack
                alignItems="center"
                backgroundColor="$backgroundBrandSoft"
                borderRadius="$r2"
                justifyContent="space-between"
                paddingVertical="$s2"
                paddingHorizontal="$s2"
              >
                <XStack alignItems="center" gap="$s3" paddingHorizontal="$s1">
                  <Avatar size={ms(32)} backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0">
                    <User size={ms(20)} color="$interactiveOnBaseBrandDefault" />
                  </Avatar>
                  <Text emphasized callout color="$uiNeutralSecondary">
                    To:
                  </Text>
                  <Text emphasized callout color="$uiNeutralPrimary" fontFamily="$mono">
                    {shortenAddress(withdraw.receiver, 7, 7)}
                  </Text>
                </XStack>
                <Button
                  backgroundColor={hasContact ? "$interactiveBaseErrorSoftDefault" : "$interactiveBaseBrandSoftDefault"}
                  padding="$s3_5"
                  onPress={() => {
                    queryClient.setQueryData<{ name: string; address: Address; ens: string }[] | undefined>(
                      ["contacts", "saved"],
                      (old) => {
                        if (hasContact) {
                          return old?.filter((contact) => contact.address !== withdraw.receiver);
                        } else {
                          return old && old.length > 0
                            ? [...old, { name: "New Contact", address: parse(Address, withdraw.receiver), ens: "" }]
                            : [{ name: "New Contact", address: parse(Address, withdraw.receiver), ens: "" }];
                        }
                      },
                    );
                    Alert.alert(
                      hasContact ? "Contact removed" : "Contact added",
                      hasContact
                        ? "This address has been removed from your contacts list."
                        : "This address has been added to your contacts list.",
                    );
                  }}
                >
                  {hasContact ? (
                    <UserMinus size={ms(24)} color="$interactiveOnBaseErrorSoft" />
                  ) : (
                    <UserPlus size={ms(24)} color="$interactiveOnBaseBrandSoft" />
                  )}
                </Button>
              </XStack>
            )}
            <AssetSelector positions={positions} onSubmit={setSelectedMarket} />
            <Button
              contained
              main
              spaced
              disabled={!selectedMarket}
              iconAfter={
                <ArrowRight color={selectedMarket ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />
              }
              onPress={() => {
                handleSubmit();
              }}
            >
              Next
            </Button>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
