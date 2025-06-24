import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseConnection } from "../src/db/connection";
import { DictionaryHandler } from "../src/handlers/dictionary";
import { TermHandler } from "../src/handlers/term";
import { unlinkSync, existsSync } from "fs";

describe("TermHandler", () => {
  let db: DatabaseConnection;
  let dictHandler: DictionaryHandler;
  let termHandler: TermHandler;
  let testDict: ReturnType<typeof dictHandler.create>;
  const testDbPath = "./test-term.db";
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
    testDict = dictHandler.create("Test Dictionary", "Test description");
  });

  afterEach(() => {
    db.close();
    cleanupDb();
  });

  test("should add a term with initial definition", () => {
    const result = termHandler.add(
      "Test Dictionary",
      "API",
      "Application Programming Interface",
    );

    expect(result.term).toBe("API");
    expect(result.normalized_term).toBe("api");
    expect(result.dictionary_id).toBe(testDict.id);
    expect(result.definition.definition).toBe(
      "Application Programming Interface",
    );
  });

  test("should add term by dictionary ID", () => {
    const result = termHandler.add(
      testDict.id,
      "API",
      "Application Programming Interface",
    );

    expect(result.term).toBe("API");
    expect(result.dictionary_id).toBe(testDict.id);
  });

  test("should get terms by normalized name", () => {
    termHandler.add(
      "Test Dictionary",
      "API",
      "Application Programming Interface",
    );
    const dict2 = dictHandler.create("Another Dict", "Another description");
    termHandler.add(dict2.id, "api", "Another definition");

    const results = termHandler.get("API");

    expect(results).toHaveLength(2);

    const testDictResult = results.find(
      (r) => r.dictionary.name === "Test Dictionary",
    );
    const anotherDictResult = results.find(
      (r) => r.dictionary.name === "Another Dict",
    );

    expect(testDictResult?.term).toBe("API");
    expect(testDictResult?.definitions).toHaveLength(1);
    expect(anotherDictResult?.term).toBe("api");
    expect(anotherDictResult?.definitions).toHaveLength(1);
  });

  test("should search terms with pattern", () => {
    termHandler.add(
      "Test Dictionary",
      "API",
      "Application Programming Interface",
    );
    termHandler.add("Test Dictionary", "REST API", "RESTful API");
    termHandler.add("Test Dictionary", "GraphQL", "Graph Query Language");

    const results = termHandler.search("api");

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.term).sort()).toEqual(["API", "REST API"]);
  });

  test("should search terms in specific dictionary", () => {
    termHandler.add(
      "Test Dictionary",
      "API",
      "Application Programming Interface",
    );
    const dict2 = dictHandler.create("Another Dict", "Another description");
    termHandler.add(dict2.id, "API Gateway", "API Gateway service");

    const results = termHandler.search("api", "Test Dictionary");

    expect(results).toHaveLength(1);
    expect(results[0].term).toBe("API");
  });

  test("should update term", () => {
    const created = termHandler.add(
      "Test Dictionary",
      "API",
      "Application Programming Interface",
    );
    const updated = termHandler.update(created.id, "APIs");

    expect(updated?.term).toBe("APIs");
    expect(updated?.normalized_term).toBe("apis");
    expect(updated?.updated_at).toBeGreaterThan(created.updated_at);
  });

  test("should delete term", () => {
    const created = termHandler.add(
      "Test Dictionary",
      "API",
      "Application Programming Interface",
    );

    expect(termHandler.delete(created.id)).toBe(true);
    expect(termHandler.get("API")).toHaveLength(0);
  });

  test("should handle unique constraint on normalized term per dictionary", () => {
    termHandler.add(
      "Test Dictionary",
      "API",
      "Application Programming Interface",
    );

    expect(() => {
      termHandler.add("Test Dictionary", "api", "Another definition");
    }).toThrow();
  });

  test("should allow same term in different dictionaries", () => {
    termHandler.add(
      "Test Dictionary",
      "API",
      "Application Programming Interface",
    );
    const dict2 = dictHandler.create("Another Dict", "Another description");

    expect(() => {
      termHandler.add(dict2.id, "API", "Another definition");
    }).not.toThrow();
  });

  test("should throw error for non-existent dictionary", () => {
    expect(() => {
      termHandler.add("Non-existent", "API", "Definition");
    }).toThrow("Dictionary not found");
  });
});
