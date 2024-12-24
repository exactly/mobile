const pem =
  process.env.NODE_ENV === "production"
    ? `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCeZ9uCoxi2XvOw1VmvVLo88TLk
GE+OO1j3fa8HhYlJZZ7CCIAsaCorrU+ZpD5PUTnmME3DJk+JyY1BB3p8XI+C5uno
QucrbxFbkM1lgR10ewz/LcuhleG0mrXL/bzUZbeJqI6v3c9bXvLPKlsordPanYBG
FZkmBPxc8QEdRgH4awIDAQAB
-----END PUBLIC KEY-----`
    : `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCAP192809jZyaw62g/eTzJ3P9H
+RmT88sXUYjQ0K8Bx+rJ83f22+9isKx+lo5UuV8tvOlKwvdDS/pVbzpG7D7NO45c
0zkLOXwDHZkou8fuj8xhDO5Tq3GzcrabNLRLVz3dkx0znfzGOhnY4lkOMIdKxlQb
LuVM/dGDC9UpulF+UwIDAQAB
-----END PUBLIC KEY-----`;

export async function session() {
  const secret = window.crypto.randomUUID().replaceAll("-", "");
  const hbytes = [];
  for (let index = 0; index < secret.length; index += 2) {
    hbytes.push(Number.parseInt(secret.slice(index, index + 2), 16));
  }
  const byteArray = new Uint8Array(hbytes);
  let hbinary = "";
  for (const byte of byteArray) hbinary += String.fromCodePoint(byte);
  const secretKeyBase64 = window.btoa(hbinary);

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

  return {
    id: window.btoa(binary),
    secret,
  };
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
