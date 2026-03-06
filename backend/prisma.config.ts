import { defineConfig, env } from "prisma/config";
import "./src/bootstrap/env.ts";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
