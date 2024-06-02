import { ArrowRight, ArrowSquareOut, CalendarBlank, File, Hash, SpinnerGap, User } from "@phosphor-icons/react";
import React, { useState } from "react";
import { Image, Input, Stack, Text, View } from "tamagui";

import Button from "../components/Button";
import Contact from "../components/Contact";
import Drawer from "../components/Drawer";

function Available() {
  return (
    <View
      borderRadius="8px"
      flexDirection="row"
      backgroundColor="#F3FBF9"
      gap="12px"
      alignItems="center"
      marginBottom="16px"
    >
      <Image
        source="https://cdn.worldvectorlogo.com/logos/ethereum-eth.svg"
        alt="profile photo"
        width="32px"
        height="32px"
        marginLeft="12px"
      />
      <Text fontSize="16px" fontWeight="400" flex={1}>
        <Text color="$textSecondary">Available: </Text>
        <Text fontWeight="600">0.809 ETH</Text>
      </Text>
      <Button secondary margin="4px" paddingHorizontal="17px" height="48px" fontSize="13px" actionIcon="MAX" />
    </View>
  );
}

function Amount() {
  return (
    <View
      borderRadius="8px"
      flexDirection="column"
      backgroundColor="#F3FBF9"
      alignItems="center"
      marginBottom="16px"
      padding="16px"
      display="flex"
      gap="8px"
    >
      <Input
        flex={1}
        borderColor="transparent"
        placeholder="0.42 ETH"
        textAlign="center"
        fontSize="28px"
        fontWeight="400"
        paddingVertical="20px"
      />
      <Input
        flex={1}
        borderColor="transparent"
        placeholder="1,283.98 USD"
        textAlign="center"
        fontSize="28px"
        fontWeight="400"
        paddingVertical="20px"
      />
    </View>
  );
}

const ReviewTransaction = ({ onSubmit }: { onSubmit: () => void }) => (
  <View paddingHorizontal="24px" height="100%">
    <Text fontSize="16px" fontWeight="600" textAlign="center" marginBottom="32px" marginTop="16px">
      Review transaction
    </Text>
    <View display="flex" flexDirection="column" gap="17px" marginBottom="25px">
      <Text color="$textSecondary" fontWeight="600" fontSize="13px">
        Sending
      </Text>
      <View display="flex" flexDirection="row" gap="12px" alignItems="center">
        <Image
          source="https://cdn.worldvectorlogo.com/logos/ethereum-eth.svg"
          alt="profile photo"
          width="48px"
          height="48px"
        />
        <View display="flex" flexDirection="column">
          <Text fontSize="28px" fontWeight="400">
            0.42
          </Text>
          <Text fontSize="15px" color="$textSecondary" fontWeight="400">
            $1,283.98
          </Text>
        </View>
      </View>
    </View>
    <View display="flex" flexDirection="column" gap="17px" marginBottom="25px">
      <Text color="$textSecondary" fontWeight="600" fontSize="13px">
        To
      </Text>
      <View display="flex" flexDirection="row" gap="12px" alignItems="center">
        <View backgroundColor="$interactiveBaseBrandDefault" borderRadius="$full" padding="4px">
          <User size="40px" fill="#F3FBF9" />
        </View>
        <View display="flex" flexDirection="column">
          <Text fontSize="28px" fontWeight="400">
            0x3D5...383B7
          </Text>
          <Text fontSize="15px" color="$textSecondary" fontWeight="400">
            First time send
          </Text>
        </View>
      </View>
    </View>
    <Button marginTop="auto" actionIcon={<ArrowRight size="24px" />} onPress={onSubmit}>
      Hold to send
    </Button>
  </View>
);

const TransactionReceipt = () => (
  <>
    <View
      display="flex"
      flexDirection="column"
      alignItems="center"
      paddingTop="44px"
      gap="16px"
      borderBottomWidth="1px"
      borderColor="$borderSoft"
      paddingBottom="24px"
    >
      <View backgroundColor="$backgroundMild" padding="16px" borderRadius="$full">
        <SpinnerGap fill="#12A594" size="56px" />
      </View>
      <Text color="$textSecondary" fontSize="20px" fontWeight="600">
        Sending...
      </Text>
      <View display="flex" flexDirection="row" gap="12px" alignItems="center">
        <Image
          source="https://cdn.worldvectorlogo.com/logos/ethereum-eth.svg"
          alt="profile photo"
          width="32px"
          height="32px"
        />
        <View display="flex" flexDirection="column">
          <Text fontSize="34px" fontWeight="400">
            0.42
          </Text>
          <Text fontSize="17px" color="$textSecondary" fontWeight="400">
            $1,283.98
          </Text>
        </View>
      </View>
    </View>
    <View display="flex" flexDirection="column" paddingHorizontal="24px" paddingTop="36px" gap="32px">
      <View display="flex" flexDirection="row" alignItems="center" gap="8px">
        <View backgroundColor="$interactiveBaseBrandDefault" borderRadius="$full" padding="2px">
          <User size="16px" fill="#F3FBF9" />
        </View>
        <View display="flex" flexDirection="row" flex={1} alignItems="center">
          <Text width="50%" color="$textSecondary" fontSize="13px" fontWeight="600">
            To
          </Text>
          <Text width="50%" fontSize="16px" fontWeight="400" textAlign="right">
            0x3Ds3h5...3fp083B7
          </Text>
        </View>
      </View>
      <View display="flex" flexDirection="row" alignItems="center" gap="8px">
        <CalendarBlank fill="#12A594" size="20px" />
        <View display="flex" flexDirection="row" flex={1} alignItems="center">
          <Text width="50%" color="$textSecondary" fontSize="13px" fontWeight="600">
            Date
          </Text>
          <Text width="50%" fontSize="16px" fontWeight="400" textAlign="right">
            Feb 21, 2024 at 16:32
          </Text>
        </View>
      </View>
      <View display="flex" flexDirection="row" alignItems="center" gap="8px">
        <Hash fill="#12A594" size="20px" />
        <View display="flex" flexDirection="row" flex={1} alignItems="center">
          <Text width="50%" color="$textSecondary" fontSize="13px" fontWeight="600">
            Transaction Hash
          </Text>
          <Text width="50%" fontSize="16px" fontWeight="400" textAlign="right">
            0xe1b656...984h45a2
          </Text>
        </View>
      </View>
      <Button marginTop="auto" actionIcon={<ArrowSquareOut size="24px" />}>
        View on Etherscan
      </Button>
    </View>
  </>
);

export default function Send() {
  const [openDrawer, setOpenDrawer] = useState<"review" | "transaction-receipt" | undefined>();

  return (
    <>
      <Stack paddingTop="36px" paddingBottom="16px" paddingHorizontal="16px" height="100vh">
        <Text fontSize="16px" fontWeight="600" textAlign="center" marginBottom="32px">
          Enter amount
        </Text>
        <Contact />
        <Available />
        <Amount />
        <Button
          marginTop="auto"
          actionIcon={<File size="24px" />}
          onPress={() => {
            setOpenDrawer("review");
          }}
        >
          Review
        </Button>
      </Stack>

      <Drawer
        open={openDrawer === "review"}
        onClose={() => {
          setOpenDrawer(undefined);
        }}
      >
        <ReviewTransaction
          onSubmit={() => {
            setOpenDrawer("transaction-receipt");
          }}
        />
      </Drawer>
      <Drawer
        open={openDrawer === "transaction-receipt"}
        onClose={() => {
          setOpenDrawer(undefined);
        }}
      >
        <TransactionReceipt />
      </Drawer>
    </>
  );
}
