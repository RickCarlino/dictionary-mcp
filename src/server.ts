import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DatabaseConnection } from "./db/connection.js";
import { DictionaryHandler } from "./handlers/dictionary.js";
import { TermHandler } from "./handlers/term.js";
import { DefinitionHandler } from "./handlers/definition.js";
import { TextHandler } from "./handlers/text.js";
import { ImportExportHandler } from "./utils/import-export.js";
import { tools } from "./tools.js";

interface ToolArgs {
  [key: string]: unknown;
  name?: string;
  description?: string;
  id?: string;
  dictionary?: string;
  term?: string;
  definition?: string;
  query?: string;
  text?: string;
  context?: string;
  format?: string;
  data?: string;
  prompt?: string;
  dictionaries?: string[];
  match_type?: string;
  search_in?: string[];
  limit?: number;
  offset?: number;
}

export class DictionaryServer {
  private server: Server;
  private db: DatabaseConnection;
  private dictHandler: DictionaryHandler;
  private termHandler: TermHandler;
  private defHandler: DefinitionHandler;
  private textHandler: TextHandler;
  private importExportHandler: ImportExportHandler;

  constructor() {
    this.server = new Server(
      { name: "dictionary-mcp", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    this.db = new DatabaseConnection(process.env.DATABASE_PATH);
    const dbInstance = this.db.getDb();
    const generateId = this.db.generateId;
    const normalizeText = this.db.normalizeText;

    this.dictHandler = new DictionaryHandler(
      dbInstance,
      generateId,
      normalizeText,
    );
    this.termHandler = new TermHandler(dbInstance, generateId, normalizeText);
    this.defHandler = new DefinitionHandler(
      dbInstance,
      generateId,
      normalizeText,
    );
    this.textHandler = new TextHandler(dbInstance, generateId, normalizeText);
    this.importExportHandler = new ImportExportHandler(
      this.dictHandler,
      this.termHandler,
      this.defHandler,
    );
    this.setupHandlers();
  }

  initialize = () => this.db.initialize();
  close = () => this.db.close();

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.values(tools),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = tools[name];

      if (!tool) throw new Error(`Unknown tool: ${name}`);

      try {
        const result = await this.handleToolCall(name, args as ToolArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: `Error: ${message}`,
            },
          ],
        };
      }
    });
  }

  private async handleToolCall(name: string, args: ToolArgs): Promise<unknown> {
    const handlers: Record<string, () => unknown> = {
      dictionary_create: () =>
        this.dictHandler.create(args.name!, args.description),
      dictionary_list: () => this.dictHandler.list(),
      dictionary_get: () => this.dictHandler.get(args.id!),
      dictionary_update: () =>
        this.dictHandler.update(args.id!, {
          name: args.name,
          description: args.description,
        }),
      dictionary_delete: () => ({ deleted: this.dictHandler.delete(args.id!) }),
      term_add: () =>
        this.termHandler.add(args.dictionary!, args.term!, args.definition!),
      term_get: () => this.termHandler.get(args.term!),
      term_search: () => this.termHandler.search(args.query!, args.dictionary),
      term_search_advanced: () =>
        this.termHandler.advancedSearch(args.query!, {
          dictionaries: args.dictionaries,
          matchType: args.match_type as
            | "exact"
            | "fuzzy"
            | "prefix"
            | "contains"
            | undefined,
          searchIn: args.search_in as
            | ("term" | "definition" | "context")[]
            | undefined,
          limit: args.limit,
          offset: args.offset,
        }),
      term_update: () => this.termHandler.update(args.id!, args.term!),
      term_delete: () => ({ deleted: this.termHandler.delete(args.id!) }),
      definition_add: () =>
        this.defHandler.add(args.term!, args.text!, args.context),
      definition_update: () => this.defHandler.update(args.id!, args.text!),
      definition_delete: () => ({ deleted: this.defHandler.delete(args.id!) }),
      text_scan: () => ({
        found_terms: this.textHandler.scan(args.text!, args.dictionaries),
      }),
      text_index: () =>
        this.textHandler.index(args.text!, args.dictionary!, args.prompt),
      text_highlight: () => ({
        highlighted: this.textHandler.highlight(
          args.text!,
          args.format as "html" | "markdown" | undefined,
        ),
      }),
      import_dictionary: () => {
        const importHandlers: Record<string, () => unknown> = {
          json: () => this.importExportHandler.importFromJson(args.data!),
          csv: () => this.importExportHandler.importFromCsv(args.data!),
        };
        const handler = importHandlers[args.format!];
        if (!handler)
          throw new Error(`Unsupported import format: ${args.format}`);
        return handler();
      },
      export_dictionary: () => {
        const exportHandlers: Record<string, () => unknown> = {
          json: () => ({
            data: this.importExportHandler.exportToJson(args.id!),
          }),
          csv: () => ({ data: this.importExportHandler.exportToCsv(args.id!) }),
        };
        const handler = exportHandlers[args.format!];
        if (!handler)
          throw new Error(`Unsupported export format: ${args.format}`);
        return handler();
      },
    };

    const handler = handlers[name];
    if (!handler) throw new Error(`Tool ${name} not implemented yet`);

    return handler();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
