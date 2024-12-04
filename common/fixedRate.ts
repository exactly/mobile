import { ONE_YEAR, WAD } from "@exactly/lib";

export default function fixedRate(maturity: bigint, assets: bigint, fee: bigint, timestamp: bigint) {
  return ((((assets + fee) * WAD) / assets - WAD) * ONE_YEAR) / (maturity - timestamp);
}
