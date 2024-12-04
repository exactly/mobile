export default function shortenHex(hex: string, start = 4, end = 4) {
  return hex && `${hex.slice(0, 2 + start)}…${hex.slice(-end)}`;
}
