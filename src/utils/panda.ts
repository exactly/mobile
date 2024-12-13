import pem from "@exactly/common/pandaCertificate";

export async function session() {
  const secret = window.crypto.randomUUID().replaceAll("-", "");
  const secretBytes = [];
  for (let index = 0; index < secret.length; index += 2) {
    secretBytes.push(Number.parseInt(secret.slice(index, index + 2), 16));
  }
  const byteArray = new Uint8Array(secretBytes);
  let secretBinary = "";
  for (const byte of byteArray) secretBinary += String.fromCodePoint(byte);
  const secretKeyBase64 = window.btoa(secretBinary);

  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pem.slice(pemHeader.length, pem.length - pemFooter.length - 1);
  const binaryDerString = window.atob(pemContents);
  const buf = new ArrayBuffer(binaryDerString.length);
  const bufView = new Uint8Array(buf);
  for (let index = 0, stringLength = binaryDerString.length; index < stringLength; index++) {
    bufView[index] = binaryDerString.codePointAt(index)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }
  const binaryDer = buf;

  const rsaPublicKey = await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-1" },
    true,
    ["encrypt"],
  );

  const encryptedArrayBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPublicKey,
    new TextEncoder().encode(secretKeyBase64),
  );
  let binary = "";
  const bytes = new Uint8Array(encryptedArrayBuffer);
  const length = bytes.byteLength;
  for (let index = 0; index < length; index++) {
    binary += String.fromCodePoint(bytes[index]!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  return { id: window.btoa(binary), secret };
}

export async function decrypt(base64Secret: string, base64Iv: string, secretKey: string) {
  if (!base64Secret) throw new Error("base64Secret is required");
  if (!base64Iv) throw new Error("base64Iv is required");
  if (!secretKey || !/^[0-9A-F]+$/i.test(secretKey)) {
    throw new Error("secretKey must be a hex string");
  }

  const secret = Uint8Array.from(window.atob(base64Secret), (c) => c.codePointAt(0)!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
  const iv = Uint8Array.from(window.atob(base64Iv), (c) => c.codePointAt(0)!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
  const secretKeyArrayBuffer = Uint8Array.from(
    secretKey.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)), // eslint-disable-line @typescript-eslint/no-non-null-assertion
  );

  const cryptoKey = await window.crypto.subtle.importKey("raw", secretKeyArrayBuffer, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);

  const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, secret);
  return new TextDecoder().decode(decrypted);
}
