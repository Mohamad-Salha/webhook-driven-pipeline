import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
export default defineConfig({
	schema: "src/db/schema.ts",
	out: "src/db/generated",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/mydatabase",
	},
});