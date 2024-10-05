import { ArrowLeft, ArrowRight, Coins, DollarSign, User } from "@tamagui/lucide-icons";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { type ValibotValidator, valibotValidator } from "@tanstack/valibot-form-adapter";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Avatar, ScrollView, XStack } from "tamagui";
import { bigint, check, pipe } from "valibot";

import handleError from "../../utils/handleError";
import queryClient, { type Withdraw } from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import useMarketAccount from "../../utils/useMarketAccount";
import WAD from "../../utils/WAD";
import AmountSelector from "../shared/AmountSelector";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Amount() {
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { market } = useMarketAccount(withdraw?.market);
  const { canGoBack } = router;
  const { Field, handleSubmit, Subscribe } = useForm<{ amount: bigint }, ValibotValidator>({
    defaultValues: { amount: withdraw?.amount ?? 0n },
    onSubmit: ({ value: { amount } }) => {
      queryClient.setQueryData<Withdraw>(["withdrawal"], (old) => (old ? { ...old, amount } : { amount }));
      router.push("/send-funds/withdraw");
    },
  });
  const available = market ? market.floatingDepositAssets : 0n;
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
                </XStack>
              )}

              {market && (
                <>
                  <XStack
                    alignItems="center"
                    backgroundColor="$backgroundBrandSoft"
                    borderRadius="$r2"
                    gap="$s3"
                    justifyContent="space-between"
                  >
                    <XStack alignItems="center" gap="$s3" padding="$s3">
                      <Avatar backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0" size={ms(32)}>
                        <Coins color="$interactiveOnBaseBrandDefault" size={ms(20)} />
                      </Avatar>
                      <Text callout color="$uiNeutralSecondary">
                        Available:
                      </Text>
                      <Text callout color="$uiNeutralPrimary" numberOfLines={1}>
                        {`${(Number(available) / 10 ** market.decimals).toLocaleString(undefined, {
                          maximumFractionDigits: market.decimals,
                          minimumFractionDigits: 0,
                          useGrouping: false,
                        })} ${market.assetName}`}
                      </Text>
                    </XStack>
                  </XStack>

                  <XStack
                    alignItems="center"
                    backgroundColor="$backgroundBrandSoft"
                    borderRadius="$r2"
                    gap="$s3"
                    justifyContent="space-between"
                  >
                    <XStack alignItems="center" gap="$s3" padding="$s3">
                      <Avatar backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0" size={ms(32)}>
                        <DollarSign color="$interactiveOnBaseBrandDefault" size={ms(20)} />
                      </Avatar>
                      <Text callout color="$uiNeutralSecondary">
                        Value:
                      </Text>
                      <Text callout color="$uiNeutralPrimary" numberOfLines={1}>
                        {(
                          Number((market.floatingDepositAssets * market.usdPrice) / WAD) /
                          10 ** market.decimals
                        ).toLocaleString(undefined, {
                          currency: "USD",
                          currencyDisplay: "narrowSymbol",
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 0,
                          style: "currency",
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
              {({ handleChange, state: { meta } }) => (
                <>
                  <AmountSelector onChange={handleChange} />
                  {meta.errors.length > 0 ? (
                    <Text color="$uiNeutralSecondary" footnote padding="$s3">
                      {meta.errors[0]?.toString().split(",")[0]}
                    </Text>
                  ) : undefined}
                </>
              )}
            </Field>

            <Subscribe selector={({ isTouched, isValid }) => [isValid, isTouched]}>
              {([isValid, isTouched]) => {
                return (
                  <Button
                    contained
                    disabled={!isValid || !isTouched}
                    iconAfter={
                      <ArrowRight
                        color={isValid && isTouched ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"}
                      />
                    }
                    main
                    onPress={() => {
                      handleSubmit().catch(handleError);
                    }}
                    spaced
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
