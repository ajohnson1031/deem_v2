import "./bootstrap/env.ts";
import { getEnv } from "./config/env.js";
import { buildProviderRegistry } from "./providers/registry.js";
import { startConversionWorker } from "./workers/conversionWorker.js";
import { startWatchdogWorker } from "./workers/watchdogWorker.js";

const env = getEnv();
const providers = buildProviderRegistry(env);

startConversionWorker(providers);
startWatchdogWorker();
