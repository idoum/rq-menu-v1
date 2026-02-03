// Prisma configuration file for SAASRESTO
// In production (Docker), environment variables are set by docker-compose
// In development, they come from .env file (loaded by Next.js automatically)

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
