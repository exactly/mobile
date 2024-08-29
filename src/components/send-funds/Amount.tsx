import { ArrowLeft, ArrowRight, Coins, User } from "@tamagui/lucide-icons";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { valibotValidator, type ValibotValidator } from "@tanstack/valibot-form-adapter";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Avatar, ScrollView, XStack, YStack } from "tamagui";
import * as v from "valibot";
import type { Address } from "viem";

import handleError from "../../utils/handleError";
import queryClient, { type Withdraw } from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import useMarket from "../../utils/useMarket";
import AmountSelector from "../shared/AmountSelector";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Amount() {
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { canGoBack } = router;
  const marketAccount = useMarket(withdraw?.market);

  const {
    Field,
    Subscribe,
    handleSubmit,
    state: { errors },
  } = useForm<{ amount: bigint }, ValibotValidator>({
    defaultValues: { amount: withdraw?.amount ?? 0n },
    onSubmit: ({ value: { amount } }) => {
      queryClient.setQueryData<{ receiver?: Address; market?: Address; amount: bigint }>(["withdrawal"], (old) => {
        return old ? { ...old, amount } : { amount };
      });
      router.push("/send-funds/withdraw");
    },
  });

  const available = marketAccount
    ? (marketAccount.maxBorrowAssets * 10n ** 18n) / BigInt(10 ** marketAccount.decimals)
    : 0n;

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

              {marketAccount && (
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
                    <Text callout color="$uiNeutralPrimary">
                      {(Number(available) / 1e18).toLocaleString(undefined, {
                        currency: "USD",
                      })}{" "}
                      {marketAccount.assetName}
                    </Text>
                  </XStack>
                </XStack>
              )}
            </View>

            <Field
              name="amount"
              validatorAdapter={valibotValidator()}
              validators={{
                onChange: v.pipe(
                  v.bigint(),
                  v.check((value) => value > 0n, "invalid amount"),
                  v.check((value) => value <= available, "invalid amount"),
                ),
              }}
            >
              {({ handleChange }) => (
                <YStack gap="$s2">
                  <AmountSelector onChange={handleChange} />
                </YStack>
              )}
            </Field>

            {errors.length > 0 ? (
              <Text padding="$s3" footnote color="$uiNeutralSecondary">
                {errors[0]?.toString().split(",")[0]}
              </Text>
            ) : undefined}

            <Subscribe selector={({ isValid, isTouched }) => [isValid, isTouched]}>
              {([isValid, isTouched]) => {
                return (
                  <Button
                    contained
                    main
                    spaced
                    disabled={!(isValid && isTouched)}
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
