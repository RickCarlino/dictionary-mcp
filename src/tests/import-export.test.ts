import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { rmSync } from "fs";
import { DatabaseConnection } from "../db/connection";
import { DictionaryHandler } from "../handlers/dictionary";
import { TermHandler } from "../handlers/term";
import { DefinitionHandler } from "../handlers/definition";
import { ImportExportHandler } from "../utils/import-export";

describe("Import/Export functionality", () => {
  let db: Database;
  let dbConn: DatabaseConnection;
  let dictHandler: DictionaryHandler;
  let termHandler: TermHandler;
  let defHandler: DefinitionHandler;
  let importExportHandler: ImportExportHandler;
  const testDbPath = "./test-import-export.db";

  beforeEach(async () => {
    dbConn = new DatabaseConnection(testDbPath);
    await dbConn.initialize();
    db = dbConn.getDb();

    dictHandler = new DictionaryHandler(
      db,
      dbConn.generateId,
      dbConn.normalizeText,
    );
    termHandler = new TermHandler(db, dbConn.generateId, dbConn.normalizeText);
    defHandler = new DefinitionHandler(
      db,
      dbConn.generateId,
      dbConn.normalizeText,
    );
    importExportHandler = new ImportExportHandler(
      dictHandler,
      termHandler,
      defHandler,
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

  describe("JSON Export", () => {
    test("exports dictionary with terms and definitions", () => {
      const dict = dictHandler.create("Test Dict", "Test description");
      const term1 = termHandler.add(
        dict.id,
        "API",
        "Application Programming Interface",
      );
      const term2 = termHandler.add(
        dict.id,
        "REST",
        "Representational State Transfer",
      );
      defHandler.add(term1.id, "Advanced Programming Interface", "technical");

      const jsonData = importExportHandler.exportToJson(dict.id);
      const exported = JSON.parse(jsonData);

      expect(exported.name).toBe("Test Dict");
      expect(exported.description).toBe("Test description");
      expect(exported.terms).toHaveLength(2);

      const apiTerm = exported.terms.find((t: any) => t.term === "API");
      expect(apiTerm).toBeDefined();
      expect(apiTerm.definitions).toHaveLength(2);
      expect(apiTerm.definitions[0].definition).toBe(
        "Application Programming Interface",
      );
      expect(apiTerm.definitions[1].definition).toBe(
        "Advanced Programming Interface",
      );
      expect(apiTerm.definitions[1].context).toBe("technical");
    });

    test("throws error for non-existent dictionary", () => {
      expect(() => {
        importExportHandler.exportToJson("non-existent-id");
      }).toThrow("Dictionary not found");
    });

    test("exports empty dictionary", () => {
      const dict = dictHandler.create("Empty Dict");
      const jsonData = importExportHandler.exportToJson(dict.id);
      const exported = JSON.parse(jsonData);

      expect(exported.name).toBe("Empty Dict");
      expect(exported.terms).toHaveLength(0);
    });
  });

  describe("JSON Import", () => {
    test("imports dictionary with terms and definitions", () => {
      const importData = {
        name: "Imported Dict",
        description: "Imported description",
        terms: [
          {
            term: "CPU",
            definitions: [
              { definition: "Central Processing Unit" },
              {
                definition: "Computer Processing Unit",
                context: "alternative",
              },
            ],
          },
          {
            term: "RAM",
            definitions: [{ definition: "Random Access Memory" }],
          },
        ],
      };

      const result = importExportHandler.importFromJson(
        JSON.stringify(importData),
      );

      expect(result.dictionary.name).toBe("Imported Dict");
      expect(result.dictionary.description).toBe("Imported description");
      expect(result.termCount).toBe(2);
      expect(result.definitionCount).toBe(3);

      // Verify imported data
      const terms = termHandler.get("CPU");
      expect(terms).toHaveLength(1);
      expect(terms[0]?.definitions).toHaveLength(2);
      expect(terms[0]?.definitions?.[1]?.context).toBe("alternative");
    });

    test("throws error for invalid JSON", () => {
      expect(() => {
        importExportHandler.importFromJson("invalid json");
      }).toThrow("Invalid JSON format");
    });

    test("throws error for invalid data structure", () => {
      expect(() => {
        importExportHandler.importFromJson('{"invalid": "structure"}');
      }).toThrow("Invalid import data structure");
    });

    test("skips invalid terms", () => {
      const importData = {
        name: "Test Dict",
        terms: [
          { term: "Valid", definitions: [{ definition: "Valid def" }] },
          { term: "NoDefinitions", definitions: [] },
          { term: "", definitions: [{ definition: "Empty term" }] },
          { definitions: [{ definition: "No term" }] },
        ],
      };

      const result = importExportHandler.importFromJson(
        JSON.stringify(importData),
      );
      expect(result.termCount).toBe(1);
      expect(result.definitionCount).toBe(1);
    });
  });

  describe("CSV Export", () => {
    test("exports dictionary to CSV format", () => {
      const dict = dictHandler.create("CSV Dict", "CSV description");
      const term1 = termHandler.add(
        dict.id,
        "HTTP",
        "Hypertext Transfer Protocol",
      );
      const term2 = termHandler.add(dict.id, "URL", "Uniform Resource Locator");
      defHandler.add(term1.id, "Web protocol", "web");

      const csvData = importExportHandler.exportToCsv(dict.id);
      const lines = csvData.split("\n");

      expect(lines[0]).toBe(
        "dictionary_name,dictionary_description,term,definition,context",
      );
      expect(lines).toHaveLength(4); // header + 3 definitions
      expect(lines[1]).toContain("CSV Dict");
      expect(lines[1]).toContain("HTTP");
      expect(lines[1]).toContain("Hypertext Transfer Protocol");
    });

    test("handles special characters in CSV", () => {
      const dict = dictHandler.create(
        "Dict, with comma",
        'Description with "quotes"',
      );
      termHandler.add(dict.id, "Term, with comma", "Definition with\nnewline");

      const csvData = importExportHandler.exportToCsv(dict.id);

      expect(csvData).toContain('"Dict, with comma"');
      expect(csvData).toContain('"Description with ""quotes"""');
      expect(csvData).toContain('"Term, with comma"');
      expect(csvData).toContain('"Definition with\nnewline"');

      // Verify the CSV can be parsed back correctly
      const result = importExportHandler.importFromCsv(csvData);
      expect(result.dictionaries[0]?.name).toBe("Dict, with comma");
      const terms = termHandler.get("Term, with comma");
      expect(terms[0]?.definitions?.[0]?.definition).toBe(
        "Definition with\nnewline",
      );
    });
  });

  describe("CSV Import", () => {
    test("imports dictionary from CSV format", () => {
      const csvData = `dictionary_name,dictionary_description,term,definition,context
Tech Terms,Technical terminology,API,Application Programming Interface,
Tech Terms,Technical terminology,API,Advanced Programming Interface,development
Tech Terms,Technical terminology,REST,Representational State Transfer,web
Finance Terms,Financial terminology,ROI,Return on Investment,accounting`;

      const result = importExportHandler.importFromCsv(csvData);

      expect(result.dictionaries).toHaveLength(2);
      expect(result.termCount).toBe(3);
      expect(result.definitionCount).toBe(4);

      const techDict = result.dictionaries.find((d) => d.name === "Tech Terms");
      expect(techDict?.description).toBe("Technical terminology");

      const apiTerms = termHandler.get("API");
      expect(apiTerms).toHaveLength(1); // Only in Tech Terms
      expect(apiTerms[0]?.definitions).toHaveLength(2); // Two definitions for API
    });

    test("handles CSV with special characters", () => {
      const csvData = `dictionary_name,dictionary_description,term,definition,context
"Dict, with comma","Description with ""quotes""","Term, with comma","Definition with
newline",context`;

      const result = importExportHandler.importFromCsv(csvData);

      expect(result.dictionaries[0]?.name).toBe("Dict, with comma");
      expect(result.dictionaries[0]?.description).toBe(
        'Description with "quotes"',
      );

      const terms = termHandler.get("Term, with comma");
      expect(terms).toHaveLength(1);
      expect(terms[0]?.definitions?.[0]?.definition).toBe(
        "Definition with\nnewline",
      );
    });

    test("throws error for empty CSV", () => {
      expect(() => {
        importExportHandler.importFromCsv("");
      }).toThrow("CSV must have header and at least one data row");
    });

    test("skips invalid rows", () => {
      const csvData = `dictionary_name,dictionary_description,term,definition,context
Valid Dict,Description,Term,Definition,
Invalid,Row,Missing
Another,Valid,Row,Definition,context`;

      const result = importExportHandler.importFromCsv(csvData);
      expect(result.termCount).toBe(2);
      expect(result.definitionCount).toBe(2);
    });
  });

  describe("Round-trip conversion", () => {
    test("JSON export/import preserves data", () => {
      // Create original data
      const dict = dictHandler.create("Original", "Original description");
      const term1 = termHandler.add(dict.id, "Term1", "Definition1");
      defHandler.add(term1.id, "Definition2", "context1");
      const term2 = termHandler.add(dict.id, "Term2", "Definition3");

      // Export to JSON
      const jsonData = importExportHandler.exportToJson(dict.id);

      // Clear database
      dictHandler.delete(dict.id);

      // Import from JSON
      const result = importExportHandler.importFromJson(jsonData);

      // Verify
      expect(result.dictionary.name).toBe("Original");
      expect(result.dictionary.description).toBe("Original description");
      expect(result.termCount).toBe(2);
      expect(result.definitionCount).toBe(3);

      const terms = termHandler.get("Term1");
      expect(terms[0]?.definitions).toHaveLength(2);
      expect(terms[0]?.definitions?.[1]?.context).toBe("context1");
    });

    test("CSV export/import preserves essential data", () => {
      // Create original data
      const dict = dictHandler.create("CSV Test", "CSV description");
      termHandler.add(dict.id, "Term1", "Definition1");
      termHandler.add(dict.id, "Term2", "Definition2");

      // Export to CSV
      const csvData = importExportHandler.exportToCsv(dict.id);

      // Clear database
      dictHandler.delete(dict.id);

      // Import from CSV
      const result = importExportHandler.importFromCsv(csvData);

      // Verify
      expect(result.dictionaries[0]?.name).toBe("CSV Test");
      expect(result.dictionaries[0]?.description).toBe("CSV description");
      expect(result.termCount).toBe(2);
      expect(result.definitionCount).toBe(2);
    });
  });
});
