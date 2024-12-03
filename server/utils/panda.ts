import { Hex } from "@exactly/common/validation";
import { parse, string } from "valibot";

if (!process.env.PANDA_COLLECTOR) throw new Error("missing panda collector key");
export const collector = parse(Hex, process.env.PANDA_COLLECTOR.toLowerCase());

if (!process.env.PANDA_WEBHOOK_KEY) throw new Error("missing panda webhooks key");
export default parse(string(), process.env.PANDA_WEBHOOK_KEY);;
