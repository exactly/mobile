import { ArrowLeft, ArrowRight, Coins, DollarSign, User } from "@tamagui/lucide-icons";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { valibotValidator, type ValibotValidator } from "@tanstack/valibot-form-adapter";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Avatar, ScrollView, XStack } from "tamagui";
import { bigint, check, pipe } from "valibot";

import WAD from "../../utils/WAD";
import handleError from "../../utils/handleError";
import queryClient, { type Withdraw } from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import useMarketAccount from "../../utils/useMarketAccount";
import AmountSelector from "../shared/AmountSelector";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Amount() {
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { market } = useMarketAccount(withdraw?.market);
  const { canGoBack } = router;
  const { Field, Subscribe, handleSubmit } = useForm<{ amount: bigint }, ValibotValidator>({
    defaultValues: { amount: withdraw?.amount ?? 0n },
    onSubmit: ({ value: { amount } }) => {
      queryClient.setQueryData<Withdraw>(["withdrawal"], (old) => (old ? { ...old, amount } : { amount }));
      router.push("/send-funds/withdraw");
    },
  });
  const available = market ? market.floatingDepositAssets : 0n;
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
          <Text color="$uiNeutralPrimary" fontSize={ms(15)} fontWeight="bold">
            Enter amount
          </Text>
        </View>
        <ScrollView flex={1}>
          <View flex={1} gap="$s5">
            <View gap="$s3">
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

              {market && (
                <>
                  <XStack
                    alignItems="center"
                    backgroundColor="$backgroundBrandSoft"
                    borderRadius="$r2"
                    justifyContent="space-between"
                    gap="$s3"
                  >
                    <XStack alignItems="center" gap="$s3" padding="$s3">
                      <Avatar size={ms(32)} backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0">
                        <Coins size={ms(20)} color="$interactiveOnBaseBrandDefault" />
                      </Avatar>
                      <Text callout color="$uiNeutralSecondary">
                        Available:
                      </Text>
                      <Text callout color="$uiNeutralPrimary" numberOfLines={1}>
                        {`${(Number(available) / 10 ** market.decimals).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: market.decimals,
                          useGrouping: false,
                        })} ${market.assetName}`}
                      </Text>
                    </XStack>
                  </XStack>

                  <XStack
                    alignItems="center"
                    backgroundColor="$backgroundBrandSoft"
                    borderRadius="$r2"
                    justifyContent="space-between"
                    gap="$s3"
                  >
                    <XStack alignItems="center" gap="$s3" padding="$s3">
                      <Avatar size={ms(32)} backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0">
                        <DollarSign size={ms(20)} color="$interactiveOnBaseBrandDefault" />
                      </Avatar>
                      <Text callout color="$uiNeutralSecondary">
                        Value:
                      </Text>
                      <Text callout color="$uiNeutralPrimary" numberOfLines={1}>
                        {(
                          Number((market.floatingDepositAssets * market.usdPrice) / WAD) /
                          10 ** market.decimals
                        ).toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          currencyDisplay: "narrowSymbol",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </XStack>
                  </XStack>
                </>
              )}
            </View>

            <Field
              name="amount"
              validatorAdapter={valibotValidator()}
              validators={{
                onChange: pipe(
                  bigint(),
                  check((value) => {
                    return value !== 0n;
                  }, "amount cannot be 0"),
                  check((value) => {
                    return value <= available;
                  }, "amount cannot be greater than available"),
                ),
              }}
            >
              {({ state: { meta }, handleChange }) => (
                <>
                  <AmountSelector onChange={handleChange} />
                  {meta.errors.length > 0 ? (
                    <Text padding="$s3" footnote color="$uiNeutralSecondary">
                      {meta.errors[0]?.toString().split(",")[0]}
                    </Text>
                  ) : undefined}
                </>
              )}
            </Field>

            <Subscribe selector={({ isValid, isTouched }) => [isValid, isTouched]}>
              {([isValid, isTouched]) => {
                return (
                  <Button
                    contained
                    main
                    spaced
                    disabled={!isValid || !isTouched}
                    iconAfter={
                      <ArrowRight
                        color={isValid && isTouched ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"}
                      />
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
