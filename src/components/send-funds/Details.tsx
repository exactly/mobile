import { A } from "@expo/html-elements";
import { User, Calendar, Hash, ExternalLink } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { XStack, Avatar } from "tamagui";
import type { Address } from "viem";
import { optimism } from "viem/chains";
import { useAccount } from "wagmi";

import queryClient from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

interface DetailsProperties {
  hash?: string;
}

export default function Details({ hash }: DetailsProperties) {
  const { chainId } = useAccount();
  const { data } = useQuery<{
    receiver?: Address;
    market?: Address;
    amount: bigint;
  }>({ queryKey: ["withdrawal"] });
  return (
    <View padded gap="$s4">
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$s3">
          <Avatar size={ms(20)} backgroundColor="$interactiveBaseBrandDefault" borderRadius="$r_0">
            <User size={ms(16)} color="$interactiveOnBaseBrandDefault" />
          </Avatar>
          <Text footnote color="$uiNeutralSecondary">
            To
          </Text>
        </XStack>
        <Text>{shortenAddress(data?.receiver ?? "", 7, 7)}</Text>
      </XStack>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$s3">
          <Calendar size={ms(20)} color="$uiBrandPrimary" />
          <Text footnote color="$uiNeutralSecondary">
            Date
          </Text>
        </XStack>
        <Text>
          {new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </Text>
      </XStack>
      {hash && (
        <>
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$s3">
              <Hash size={ms(20)} color="$uiBrandPrimary" />
              <Text footnote color="$uiNeutralSecondary">
                Transaction hash
              </Text>
            </XStack>
            <Text>{shortenAddress(hash, 7, 7)}</Text>
          </XStack>
          <A
            href={`${chainId === optimism.id ? "https://optimistic.etherscan.io" : "https://sepolia-optimism.etherscan.io"}/tx/${hash}`}
          >
            <Button contained main spaced fullwidth iconAfter={<ExternalLink color="$interactiveOnBaseBrandDefault" />}>
              View on explorer
            </Button>
          </A>

          <View padded alignItems="center">
            <Pressable
              onPress={() => {
                queryClient.setQueryData(["withdrawal"], { receiver: undefined, market: undefined, amount: 0n });
                router.replace("/");
              }}
            >
              <Text emphasized footnote color="$interactiveBaseBrandDefault">
                Close
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
