import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { View, Text, Spinner, Button } from "tamagui";
import { useAccount, useWriteContract } from "wagmi";

import { auditorAddress, marketUSDCAddress, useSimulateAuditorEnterMarket } from "../../generated/contracts";

const pressStyle = { backgroundColor: "$interactiveBaseBrandDefault", opacity: 0.9 };

export default function PasskeyUtils() {
  const { address } = useAccount();
  const { data: enterUSDCSimulation } = useSimulateAuditorEnterMarket({
    address: auditorAddress,
    args: [marketUSDCAddress],
    query: { enabled: !!address },
  });
  const { writeContract, data: txHash, isPending: isSending, error } = useWriteContract();
  const enterUSDC = useCallback(() => {
    if (!enterUSDCSimulation) throw new Error("no simulation");
    writeContract(enterUSDCSimulation.request);
  }, [enterUSDCSimulation, writeContract]);
  return (
    <View gap={ms(10)}>
      <Text fontSize={ms(16)} color="$uiNeutralPrimary" fontWeight="bold">
        Protocol
      </Text>
      {isSending && <Spinner color="$interactiveBaseBrandDefault" />}
      {error && (
        <Text color="$uiErrorPrimary" fontWeight="bold">
          {error.message}
        </Text>
      )}
      {txHash && (
        <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
          <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
            {txHash}
          </Text>
        </View>
      )}
      <View flexDirection="row" gap={ms(10)}>
        <Button
          borderRadius="$r2"
          variant="outlined"
          backgroundColor="$interactiveBaseBrandDefault"
          color="$interactiveOnBaseBrandDefault"
          onPress={enterUSDC}
          fontWeight="bold"
          pressStyle={pressStyle}
          padding={ms(10)}
          flex={1}
        >
          Simulate enter USDC market
        </Button>
      </View>
    </View>
  );
}
