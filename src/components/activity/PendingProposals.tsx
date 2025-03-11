import ProposalType from "@exactly/common/ProposalType";
import { exaPreviewerAddress } from "@exactly/common/generated/chain";
import {
  ArrowLeft,
  CircleHelp,
  Coins,
  RefreshCw,
  ArrowLeftRight,
  ArrowUpRight,
  SearchSlash,
} from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, RefreshControl, ScrollView } from "react-native";
import { ms } from "react-native-size-matters";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { useReadExaPreviewerPendingProposals } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import useIntercom from "../../utils/useIntercom";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function getProposalTypeLabel(proposalType: ProposalType): { label: string; icon: React.ReactNode } {
  switch (proposalType) {
    case ProposalType.BorrowAtMaturity:
      return {
        label: "Protocol borrow",
        icon: <Coins color="$interactiveOnBaseInformationSoft" />,
      };
    case ProposalType.RepayAtMaturity:
    case ProposalType.CrossRepayAtMaturity:
      return {
        label: "Protocol debt payment",
        icon: <Coins color="$interactiveOnBaseInformationSoft" />,
      };
    case ProposalType.RollDebt:
      return {
        label: "Protocol debt rollover",
        icon: <RefreshCw color="$interactiveOnBaseInformationSoft" />,
      };
    case ProposalType.Swap:
      return {
        label: "Asset swap",
        icon: <ArrowLeftRight color="$interactiveOnBaseInformationSoft" />,
      };
    case ProposalType.Redeem:
    case ProposalType.Withdraw:
      return {
        label: "Send",
        icon: <ArrowUpRight color="$interactiveOnBaseInformationSoft" />,
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
              return (
                <View key={`${nonce}`} flexDirection="row" gap="$s4" alignItems="center" paddingVertical="$s3">
                  <View
                    width={ms(40)}
                    height={ms(40)}
                    borderRadius="$r3"
                    backgroundColor="$interactiveBaseInformationSoftDefault"
                    justifyContent="center"
                    alignItems="center"
                  >
                    {getProposalTypeLabel(proposal.proposalType).icon}
                  </View>
                  <View flex={1} alignSelf="center" justifyContent="center">
                    <Text subHeadline maxFontSizeMultiplier={1} color="$uiPrimary">
                      {getProposalTypeLabel(proposal.proposalType).label}
                    </Text>
                  </View>
                </View>
              );
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
