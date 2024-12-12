import * as crypto from "crypto"; // eslint-disable-line unicorn/prefer-node-protocol

const developmentPem = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCAP192809jZyaw62g/eTzJ3P9H
+RmT88sXUYjQ0K8Bx+rJ83f22+9isKx+lo5UuV8tvOlKwvdDS/pVbzpG7D7NO45c
0zkLOXwDHZkou8fuj8xhDO5Tq3GzcrabNLRLVz3dkx0znfzGOhnY4lkOMIdKxlQb
LuVM/dGDC9UpulF+UwIDAQAB
-----END PUBLIC KEY-----`;

function generateSessionId() {
  const secretKey = crypto.randomUUID().replaceAll("-", "");
  const secretKeyBase64 = Buffer.from(secretKey, "hex").toString("base64");
  const secretKeyBase64Buffer = Buffer.from(secretKeyBase64, "utf8");
  const secretKeyBase64BufferEncrypted = crypto.publicEncrypt(
    { key: developmentPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    secretKeyBase64Buffer,
  );
  return {
    secretKey,
    sessionId: secretKeyBase64BufferEncrypted.toString("base64"),
  };
}

function decryptSecret(base64Secret: string, base64Iv: string, secretKey: string) {
  if (!base64Secret) throw new Error("base64Secret is required");
  if (!base64Iv) throw new Error("base64Iv is required");
  if (!secretKey || !/^[0-9A-F]+$/i.test(secretKey)) {
    throw new Error("secretKey must be a hex string");
  }
  const secret = Buffer.from(base64Secret, "base64");
  const iv = Buffer.from(base64Iv, "base64");
  const secretKeyBuffer = Buffer.from(secretKey, "hex");
  const authTag = secret.subarray(-16);
  const ciphertext = secret.subarray(0, -16);
  const decipher = crypto.createDecipheriv("aes-128-gcm", secretKeyBuffer, iv);
  decipher.setAutoPadding(false);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

export { generateSessionId, decryptSecret };
