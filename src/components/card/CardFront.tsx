import { Dot } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";

import ExaCard from "../../assets/images/card.svg";
import Text from "../shared/Text";
import View from "../shared/View";

export default function CardFront({ lastFour }: { lastFour?: string }) {
  return (
    <View height="100%" width="100%">
      <ExaCard height="100%" width="100%" />
      <View bottom={ms(10)} flexDirection="row" gap="$s2" left={ms(10)} position="absolute">
        <View flexDirection="row" gap="$s2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Dot
              color="white"
              key={index}
              size={ms(17)}
              transform={[{ translateX: index * ms(12) * -1 }, { translateY: 1 }]}
            />
          ))}
        </View>
        <Text
          callout
          color="white"
          emphasized
          paddingTop={lastFour ? 0 : ms(3)}
          transform={[{ translateX: ms(40) * -1 }]}
        >
          {lastFour}
        </Text>
      </View>
    </View>
  );
}
