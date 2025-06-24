import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseConnection } from "../src/db/connection";
import { DictionaryHandler } from "../src/handlers/dictionary";
import { TermHandler } from "../src/handlers/term";
import { TextHandler } from "../src/handlers/text";
import { unlinkSync, existsSync } from "fs";

describe("TextHandler", () => {
  let db: DatabaseConnection;
  let dictHandler: DictionaryHandler;
  let termHandler: TermHandler;
  let textHandler: TextHandler;
  let engDict: ReturnType<typeof dictHandler.create>;
  let finDict: ReturnType<typeof dictHandler.create>;
  const testDbPath = "./test-text.db";
  const cleanupDb = () => existsSync(testDbPath) && unlinkSync(testDbPath);

  beforeEach(async () => {
    cleanupDb();
    db = new DatabaseConnection(testDbPath);
    await db.initialize();
    const dbInstance = db.getDb();
    const generateId = db.generateId;
    const normalizeText = db.normalizeText;

    dictHandler = new DictionaryHandler(dbInstance, generateId, normalizeText);
    termHandler = new TermHandler(dbInstance, generateId, normalizeText);
    textHandler = new TextHandler(dbInstance, generateId, normalizeText);

    engDict = dictHandler.create("Engineering", "Technical terms");
    finDict = dictHandler.create("Finance", "Financial terms");

    termHandler.add(engDict.id, "API", "Application Programming Interface");
    termHandler.add(engDict.id, "QRS", "Quality Review System");
    termHandler.add(engDict.id, "CI/CD", "Continuous Integration/Deployment");
    termHandler.add(finDict.id, "QRS", "Quarterly Revenue Summary");
    termHandler.add(finDict.id, "ROI", "Return on Investment");
  });

  afterEach(() => {
    db.close();
    cleanupDb();
  });

  test("should find single term in text", () => {
    const results = textHandler.scan("The API is ready");

    expect(results).toHaveLength(1);
    expect(results[0].term).toBe("API");
    expect(results[0].position).toBe(4);
    expect(results[0].dictionary).toBe("Engineering");
    expect(results[0].definitions).toEqual([
      "Application Programming Interface",
    ]);
  });

  test("should find multiple terms in text", () => {
    const results = textHandler.scan("Update the QRS and check the API");

    expect(results).toHaveLength(3);
    expect(
      results.some((r) => r.term === "QRS" && r.dictionary === "Engineering"),
    ).toBe(true);
    expect(
      results.some((r) => r.term === "QRS" && r.dictionary === "Finance"),
    ).toBe(true);
    expect(results.some((r) => r.term === "API")).toBe(true);
  });

  test("should find terms from multiple dictionaries", () => {
    const results = textHandler.scan("The QRS report shows good ROI");

    expect(results).toHaveLength(3);
    const qrsResults = results.filter((r) => r.term === "QRS");
    const roiResults = results.filter((r) => r.term === "ROI");

    expect(qrsResults).toHaveLength(2);
    expect(roiResults).toHaveLength(1);
    expect(roiResults[0].dictionary).toBe("Finance");
  });

  test("should filter by dictionary IDs", () => {
    const results = textHandler.scan("Check QRS and API status", [engDict.id]);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.dictionary === "Engineering")).toBe(true);
  });

  test("should handle case-insensitive matching", () => {
    const results = textHandler.scan("The api and API are the same");

    expect(results).toHaveLength(2);
    expect(results[0].position).toBe(4);
    expect(results[1].position).toBe(12);
  });

  test("should handle terms with special characters", () => {
    const results = textHandler.scan("We use CI/CD for deployment");

    expect(results).toHaveLength(1);
    expect(results[0].term).toBe("CI/CD");
    expect(results[0].position).toBe(7);
  });

  test("should highlight terms in markdown format", () => {
    const highlighted = textHandler.highlight("The API is ready", "markdown");

    expect(highlighted).toBe("The **API** is ready");
  });

  test("should highlight terms in HTML format", () => {
    const highlighted = textHandler.highlight("The API is ready", "html");

    expect(highlighted).toBe(
      'The <span class="dictionary-term" title="Application Programming Interface">API</span> is ready',
    );
  });

  test("should highlight multiple terms", () => {
    const highlighted = textHandler.highlight(
      "Update QRS and check API",
      "markdown",
    );

    expect(highlighted).toBe("Update **QRS** and check **API**");
  });

  test("should return original text when no terms found", () => {
    const text = "No terms here";
    const highlighted = textHandler.highlight(text);

    expect(highlighted).toBe(text);
  });

  test("should handle overlapping terms correctly", () => {
    termHandler.add(engDict.id, "API Gateway", "API Gateway Service");

    const results = textHandler.scan("The API Gateway is configured");

    expect(results).toHaveLength(2);
    expect(results.some((r) => r.term === "API")).toBe(true);
    expect(results.some((r) => r.term === "API Gateway")).toBe(true);
  });

  test("should handle empty text", () => {
    const results = textHandler.scan("");

    expect(results).toHaveLength(0);
  });

  test("should handle text with no matches", () => {
    const results = textHandler.scan("This text has no dictionary terms");

    expect(results).toHaveLength(0);
  });

  test("should index unknown terms to dictionary", async () => {
    const result = await textHandler.index(
      "The microservices use GraphQL",
      engDict.id,
    );

    expect(result.termsAdded).toHaveLength(0);
  });

  test("should throw error for non-existent dictionary when indexing", async () => {
    await expect(
      textHandler.index("Some text", "NonExistentDict"),
    ).rejects.toThrow("Dictionary not found");
  });
});
