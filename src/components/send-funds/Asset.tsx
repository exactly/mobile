import { previewerAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import { ArrowLeft, ArrowRight, User, UserMinus, UserPlus } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
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
  const [selectedMarket, setSelectedMarket] = React.useState<Address | undefined>();
  const { data: savedContacts } = useQuery<{ address: Address; ens: string }[] | undefined>({
    queryKey: ["contacts", "saved"],
  });
  const { data: markets } = useReadPreviewerExactly({
    account: address,
    address: previewerAddress,
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
        return old ? { ...old, market: selectedMarket } : { amount: 0n, market: selectedMarket };
      });
      router.push("/send-funds/amount");
    }
  };

  const hasContact = savedContacts?.find((contact) => contact.address === withdraw?.receiver);

  return (
    <SafeView fullScreen>
      <View fullScreen gap={ms(20)} padded>
        <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-around">
          <View left={0} position="absolute">
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft color="$uiNeutralPrimary" size={ms(24)} />
              </Pressable>
            )}
          </View>
          <Text color="$uiNeutralPrimary" emphasized fontSize={ms(15)}>
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
                paddingHorizontal="$s2"
                paddingVertical="$s2"
              >
                <XStack alignItems="center" gap="$s3" paddingHorizontal="$s1">
                  <Avatar backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0" size={ms(32)}>
                    <User color="$interactiveOnBaseBrandDefault" size={ms(20)} />
                  </Avatar>
                  <Text callout color="$uiNeutralSecondary" emphasized>
                    To:
                  </Text>
                  <Text callout color="$uiNeutralPrimary" emphasized>
                    {shortenAddress(withdraw.receiver, 7, 7)}
                  </Text>
                </XStack>
                <Button
                  backgroundColor={hasContact ? "$interactiveBaseErrorSoftDefault" : "$interactiveBaseBrandSoftDefault"}
                  onPress={() => {
                    queryClient.setQueryData<{ address: Address; ens: string; name: string }[] | undefined>(
                      ["contacts", "saved"],
                      (old) => {
                        if (hasContact) {
                          return old?.filter((contact) => contact.address !== withdraw.receiver);
                        } else {
                          return old && old.length > 0
                            ? [...old, { address: parse(Address, withdraw.receiver), ens: "", name: "New Contact" }]
                            : [{ address: parse(Address, withdraw.receiver), ens: "", name: "New Contact" }];
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
                  padding="$s3_5"
                >
                  {hasContact ? (
                    <UserMinus color="$interactiveOnBaseErrorSoft" size={ms(24)} />
                  ) : (
                    <UserPlus color="$interactiveOnBaseBrandSoft" size={ms(24)} />
                  )}
                </Button>
              </XStack>
            )}
            <AssetSelector onSubmit={setSelectedMarket} positions={positions} />
            <Button
              contained
              disabled={!selectedMarket}
              iconAfter={
                <ArrowRight color={selectedMarket ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />
              }
              main
              onPress={() => {
                handleSubmit();
              }}
              spaced
            >
              Next
            </Button>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
