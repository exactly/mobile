import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@github/webauthn-json/dist/types/basic/json";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import React from "react";
import { Button, YStack } from "tamagui";

async function authenticate() {
  const optionsResponse = await fetch("http://localhost:3000/api/auth/generate-authentication-options?userID=seba");
  const options = (await optionsResponse.json()) as PublicKeyCredentialRequestOptionsJSON;
  console.log("Authentication Options (Autofill)", options);
  try {
    const authenticationResponse = await startAuthentication({
      ...options,
      // allowCredentials: undefined,
    });
    console.log("Authentication Response (Autofill)", JSON.stringify(authenticationResponse, undefined, 2));
    const verificationResp = await fetch("http://localhost:3000/api/auth/verify-authentication?userID=seba", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authenticationResponse),
    });
    const verificationJSON = (await verificationResp.json()) as { verified: boolean };
    console.log("Server Response (Autofill)", JSON.stringify(verificationJSON, undefined, 2));
    if (verificationJSON.verified) {
      alert(`User authenticated!`);
    } else {
      alert(`Oh no, something went wrong! Response: <pre>${JSON.stringify(verificationJSON)}</pre>`);
    }
  } catch (error) {
    console.error("(Autofill)", error);
  }
}

async function register() {
  const response = await fetch("http://localhost:3000/api/auth/generate-registration-options?userID=seba");
  try {
    const options = (await response.json()) as PublicKeyCredentialCreationOptionsJSON;
    const registration = await startRegistration(options);
    const verifyRegistrationResponse = await fetch("http://localhost:3000/api/auth/verify-registration?userID=seba", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registration),
    });
    const { verified } = (await verifyRegistrationResponse.json()) as { verified: boolean };
    console.log("Server Response", JSON.stringify({ verified }, undefined, 2));
    if (verified) {
      console.log(`Authenticator registered!`);
    } else {
      console.log(`Oh no, something went wrong! Response: <pre>${JSON.stringify({ verified })}</pre>`);
    }
  } catch (error) {
    console.error(error);
  }
}

export default function Auth() {
  return (
    <YStack>
      <Button onPress={authenticate}> Authenticate</Button>
      <Button onPress={register}> Register</Button>
    </YStack>
  );
}
