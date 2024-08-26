import { previewerAddress } from "@exactly/common/generated/chain";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { valibotValidator, type ValibotValidator } from "@tanstack/valibot-form-adapter";
import React, { useCallback, useMemo } from "react";
import { ms } from "react-native-size-matters";
import { styled } from "tamagui";
import * as v from "valibot";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import Input from "./Input";
import View from "./View";
import { useReadPreviewerExactly } from "../../generated/contracts";
import type { Withdrawal } from "../../utils/queryClient";

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
  const { data } = useQuery<Withdrawal>({ queryKey: ["withdrawal"] });
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  const { Field, setFieldValue } = useForm<{ assetInput: string; usdInput: string }, ValibotValidator>({
    defaultValues: {
      assetInput: "",
      usdInput: "",
    },
  });

  const assetMarket = useMemo(() => markets?.find(({ market }) => market === data?.market), [markets, data]);

  const handleAssetChange = useCallback(
    (text: string) => {
      if (!assetMarket) return;
      setFieldValue("assetInput", text);
      const floatInput = Number.parseFloat(text);
      if (Number.isNaN(floatInput)) {
        setFieldValue("usdInput", "");
        return;
      }
      const input = BigInt(Math.floor(floatInput * 10 ** assetMarket.decimals));
      const usdInput = (input * assetMarket.usdPrice) / BigInt(10 ** assetMarket.decimals);
      setFieldValue("usdInput", (Number(usdInput) / 1e18).toString());
      onChange(input);
    },
    [assetMarket, onChange, setFieldValue],
  );

  const handleUsdChange = useCallback(
    (text: string) => {
      if (!assetMarket) return;
      setFieldValue("usdInput", text);
      const floatInput = Number.parseFloat(text);
      if (Number.isNaN(floatInput)) {
        setFieldValue("assetInput", "");
        return;
      }
      const input = BigInt(Math.floor(Number(floatInput * 1e18)));
      const assetInput = (input * BigInt(10 ** assetMarket.decimals)) / assetMarket.usdPrice;
      setFieldValue("assetInput", (Number(assetInput) / 10 ** assetMarket.decimals).toString());
      onChange(assetInput);
    },
    [assetMarket, onChange, setFieldValue],
  );

  return (
    <View borderRadius="$r3" gap="$s3" backgroundColor="$backgroundBrandSoft" padding="$s3">
      <Field name="assetInput">
        {({ state: { value } }) => (
          <AmountInput
            inputMode="numeric"
            placeholder={`0 ${assetMarket?.assetName ?? ""}`}
            value={value}
            onChangeText={(text) => {
              handleAssetChange(text);
            }}
          />
        )}
      </Field>
      <Field
        name="usdInput"
        validatorAdapter={valibotValidator()}
        validators={{
          onChange: v.pipe(v.string(), v.nonEmpty("empty amount")),
        }}
      >
        {({ state: { value } }) => (
          <AmountInput
            placeholder="0 USD"
            inputMode="numeric"
            value={value}
            onChangeText={(text) => {
              handleUsdChange(text);
            }}
          />
        )}
      </Field>
    </View>
  );
}
