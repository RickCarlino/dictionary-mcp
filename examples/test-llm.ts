#!/usr/bin/env bun
import { DatabaseConnection } from "../src/db/connection";
import { DictionaryHandler } from "../src/handlers/dictionary";
import { TermHandler } from "../src/handlers/term";
import { DefinitionHandler } from "../src/handlers/definition";
import { TextHandler } from "../src/handlers/text";

// Test the LLM integration
async function testLLM() {
  const dbConn = new DatabaseConnection("./test-llm.db");
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
  const textHandler = new TextHandler(
    db,
    dbConn.generateId,
    dbConn.normalizeText,
  );

  try {
    // Create a test dictionary
    const dict = dictHandler.create("Tech Terms", "Technical terminology");
    console.log("Created dictionary:", dict.name);

    // Test text with technical terms
    const testText = `
      Our microservices architecture uses GraphQL for API queries.
      The DevOps team manages Kubernetes clusters for container orchestration.
      We implement OAuth2 for authentication and use JWT tokens.
      The CI/CD pipeline automatically deploys to staging after tests pass.
    `;

    console.log("\nAnalyzing text for unknown terms...");
    const result = await textHandler.index(testText, dict.id);

    console.log("\nResult:", JSON.stringify(result, null, 2));

    if (result.termsAdded.length > 0) {
      console.log("\nAdded terms to dictionary:");
      result.termsAdded.forEach((term) => {
        console.log(`  - ${term}`);
      });
    } else {
      console.log("\nNo new terms were identified by the LLM.");
    }

    // Show all terms in dictionary
    const allTerms = termHandler.getByDictionary(dict.id);
    console.log(`\nTotal terms in dictionary: ${allTerms.length}`);
  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    dbConn.close();
    // Clean up test database
    const fs = await import("fs");
    try {
      fs.rmSync("./test-llm.db");
      fs.rmSync("./test-llm.db-shm");
      fs.rmSync("./test-llm.db-wal");
    } catch {}
  }
}

testLLM();
