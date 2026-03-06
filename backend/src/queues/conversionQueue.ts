// src/queues/conversionQueue.ts
import { Queue } from "bullmq";
import { getBullMqConnection } from "./connection.js";

export const CONVERSION_QUEUE_NAME = "conversion";

export const conversionQueue = new Queue(CONVERSION_QUEUE_NAME, {
  connection: getBullMqConnection(),
});
