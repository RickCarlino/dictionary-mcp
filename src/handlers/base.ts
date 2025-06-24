import { Database } from "bun:sqlite";

type QueryParam = string | number | boolean | null;

export abstract class BaseHandler {
  constructor(
    protected db: Database,
    protected generateId: () => string,
    protected normalizeText: (text: string) => string,
  ) {}

  protected runQuery<T>(sql: string, ...params: QueryParam[]): T | null {
    return this.db.prepare(sql).get(...params) as T | null;
  }

  protected runQueryAll<T>(sql: string, ...params: QueryParam[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  protected execute(sql: string, ...params: QueryParam[]): { changes: number } {
    return this.db.prepare(sql).run(...params);
  }

  protected exists(table: string, field: string, value: string): boolean {
    const result = this.runQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${table} WHERE ${field} = ?`,
      value,
    );
    return (result?.count ?? 0) > 0;
  }
}
