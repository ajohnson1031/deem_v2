import "../bootstrap/env.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// This pulls PrismaClient from the Node (non-wasm) build
const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new (args: any) => any;
};

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
