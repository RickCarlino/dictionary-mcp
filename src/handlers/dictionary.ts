import type { Dictionary } from "../types.js";
import { BaseHandler } from "./base.js";

interface DictionaryUpdate {
  name?: string;
  description?: string;
}

export class DictionaryHandler extends BaseHandler {
  create(name: string, description?: string): Dictionary {
    const id = this.generateId();
    const now = Date.now();

    this.execute(
      "INSERT INTO dictionaries (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      id,
      name,
      description || null,
      now,
      now,
    );

    return { id, name, description, created_at: now, updated_at: now };
  }

  list = (): Dictionary[] =>
    this.runQueryAll("SELECT * FROM dictionaries ORDER BY name");

  get = (id: string): Dictionary | null =>
    this.runQuery("SELECT * FROM dictionaries WHERE id = ?", id);

  getByName = (name: string): Dictionary | null =>
    this.runQuery("SELECT * FROM dictionaries WHERE name = ?", name);

  update(id: string, updates: DictionaryUpdate): Dictionary | null {
    if (!this.get(id)) return null;

    const fields = ["updated_at = ?"];
    const values: (string | number)[] = [Date.now()];

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) return;
      fields.push(`${key} = ?`);
      values.push(value);
    });

    this.execute(
      `UPDATE dictionaries SET ${fields.join(", ")} WHERE id = ?`,
      ...values,
      id,
    );

    return this.get(id);
  }

  delete = (id: string): boolean =>
    this.execute("DELETE FROM dictionaries WHERE id = ?", id).changes > 0;

  resolveReference = (ref: string): string | null => {
    const byId = this.get(ref);
    if (byId) return byId.id;

    const byName = this.getByName(ref);
    return byName ? byName.id : null;
  };
}
