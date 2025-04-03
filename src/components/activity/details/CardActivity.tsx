import type { CreditActivity, DebitActivity, InstallmentsActivity, PandaActivity } from "@exactly/server/api/activity";
import { ShoppingCart } from "@tamagui/lucide-icons";
import React from "react";
import { Square, XStack, YStack } from "tamagui";

import PaymentDetails from "./PaymentDetails";
import PurchaseDetails from "./PurchaseDetails";
import TransactionDetails from "./TransactionDetails";
import Text from "../../shared/Text";

export default function CardActivity({
  item,
}: {
  item: CreditActivity | DebitActivity | InstallmentsActivity | PandaActivity;
}) {
  const { usdAmount } = item;
  return (
    <>
      <YStack gap="$s7" paddingBottom="$s9">
        <XStack justifyContent="center" alignItems="center">
          <Square borderRadius="$r4" backgroundColor="$backgroundStrong" size={80}>
            <ShoppingCart size={48} color="$uiNeutralPrimary" strokeWidth={2} />
          </Square>
        </XStack>
        <YStack gap="$s4_5" justifyContent="center" alignItems="center">
          <Text secondary body>
            Paid
            <Text emphasized primary body $platform-web={{ whiteSpace: "normal" }}>
              &nbsp;
              {item.merchant.name}
            </Text>
          </Text>
          <Text title primary color="$uiNeutralPrimary">
            {Number(usdAmount).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
            })}
          </Text>
          <Text secondary body>
            {item.merchant.name}
          </Text>
        </YStack>
      </YStack>
      {item.type === "panda" ? (
        item.operations.map((operation) => (
          <YStack key={operation.id} gap="$s7" flex={1}>
            <PurchaseDetails item={operation} />
            <PaymentDetails item={operation} />
            <TransactionDetails source={operation} />
          </YStack>
        ))
      ) : (
        <YStack gap="$s7" flex={1}>
          <PurchaseDetails item={item} />
          <PaymentDetails item={item} />
          <TransactionDetails />
        </YStack>
      )}
    </>
  );
}
