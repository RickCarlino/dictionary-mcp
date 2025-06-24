export interface Dictionary {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  updated_at: number;
}

export interface Term {
  id: string;
  dictionary_id: string;
  term: string;
  normalized_term: string;
  created_at: number;
  updated_at: number;
}

export interface Definition {
  id: string;
  term_id: string;
  definition: string;
  context?: string;
  created_at: number;
}

export interface UsageStats {
  id: string;
  term_id: string;
  lookup_count: number;
  last_accessed?: number;
}

export interface TextScanResult {
  term: string;
  position: number;
  dictionary: string;
  definitions: string[];
}

export interface TextIndexResult {
  existingTerms: TextScanResult[];
  termsAdded: string[];
  llmUsed: boolean;
}

export interface SearchResult {
  term: Term;
  definitions: Definition[];
  dictionary: Dictionary;
  score?: number;
}

export type ImportFormat = "json" | "csv";
export type HighlightFormat = "html" | "markdown";

export interface DictionaryImport {
  name: string;
  description?: string;
  terms: Array<{
    term: string;
    definitions: Array<{
      definition: string;
      context?: string;
    }>;
  }>;
}
