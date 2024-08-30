import { previewerAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/types";
import { ArrowLeft, ArrowRight, User } from "@tamagui/lucide-icons";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { valibotValidator, type ValibotValidator } from "@tanstack/valibot-form-adapter";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms, vs } from "react-native-size-matters";
import { SvgUri } from "react-native-svg";
import { Avatar, ScrollView, ToggleGroup, XStack, YStack } from "tamagui";
import { parse } from "valibot";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../../generated/contracts";
import assetLogos from "../../utils/assetLogos";
import handleError from "../../utils/handleError";
import queryClient, { type Withdraw } from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function AssetSelection() {
  const { canGoBack } = router;
  const { address } = useAccount();
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });

  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  const { Field, Subscribe, handleSubmit } = useForm<{ market: string }, ValibotValidator>({
    defaultValues: withdraw?.market && { market: withdraw.market },
    onSubmit: ({ value }) => {
      const market = parse(Address, value.market);
      queryClient.setQueryData<Withdraw>(["withdrawal"], (old) => {
        return old ? { ...old, market } : { market, amount: 0n };
      });
      router.push("/send-funds/amount");
    },
  });

  const positions = markets
    ?.map((market) => ({
      ...market,
      symbol: market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3),
      usdValue: (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals),
    }))
    .filter(({ floatingDepositAssets }) => floatingDepositAssets > 0);

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
              >
                <XStack alignItems="center" gap="$s3" padding="$s3">
                  <Avatar size={ms(32)} backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0">
                    <User size={ms(20)} color="$interactiveOnBaseBrandDefault" />
                  </Avatar>
                  <Text emphasized callout color="$uiNeutralSecondary">
                    To:
                  </Text>
                  <Text emphasized callout color="$uiNeutralPrimary">
                    {shortenAddress(withdraw.receiver, 7, 7)}
                  </Text>
                </XStack>
              </XStack>
            )}
            {positions && positions.length > 0 ? (
              <Field name="market" validatorAdapter={valibotValidator()} validators={{ onChange: Address }}>
                {({ state: { value, meta }, handleChange }) => (
                  <YStack gap="$s2">
                    <ToggleGroup
                      type="single"
                      flexDirection="column"
                      backgroundColor="transparent"
                      borderWidth={1}
                      borderColor="$borderNeutralSeparator"
                      padding="$s3"
                      onValueChange={handleChange}
                      value={value}
                    >
                      {positions.map(
                        ({ symbol, assetName, floatingDepositAssets, decimals, usdValue, market }, index) => (
                          <ToggleGroup.Item
                            key={index}
                            value={market}
                            paddingHorizontal="$s4"
                            paddingVertical={0}
                            backgroundColor="transparent"
                            alignItems="stretch"
                            borderWidth={1}
                            borderRadius="$r_2"
                            borderColor={value === market ? "$borderBrandStrong" : "transparent"}
                          >
                            <View
                              flexDirection="row"
                              alignItems="center"
                              justifyContent="space-between"
                              paddingVertical={vs(10)}
                            >
                              <View flexDirection="row" gap={ms(10)} alignItems="center">
                                <SvgUri
                                  uri={assetLogos[symbol as keyof typeof assetLogos]}
                                  width={ms(32)}
                                  height={ms(32)}
                                />
                                <View gap="$s2" alignItems="flex-start">
                                  <Text fontSize={ms(15)} fontWeight="bold">
                                    {symbol}
                                  </Text>
                                  <Text fontSize={ms(12)} color="$uiNeutralSecondary">
                                    {assetName}
                                  </Text>
                                </View>
                              </View>
                              <View gap="$s2" flex={1}>
                                <View flexDirection="row" alignItems="center" justifyContent="flex-end">
                                  <Text fontSize={ms(15)} fontWeight="bold" textAlign="right">
                                    {(Number(usdValue) / 1e18).toLocaleString(undefined, {
                                      style: "currency",
                                      currency: "USD",
                                    })}
                                  </Text>
                                </View>
                                <Text fontSize={ms(12)} color="$uiNeutralSecondary" textAlign="right">
                                  {Number(floatingDepositAssets / BigInt(10 ** decimals)).toLocaleString()} {symbol}
                                </Text>
                              </View>
                            </View>
                          </ToggleGroup.Item>
                        ),
                      )}
                    </ToggleGroup>
                    {meta.errors.length > 0 ? (
                      <Text padding="$s3" footnote color="$uiNeutralSecondary">
                        {meta.errors[0]?.toString().split(",")[0]}
                      </Text>
                    ) : undefined}
                  </YStack>
                )}
              </Field>
            ) : (
              <Text textAlign="center" emphasized footnote color="$uiNeutralSecondary">
                No available assets.
              </Text>
            )}
            <Subscribe selector={({ canSubmit }) => canSubmit}>
              {(canSubmit) => {
                return (
                  <Button
                    contained
                    main
                    spaced
                    disabled={!canSubmit}
                    iconAfter={
                      <ArrowRight color={canSubmit ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />
                    }
                    onPress={() => {
                      handleSubmit().catch(handleError);
                    }}
                  >
                    Next
                  </Button>
                );
              }}
            </Subscribe>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
