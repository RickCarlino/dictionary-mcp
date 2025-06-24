import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DictionaryServer } from "../src/server";
import { unlinkSync, existsSync } from "fs";

describe("Integration Tests", () => {
  let server: DictionaryServer;
  const testDbPath = "./test-integration.db";
  const cleanupDb = () => existsSync(testDbPath) && unlinkSync(testDbPath);

  beforeEach(async () => {
    cleanupDb();
    process.env.DATABASE_PATH = testDbPath;
    server = new DictionaryServer();
    await server.initialize();
  });

  afterEach(() => {
    server.close();
    cleanupDb();
    delete process.env.DATABASE_PATH;
  });

  test("dictionary CRUD operations work end-to-end", async () => {
    const handler = (server as any).dictHandler;

    const created = handler.create("Test Dict", "Test description");
    expect(created.name).toBe("Test Dict");

    const list = handler.list();
    expect(list).toHaveLength(1);

    const found = handler.get(created.id);
    expect(found).toEqual(created);

    const updated = handler.update(created.id, { name: "Updated Dict" });
    expect(updated?.name).toBe("Updated Dict");

    const deleted = handler.delete(created.id);
    expect(deleted).toBe(true);

    const finalList = handler.list();
    expect(finalList).toHaveLength(0);
  });
});
