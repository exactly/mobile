import React, { useCallback } from "react";
import { Button, Platform } from "react-native";
import * as Sentry from "sentry-expo";
import { Text, XStack, YStack } from "tamagui";
import { useBlockNumber } from "wagmi";

const rpId = __DEV__ && Platform.OS === "web" ? "localhost" : "exactly.app";

export default function Home() {
  const { data: blockNumber } = useBlockNumber();

  const create = useCallback(() => {
    const challenge = generateRandomBuffer();
    const username = `exactly, ${new Date().toISOString().slice(0, 10)}`;
    navigator.credentials
      .create({
        publicKey: {
          rp: { id: rpId, name: "exactly" },
          user: { id: challenge, name: username, displayName: username },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: { requireResidentKey: true, residentKey: "required", userVerification: "required" },
          challenge,
        },
      })
      .then((credential) => {
        console.log("credential", credential); // eslint-disable-line no-console
      })
      .catch(handleError);
  }, []);

  const get = useCallback(() => {
    navigator.credentials
      .get({ publicKey: { rpId, userVerification: "required", challenge: generateRandomBuffer() } })
      .then((credential) => {
        console.log("credential", credential); // eslint-disable-line no-console
      })
      .catch(handleError);
  }, []);

  return (
    <XStack flex={1} alignItems="center" space>
      <YStack flex={1} alignItems="center" space>
        <Text textAlign="center">block number: {blockNumber && String(blockNumber)}</Text>
        <Button title="create" onPress={create} />
        <Button title="get" onPress={get} />
      </YStack>
    </XStack>
  );
}

function generateRandomBuffer() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return array.buffer;
}

function handleError(error: unknown) {
  console.log(error); // eslint-disable-line no-console
  (Sentry.Native ?? Sentry.React).captureException(error); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
}
