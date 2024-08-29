import { Environment } from "react-native-persona";

if (!process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID) throw new Error("missing persona template id");

export const templateId = process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID;
export const environment = __DEV__ ? Environment.SANDBOX : Environment.PRODUCTION;
