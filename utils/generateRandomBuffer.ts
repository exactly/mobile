export default function generateRandomBuffer() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return array.buffer;
}
