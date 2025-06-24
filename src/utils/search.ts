export interface SearchOptions {
  dictionaries?: string[];
  matchType?: "exact" | "fuzzy" | "prefix" | "contains";
  searchIn?: ("term" | "definition" | "context")[];
  limit?: number;
  offset?: number;
}

export class SearchEngine {
  constructor(private normalizeText: (text: string) => string) {}

  buildSearchQuery(
    query: string,
    options: SearchOptions = {},
  ): { sql: string; params: (string | number)[] } {
    const {
      dictionaries = [],
      matchType = "contains",
      searchIn = ["term"],
      limit = 100,
      offset = 0,
    } = options;

    const normalizedQuery = this.normalizeText(query);
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    const searchConditions: string[] = [];

    if (searchIn.includes("term")) {
      searchConditions.push(
        this.buildMatchCondition(
          "t.normalized_term",
          normalizedQuery,
          matchType,
          params,
        ),
      );
    }

    if (searchIn.includes("definition")) {
      searchConditions.push(
        this.buildMatchCondition(
          "LOWER(def.definition)",
          normalizedQuery,
          matchType,
          params,
        ),
      );
    }

    if (searchIn.includes("context")) {
      searchConditions.push(
        this.buildMatchCondition(
          "LOWER(def.context)",
          normalizedQuery,
          matchType,
          params,
        ),
      );
    }

    if (searchConditions.length > 0) {
      conditions.push(`(${searchConditions.join(" OR ")})`);
    }

    if (dictionaries.length > 0) {
      const placeholders = dictionaries.map(() => "?").join(", ");
      conditions.push(`d.id IN (${placeholders})`);
      params.push(...dictionaries);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT DISTINCT 
        t.id, t.dictionary_id, t.term, t.normalized_term, t.created_at, t.updated_at,
        d.id as dict_id, d.name as dict_name, d.description as dict_description,
        d.created_at as dict_created_at, d.updated_at as dict_updated_at
      FROM terms t
      JOIN dictionaries d ON t.dictionary_id = d.id
      ${searchIn.includes("definition") || searchIn.includes("context") ? "LEFT JOIN definitions def ON t.id = def.term_id" : ""}
      ${whereClause}
      ORDER BY t.term
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    return { sql, params };
  }

  private buildMatchCondition(
    column: string,
    query: string,
    matchType: string,
    params: (string | number)[],
  ): string {
    switch (matchType) {
      case "exact":
        params.push(query);
        return `${column} = ?`;

      case "prefix":
        params.push(`${query}%`);
        return `${column} LIKE ?`;

      case "fuzzy":
        const fuzzyPattern = query
          .split("")
          .map((c) => c)
          .join("%");
        params.push(`%${fuzzyPattern}%`);
        return `${column} LIKE ?`;

      case "contains":
      default:
        params.push(`%${query}%`);
        return `${column} LIKE ?`;
    }
  }

  calculateRelevanceScore(term: string, query: string): number {
    const normalizedTerm = this.normalizeText(term);
    const normalizedQuery = this.normalizeText(query);

    if (normalizedTerm === normalizedQuery) return 100;
    if (normalizedTerm.startsWith(normalizedQuery)) return 90;
    if (normalizedTerm.includes(normalizedQuery)) return 70;

    const termChars = normalizedTerm.split("");
    const queryChars = normalizedQuery.split("");
    let matches = 0;
    let queryIndex = 0;

    for (const char of termChars) {
      if (queryIndex < queryChars.length && char === queryChars[queryIndex]) {
        matches++;
        queryIndex++;
      }
    }

    return Math.floor((matches / queryChars.length) * 60);
  }
}
