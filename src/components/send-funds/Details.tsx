import { A } from "@expo/html-elements";
import { Calendar, ExternalLink, Hash, User } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Avatar, XStack } from "tamagui";
import { optimism } from "viem/chains";
import { useAccount } from "wagmi";

import queryClient, { type Withdraw } from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

interface DetailsProperties {
  hash?: string;
}

export default function Details({ hash }: DetailsProperties) {
  const { chainId } = useAccount();
  const { data } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  return (
    <View gap="$s4" padded>
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$s3">
          <Avatar backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0" size={ms(20)}>
            <User color="$interactiveOnBaseBrandDefault" size={ms(16)} />
          </Avatar>
          <Text color="$uiNeutralSecondary" footnote>
            To
          </Text>
        </XStack>
        <Text>{shortenAddress(data?.receiver ?? "", 7, 7)}</Text>
      </XStack>
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$s3">
          <Calendar color="$uiBrandPrimary" size={ms(20)} />
          <Text color="$uiNeutralSecondary" footnote>
            Date
          </Text>
        </XStack>
        <Text>
          {new Date().toLocaleString("en-US", {
            day: "numeric",
            hour: "2-digit",
            hour12: false,
            minute: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </XStack>
      {hash && (
        <>
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$s3">
              <Hash color="$uiBrandPrimary" size={ms(20)} />
              <Text color="$uiNeutralSecondary" footnote>
                Transaction hash
              </Text>
            </XStack>
            <Text>{shortenAddress(hash, 7, 7)}</Text>
          </XStack>
          <A
            href={`${chainId === optimism.id ? "https://optimistic.etherscan.io" : "https://sepolia-optimism.etherscan.io"}/tx/${hash}`}
          >
            <Button contained fullwidth iconAfter={<ExternalLink color="$interactiveOnBaseBrandDefault" />} main spaced>
              View on explorer
            </Button>
          </A>

          <View alignItems="center" padded>
            <Pressable
              onPress={() => {
                queryClient.setQueryData(["withdrawal"], { amount: 0n, market: undefined, receiver: undefined });
                router.replace("/");
              }}
            >
              <Text color="$interactiveBaseBrandDefault" emphasized footnote>
                Close
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
