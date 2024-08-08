import { setStringAsync } from "expo-clipboard";
import React, { useCallback } from "react";
import { ms } from "react-native-size-matters";
import { View, Spinner } from "tamagui";
import { erc20Abi, zeroAddress } from "viem";
import { useAccount, useBalance, useSimulateContract, useWriteContract } from "wagmi";

import {
  auditorAddress,
  marketUSDCAddress,
  usdcAddress,
  useSimulateAuditorEnterMarket,
  useSimulateMarketDeposit,
} from "../../generated/contracts";
import handleError from "../../utils/handleError";
import Button from "../shared/Button";
import Text from "../shared/Text";

export default function PasskeyUtils() {
  const { address } = useAccount();
  const { data: balance } = useBalance({ token: usdcAddress, address });

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
  const { writeContract: approve, data: approveHash, isPending: isApproving, error: approveError } = useWriteContract();

  const { data: enterUSDCSimulation } = useSimulateAuditorEnterMarket({
    address: auditorAddress,
    args: [marketUSDCAddress],
    query: { enabled: !!address },
  });
  const { data: depositUSDCSimulation } = useSimulateMarketDeposit({
    address: marketUSDCAddress,
    args: [balance?.value ?? 0n, address ?? zeroAddress],
    query: { enabled: !!address && !!balance && balance.value > 0n },
  });
  const { data: approveUSDCSimulation } = useSimulateContract({
    abi: erc20Abi,
    functionName: "approve",
    address: usdcAddress,
    args: [marketUSDCAddress, balance?.value ?? 0n],
    query: { enabled: !!address && !!balance && balance.value > 0n },
  });

  const enterUSDC = useCallback(() => {
    if (!enterUSDCSimulation) throw new Error("no enter market simulation");
    enterMarket(enterUSDCSimulation.request);
  }, [enterUSDCSimulation, enterMarket]);

  const depositUSDC = useCallback(() => {
    if (!depositUSDCSimulation) throw new Error("no deposit simulation");
    depositMarket(depositUSDCSimulation.request);
  }, [depositMarket, depositUSDCSimulation]);

  const approveUSDC = useCallback(() => {
    if (!approveUSDCSimulation) throw new Error("no approve simulation");
    approve(approveUSDCSimulation.request);
  }, [approve, approveUSDCSimulation]);

  const copyEnterMarketHash = () => {
    if (!enterMarketHash) return;
    setStringAsync(enterMarketHash).catch(handleError);
  };

  const copyDepositHash = () => {
    if (!depositHash) return;
    setStringAsync(depositHash).catch(handleError);
  };

  const copyApproveHash = () => {
    if (!approveHash) return;
    setStringAsync(approveHash).catch(handleError);
  };

  return (
    <View gap={ms(10)}>
      <Text fontSize={ms(16)} fontWeight="bold">
        Exactly
      </Text>

      {(isSending || isDepositing || isApproving) && <Spinner color="$interactiveBaseBrandDefault" />}

      {(enterMarketError || depositError || approveError) && (
        <Text color="$uiErrorPrimary" fontWeight="bold">
          {enterMarketError
            ? enterMarketError.message
            : depositError
              ? depositError.message
              : approveError
                ? approveError.message
                : "Error"}
        </Text>
      )}

      {approveHash && (
        <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
          <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
            {approveHash}
          </Text>
        </View>
      )}

      <View flexDirection="row" gap={ms(10)}>
        <Button contained onPress={approveUSDC} padding={ms(10)} flex={1}>
          Approve USDC
        </Button>
        {approveHash && (
          <Button outlined borderRadius="$r2" onPress={copyApproveHash} padding={ms(10)} flex={1}>
            Copy
          </Button>
        )}
      </View>

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

      {depositHash && (
        <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
          <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
            {depositHash}
          </Text>
        </View>
      )}

      <View flexDirection="row" gap={ms(10)}>
        <Button contained onPress={depositUSDC} padding={ms(10)} flex={1}>
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
