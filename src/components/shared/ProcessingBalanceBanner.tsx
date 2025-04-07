import { useQuery } from "@tanstack/react-query";
import React from "react";

import Text from "./Text";
import View from "./View";
import isProcessing from "../../utils/isProcessing";
import { getActivity } from "../../utils/server";

const ProcessingBalanceBanner = () => {
  const { data: country } = useQuery({ queryKey: ["user", "country"] });
  const { data: processingBalance } = useQuery({
    queryKey: ["activity"],
    queryFn: () => getActivity(),
    select: (activity) =>
      activity.reduce(
        (total, item) => (item.type === "panda" && isProcessing(item.timestamp) ? total + item.usdAmount : total),
        0,
      ),
    enabled: country === "US",
  });
  if (!processingBalance) return null;
  return (
    <View
      backgroundColor="$interactiveBaseWarningSoftDefault"
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
      paddingVertical="$s3"
      paddingHorizontal="$s4"
    >
      <Text
        emphasized
        footnote
        color="$interactiveOnBaseWarningSoft"
      >{`Processing balance → ${processingBalance.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        currencyDisplay: "narrowSymbol",
      })}`}</Text>
    </View>
  );
};

export default ProcessingBalanceBanner;
