import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { rmSync } from "fs";
import { DatabaseConnection } from "../db/connection";
import { TermHandler } from "../handlers/term";
import { DictionaryHandler } from "../handlers/dictionary";
import { DefinitionHandler } from "../handlers/definition";
import type { SearchOptions } from "../utils/search";

describe("Search functionality", () => {
  let db: Database;
  let dbConn: DatabaseConnection;
  let termHandler: TermHandler;
  let dictHandler: DictionaryHandler;
  let defHandler: DefinitionHandler;
  const testDbPath = "./test-search.db";

  beforeEach(async () => {
    dbConn = new DatabaseConnection(testDbPath);
    await dbConn.initialize();
    db = dbConn.getDb();

    termHandler = new TermHandler(db, dbConn.generateId, dbConn.normalizeText);
    dictHandler = new DictionaryHandler(
      db,
      dbConn.generateId,
      dbConn.normalizeText,
    );
    defHandler = new DefinitionHandler(
      db,
      dbConn.generateId,
      dbConn.normalizeText,
    );

    // Set up test data
    const dict1 = dictHandler.create("Engineering", "Engineering terms");
    const dict2 = dictHandler.create("Finance", "Financial terms");

    // Engineering terms
    termHandler.add(dict1.id, "API", "Application Programming Interface");
    termHandler.add(
      dict1.id,
      "CI/CD",
      "Continuous Integration/Continuous Deployment",
    );
    termHandler.add(dict1.id, "REST", "Representational State Transfer");

    // Finance terms
    const roi = termHandler.add(dict2.id, "ROI", "Return on Investment");
    defHandler.add(
      "ROI",
      "Return on Investment - financial metric",
      "accounting",
    );

    termHandler.add(dict2.id, "API", "Annual Percentage Interest");
    termHandler.add(
      dict2.id,
      "EBITDA",
      "Earnings Before Interest, Taxes, Depreciation, and Amortization",
    );
  });

  afterEach(() => {
    dbConn.close();
    try {
      rmSync(testDbPath);
      rmSync(testDbPath + "-shm");
      rmSync(testDbPath + "-wal");
    } catch {}
  });

  describe("Basic search", () => {
    test("searches by term contains", () => {
      const results = termHandler.search("ap");
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.term).sort()).toEqual(["API", "API"]);
    });

    test("searches within specific dictionary", () => {
      const results = termHandler.search("API", "Engineering");
      expect(results).toHaveLength(1);
      expect(results[0]?.term).toBe("API");
      expect(results[0]?.dictionary.name).toBe("Engineering");
    });

    test("returns empty array for no matches", () => {
      const results = termHandler.search("xyz");
      expect(results).toHaveLength(0);
    });
  });

  describe("Advanced search", () => {
    test("exact match", () => {
      const results = termHandler.advancedSearch("api", { matchType: "exact" });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.normalized_term === "api")).toBe(true);
    });

    test("prefix match", () => {
      const results = termHandler.advancedSearch("ci", { matchType: "prefix" });
      expect(results).toHaveLength(1);
      expect(results[0]?.term).toBe("CI/CD");
    });

    test("fuzzy match", () => {
      const results = termHandler.advancedSearch("api", { matchType: "fuzzy" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.term === "API")).toBe(true);

      // Test fuzzy pattern matching - "ai" should match "API"
      const fuzzyResults = termHandler.advancedSearch("ai", {
        matchType: "fuzzy",
      });
      expect(fuzzyResults.length).toBeGreaterThan(0);
      expect(fuzzyResults.some((r) => r.term === "API")).toBe(true);
    });

    test("search in multiple dictionaries", () => {
      const results = termHandler.advancedSearch("api", {
        dictionaries: ["Engineering", "Finance"],
      });
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.dictionary.name).sort()).toEqual([
        "Engineering",
        "Finance",
      ]);
    });

    test("search by definition content", () => {
      const results = termHandler.advancedSearch("investment", {
        searchIn: ["definition"],
      });
      expect(results).toHaveLength(1);
      expect(results[0]?.term).toBe("ROI");
    });

    test("search in multiple fields", () => {
      const results = termHandler.advancedSearch("interest", {
        searchIn: ["term", "definition"],
      });
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.term).sort()).toEqual(["API", "EBITDA"]);
    });

    test("search by context", () => {
      const results = termHandler.advancedSearch("accounting", {
        searchIn: ["context"],
      });
      expect(results).toHaveLength(1);
      expect(results[0]?.term).toBe("ROI");
    });

    test("limit and offset", () => {
      const page1 = termHandler.advancedSearch("", { limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = termHandler.advancedSearch("", { limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = termHandler.advancedSearch("", { limit: 2, offset: 4 });
      expect(page3).toHaveLength(2);
    });

    test("combined filters", () => {
      const results = termHandler.advancedSearch("i", {
        dictionaries: ["Finance"],
        matchType: "contains",
        searchIn: ["term", "definition"],
        limit: 10,
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.dictionary.name === "Finance")).toBe(true);
    });
  });

  describe("Relevance scoring", () => {
    test("exact matches rank higher", () => {
      const results = termHandler.advancedSearch("api", { matchType: "fuzzy" });
      expect(results.length).toBeGreaterThan(0);
      // API should rank higher than other fuzzy matches
      expect(results[0]?.normalized_term).toBe("api");
    });

    test("prefix matches rank high", () => {
      termHandler.add("Engineering", "APIDOC", "API Documentation");
      termHandler.add("Engineering", "APIKEY", "API Key");

      const results = termHandler.advancedSearch("api", { matchType: "fuzzy" });
      const apiIndex = results.findIndex((r) => r.term === "API");
      const apidocIndex = results.findIndex((r) => r.term === "APIDOC");

      expect(apiIndex).toBeLessThan(apidocIndex);
    });
  });

  describe("Case insensitive search", () => {
    test("matches regardless of case", () => {
      const results1 = termHandler.search("API");
      const results2 = termHandler.search("api");
      const results3 = termHandler.search("Api");

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(2);
      expect(results3).toHaveLength(2);
    });
  });

  describe("Edge cases", () => {
    test("handles empty query", () => {
      const results = termHandler.advancedSearch("");
      expect(results.length).toBeGreaterThan(0);
    });

    test("handles special characters", () => {
      termHandler.add("Engineering", "C++", "C Plus Plus language");
      const results = termHandler.search("c++");
      expect(results).toHaveLength(1);
      expect(results[0]?.term).toBe("C++");
    });

    test("handles non-existent dictionary filter", () => {
      const results = termHandler.advancedSearch("api", {
        dictionaries: ["NonExistent"],
      });
      expect(results).toHaveLength(0);
    });

    test("handles mixed valid and invalid dictionaries", () => {
      const results = termHandler.advancedSearch("api", {
        dictionaries: ["Engineering", "NonExistent"],
      });
      expect(results).toHaveLength(1);
      expect(results[0]?.dictionary.name).toBe("Engineering");
    });
  });
});
