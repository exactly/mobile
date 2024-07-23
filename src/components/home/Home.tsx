import { readContract, getAccount } from "@wagmi/core";
import { CaretRight } from "phosphor-react-native";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View, useTheme } from "tamagui";
import { zeroAddress } from "viem";

import Balance from "./Balance";
import HomeActions from "./HomeActions";
import LatestActivity from "./LatestActivity";
import { previewerAbi, previewerAddress } from "../../generated/contracts";
import type { PreviewerData } from "../../stores/usePreviewerStore";
import usePreviewerStore from "../../stores/usePreviewerStore";
import handleError from "../../utils/handleError";
import wagmiConfig from "../../utils/wagmi";
import AlertBadge from "../shared/AlertBadge";
import BaseLayout from "../shared/BaseLayout";
import InfoPreview from "../shared/InfoPreview";
import ProfileHeader from "../shared/ProfileHeader";
import SafeView from "../shared/SafeView";

export default function Home() {
  const theme = useTheme();
  const { setPreviewerData } = usePreviewerStore();

  useEffect(() => {
    const fetchPreviewer = async () => {
      try {
        const previewerData: PreviewerData = await readContract(wagmiConfig, {
          address: previewerAddress,
          abi: previewerAbi,
          functionName: "exactly",
          args: [getAccount(wagmiConfig).address || zeroAddress],
        });

        setPreviewerData(previewerData);
      } catch (error) {
        handleError(error);
      }
    };

    fetchPreviewer().catch(handleError);
  }, [setPreviewerData]);

  return (
    <SafeView paddingBottom={0}>
      <BaseLayout>
        <ProfileHeader />
      </BaseLayout>
      <ScrollView>
        <BaseLayout width="100%" height="100%">
          <View gap={ms(20)} flex={1} paddingVertical={ms(20)}>
            <AlertBadge />
            <Balance />
            <HomeActions />
            <InfoPreview
              title="Credit limit"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      Manage
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </Pressable>
              }
            >
              <Text textAlign="center" fontSize={15} color="$uiSecondary">
                Learn more about your credit limit.
              </Text>
            </InfoPreview>
            <InfoPreview
              title="Available to spend"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      Manage
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </Pressable>
              }
            >
              <Text textAlign="center" fontSize={15} color="$uiSecondary">
                No funds to spend.
              </Text>
            </InfoPreview>
            <InfoPreview
              title="Upcoming installments"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      View all
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </Pressable>
              }
            >
              <Text textAlign="center" fontSize={15} color="$uiSecondary">
                There are no installments to show yet.
              </Text>
            </InfoPreview>

            <InfoPreview
              title="Latest activity"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      View all
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </Pressable>
              }
            >
              <LatestActivity />
            </InfoPreview>
          </View>
        </BaseLayout>
      </ScrollView>
    </SafeView>
  );
}
