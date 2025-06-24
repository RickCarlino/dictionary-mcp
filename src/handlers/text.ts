import type {
  TextScanResult,
  TextIndexResult,
  HighlightFormat,
} from "../types.js";
import { Database } from "bun:sqlite";
import { BaseHandler } from "./base.js";
import { LLMClient } from "../utils/llm-client.js";

interface TermMatch {
  term: string;
  termId: string;
  position: number;
  length: number;
  dictionary: string;
  dictionaryId: string;
  definitions: string[];
}

interface TermRow {
  id: string;
  term: string;
  normalized_term: string;
  dictionary_id: string;
  dictionary_name: string;
}

export class TextHandler extends BaseHandler {
  private llmClient: LLMClient;

  constructor(
    db: Database,
    generateId: () => string,
    normalizeText: (text: string) => string,
  ) {
    super(db, generateId, normalizeText);
    this.llmClient = new LLMClient();
  }

  scan = (text: string, dictionaryIds?: string[]): TextScanResult[] =>
    this.findMatches(text, dictionaryIds).map(
      ({ term, position, dictionary, definitions }) => ({
        term,
        position,
        dictionary,
        definitions,
      }),
    );

  highlight(text: string, format: HighlightFormat = "markdown"): string {
    const matches = this.findMatches(text);
    if (!matches.length) return text;

    const uniqueMatches = new Map<number, TermMatch>();
    matches.forEach((match) => {
      const existing = uniqueMatches.get(match.position);
      if (!existing || match.length > existing.length) {
        uniqueMatches.set(match.position, match);
      }
    });

    return Array.from(uniqueMatches.values())
      .sort((a, b) => b.position - a.position)
      .reduce((result, match) => {
        const before = result.slice(0, match.position);
        const term = result.slice(
          match.position,
          match.position + match.length,
        );
        const after = result.slice(match.position + match.length);

        const highlighted =
          format === "html"
            ? `<span class="dictionary-term" title="${match.definitions[0]}">${term}</span>`
            : `**${term}**`;

        return before + highlighted + after;
      }, text);
  }

  async index(
    text: string,
    dictionaryId: string,
    customPrompt?: string,
  ): Promise<TextIndexResult> {
    const dictId = this.resolveDictionaryRef(dictionaryId);
    if (!dictId) throw new Error(`Dictionary not found: ${dictionaryId}`);

    const existingTerms = this.scan(text, [dictId]);
    const existingNormalized = new Set(
      this.getAllTerms([dictId]).map((t) => this.normalizeText(t.term)),
    );

    const prompt = customPrompt || this.buildDefaultPrompt(text);
    const suggestedTerms = await this.callLLM(prompt);
    const termsAdded = this.addNewTerms(
      suggestedTerms,
      dictId,
      existingNormalized,
    );

    return {
      existingTerms,
      termsAdded,
      llmUsed: this.llmClient.isConfigured(),
    };
  }

  private buildDefaultPrompt(text: string): string {
    return `Analyze the following text and identify technical terms, acronyms, jargon, or specialized vocabulary that might need definitions. Return ONLY a JSON array of strings, with each string being a term that should be added to a dictionary. Do not include common words or terms that are self-explanatory.

Text to analyze:
${text}

Example response: ["API", "REST", "microservices", "CI/CD"]`;
  }

  private async callLLM(prompt: string): Promise<string[]> {
    if (!this.llmClient.isConfigured()) return [];

    try {
      const response = await this.llmClient.complete(prompt);

      try {
        const terms = JSON.parse(response.content);
        if (Array.isArray(terms) && terms.every((t) => typeof t === "string")) {
          return terms;
        }
        return [];
      } catch {
        return [];
      }
    } catch {
      return [];
    }
  }

  private addNewTerms(
    terms: string[],
    dictId: string,
    existingNormalized: Set<string>,
  ): string[] {
    const created: string[] = [];
    const now = Date.now();

    this.db.transaction(() => {
      terms.forEach((term) => {
        const normalized = this.normalizeText(term);

        if (existingNormalized.has(normalized)) return;

        try {
          this.execute(
            "INSERT INTO terms (id, dictionary_id, term, normalized_term, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            this.generateId(),
            dictId,
            term,
            normalized,
            now,
            now,
          );
          created.push(term);
        } catch (err) {
          const error = err as Error;
          if (!error.message.includes("UNIQUE constraint")) throw err;
        }
      });
    })();

    return created;
  }

  private findMatches(text: string, dictionaryIds?: string[]): TermMatch[] {
    const terms = this.getAllTerms(dictionaryIds);
    const matches: TermMatch[] = [];

    terms.forEach((term) => {
      const regex = new RegExp(`\\b${this.escapeRegex(term.term)}\\b`, "gi");
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          term: match[0],
          termId: term.id,
          position: match.index,
          length: match[0].length,
          dictionary: term.dictionary_name,
          dictionaryId: term.dictionary_id,
          definitions: this.getDefinitions(term.id),
        });
      }
    });

    return matches;
  }

  private getAllTerms(dictionaryIds?: string[]): TermRow[] {
    const baseQuery = `
      SELECT t.id, t.term, t.normalized_term, t.dictionary_id, d.name as dictionary_name
      FROM terms t
      JOIN dictionaries d ON t.dictionary_id = d.id
    `;

    if (!dictionaryIds || dictionaryIds.length === 0) {
      return this.runQueryAll(baseQuery + " ORDER BY length(t.term) DESC");
    }

    const placeholders = dictionaryIds.map(() => "?").join(", ");
    return this.runQueryAll(
      `${baseQuery} WHERE t.dictionary_id IN (${placeholders}) ORDER BY length(t.term) DESC`,
      ...dictionaryIds,
    );
  }

  private getDefinitions(termId: string): string[] {
    return this.runQueryAll<{ definition: string }>(
      "SELECT definition FROM definitions WHERE term_id = ? ORDER BY created_at",
      termId,
    ).map((d) => d.definition);
  }

  private escapeRegex = (str: string): string =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  private resolveDictionaryRef(ref: string): string | null {
    const result = this.runQuery<{ id: string }>(
      "SELECT id FROM dictionaries WHERE id = ? OR name = ? LIMIT 1",
      ref,
      ref,
    );
    return result?.id || null;
  }
}
