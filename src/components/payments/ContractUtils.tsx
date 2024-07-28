import * as Clipboard from "expo-clipboard";
import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { View, Text, Spinner } from "tamagui";
import { useAccount, useWriteContract } from "wagmi";

import { auditorAddress, marketUSDCAddress, useSimulateAuditorEnterMarket } from "../../generated/contracts";
import handleError from "../../utils/handleError";
import Button from "../shared/Button";

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
  const copy = () => {
    if (!txHash) return;
    Clipboard.setStringAsync(txHash).catch(handleError);
  };
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
        <Button contained onPress={enterUSDC} padding={ms(10)}>
          Enter USDC market
        </Button>
        {txHash && (
          <Button outlined borderRadius="$r2" onPress={copy} padding={ms(10)}>
            Copy
          </Button>
        )}
      </View>
    </View>
  );
}
