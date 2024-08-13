import { ChevronRight } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import Balance from "./Balance";
import HomeActions from "./HomeActions";
import InfoCard from "./InfoCard";
import LatestActivity from "./LatestActivity";
import ProfileHeader from "../shared/ProfileHeader";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Home() {
  return (
    <SafeView fullScreen tab>
      <ProfileHeader />
      <ScrollView>
        <View gap={ms(20)} flex={1} padded>
          <Balance />
          <HomeActions />
          <InfoCard
            title="Credit limit"
            renderAction={
              <Pressable>
                <View flexDirection="row" gap={2} alignItems="center">
                  <Text color="$interactiveTextBrandDefault" emphasized footnote>
                    Manage
                  </Text>
                  <ChevronRight size={14} color="$interactiveTextBrandDefault" fontWeight="bold" />
                </View>
              </Pressable>
            }
          >
            <Text textAlign="center" fontSize={15} color="$uiNeutralSecondary">
              Learn more about your credit limit.
            </Text>
          </InfoCard>
          <InfoCard
            title="Available to spend"
            renderAction={
              <Pressable>
                <View flexDirection="row" gap={2} alignItems="center">
                  <Text color="$interactiveTextBrandDefault" emphasized footnote>
                    Manage
                  </Text>
                  <ChevronRight size={14} color="$interactiveTextBrandDefault" fontWeight="bold" />
                </View>
              </Pressable>
            }
          >
            <Text textAlign="center" fontSize={15} color="$uiNeutralSecondary">
              No funds to spend.
            </Text>
          </InfoCard>
          <InfoCard
            title="Upcoming installments"
            renderAction={
              <Pressable>
                <View flexDirection="row" gap={2} alignItems="center">
                  <Text color="$interactiveTextBrandDefault" emphasized footnote>
                    View all
                  </Text>
                  <ChevronRight size={14} color="$interactiveTextBrandDefault" fontWeight="bold" />
                </View>
              </Pressable>
            }
          >
            <Text textAlign="center" fontSize={15} color="$uiNeutralSecondary">
              There are no installments to show yet.
            </Text>
          </InfoCard>

          <InfoCard
            title="Latest activity"
            renderAction={
              <Pressable>
                <View flexDirection="row" gap={2} alignItems="center">
                  <Text color="$interactiveTextBrandDefault" emphasized footnote>
                    View all
                  </Text>
                  <ChevronRight size={14} color="$interactiveTextBrandDefault" fontWeight="bold" />
                </View>
              </Pressable>
            }
          >
            <LatestActivity />
          </InfoCard>
        </View>
      </ScrollView>
    </SafeView>
  );
}
