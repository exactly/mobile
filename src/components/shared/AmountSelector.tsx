import { WAD } from "@exactly/lib";
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
import type { Withdraw } from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";

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

export default function AmountSelector({ onChange }: { onChange: (value: bigint) => void }) {
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
          style: "currency",
          currency: "USD",
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
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
