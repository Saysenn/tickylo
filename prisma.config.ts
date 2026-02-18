// Prisma v7 config — connection URLs live here, not in schema.prisma
// Set DATABASE_URL in .env.local (see .env.example for format)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
