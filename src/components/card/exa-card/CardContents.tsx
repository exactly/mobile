import { marketUSDCAddress, previewerAddress } from "@exactly/common/generated/chain";
import { borrowLimit, withdrawLimit } from "@exactly/lib";
import React from "react";
import { AnimatePresence, Spinner, XStack, YStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import Card from "../../../assets/images/card.svg";
import { useReadPreviewerExactly } from "../../../generated/contracts";
import Text from "../../shared/Text";
import View from "../../shared/View";

export default function CardContents({
  isCredit,
  isLoading,
  disabled,
}: {
  isCredit: boolean;
  isLoading: boolean;
  disabled: boolean;
}) {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });
  return (
    <XStack
      height={88}
      animation="moderate"
      animateOnly={["opacity"]}
      justifyContent="space-between"
      alignItems="center"
      padding="$s5"
      opacity={disabled ? 0.5 : 1}
    >
      <YStack justifyContent="center">
        <AnimatePresence exitBeforeEnter>
          {isLoading ? (
            <View
              key="loading"
              animation="quick"
              enterStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
              exitStyle={{ opacity: 0 }} // eslint-disable-line react-native/no-inline-styles
            >
              <Spinner color="white" />
            </View>
          ) : isCredit ? (
            <View
              key="credit"
              animation="moderate"
              enterStyle={{ opacity: 0, transform: [{ translateX: -100 }] }} // eslint-disable-line react-native/no-inline-styles
              exitStyle={{ opacity: 0, transform: [{ translateX: -100 }] }} // eslint-disable-line react-native/no-inline-styles
              transform={[{ translateX: 0 }]}
            >
              <Text sensitive color="white" title2>
                {(markets
                  ? Number(borrowLimit(markets, marketUSDCAddress, Math.floor(Date.now() / 1000))) / 1e6
                  : 0
                ).toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  currencyDisplay: "narrowSymbol",
                })}
              </Text>
              <View
                animation="moderate"
                enterStyle={{ opacity: 0, transform: [{ translateX: 25 }] }} // eslint-disable-line react-native/no-inline-styles
                exitStyle={{ opacity: 0, transform: [{ translateX: 25 }] }} // eslint-disable-line react-native/no-inline-styles
                transform={[{ translateX: 0 }]}
              >
                <Text color="white" emphasized caption>
                  CREDIT LIMIT
                </Text>
              </View>
            </View>
          ) : (
            <View
              key="debit"
              animation="moderate"
              enterStyle={{ opacity: 0, transform: [{ translateX: 100 }] }} // eslint-disable-line react-native/no-inline-styles
              exitStyle={{ opacity: 0, transform: [{ translateX: 100 }] }} // eslint-disable-line react-native/no-inline-styles
              transform={[{ translateX: 0 }]}
            >
              <Text sensitive color="white" title2>
                {(markets
                  ? Number(withdrawLimit(markets, marketUSDCAddress, Math.floor(Date.now() / 1000))) / 1e6
                  : 0
                ).toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  currencyDisplay: "narrowSymbol",
                })}
              </Text>
              <View
                animation="moderate"
                enterStyle={{ opacity: 0, transform: [{ translateX: -25 }] }} // eslint-disable-line react-native/no-inline-styles
                exitStyle={{ opacity: 0, transform: [{ translateX: -25 }] }} // eslint-disable-line react-native/no-inline-styles
                transform={[{ translateX: 0 }]}
              >
                <Text color="white" emphasized caption>
                  DEBIT LIMIT
                </Text>
              </View>
            </View>
          )}
        </AnimatePresence>
      </YStack>
      <XStack
        animation="moderate"
        position="absolute"
        right={0}
        left={0}
        top={0}
        bottom={0}
        backgroundColor="transparent"
        justifyContent="flex-end"
      >
        <Card preserveAspectRatio="xMidYMid slice" height="100%" width="50%" shouldRasterizeIOS />
      </XStack>
    </XStack>
  );
}
