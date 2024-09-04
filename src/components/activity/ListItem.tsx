import React from "react";

import Text from "../shared/Text";
import View from "../shared/View";

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  date: string;
  logo: string;
  asset: {
    name: string;
    amount: bigint;
    usdValue: bigint;
  };
}

interface ListItemProperties {
  item: ActivityItem;
}

// TODO replace with new design
export default function ListItem({ item }: ListItemProperties) {
  return (
    <View gap="$s2">
      <Text>{item.title}</Text>
      <Text>{item.description}</Text>
    </View>
  );
}
