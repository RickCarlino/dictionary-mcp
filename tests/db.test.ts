import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseConnection } from "../src/db/connection";
import { unlinkSync, existsSync } from "fs";

describe("Database", () => {
  let db: DatabaseConnection;
  const testDbPath = "./test-dictionary.db";
  const cleanupDb = () => existsSync(testDbPath) && unlinkSync(testDbPath);

  beforeEach(async () => {
    cleanupDb();
    db = new DatabaseConnection(testDbPath);
    await db.initialize();
  });

  afterEach(() => {
    db.close();
    cleanupDb();
  });

  test("should create all required tables", () => {
    const tables = db
      .getDb()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as { name: string }[];

    expect(tables.map((t) => t.name).sort()).toEqual([
      "definitions",
      "dictionaries",
      "schema_version",
      "terms",
      "usage_stats",
    ]);
  });

  test("should set schema version", () => {
    const { version } = db
      .getDb()
      .prepare(
        "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
      )
      .get() as { version: number };

    expect(version).toBe(1);
  });

  test("should generate unique IDs", () => {
    const [id1, id2] = [db.generateId(), db.generateId()];
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("should normalize text correctly", () => {
    const cases = [
      ["  Hello   World  ", "hello world"],
      ["UPPERCASE", "uppercase"],
      ["multiple   spaces", "multiple spaces"],
    ];
    cases.forEach(([input, expected]) =>
      expect(db.normalizeText(input)).toBe(expected),
    );
  });

  test("foreign key constraints should work", () => {
    const database = db.getDb();
    const [dictId, termId] = [db.generateId(), db.generateId()];
    const now = Date.now();

    database
      .prepare(
        "INSERT INTO dictionaries (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
      )
      .run(dictId, "Test Dict", now, now);

    database
      .prepare(
        "INSERT INTO terms (id, dictionary_id, term, normalized_term, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(termId, dictId, "Test Term", "test term", now, now);

    database.prepare("DELETE FROM dictionaries WHERE id = ?").run(dictId);

    expect(
      database.prepare("SELECT * FROM terms WHERE id = ?").get(termId),
    ).toBeNull();
  });
});
