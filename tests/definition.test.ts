import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseConnection } from "../src/db/connection";
import { DictionaryHandler } from "../src/handlers/dictionary";
import { TermHandler } from "../src/handlers/term";
import { DefinitionHandler } from "../src/handlers/definition";
import { unlinkSync, existsSync } from "fs";

describe("DefinitionHandler", () => {
  let db: DatabaseConnection;
  let dictHandler: DictionaryHandler;
  let termHandler: TermHandler;
  let defHandler: DefinitionHandler;
  let testDict: ReturnType<typeof dictHandler.create>;
  let testTerm: ReturnType<typeof termHandler.add>;
  const testDbPath = "./test-definition.db";
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
    defHandler = new DefinitionHandler(dbInstance, generateId, normalizeText);

    testDict = dictHandler.create("Test Dictionary", "Test description");
    testTerm = termHandler.add(testDict.id, "API", "Initial definition");
  });

  afterEach(() => {
    db.close();
    cleanupDb();
  });

  test("should add definition to term by ID", () => {
    const def = defHandler.add(
      testTerm.id,
      "Application Programming Interface",
      "Technical",
    );

    expect(def.definition).toBe("Application Programming Interface");
    expect(def.context).toBe("Technical");
    expect(def.term_id).toBe(testTerm.id);
  });

  test("should add definition to term by text", () => {
    const def = defHandler.add("API", "Another definition");

    expect(def.definition).toBe("Another definition");
    expect(def.term_id).toBe(testTerm.id);
    expect(def.context).toBeUndefined();
  });

  test("should get definition by ID", () => {
    const created = defHandler.add(testTerm.id, "Test definition");
    const found = defHandler.get(created.id);

    expect(found?.id).toBe(created.id);
    expect(found?.definition).toBe(created.definition);
    expect(found?.term_id).toBe(created.term_id);
  });

  test("should get all definitions for a term", () => {
    defHandler.add("API", "Definition 1");
    defHandler.add("API", "Definition 2", "Context 2");
    defHandler.add("API", "Definition 3");

    const definitions = defHandler.getByTerm("API");

    expect(definitions).toHaveLength(4);
    expect(definitions[0].definition).toBe("Initial definition");
    expect(definitions[1].definition).toBe("Definition 1");
    expect(definitions[2].definition).toBe("Definition 2");
    expect(definitions[2].context).toBe("Context 2");
  });

  test("should update definition", () => {
    const created = defHandler.add("API", "Old definition");
    const updated = defHandler.update(created.id, "New definition");

    expect(updated?.definition).toBe("New definition");
    expect(updated?.id).toBe(created.id);
  });

  test("should update term timestamp when definition is updated", () => {
    const originalTermTime = testTerm.updated_at;
    const def = defHandler.add("API", "Test definition");

    Bun.sleepSync(10);

    defHandler.update(def.id, "Updated definition");

    const updatedTerm = db
      .getDb()
      .prepare("SELECT updated_at FROM terms WHERE id = ?")
      .get(testTerm.id) as { updated_at: number };

    expect(updatedTerm.updated_at).toBeGreaterThan(originalTermTime);
  });

  test("should delete definition", () => {
    const created = defHandler.add("API", "Test definition");

    expect(defHandler.delete(created.id)).toBe(true);
    expect(defHandler.get(created.id)).toBeNull();
    expect(defHandler.delete(created.id)).toBe(false);
  });

  test("should update term timestamp when definition is deleted", () => {
    const def = defHandler.add("API", "Test definition");
    const originalTermTime = testTerm.updated_at;

    Bun.sleepSync(10);

    defHandler.delete(def.id);

    const updatedTerm = db
      .getDb()
      .prepare("SELECT updated_at FROM terms WHERE id = ?")
      .get(testTerm.id) as { updated_at: number };

    expect(updatedTerm.updated_at).toBeGreaterThan(originalTermTime);
  });

  test("should throw error for non-existent term", () => {
    expect(() => {
      defHandler.add("NonExistentTerm", "Definition");
    }).toThrow("Term not found");
  });

  test("should cascade delete when term is deleted", () => {
    const def1 = defHandler.add("API", "Definition 1");
    const def2 = defHandler.add("API", "Definition 2");

    termHandler.delete(testTerm.id);

    expect(defHandler.get(def1.id)).toBeNull();
    expect(defHandler.get(def2.id)).toBeNull();
  });
});
