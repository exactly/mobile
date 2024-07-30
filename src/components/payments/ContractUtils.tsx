import * as Clipboard from "expo-clipboard";
import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { View, Text, Spinner } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount, useBalance, useWriteContract } from "wagmi";

import {
  auditorAddress,
  marketUSDCAddress,
  usdcAddress,
  useSimulateAuditorEnterMarket,
  useSimulateMarketDeposit,
} from "../../generated/contracts";
import handleError from "../../utils/handleError";
import Button from "../shared/Button";

export default function PasskeyUtils() {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address: usdcAddress });

  const {
    writeContract: enterMarket,
    data: enterMarketHash,
    isPending: isSending,
    error: enterMarketError,
  } = useWriteContract();
  const {
    writeContract: depositMarket,
    data: depositHash,
    isPending: isDepositing,
    error: depositError,
  } = useWriteContract();

  const { data: enterUSDCSimulation } = useSimulateAuditorEnterMarket({
    address: auditorAddress,
    args: [marketUSDCAddress],
    query: { enabled: !!address },
  });
  const { data: depositUSDCSimulation } = useSimulateMarketDeposit({
    address: marketUSDCAddress,
    args: [balance?.value ?? 0n, address ?? zeroAddress],
    query: { enabled: !!address },
  });

  const enterUSDC = useCallback(() => {
    if (!enterUSDCSimulation) throw new Error("no enter market simulation");
    enterMarket(enterUSDCSimulation.request);
  }, [enterUSDCSimulation, enterMarket]);

  const deposit = useCallback(() => {
    if (!depositUSDCSimulation) throw new Error("no deposit simulation");
    depositMarket(depositUSDCSimulation.request);
  }, [depositMarket, depositUSDCSimulation]);

  const copyEnterMarketHash = () => {
    if (!enterMarketHash) return;
    Clipboard.setStringAsync(enterMarketHash).catch(handleError);
  };

  const copyDepositHash = () => {
    if (!depositHash) return;
    Clipboard.setStringAsync(depositHash).catch(handleError);
  };

  return (
    <View gap={ms(10)}>
      <Text fontSize={ms(16)} color="$uiNeutralPrimary" fontWeight="bold">
        Exactly
      </Text>
      {(isSending || isDepositing) && <Spinner color="$interactiveBaseBrandDefault" />}
      {(enterMarketError || depositError) && (
        <Text color="$uiErrorPrimary" fontWeight="bold">
          {enterMarketError ? enterMarketError.message : depositError ? depositError.message : "Error"}
        </Text>
      )}
      {enterMarketHash && (
        <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
          <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
            {enterMarketHash}
          </Text>
        </View>
      )}
      <View flexDirection="row" gap={ms(10)}>
        <Button contained onPress={enterUSDC} padding={ms(10)} flex={1}>
          Enter USDC market
        </Button>
        {enterMarketHash && (
          <Button outlined borderRadius="$r2" onPress={copyEnterMarketHash} padding={ms(10)} flex={1}>
            Copy
          </Button>
        )}
      </View>
      <View flexDirection="row" gap={ms(10)}>
        <Button contained onPress={deposit} padding={ms(10)} flex={1}>
          Deposit
        </Button>
        {depositHash && (
          <Button outlined borderRadius="$r2" onPress={copyDepositHash} padding={ms(10)} flex={1}>
            Copy
          </Button>
        )}
      </View>
    </View>
  );
}
