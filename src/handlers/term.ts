import type { Term, Definition, Dictionary } from "../types.js";
import { Database } from "bun:sqlite";
import { BaseHandler } from "./base.js";
import { SearchEngine, type SearchOptions } from "../utils/search.js";

interface TermWithDictionary {
  id: string;
  dictionary_id: string;
  term: string;
  normalized_term: string;
  created_at: number;
  updated_at: number;
  dict_id: string;
  dict_name: string;
  dict_description: string | null;
  dict_created_at: number;
  dict_updated_at: number;
}

type TermWithDetails = Term & {
  dictionary: Dictionary;
  definitions: Definition[];
};

export class TermHandler extends BaseHandler {
  private searchEngine: SearchEngine;

  constructor(
    db: Database,
    generateId: () => string,
    normalizeText: (text: string) => string,
  ) {
    super(db, generateId, normalizeText);
    this.searchEngine = new SearchEngine(normalizeText);
  }

  add(
    dictionaryRef: string,
    term: string,
    initialDefinition: string,
  ): Term & { definition: Definition } {
    const dictId = this.resolveDictionaryRef(dictionaryRef);
    if (!dictId) throw new Error(`Dictionary not found: ${dictionaryRef}`);

    const [termId, defId] = [this.generateId(), this.generateId()];
    const normalized = this.normalizeText(term);
    const now = Date.now();

    return this.db.transaction(() => {
      this.execute(
        "INSERT INTO terms (id, dictionary_id, term, normalized_term, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        termId,
        dictId,
        term,
        normalized,
        now,
        now,
      );

      this.execute(
        "INSERT INTO definitions (id, term_id, definition, created_at) VALUES (?, ?, ?, ?)",
        defId,
        termId,
        initialDefinition,
        now,
      );

      return {
        id: termId,
        dictionary_id: dictId,
        term,
        normalized_term: normalized,
        created_at: now,
        updated_at: now,
        definition: {
          id: defId,
          term_id: termId,
          definition: initialDefinition,
          context: undefined,
          created_at: now,
        },
      };
    })();
  }

  get(term: string): TermWithDetails[] {
    const terms = this.getTermsWithDictionary(
      "WHERE t.normalized_term = ?",
      this.normalizeText(term),
    );
    return this.enrichWithDefinitions(terms);
  }

  search(query: string, dictionaryRef?: string): TermWithDetails[] {
    const params: (string | number | null)[] = [
      `%${this.normalizeText(query)}%`,
    ];
    let whereClause = "WHERE t.normalized_term LIKE ?";

    if (!dictionaryRef) {
      const terms = this.getTermsWithDictionary(whereClause, ...params);
      return this.enrichWithDefinitions(terms);
    }

    const dictId = this.resolveDictionaryRef(dictionaryRef);
    if (!dictId) return [];

    whereClause += " AND t.dictionary_id = ?";
    params.push(dictId);

    const terms = this.getTermsWithDictionary(whereClause, ...params);
    return this.enrichWithDefinitions(terms);
  }

  advancedSearch(
    query: string,
    options: SearchOptions = {},
  ): TermWithDetails[] {
    if (options.dictionaries && options.dictionaries.length > 0) {
      const resolvedDictionaries = options.dictionaries
        .map((ref) => this.resolveDictionaryRef(ref))
        .filter((id): id is string => id !== null);

      if (resolvedDictionaries.length === 0) return [];

      options.dictionaries = resolvedDictionaries;
    }

    const { sql, params } = this.searchEngine.buildSearchQuery(query, options);
    const terms = this.runQueryAll<TermWithDictionary>(sql, ...params);

    if (options.matchType === "fuzzy" || !options.matchType) {
      terms.sort((a, b) => {
        const scoreA = this.searchEngine.calculateRelevanceScore(a.term, query);
        const scoreB = this.searchEngine.calculateRelevanceScore(b.term, query);
        return scoreB - scoreA;
      });
    }

    return this.enrichWithDefinitions(terms);
  }

  update(id: string, term: string): Term | null {
    if (!this.runQuery<Term>("SELECT * FROM terms WHERE id = ?", id))
      return null;

    this.execute(
      "UPDATE terms SET term = ?, normalized_term = ?, updated_at = ? WHERE id = ?",
      term,
      this.normalizeText(term),
      Date.now(),
      id,
    );

    return this.runQuery("SELECT * FROM terms WHERE id = ?", id);
  }

  delete = (id: string): boolean =>
    this.execute("DELETE FROM terms WHERE id = ?", id).changes > 0;

  getByDictionary(dictionaryId: string): Term[] {
    return this.runQueryAll(
      "SELECT * FROM terms WHERE dictionary_id = ? ORDER BY term",
      dictionaryId,
    );
  }

  private getTermsWithDictionary(
    whereClause: string,
    ...params: (string | number | null)[]
  ): TermWithDictionary[] {
    return this.runQueryAll(
      `
      SELECT t.*, d.id as dict_id, d.name as dict_name, d.description as dict_description,
             d.created_at as dict_created_at, d.updated_at as dict_updated_at
      FROM terms t
      JOIN dictionaries d ON t.dictionary_id = d.id
      ${whereClause}
      ORDER BY t.term
    `,
      ...params,
    );
  }

  private enrichWithDefinitions(
    terms: TermWithDictionary[],
  ): TermWithDetails[] {
    return terms.map((row) => ({
      id: row.id,
      dictionary_id: row.dictionary_id,
      term: row.term,
      normalized_term: row.normalized_term,
      created_at: row.created_at,
      updated_at: row.updated_at,
      dictionary: {
        id: row.dict_id,
        name: row.dict_name,
        description: row.dict_description ?? undefined,
        created_at: row.dict_created_at,
        updated_at: row.dict_updated_at,
      },
      definitions: this.runQueryAll(
        "SELECT * FROM definitions WHERE term_id = ? ORDER BY created_at",
        row.id,
      ),
    }));
  }

  private resolveDictionaryRef(ref: string): string | null {
    const result = this.runQuery<{ id: string }>(
      "SELECT id FROM dictionaries WHERE id = ? OR name = ? LIMIT 1",
      ref,
      ref,
    );
    return result?.id || null;
  }
}
