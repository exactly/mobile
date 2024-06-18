import { createSecretKey } from "node:crypto";

if (!process.env.JWT_SECRET) throw new Error("missing jwt secret");

export default createSecretKey(process.env.JWT_SECRET, "utf8");
