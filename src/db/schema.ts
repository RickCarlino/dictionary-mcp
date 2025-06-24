export const SCHEMA_VERSION = 1;

const tables = {
  dictionaries: `
    CREATE TABLE IF NOT EXISTS dictionaries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  terms: `
    CREATE TABLE IF NOT EXISTS terms (
      id TEXT PRIMARY KEY,
      dictionary_id TEXT NOT NULL,
      term TEXT NOT NULL,
      normalized_term TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (dictionary_id) REFERENCES dictionaries(id) ON DELETE CASCADE,
      UNIQUE(dictionary_id, normalized_term)
    )`,
  definitions: `
    CREATE TABLE IF NOT EXISTS definitions (
      id TEXT PRIMARY KEY,
      term_id TEXT NOT NULL,
      definition TEXT NOT NULL,
      context TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
    )`,
  usage_stats: `
    CREATE TABLE IF NOT EXISTS usage_stats (
      id TEXT PRIMARY KEY,
      term_id TEXT NOT NULL,
      lookup_count INTEGER DEFAULT 0,
      last_accessed INTEGER,
      FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
      UNIQUE(term_id)
    )`,
  schema_version: `
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )`,
};

const indexes = [
  "CREATE INDEX IF NOT EXISTS idx_terms_normalized ON terms(normalized_term)",
  "CREATE INDEX IF NOT EXISTS idx_terms_dictionary ON terms(dictionary_id)",
  "CREATE INDEX IF NOT EXISTS idx_definitions_term ON definitions(term_id)",
  "CREATE INDEX IF NOT EXISTS idx_usage_stats_term ON usage_stats(term_id)",
];

export const CREATE_TABLES_SQL =
  [...Object.values(tables), ...indexes].join(";\n") + ";";

export const DROP_TABLES_SQL =
  ["usage_stats", "definitions", "terms", "dictionaries", "schema_version"]
    .map((table) => `DROP TABLE IF EXISTS ${table}`)
    .join(";\n") + ";";
