#!/usr/bin/env bun
import { readFileSync } from "fs";
import { join, basename } from "path";
import { Database } from "bun:sqlite";
import { DatabaseConnection } from "../src/db/connection";
import { DictionaryHandler } from "../src/handlers/dictionary";
import { TermHandler } from "../src/handlers/term";
import { DefinitionHandler } from "../src/handlers/definition";
import { ImportExportHandler } from "../src/utils/import-export";

// Get command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "Usage: bun run import.ts <dictionary-file.json> [database-path]",
  );
  console.error("Example: bun run import.ts engineering.json");
  console.error(
    "Example: bun run import.ts engineering.json ./my-dictionary.db",
  );
  process.exit(1);
}

const dictionaryFile = args[0];
const dbPath = args[1] || "./dictionary.db";

// Initialize database and handlers
const dbConn = new DatabaseConnection(dbPath);
await dbConn.initialize();
const db = dbConn.getDb();

const dictHandler = new DictionaryHandler(
  db,
  dbConn.generateId,
  dbConn.normalizeText,
);
const termHandler = new TermHandler(
  db,
  dbConn.generateId,
  dbConn.normalizeText,
);
const defHandler = new DefinitionHandler(
  db,
  dbConn.generateId,
  dbConn.normalizeText,
);
const importExportHandler = new ImportExportHandler(
  dictHandler,
  termHandler,
  defHandler,
);

try {
  // Read the dictionary file
  const filePath = dictionaryFile.startsWith("/")
    ? dictionaryFile
    : join(__dirname, "dictionaries", dictionaryFile);

  console.log(`Importing dictionary from: ${filePath}`);
  const jsonData = readFileSync(filePath, "utf-8");

  // Import the dictionary
  const result = importExportHandler.importFromJson(jsonData);

  console.log(`\n✅ Successfully imported "${result.dictionary.name}"`);
  console.log(`   - Terms: ${result.termCount}`);
  console.log(`   - Definitions: ${result.definitionCount}`);
  console.log(`   - Database: ${dbPath}`);
} catch (error: any) {
  console.error(`\n❌ Error importing dictionary: ${error.message}`);
  process.exit(1);
} finally {
  dbConn.close();
}
