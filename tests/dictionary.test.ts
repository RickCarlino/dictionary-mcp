import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseConnection } from "../src/db/connection";
import { DictionaryHandler } from "../src/handlers/dictionary";
import { unlinkSync, existsSync } from "fs";

describe("DictionaryHandler", () => {
  let db: DatabaseConnection;
  let handler: DictionaryHandler;
  const testDbPath = "./test-dictionary.db";
  const cleanupDb = () => existsSync(testDbPath) && unlinkSync(testDbPath);

  beforeEach(async () => {
    cleanupDb();
    db = new DatabaseConnection(testDbPath);
    await db.initialize();
    handler = new DictionaryHandler(
      db.getDb(),
      db.generateId,
      db.normalizeText,
    );
  });

  afterEach(() => {
    db.close();
    cleanupDb();
  });

  test("should create a dictionary", () => {
    const dict = handler.create("Engineering", "Technical terms");

    expect(dict.name).toBe("Engineering");
    expect(dict.description).toBe("Technical terms");
    expect(dict.id).toBeTruthy();
    expect(dict.created_at).toBeTruthy();
    expect(dict.updated_at).toBe(dict.created_at);
  });

  test("should list dictionaries", () => {
    handler.create("Engineering", "Technical terms");
    handler.create("Finance", "Financial terms");

    const list = handler.list();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("Engineering");
    expect(list[1].name).toBe("Finance");
  });

  test("should get dictionary by id", () => {
    const created = handler.create("Engineering", "Technical terms");
    const found = handler.get(created.id);

    expect(found).toEqual(created);
  });

  test("should get dictionary by name", () => {
    const created = handler.create("Engineering", "Technical terms");
    const found = handler.getByName("Engineering");

    expect(found).toEqual(created);
  });

  test("should update dictionary", () => {
    const created = handler.create("Engineering", "Technical terms");
    const updated = handler.update(created.id, {
      name: "Engineering Team",
      description: "Updated description",
    });

    expect(updated?.name).toBe("Engineering Team");
    expect(updated?.description).toBe("Updated description");
    expect(updated?.updated_at).toBeGreaterThan(created.updated_at);
  });

  test("should delete dictionary", () => {
    const created = handler.create("Engineering", "Technical terms");

    expect(handler.delete(created.id)).toBe(true);
    expect(handler.get(created.id)).toBeNull();
    expect(handler.delete(created.id)).toBe(false);
  });

  test("should resolve dictionary reference by id", () => {
    const created = handler.create("Engineering", "Technical terms");

    expect(handler.resolveReference(created.id)).toBe(created.id);
  });

  test("should resolve dictionary reference by name", () => {
    const created = handler.create("Engineering", "Technical terms");

    expect(handler.resolveReference("Engineering")).toBe(created.id);
  });

  test("should handle unique constraint on name", () => {
    handler.create("Engineering", "Technical terms");

    expect(() => {
      handler.create("Engineering", "Another description");
    }).toThrow();
  });
});
