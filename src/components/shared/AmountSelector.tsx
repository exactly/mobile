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
import useMarket from "../../utils/useMarket";

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
  const marketAccount = useMarket(withdraw?.market);
  const { Field, setFieldValue } = useForm<{ assetInput: string; usdInput: string }, ValibotValidator>({
    defaultValues: { assetInput: "", usdInput: "" },
  });

  const handleAssetChange = useCallback(
    (text: string) => {
      if (!marketAccount) return;
      setFieldValue("assetInput", text);
      const floatInput = Number(text);
      if (Number.isNaN(floatInput)) {
        setFieldValue("usdInput", "");
        return;
      }
      const input = BigInt(Math.floor(floatInput * 10 ** marketAccount.decimals));
      const usdInput = (input * marketAccount.usdPrice) / BigInt(10 ** marketAccount.decimals);
      setFieldValue("usdInput", (Number(usdInput) / 1e18).toString());
      onChange(input);
    },
    [marketAccount, onChange, setFieldValue],
  );
  const handleUSDChange = useCallback(
    (text: string) => {
      if (!marketAccount) return;
      setFieldValue("usdInput", text);
      const floatInput = Number(text);
      if (Number.isNaN(floatInput)) {
        setFieldValue("assetInput", "");
        return;
      }
      const input = BigInt(Math.floor(Number(floatInput * 1e18)));
      const assetInput = (input * BigInt(10 ** marketAccount.decimals)) / marketAccount.usdPrice;
      setFieldValue("assetInput", (Number(assetInput) / 10 ** marketAccount.decimals).toString());
      onChange(assetInput);
    },
    [marketAccount, onChange, setFieldValue],
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
            placeholder={`0 ${marketAccount?.assetName ?? ""}`}
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
