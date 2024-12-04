export default function shortenAddress(address: string, start: number, end: number) {
  return address && `${address.slice(0, start)}…${address.slice(-end)}`;
}
