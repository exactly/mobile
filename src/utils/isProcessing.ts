import { isAfter, subDays } from "date-fns";

export default function isProcessing(timestamp: number | string) {
  const nextReset = subDays(new Date(), 1);
  nextReset.setUTCHours(13, 0, 0, 0);
  return isAfter(new Date(timestamp), nextReset);
}
