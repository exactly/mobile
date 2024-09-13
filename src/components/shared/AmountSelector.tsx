import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { valibotValidator, type ValibotValidator } from "@tanstack/valibot-form-adapter";
import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { styled } from "tamagui";
import { nonEmpty, pipe, string } from "valibot";
import { formatUnits, parseUnits } from "viem";

import Input from "./Input";
import View from "./View";
import WAD from "../../utils/WAD";
import type { Withdraw } from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";

interface AmountSelectorProperties {
  onChange: (value: bigint) => void;
}

const AmountInput = styled(Input, {
  focusStyle: { borderColor: "$borderBrandStrong", borderWidth: 1 },
  backgroundColor: "$backgroundSoft",
  borderRadius: "$r2",
  height: ms(60),
  textAlign: "center",
  fontSize: ms(24),
  borderWidth: 0,
  flex: 1,
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
      const sanitized = text.replaceAll(/[^\d.]/g, "").replaceAll(/(\..*?)\..*/g, "$1");
      const assetWei = parseUnits(sanitized, market.decimals);
      const usdWei = (assetWei * market.usdPrice) / WAD;
      setFieldValue(
        "usdInput",
        Number(formatUnits(usdWei, market.decimals)).toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
      onChange(assetWei);
    },
    [market, setFieldValue, onChange],
  );

  const handleUsdChange = useCallback(
    (text: string) => {
      if (!market) return;
      setFieldValue("usdInput", text);
      const sanitized = text.replaceAll(/[^\d.]/g, "").replaceAll(/(\..*?)\..*/g, "$1");
      const usdWei = parseUnits(sanitized, 18);
      const assetWei = (usdWei * WAD) / market.usdPrice;
      const formattedWei = (assetWei * BigInt(10 ** market.decimals)) / WAD;
      const fieldValue = formatUnits(formattedWei, market.decimals);
      setFieldValue("assetInput", fieldValue);
      onChange(formattedWei);
    },
    [market, onChange, setFieldValue],
  );

  return (
    <View borderRadius="$r3" gap="$s3" backgroundColor="$backgroundBrandSoft" padding="$s3">
      <Field
        name="assetInput"
        validatorAdapter={valibotValidator()}
        validators={{ onChange: pipe(string(), nonEmpty("empty amount")) }}
      >
        {({ state: { value } }) => (
          <AmountInput
            inputMode="decimal"
            placeholder={`0 ${market?.assetName ?? ""}`}
            value={value}
            onChangeText={handleAssetChange}
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
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            value={value}
          />
        )}
      </Field>
    </View>
  );
}
