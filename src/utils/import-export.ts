import type { Dictionary, Term, Definition } from "../types.js";

type TermWithDetails = Term & {
  dictionary: Dictionary;
  definitions: Definition[];
};

export interface DictionaryExport {
  dictionary: Dictionary;
  terms: Array<{
    term: Term;
    definitions: Definition[];
  }>;
}

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

export interface CsvRow {
  dictionary_name: string;
  dictionary_description: string;
  term: string;
  definition: string;
  context: string;
}

interface DictionaryHandlerInterface {
  get(id: string): Dictionary | null;
  list(): Dictionary[];
  create(name: string, description?: string): Dictionary;
}

interface TermHandlerInterface {
  getByDictionary(dictionaryId: string): Term[];
  get(term: string): TermWithDetails[];
  add(
    dictionaryId: string,
    term: string,
    definition: string,
  ): Term & { definition: Definition };
}

interface DefinitionHandlerInterface {
  getByTerm(termId: string): Definition[];
  add(termId: string, text: string, context?: string): Definition;
  updateContext(id: string, context: string): Definition | null;
}

export class ImportExportHandler {
  constructor(
    private dictHandler: DictionaryHandlerInterface,
    private termHandler: TermHandlerInterface,
    private defHandler: DefinitionHandlerInterface,
  ) {}

  exportToJson(dictionaryId: string): string {
    const dictionary = this.dictHandler.get(dictionaryId);
    if (!dictionary) {
      throw new Error(`Dictionary not found: ${dictionaryId}`);
    }

    const terms = this.termHandler.getByDictionary(dictionaryId);
    const exportData: DictionaryImport = {
      name: dictionary.name,
      description: dictionary.description,
      terms: terms.map((term: Term) => ({
        term: term.term,
        definitions: this.defHandler
          .getByTerm(term.id)
          .map((def: Definition) => ({
            definition: def.definition,
            context: def.context,
          })),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  importFromJson(jsonData: string): {
    dictionary: Dictionary;
    termCount: number;
    definitionCount: number;
  } {
    let data: DictionaryImport;

    try {
      data = JSON.parse(jsonData);
    } catch (error) {
      throw new Error("Invalid JSON format");
    }

    if (!data.name || !Array.isArray(data.terms)) {
      throw new Error("Invalid import data structure");
    }

    const dictionary = this.dictHandler.create(data.name, data.description);
    let termCount = 0;
    let definitionCount = 0;

    for (const termData of data.terms) {
      if (
        !termData.term ||
        !Array.isArray(termData.definitions) ||
        termData.definitions.length === 0
      ) {
        continue;
      }

      const firstDef = termData.definitions[0];
      if (!firstDef) continue;
      const term = this.termHandler.add(
        dictionary.id,
        termData.term,
        firstDef.definition,
      );
      termCount++;
      definitionCount++;

      if (firstDef.context) {
        const definitions = this.defHandler.getByTerm(term.id);
        if (definitions.length > 0) {
          this.defHandler.updateContext(definitions[0]!.id, firstDef.context);
        }
      }

      for (let i = 1; i < termData.definitions.length; i++) {
        const def = termData.definitions[i];
        if (!def) continue;
        this.defHandler.add(term.id, def.definition, def.context);
        definitionCount++;
      }
    }

    return { dictionary, termCount, definitionCount };
  }

  exportToCsv(dictionaryId: string): string {
    const dictionary = this.dictHandler.get(dictionaryId);
    if (!dictionary) {
      throw new Error(`Dictionary not found: ${dictionaryId}`);
    }

    const terms = this.termHandler.getByDictionary(dictionaryId);
    const rows: string[] = [];

    rows.push("dictionary_name,dictionary_description,term,definition,context");

    for (const term of terms) {
      const definitions = this.defHandler.getByTerm(term.id);
      for (const def of definitions) {
        const row = [
          this.escapeCsv(dictionary.name),
          this.escapeCsv(dictionary.description || ""),
          this.escapeCsv(term.term),
          this.escapeCsv(def.definition),
          this.escapeCsv(def.context || ""),
        ].join(",");
        rows.push(row);
      }
    }

    return rows.join("\n");
  }

  importFromCsv(csvData: string): {
    dictionaries: Dictionary[];
    termCount: number;
    definitionCount: number;
  } {
    const rows = this.parseCsvData(csvData);
    if (rows.length < 2) {
      throw new Error("CSV must have header and at least one data row");
    }

    const dataRows = rows.slice(1);
    const dictionaryMap = new Map<string, Dictionary>();
    const termMap = new Map<string, Map<string, Term | TermWithDetails>>();
    let termCount = 0;
    let definitionCount = 0;

    for (const row of dataRows) {
      if (row.length < 5) continue;

      const [dictName, dictDesc, termText, defText, context] = row;

      if (!dictName || !termText || !defText) continue;

      let dictionary = dictionaryMap.get(dictName);
      if (!dictionary) {
        const existing = this.dictHandler
          .list()
          .find((d: Dictionary) => d.name === dictName);
        if (existing) {
          dictionary = existing;
        } else {
          dictionary = this.dictHandler.create(dictName, dictDesc || undefined);
        }
        if (dictionary) {
          dictionaryMap.set(dictName, dictionary);
          termMap.set(dictName, new Map());
        }
      }

      if (!dictionary) continue;

      const dictTerms = termMap.get(dictName);
      if (!dictTerms) continue;

      let term = dictTerms.get(termText);
      if (!term) {
        const existingTerms = this.termHandler.get(termText);
        const existingTerm = existingTerms.find(
          (t: TermWithDetails) => t.dictionary_id === dictionary.id,
        );

        if (existingTerm) {
          term = existingTerm;
          this.defHandler.add(existingTerm.id, defText, context || undefined);
          definitionCount++;
        } else {
          const newTerm = this.termHandler.add(
            dictionary.id,
            termText,
            defText,
          );
          term = newTerm;
          termCount++;
          definitionCount++;

          if (context) {
            const definitions = this.defHandler.getByTerm(newTerm.id);
            if (definitions.length > 0) {
              this.defHandler.updateContext(definitions[0]!.id, context);
            }
          }
        }
        if (term) {
          dictTerms.set(termText, term);
        }
      } else {
        this.defHandler.add(term.id, defText, context || undefined);
        definitionCount++;
      }
    }

    return {
      dictionaries: Array.from(dictionaryMap.values()),
      termCount,
      definitionCount,
    };
  }

  private escapeCsv(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i++;
        continue;
      }

      if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
        i++;
        continue;
      }

      current += char;
      i++;
    }

    result.push(current);
    return result;
  }

  private parseCsvData(csvData: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;
    let i = 0;

    while (i < csvData.length) {
      const char = csvData[i];

      if (char === '"') {
        if (inQuotes && csvData[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i++;
        continue;
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      }

      if (char === "\n" && !inQuotes) {
        currentRow.push(currentField);
        if (currentRow.some((field) => field.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some((field) => field.trim())) {
        rows.push(currentRow);
      }
    }

    return rows;
  }
}
