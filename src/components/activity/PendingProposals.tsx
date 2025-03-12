import ProposalType, {
  decodeCrossRepayAtMaturity,
  decodeRepayAtMaturity,
  decodeWithdraw,
} from "@exactly/common/ProposalType";
import { exaPreviewerAddress } from "@exactly/common/generated/chain";
import shortenHex from "@exactly/common/shortenHex";
import {
  ArrowLeft,
  CircleHelp,
  Coins,
  RefreshCw,
  ArrowLeftRight,
  ArrowUpRight,
  SearchSlash,
} from "@tamagui/lucide-icons";
import { format } from "date-fns";
import { router } from "expo-router";
import React from "react";
import { Pressable, RefreshControl, ScrollView } from "react-native";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadExaPreviewerPendingProposals } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import useAsset from "../../utils/useAsset";
import useIntercom from "../../utils/useIntercom";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

interface Proposal {
  amount: bigint;
  market: `0x${string}`;
  timestamp: bigint;
  proposalType: ProposalType;
  data: `0x${string}`;
}

function getProposal(proposal: Proposal) {
  switch (proposal.proposalType) {
    case ProposalType.BorrowAtMaturity:
      return {
        label: "Protocol borrow",
        icon: <Coins color="$interactiveOnBaseInformationSoft" />,
      };
    case ProposalType.RepayAtMaturity:
      return {
        label: "Protocol debt payment",
        icon: <Coins color="$interactiveOnBaseInformationSoft" />,
        maturity: decodeRepayAtMaturity(proposal.data).maturity,
      };
    case ProposalType.CrossRepayAtMaturity:
      return {
        label: "Protocol debt payment",
        icon: <Coins color="$interactiveOnBaseInformationSoft" />,
        maturity: decodeCrossRepayAtMaturity(proposal.data).maturity,
      };
    case ProposalType.RollDebt:
      return {
        label: "Protocol debt rollover",
        icon: <RefreshCw color="$interactiveOnBaseInformationSoft" />,
      };
    case ProposalType.Swap:
      return {
        label: "Swapping",
        icon: <ArrowLeftRight color="$interactiveOnBaseInformationSoft" />,
      };
    case ProposalType.Redeem:
    case ProposalType.Withdraw:
      return {
        label: "Sending to",
        icon: <ArrowUpRight color="$interactiveOnBaseInformationSoft" />,
        address: decodeWithdraw(proposal.data),
      };
    default:
      return {
        label: "Unknown",
        icon: <SearchSlash color="$interactiveOnBaseInformationSoft" />,
      };
  }
}

export default function PendingProposals() {
  const { address } = useAccount();
  const { presentArticle } = useIntercom();
  const { canGoBack } = router;
  function back() {
    router.back();
  }
  const {
    data: pendingProposals,
    refetch: refetchPendingProposals,
    isLoading,
  } = useReadExaPreviewerPendingProposals({
    address: exaPreviewerAddress,
    args: [address ?? zeroAddress],
    query: {
      enabled: !!address,
      gcTime: 0,
      refetchInterval: 30_000,
    },
  });
  return (
    <SafeView fullScreen>
      <View fullScreen padded>
        <View flexDirection="row" gap={ms(10)} paddingBottom="$s4" justifyContent="space-between" alignItems="center">
          {canGoBack() && (
            <Pressable onPress={back}>
              <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
            </Pressable>
          )}
          <View flexDirection="row" alignItems="center">
            <Text color="$uiNeutralSecondary" fontSize={ms(15)} fontWeight="bold">
              Pending requests
            </Text>
          </View>
          <Pressable
            onPress={() => {
              presentArticle("10752721").catch(handleError);
            }}
          >
            <CircleHelp color="$uiNeutralPrimary" />
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                refetchPendingProposals().catch(handleError);
              }}
            />
          }
        >
          <View flex={1}>
            {(!pendingProposals || pendingProposals.length === 0) && (
              <Text textAlign="center" subHeadline color="$uiNeutralSecondary">
                There are no pending requests.
              </Text>
            )}
            {pendingProposals?.map(({ nonce, proposal }) => {
              return <ProposalItem key={nonce.toString()} proposal={proposal} />;
            })}
          </View>
        </ScrollView>
        <View paddingHorizontal="$s8">
          <Text color="$uiNeutralPlaceholder" caption2 textAlign="center">
            Each request takes about 1 minute to complete and is processed in order.
          </Text>
        </View>
      </View>
    </SafeView>
  );
}

function ProposalItem({ proposal }: { proposal: Proposal }) {
  const { label, icon, maturity, address: proposalAddress } = getProposal(proposal);
  const { market } = useAsset(proposal.market);
  const symbol = market ? (market.symbol.slice(3) === "WETH" ? "ETH" : market.symbol.slice(3)) : null;
  const usdValue = market ? (proposal.amount * market.usdPrice) / BigInt(10 ** market.decimals) : 0n;
  return (
    <XStack gap="$s4" paddingVertical="$s3">
      <View
        width={ms(40)}
        height={ms(40)}
        borderRadius="$r3"
        backgroundColor="$interactiveBaseInformationSoftDefault"
        justifyContent="center"
        alignItems="center"
      >
        {icon}
      </View>
      <XStack justifyContent="space-between" flex={1}>
        <YStack flex={1}>
          <Text subHeadline maxFontSizeMultiplier={1} color="$uiPrimary" numberOfLines={1}>
            {label}
          </Text>
          {proposal.proposalType === ProposalType.RepayAtMaturity ||
          proposal.proposalType === ProposalType.CrossRepayAtMaturity ? (
            <Text footnote maxFontSizeMultiplier={1} color="$uiNeutralSecondary" numberOfLines={1}>
              {format(new Date(Number(maturity) * 1000), "MMM dd")}
            </Text>
          ) : proposal.proposalType === ProposalType.Redeem || proposal.proposalType === ProposalType.Withdraw ? (
            <Text footnote maxFontSizeMultiplier={1} color="$uiNeutralSecondary" numberOfLines={1}>
              {shortenHex(proposalAddress ?? "", 5, 5)}
            </Text>
          ) : null}
        </YStack>
        <YStack alignItems="flex-end">
          <Text primary emphasized subHeadline numberOfLines={1}>
            {(Number(usdValue) / 1e18).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
            })}
          </Text>
          {proposal.proposalType === ProposalType.RepayAtMaturity ||
          proposal.proposalType === ProposalType.CrossRepayAtMaturity ? (
            <Text secondary footnote maxFontSizeMultiplier={1} numberOfLines={1}>
              {`${(Number(proposal.amount) / 10 ** (market?.decimals ?? 18)).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: Math.min(
                  8,
                  Math.max(
                    0,
                    (market?.decimals ?? 18) - Math.ceil(Math.log10(Math.max(1, Number(proposal.amount) / 1e18))),
                  ),
                ),
                useGrouping: false,
              })} ${symbol}`}
            </Text>
          ) : proposal.proposalType === ProposalType.Redeem || proposal.proposalType === ProposalType.Withdraw ? (
            <Text secondary footnote maxFontSizeMultiplier={1} numberOfLines={1}>
              {`${(Number(proposal.amount) / 10 ** (market?.decimals ?? 18)).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: Math.min(
                  8,
                  Math.max(
                    0,
                    (market?.decimals ?? 18) - Math.ceil(Math.log10(Math.max(1, Number(proposal.amount) / 1e18))),
                  ),
                ),
                useGrouping: false,
              })} ${symbol}`}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </XStack>
  );
}
