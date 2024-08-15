import { auditorAddress } from "@exactly/common/generated/chain";
import { setStringAsync } from "expo-clipboard";
import React, { useCallback, useState } from "react";
import { ms } from "react-native-size-matters";
import { View, Spinner } from "tamagui";
import { maxUint256, zeroAddress } from "viem";
import { useAccount, useBalance, useWriteContract } from "wagmi";

import {
  marketUSDCAddress,
  previewerAddress,
  usdcAddress,
  useReadPreviewerExactly,
  useSimulateAuditorEnterMarket,
  useSimulateMarketApprove,
  useSimulateMarketBorrowAtMaturity,
  useSimulateMarketDeposit,
} from "../../generated/contracts";
import handleError from "../../utils/handleError";
import Button from "../shared/Button";
import Input from "../shared/Input";
import Text from "../shared/Text";

function copyHash(hash: string | undefined) {
  if (!hash) return;
  setStringAsync(hash).catch(handleError);
}

export default function ContractUtils() {
  const [borrowAmount, setBorrowAmount] = useState<number>(0);
  const { address } = useAccount();
  const { data: balanceUSDC } = useBalance({ token: usdcAddress, address });
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  const marketUSDC = markets?.find((market) => market.asset === usdcAddress);
  const floatingUSDCDeposit = marketUSDC?.floatingDepositAssets ?? 0n;
  const firstMaturity = marketUSDC?.fixedPools[0]?.maturity ?? 0n;
  const borrowAssets = BigInt(borrowAmount * 10 ** (marketUSDC?.decimals ?? 6));

  const { data: approveUSDCSimulation } = useSimulateMarketApprove({
    address: usdcAddress,
    args: [marketUSDCAddress, balanceUSDC?.value ?? 0n],
    query: { enabled: !!address && !!balanceUSDC && balanceUSDC.value > 0n },
  });
  const { data: enterUSDCSimulation } = useSimulateAuditorEnterMarket({
    address: auditorAddress,
    args: [marketUSDCAddress],
    query: { enabled: !!address },
  });
  const { data: depositUSDCSimulation } = useSimulateMarketDeposit({
    address: marketUSDCAddress,
    args: [balanceUSDC?.value ?? 0n, address ?? zeroAddress],
    query: { enabled: !!address && !!balanceUSDC && balanceUSDC.value > 0n },
  });
  const { data: borrowUSDCSimulation } = useSimulateMarketBorrowAtMaturity({
    address: marketUSDCAddress,
    args: [firstMaturity, borrowAssets, maxUint256, address ?? zeroAddress, address ?? zeroAddress],
    query: { enabled: !!address && !!floatingUSDCDeposit && floatingUSDCDeposit > 0n },
  });

  const { writeContract: approve, data: approveHash, isPending: isApproving, error: approveError } = useWriteContract();
  const {
    writeContract: enter,
    data: enterMarketHash,
    isPending: isSending,
    error: enterMarketError,
  } = useWriteContract();
  const {
    writeContract: deposit,
    data: depositHash,
    isPending: isDepositing,
    error: depositError,
  } = useWriteContract();
  const { writeContract: borrow, data: borrowHash, isPending: isBorrowing, error: borrowError } = useWriteContract();

  const approveUSDC = useCallback(() => {
    if (!approveUSDCSimulation) throw new Error("no approve simulation");
    approve(approveUSDCSimulation.request);
  }, [approve, approveUSDCSimulation]);
  const enterUSDC = useCallback(() => {
    if (!enterUSDCSimulation) throw new Error("no enter market simulation");
    enter(enterUSDCSimulation.request);
  }, [enterUSDCSimulation, enter]);
  const depositUSDC = useCallback(() => {
    if (!depositUSDCSimulation) throw new Error("no deposit simulation");
    deposit(depositUSDCSimulation.request);
  }, [deposit, depositUSDCSimulation]);
  const borrowUSDC = useCallback(() => {
    if (!borrowUSDCSimulation) throw new Error("no borrow simulation");
    borrow(borrowUSDCSimulation.request);
  }, [borrow, borrowUSDCSimulation]);

  return (
    <View gap="$s4">
      <Text fontSize={ms(16)} subHeadline fontWeight="bold">
        Exactly
      </Text>

      {(isSending || isDepositing || isApproving || isBorrowing) && <Spinner color="$interactiveBaseBrandDefault" />}

      {(enterMarketError ?? depositError ?? approveError ?? borrowError) && (
        <Text color="$uiErrorPrimary" fontWeight="bold">
          {enterMarketError
            ? enterMarketError.message
            : depositError
              ? depositError.message
              : approveError
                ? approveError.message
                : borrowError
                  ? borrowError.message
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

      <View flexDirection="row" gap="$s4">
        <Button contained onPress={approveUSDC} disabled={!approveUSDCSimulation} padding={ms(10)} flex={1}>
          Approve USDC
        </Button>
        {approveHash && (
          <Button
            outlined
            borderRadius="$r2"
            onPress={() => {
              copyHash(approveHash);
            }}
            padding={ms(10)}
            flex={1}
          >
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

      <View flexDirection="row" gap="$s4">
        <Button
          contained
          onPress={enterUSDC}
          disabled={balanceUSDC?.value === 0n || !enterUSDCSimulation}
          padding={ms(10)}
          flex={1}
        >
          Enter USDC market
        </Button>
        {enterMarketHash && (
          <Button
            outlined
            borderRadius="$r2"
            onPress={() => {
              copyHash(enterMarketHash);
            }}
            padding={ms(10)}
            flex={1}
          >
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

      <View flexDirection="row" gap="$s4">
        <Button
          contained
          onPress={depositUSDC}
          disabled={balanceUSDC?.value === 0n || !depositUSDCSimulation}
          padding={ms(10)}
          flex={1}
        >
          Deposit USDC
        </Button>
        {depositHash && (
          <Button
            outlined
            borderRadius="$r2"
            onPress={() => {
              copyHash(depositHash);
            }}
            padding={ms(10)}
            flex={1}
          >
            Copy
          </Button>
        )}
      </View>

      <View gap="$s4">
        <Text fontSize={ms(16)}>Borrow</Text>
        <Input
          inputMode="numeric"
          value={borrowAmount.toString()}
          onChange={(event) => {
            setBorrowAmount(Number(event.nativeEvent.text));
          }}
        />
        {borrowHash && (
          <View borderRadius="$r4" borderWidth={2} borderColor="$borderNeutralSoft" padding={ms(10)}>
            <Text textAlign="center" fontSize={ms(14)} fontFamily="$mono" width="100%" fontWeight="bold">
              {borrowHash}
            </Text>
          </View>
        )}
        <View flexDirection="row" gap="$s4">
          <Button
            contained
            onPress={borrowUSDC}
            disabled={floatingUSDCDeposit === 0n || !borrowUSDCSimulation}
            padding={ms(10)}
            flex={1}
          >
            Borrow USDC
          </Button>
          {borrowHash && (
            <Button
              outlined
              borderRadius="$r2"
              onPress={() => {
                copyHash(borrowHash);
              }}
              padding={ms(10)}
              flex={1}
            >
              Copy
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
