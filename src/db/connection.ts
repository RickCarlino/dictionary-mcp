import { Database } from "bun:sqlite";
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema";
import { randomUUID } from "crypto";

export class DatabaseConnection {
  private db: Database;

  constructor(private dbPath: string = "./dictionary.db") {
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  }

  async initialize(): Promise<void> {
    this.db.exec(CREATE_TABLES_SQL);

    const version = this.db
      .prepare(
        "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
      )
      .get() as { version: number } | undefined;

    if (!version || version.version < SCHEMA_VERSION) {
      this.db
        .prepare(
          "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
        )
        .run(SCHEMA_VERSION, Date.now());
    }
  }

  getDb = () => this.db;
  close = () => this.db.close();
  generateId = () => randomUUID();
  normalizeText = (text: string) =>
    text.toLowerCase().trim().replace(/\s+/g, " ");

  transaction<T>(fn: () => T): T {
    const tx = this.db.transaction(fn);
    return tx();
  }
}
