if (!process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID) throw new Error("missing alchemy gas policy");

const alchemyGasPolicyId: string = process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID;

export default alchemyGasPolicyId;
