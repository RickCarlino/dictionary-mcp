import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const createTool = (
  name: string,
  description: string,
  properties: Record<string, any>,
  required: string[] = [],
): Tool => ({
  name,
  description,
  inputSchema: {
    type: "object",
    properties,
    required,
  },
});

export const tools: Record<string, Tool> = {
  dictionary_create: createTool(
    "dictionary_create",
    "Create a new dictionary",
    {
      name: { type: "string", description: "Dictionary name" },
      description: { type: "string", description: "Dictionary description" },
    },
    ["name"],
  ),

  dictionary_list: createTool("dictionary_list", "List all dictionaries", {}),

  dictionary_get: createTool(
    "dictionary_get",
    "Get dictionary details",
    { id: { type: "string", description: "Dictionary ID" } },
    ["id"],
  ),

  dictionary_update: createTool(
    "dictionary_update",
    "Update dictionary",
    {
      id: { type: "string", description: "Dictionary ID" },
      name: { type: "string", description: "New name" },
      description: { type: "string", description: "New description" },
    },
    ["id"],
  ),

  dictionary_delete: createTool(
    "dictionary_delete",
    "Delete dictionary",
    { id: { type: "string", description: "Dictionary ID" } },
    ["id"],
  ),

  term_add: createTool(
    "term_add",
    "Add a term to a dictionary",
    {
      dictionary: { type: "string", description: "Dictionary name or ID" },
      term: { type: "string", description: "Term to add" },
      definition: { type: "string", description: "Initial definition" },
    },
    ["dictionary", "term", "definition"],
  ),

  term_get: createTool(
    "term_get",
    "Get term with all definitions",
    { term: { type: "string", description: "Term to get" } },
    ["term"],
  ),

  term_search: createTool(
    "term_search",
    "Search for terms",
    {
      query: { type: "string", description: "Search query" },
      dictionary: {
        type: "string",
        description: "Limit to specific dictionary",
      },
    },
    ["query"],
  ),

  term_search_advanced: createTool(
    "term_search_advanced",
    "Advanced search for terms with multiple options",
    {
      query: { type: "string", description: "Search query" },
      dictionaries: {
        type: "array",
        items: { type: "string" },
        description: "List of dictionary names or IDs to search in",
      },
      match_type: {
        type: "string",
        enum: ["exact", "fuzzy", "prefix", "contains"],
        description: "Type of matching to use (default: contains)",
      },
      search_in: {
        type: "array",
        items: {
          type: "string",
          enum: ["term", "definition", "context"],
        },
        description: "Fields to search in (default: [term])",
      },
      limit: {
        type: "number",
        description: "Maximum results to return (default: 100)",
      },
      offset: {
        type: "number",
        description: "Number of results to skip (default: 0)",
      },
    },
    ["query"],
  ),

  term_update: createTool(
    "term_update",
    "Update term",
    {
      id: { type: "string", description: "Term ID" },
      term: { type: "string", description: "New term text" },
    },
    ["id"],
  ),

  term_delete: createTool(
    "term_delete",
    "Delete term",
    { id: { type: "string", description: "Term ID" } },
    ["id"],
  ),

  definition_add: createTool(
    "definition_add",
    "Add definition to a term",
    {
      term: { type: "string", description: "Term text" },
      text: { type: "string", description: "Definition text" },
      context: { type: "string", description: "Optional context" },
    },
    ["term", "text"],
  ),

  definition_update: createTool(
    "definition_update",
    "Update definition",
    {
      id: { type: "string", description: "Definition ID" },
      text: { type: "string", description: "New definition text" },
    },
    ["id", "text"],
  ),

  definition_delete: createTool(
    "definition_delete",
    "Delete definition",
    { id: { type: "string", description: "Definition ID" } },
    ["id"],
  ),

  text_scan: createTool(
    "text_scan",
    "Find existing dictionary terms in text",
    {
      text: { type: "string", description: "Text to scan" },
      dictionaries: {
        type: "array",
        items: { type: "string" },
        description: "Limit to specific dictionaries",
      },
    },
    ["text"],
  ),

  text_index: createTool(
    "text_index",
    "Extract unknown terms from text using LLM and add them to a dictionary",
    {
      text: {
        type: "string",
        description: "Text to analyze for unknown terms",
      },
      dictionary: {
        type: "string",
        description: "Dictionary name or ID to add terms to",
      },
      prompt: {
        type: "string",
        description: "Optional custom prompt for the LLM",
      },
    },
    ["text", "dictionary"],
  ),

  text_highlight: createTool(
    "text_highlight",
    "Highlight known dictionary terms in text",
    {
      text: { type: "string", description: "Text to highlight" },
      format: {
        type: "string",
        enum: ["html", "markdown"],
        description: "Output format",
      },
    },
    ["text"],
  ),

  import_dictionary: createTool(
    "import_dictionary",
    "Import dictionary data",
    {
      format: { type: "string", enum: ["json", "csv"] },
      data: { type: "string", description: "Dictionary data" },
    },
    ["format", "data"],
  ),

  export_dictionary: createTool(
    "export_dictionary",
    "Export dictionary data",
    {
      id: { type: "string", description: "Dictionary ID" },
      format: { type: "string", enum: ["json", "csv"] },
    },
    ["id", "format"],
  ),

  statistics_get: createTool("statistics_get", "Get usage statistics", {
    dictionary: { type: "string", description: "Limit to specific dictionary" },
  }),
};
