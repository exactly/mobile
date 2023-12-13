import type { Readable } from "node:stream";

export default function buffer(request: Readable): Promise<Buffer> {
  return new Promise((r) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      r(Buffer.concat(chunks));
    });
  });
}
