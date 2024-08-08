import { ChevronRight } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import Balance from "./Balance";
import HomeActions from "./HomeActions";
import LatestActivity from "./LatestActivity";
import InfoPreview from "../shared/InfoPreview";
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
          <InfoPreview
            title="Credit limit"
            renderAction={
              <Pressable>
                <View flexDirection="row" gap={2} alignItems="center">
                  <Text color="$interactiveTextBrandDefault" fontSize={14} lineHeight={18} fontWeight="bold">
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
          </InfoPreview>
          <InfoPreview
            title="Available to spend"
            renderAction={
              <Pressable>
                <View flexDirection="row" gap={2} alignItems="center">
                  <Text color="$interactiveTextBrandDefault" fontSize={14} lineHeight={18} fontWeight="bold">
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
          </InfoPreview>
          <InfoPreview
            title="Upcoming installments"
            renderAction={
              <Pressable>
                <View flexDirection="row" gap={2} alignItems="center">
                  <Text color="$interactiveTextBrandDefault" fontSize={14} lineHeight={18} fontWeight="bold">
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
          </InfoPreview>

          <InfoPreview
            title="Latest activity"
            renderAction={
              <Pressable>
                <View flexDirection="row" gap={2} alignItems="center">
                  <Text color="$interactiveTextBrandDefault" fontSize={14} lineHeight={18} fontWeight="bold">
                    View all
                  </Text>
                  <ChevronRight size={14} color="$interactiveTextBrandDefault" fontWeight="bold" />
                </View>
              </Pressable>
            }
          >
            <LatestActivity />
          </InfoPreview>
        </View>
      </ScrollView>
    </SafeView>
  );
}
