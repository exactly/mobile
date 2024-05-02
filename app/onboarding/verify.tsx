import React from "react";
import { Stack, Text, View } from "tamagui";

import LinkButton from "../components/LinkButton";
import { ClockClockwise, CreditCard, HandCoins, QrCode } from "@phosphor-icons/react";

const FEATURES = [
  {
    title: "Earn passive income of up to 2.73% on your deposits.",
    body: "As soon as you add funds to your account, you start earning passive income.",
    Icon: HandCoins,
  },
  {
    title: "QR Payments. With crypto.",
    body: "Pay in-store scanning any QR code.",
    Icon: QrCode,
  },
  {
    title: "Pay now, pay later. You choose.",
    body: "Pay in the moment or pay at a later date in up to 12 low rate interest installments.",
    Icon: ClockClockwise,
  },
  {
    title: "Digital credit card.",
    body: "Pay online or in-store with the first on-chain secured digital credit card backed by your asstes. No credit score check needed.",
    tag: "COMING SOON",
    Icon: CreditCard,
  },
];

export default function VerifyIdentity() {
  return (
    <Stack
      display="flex"
      flexDirection="column"
      height="100vh"
      paddingHorizontal="24px"
      paddingBottom="40px"
      justifyContent="space-between"
    >
      <View display="flex" flexDirection="column" paddingTop="96px" paddingBottom="32px">
        <Text color="$textBrandPrimary" textAlign="center" fontSize="22px" fontWeight="700" marginBottom="32px">
          Verify your identity
        </Text>
        <Text textAlign="center" fontSize="15px" fontWeight="400" marginBottom="64px" color="$textPrimary">
          This will be your account unique identifier that anyone can send you crypto to.
        </Text>
        {FEATURES.map(({ title, body, tag, Icon }) => (
          <View
            key={title}
            display="flex"
            justifyContent="space-between"
            flexWrap="wrap"
            width="100%"
            flexDirection="row"
            paddingVertical="20px"
            gap="12px"
          >
            <View width="32px" height="32px" padding="8px" backgroundColor="$interactiveOnBrandSoft" borderRadius="8px">
              <Icon size="16px" fill="#E0F8F3" />
            </View>
            <View flex={1} alignItems="flex-start">
              {tag && (
                <Text
                  backgroundColor="$interactiveBaseSuccessDefault"
                  borderRadius="4px"
                  fontSize="11px"
                  fontWeight="600"
                  color="white"
                  paddingHorizontal="4px"
                  paddingVertical="2px"
                  marginBottom="6px"
                >
                  {tag}
                </Text>
              )}
              <Text fontSize="15px" fontWeight="600">
                {title}
              </Text>
              <Text fontSize="13px" fontWeight="400" color="$textSecondary">
                {body}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View width="100%" gap="24px">
        <LinkButton href="/home">Begin verifying</LinkButton>
        <Text color="$interactiveTextBrandDefault" fontSize="13px" fontWeight="600" textAlign="center">
          Skip for now
        </Text>
      </View>
    </Stack>
  );
}
