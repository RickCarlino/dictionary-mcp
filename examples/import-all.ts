#!/usr/bin/env bun
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";
import { DatabaseConnection } from "../src/db/connection";
import { DictionaryHandler } from "../src/handlers/dictionary";
import { TermHandler } from "../src/handlers/term";
import { DefinitionHandler } from "../src/handlers/definition";
import { ImportExportHandler } from "../src/utils/import-export";

// Get database path from command line or use default
const dbPath = process.argv[2] || "./dictionary.db";

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

console.log(`Importing all example dictionaries to: ${dbPath}\n`);

// Get all JSON files in the dictionaries directory
const dictionariesDir = join(__dirname, "dictionaries");
const files = readdirSync(dictionariesDir).filter((f) => f.endsWith(".json"));

let totalTerms = 0;
let totalDefinitions = 0;
let successCount = 0;

for (const file of files) {
  try {
    const filePath = join(dictionariesDir, file);
    console.log(`Importing ${file}...`);

    const jsonData = readFileSync(filePath, "utf-8");
    const result = importExportHandler.importFromJson(jsonData);

    console.log(
      `  ✅ "${result.dictionary.name}" - ${result.termCount} terms, ${result.definitionCount} definitions`,
    );

    totalTerms += result.termCount;
    totalDefinitions += result.definitionCount;
    successCount++;
  } catch (error: any) {
    console.error(`  ❌ Failed to import ${file}: ${error.message}`);
  }
}

console.log(`\n🎉 Import complete!`);
console.log(`   - Dictionaries imported: ${successCount}/${files.length}`);
console.log(`   - Total terms: ${totalTerms}`);
console.log(`   - Total definitions: ${totalDefinitions}`);
console.log(`   - Database: ${dbPath}`);

dbConn.close();
