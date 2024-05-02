import {
  ArrowDown,
  ArrowLineDown,
  ArrowUpRight,
  BellRinging,
  CaretDown,
  CaretRight,
  EyeClosed,
  Gear,
} from "@phosphor-icons/react";
import { TrendUp } from "@phosphor-icons/react/dist/ssr";
import React from "react";
import { Image, ScrollView, Text, View } from "tamagui";

import Button from "./components/Button";

const AvailableToSpend = () => (
  <View backgroundColor="#FBFDFC" marginHorizontal="16px" borderRadius="8px" padding="16px">
    <View display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="18px">
      <Text fontSize="17px" fontWeight="600" color="$textPrimary">
        Available to spend
      </Text>
      <Text fontSize="13px" color="$textTextBrand" marginBottom="18px" display="flex" alignItems="center">
        Manage <CaretRight size="16px" />
      </Text>
    </View>
    <View display="flex" flexDirection="row">
      <View flex={1} borderRightWidth={1} borderColor="$borderSoft">
        <Text textAlign="center" fontSize="22px" fontWeight="500" color="$textPrimary">
          $14,572.21
        </Text>
        <Text textAlign="center" fontSize="12px" color="$textSecondary">
          One-time payments
        </Text>
      </View>
      <View flex={1}>
        <Text textAlign="center" fontSize="22px" fontWeight="500" color="$textPrimary">
          $14,572.21
        </Text>
        <Text textAlign="center" fontSize="12px" color="$textSecondary">
          One-time payments
        </Text>
      </View>
    </View>
  </View>
);

const Transaction = () => (
  <View display="flex" flexDirection="row" gap="16px" alignItems="center">
    <View
      width="40px"
      height="40px"
      padding="8px"
      backgroundColor="$backgroundBrandMild"
      borderRadius="8px"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <ArrowDown size="32px" fill="#12A594" />
    </View>
    <View flex={1}>
      <Text fontSize="15px" fontWeight="400" color="$textPrimary">
        Received USDC
      </Text>
      <Text fontSize="12px" fontWeight="400" color="$textSecondary">
        11/01/24
      </Text>
    </View>
    <View>
      <Text fontSize="15px" fontWeight="600" color="$textPrimary" textAlign="right">
        <Text color="$textSuccessPrimary">+</Text>$3,348.12
      </Text>
      <Text fontSize="12px" fontWeight="600" color="$textSecondary" textAlign="right">
        0.001345 ETH
      </Text>
    </View>
  </View>
);

const UpcomingInstallments = () => (
  <View backgroundColor="#FBFDFC" marginHorizontal="16px" borderRadius="8px" padding="16px">
    <View display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="18px">
      <Text fontSize="17px" fontWeight="600" color="$textPrimary">
        Latest Activity
      </Text>

      <Text fontSize="13px" color="$textTextBrand" marginBottom="18px" display="flex" alignItems="center">
        View all <CaretRight size="16px" />
      </Text>
    </View>
    <View display="flex" flexDirection="column" gap="32px">
      <Transaction />
      <Transaction />
      <Transaction />
    </View>
  </View>
);

const LatestActivity = () => (
  <View backgroundColor="#FBFDFC" marginHorizontal="16px" borderRadius="8px" padding="16px">
    <View display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="18px">
      <Text fontSize="17px" fontWeight="600" color="$textPrimary">
        Upcoming Installments
      </Text>
      <Text fontSize="13px" color="$textTextBrand" marginBottom="18px" display="flex" alignItems="center">
        View all <CaretRight size="16px" />
      </Text>
    </View>
    <Text fontSize="15px" color="$textSecondary" textAlign="center">
      There are no installments to show yet
    </Text>
  </View>
);

export default function Home() {
  return (
    <ScrollView>
      <View backgroundColor="$backgroundMild" display="flex" flexDirection="column" gap="32px" paddingBottom="51px">
        <View backgroundColor="#FBFDFC" paddingHorizontal="16px">
          <View
            display="flex"
            flexDirection="row"
            justifyContent="space-between"
            paddingTop="48px"
            paddingBottom="40px"
          >
            <View display="flex" flexDirection="row" alignItems="center" gap="8px">
              <Image
                src="https://avatars.githubusercontent.com/u/83888950?s=200&v=4"
                alt="profile photo"
                width="32px"
                height="32px"
                borderRadius="$full"
              />

              <Text fontSize="17px" fontWeight="400" color="$textPrimary">
                0xfdrc.exa.eth
              </Text>
            </View>
            <View display="flex" flexDirection="row" alignItems="center" gap="16px">
              <EyeClosed size="24px" />
              <BellRinging size="24px" />
              <Gear size="24px" />
            </View>
          </View>
          <View display="flex" flexDirection="column" alignItems="center">
            <Text fontSize="15px" fontWeight="600" color="$textSecondary" marginBottom="48px">
              Balance
            </Text>
            <Text
              fontSize="48px"
              fontWeight="500"
              color="$textPrimary"
              marginBottom="20px"
              display="flex"
              alignItems="center"
            >
              $15,186.95 <CaretDown fill="#12A594" size="32px" />
            </Text>
            <View display="flex" flexDirection="row" justifyContent="space-around" gap="8px" marginBottom="48px">
              <Text fontSize="14px" color="$textSuccessSecondary" display="flex" alignItems="center">
                <TrendUp fill="#30A46C" /> $326.78 (2.94%)
              </Text>
              <Text fontSize="14px" color="$textSecondary">
                7D
              </Text>
            </View>
          </View>
          <View display="flex" gap="8px" flexDirection="row" width="100%">
            <Button flex={1} actionIcon={<ArrowLineDown size="24px" />}>
              Add funds
            </Button>
            <Button secondary flex={1} actionIcon={<ArrowUpRight size="24px" />}>
              Send
            </Button>
          </View>
        </View>
        <AvailableToSpend />
        <UpcomingInstallments />
        <LatestActivity />
      </View>
    </ScrollView>
  );
}
