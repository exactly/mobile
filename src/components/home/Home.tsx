import { CaretRight } from "phosphor-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View, useTheme } from "tamagui";

import Balance from "./Balance.js";
import HomeActions from "./HomeActions.js";
import LatestActivity from "./LatestActivity.js";
import AlertBadge from "../shared/AlertBadge.js";
import BaseLayout from "../shared/BaseLayout.js";
import InfoPreview from "../shared/InfoPreview.js";
import ProfileHeader from "../shared/ProfileHeader.js";
import SafeView from "../shared/SafeView.js";

export default function Home() {
  const theme = useTheme();
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
                <TouchableOpacity>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      Manage
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </TouchableOpacity>
              }
            >
              <Text textAlign="center" fontSize={15} color="$uiSecondary">
                Learn more about your credit limit.
              </Text>
            </InfoPreview>
            <InfoPreview
              title="Available to spend"
              renderAction={
                <TouchableOpacity>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      Manage
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </TouchableOpacity>
              }
            >
              <Text textAlign="center" fontSize={15} color="$uiSecondary">
                No funds to spend.
              </Text>
            </InfoPreview>
            <InfoPreview
              title="Upcoming installments"
              renderAction={
                <TouchableOpacity>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      View all
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </TouchableOpacity>
              }
            >
              <Text textAlign="center" fontSize={15} color="$uiSecondary">
                There are no installments to show yet.
              </Text>
            </InfoPreview>

            <InfoPreview
              title="Latest activity"
              renderAction={
                <TouchableOpacity>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      View all
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </TouchableOpacity>
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
