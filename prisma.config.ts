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
		// Pooled URL (PgBouncer, port 6543) for all runtime queries
		url: process.env["DATABASE_URL"]!,
		// Direct URL (port 5432) for migrations — PgBouncer doesn't support DDL
		directUrl: process.env["DIRECT_URL"],
	},
});
