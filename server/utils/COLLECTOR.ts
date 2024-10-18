import { Hex } from "@exactly/common/validation";
import { parse } from "valibot";

if (!process.env.COLLECTOR_ADDRESS) throw new Error("missing collector address");

export default parse(Hex, process.env.COLLECTOR_ADDRESS.toLowerCase());
