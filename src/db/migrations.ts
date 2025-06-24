import { Database } from "bun:sqlite";
import { DROP_TABLES_SQL } from "./schema";

interface Migration {
  version: number;
  description: string;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: "Initial schema",
    up: () => {},
    down: (db) => db.exec(DROP_TABLES_SQL),
  },
];

export async function runMigrations(
  db: Database,
  targetVersion?: number,
): Promise<void> {
  const { version: currentVersion } = db
    .prepare("SELECT COALESCE(MAX(version), 0) as version FROM schema_version")
    .get() as { version: number };

  const target = targetVersion ?? Math.max(...migrations.map((m) => m.version));

  if (currentVersion === target) return;

  db.transaction(() => {
    const migrationsToRun =
      currentVersion < target
        ? migrations.filter(
            (m) => m.version > currentVersion && m.version <= target,
          )
        : [...migrations]
            .reverse()
            .filter((m) => m.version <= currentVersion && m.version > target);

    migrationsToRun.forEach((migration) => {
      if (currentVersion < target) {
        migration.up(db);
        db.prepare(
          "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
        ).run(migration.version, Date.now());
      } else {
        migration.down(db);
        db.prepare("DELETE FROM schema_version WHERE version = ?").run(
          migration.version,
        );
      }
    });
  })();
}
