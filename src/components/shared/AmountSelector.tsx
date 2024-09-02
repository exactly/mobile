import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { valibotValidator, type ValibotValidator } from "@tanstack/valibot-form-adapter";
import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { styled } from "tamagui";
import { nonEmpty, pipe, string } from "valibot";

import Input from "./Input";
import View from "./View";
import type { Withdraw } from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";

interface AmountSelectorProperties {
  onChange: (value: bigint) => void;
}

const AmountInput = styled(Input, {
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
      const floatInput = Number(text);
      if (Number.isNaN(floatInput)) {
        setFieldValue("usdInput", "");
        return;
      }
      const input = BigInt(Math.floor(floatInput * 10 ** market.decimals));
      const usdInput = (input * market.usdPrice) / BigInt(10 ** market.decimals);
      setFieldValue("usdInput", (Number(usdInput) / 1e18).toString());
      onChange(input);
    },
    [market, setFieldValue, onChange],
  );
  const handleUSDChange = useCallback(
    (text: string) => {
      if (!market) return;
      setFieldValue("usdInput", text);
      const floatInput = Number(text);
      if (Number.isNaN(floatInput)) {
        setFieldValue("assetInput", "");
        return;
      }
      const input = BigInt(Math.floor(Number(floatInput * 1e18)));
      const assetInput = (input * BigInt(10 ** market.decimals)) / market.usdPrice;
      setFieldValue("assetInput", (Number(assetInput) / 10 ** market.decimals).toString());
      onChange(assetInput);
    },
    [market, setFieldValue, onChange],
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
            inputMode="numeric"
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
          <AmountInput placeholder="0 USD" inputMode="numeric" value={value} onChangeText={handleUSDChange} />
        )}
      </Field>
    </View>
  );
}
