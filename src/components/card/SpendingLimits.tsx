import { ChevronDown } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { Accordion, Square } from "tamagui";

import SpendingLimitButton from "./SpendingLimitButton";
import Text from "../shared/Text";

export default function SpendingLimits() {
  return (
    <Accordion overflow="hidden" type="multiple" backgroundColor="$backgroundSoft" borderRadius="$r3" padding="$s4">
      <Accordion.Item value="a1" flex={1}>
        <Accordion.Trigger
          unstyled
          flexDirection="row"
          justifyContent="space-between"
          backgroundColor="transparent"
          borderWidth={0}
          alignItems="center"
        >
          {({ open }: { open: boolean }) => (
            <>
              <Text emphasized headline>
                Spending limits
              </Text>
              <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                <ChevronDown size={ms(24)} color="$interactiveTextBrandDefault" />
              </Square>
            </>
          )}
        </Accordion.Trigger>
        <Accordion.HeightAnimator animation="quick">
          <Accordion.Content exitStyle={exitStyle} gap="$s4" paddingTop="$s4">
            <SpendingLimitButton title="Daily" limit={5000} />
            <SpendingLimitButton title="Weekly" limit={10_000} />
            <SpendingLimitButton title="Monthly" limit={30_000} />
          </Accordion.Content>
        </Accordion.HeightAnimator>
      </Accordion.Item>
    </Accordion>
  );
}

const exitStyle = { opacity: 0 };
