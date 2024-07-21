if (!process.env.EXPO_PUBLIC_ALCHEMY_API_KEY) throw new Error("missing alchemy api key");

const alchemyAPIKey: string = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;

export default alchemyAPIKey;
