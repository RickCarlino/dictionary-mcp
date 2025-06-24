import type { Definition } from "../types.js";
import { BaseHandler } from "./base.js";

export class DefinitionHandler extends BaseHandler {
  add(termRef: string, text: string, context?: string): Definition {
    const termId = this.resolveTermRef(termRef);
    if (!termId) throw new Error(`Term not found: ${termRef}`);

    const id = this.generateId();
    const now = Date.now();

    this.execute(
      "INSERT INTO definitions (id, term_id, definition, context, created_at) VALUES (?, ?, ?, ?, ?)",
      id,
      termId,
      text,
      context || null,
      now,
    );

    return { id, term_id: termId, definition: text, context, created_at: now };
  }

  get = (id: string): Definition | null =>
    this.runQuery("SELECT * FROM definitions WHERE id = ?", id);

  getByTerm(termRef: string): Definition[] {
    const termId = this.resolveTermRef(termRef);
    return termId
      ? this.runQueryAll(
          "SELECT * FROM definitions WHERE term_id = ? ORDER BY created_at",
          termId,
        )
      : [];
  }

  update(id: string, text: string): Definition | null {
    const existing = this.get(id);
    if (!existing) return null;

    this.execute(
      "UPDATE definitions SET definition = ? WHERE id = ?",
      text,
      id,
    );
    this.updateTermTimestamp(existing.term_id);

    return this.get(id);
  }

  delete(id: string): boolean {
    const existing = this.get(id);
    if (!existing) return false;

    const deleted =
      this.execute("DELETE FROM definitions WHERE id = ?", id).changes > 0;
    if (deleted) this.updateTermTimestamp(existing.term_id);

    return deleted;
  }

  updateContext(id: string, context: string): Definition | null {
    const existing = this.get(id);
    if (!existing) return null;

    this.execute(
      "UPDATE definitions SET context = ? WHERE id = ?",
      context,
      id,
    );
    if (existing.term_id) this.updateTermTimestamp(existing.term_id);

    return this.get(id);
  }

  private updateTermTimestamp = (termId: string) =>
    this.execute(
      "UPDATE terms SET updated_at = ? WHERE id = ?",
      Date.now(),
      termId,
    );

  private resolveTermRef(ref: string): string | null {
    const result = this.runQuery<{ id: string }>(
      "SELECT id FROM terms WHERE id = ? OR normalized_term = ? LIMIT 1",
      ref,
      this.normalizeText(ref),
    );
    return result?.id || null;
  }
}
