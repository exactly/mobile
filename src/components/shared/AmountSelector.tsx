import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { type ValibotValidator, valibotValidator } from "@tanstack/valibot-form-adapter";
import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { styled } from "tamagui";
import { nonEmpty, pipe, string } from "valibot";
import { formatUnits, parseUnits } from "viem";

import type { Withdraw } from "../../utils/queryClient";

import useMarketAccount from "../../utils/useMarketAccount";
import WAD from "../../utils/WAD";
import Input from "./Input";
import View from "./View";

interface AmountSelectorProperties {
  onChange: (value: bigint) => void;
}

const AmountInput = styled(Input, {
  backgroundColor: "$backgroundSoft",
  borderRadius: "$r2",
  borderWidth: 0,
  flex: 1,
  focusStyle: { borderColor: "$borderBrandStrong", borderWidth: 1 },
  fontSize: ms(24),
  height: ms(60),
  textAlign: "center",
});

export default function AmountSelector({ onChange }: AmountSelectorProperties) {
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { market } = useMarketAccount(withdraw?.market);
  const { Field, setFieldValue } = useForm<{ assetInput: string; usdInput: string }, ValibotValidator>({
    defaultValues: { assetInput: "", usdInput: "" },
  });

  const handleAssetChange = useCallback(
    (text: string) => {
      if (!market) return;
      setFieldValue("assetInput", text);
      const assets = parseUnits(text.replaceAll(/\D/g, ".").replaceAll(/\.(?=.*\.)/g, ""), market.decimals);
      setFieldValue(
        "usdInput",
        Number(formatUnits((assets * market.usdPrice) / WAD, market.decimals)).toLocaleString(undefined, {
          currency: "USD",
          currencyDisplay: "narrowSymbol",
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
          style: "currency",
        }),
      );
      onChange(assets);
    },
    [market, setFieldValue, onChange],
  );

  const handleUsdChange = useCallback(
    (text: string) => {
      if (!market) return;
      setFieldValue("usdInput", text);
      const assets =
        (((parseUnits(text.replaceAll(/\D/g, ".").replaceAll(/\.(?=.*\.)/g, ""), 18) * WAD) / market.usdPrice) *
          BigInt(10 ** market.decimals)) /
        WAD;
      setFieldValue("assetInput", formatUnits(assets, market.decimals));
      onChange(assets);
    },
    [market, onChange, setFieldValue],
  );

  return (
    <View backgroundColor="$backgroundBrandSoft" borderRadius="$r3" gap="$s3" padding="$s3">
      <Field
        name="assetInput"
        validatorAdapter={valibotValidator()}
        validators={{ onChange: pipe(string(), nonEmpty("empty amount")) }}
      >
        {({ state: { value } }) => (
          <AmountInput
            inputMode="decimal"
            onChangeText={handleAssetChange}
            placeholder={`0 ${market?.assetName ?? ""}`}
            value={value}
          />
        )}
      </Field>
      <Field
        name="usdInput"
        validatorAdapter={valibotValidator()}
        validators={{ onChange: pipe(string(), nonEmpty("empty amount")) }}
      >
        {({ state: { value } }) => (
          <AmountInput
            inputMode="decimal"
            onChangeText={handleUsdChange}
            placeholder={Number(0).toLocaleString(undefined, {
              currency: "USD",
              currencyDisplay: "narrowSymbol",
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
              style: "currency",
            })}
            value={value}
          />
        )}
      </Field>
    </View>
  );
}
