#!/usr/bin/env node
import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = join(__dirname, "..", ".env.local");
try {
  const env = readFileSync(envPath, "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch (e) {
  console.error("Could not load .env.local:", e.message);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });

const schemaPath = join(__dirname, "init-db.sql");
const schema = readFileSync(schemaPath, "utf-8");

async function run() {
  try {
    await sql.unsafe(schema);
    console.log("Database schema applied successfully.");
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
