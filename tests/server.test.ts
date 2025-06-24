import { describe, test, expect } from "bun:test";
import { tools } from "../src/tools";

describe("MCP Server", () => {
  test("should have all required tools", () => {
    const toolNames = Object.keys(tools).sort();
    const expectedTools = [
      "definition_add",
      "definition_delete",
      "definition_update",
      "dictionary_create",
      "dictionary_delete",
      "dictionary_get",
      "dictionary_list",
      "dictionary_update",
      "export_dictionary",
      "import_dictionary",
      "statistics_get",
      "term_add",
      "term_delete",
      "term_get",
      "term_search",
      "term_search_advanced",
      "term_update",
      "text_highlight",
      "text_index",
      "text_scan",
    ];
    expect(toolNames).toEqual(expectedTools);
  });

  test("tools should have valid schemas", () => {
    Object.entries(tools).forEach(([name, tool]) => {
      expect(tool.name).toBe(name);
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
      if (tool.inputSchema.required) {
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      }
    });
  });

  test("required fields should be in properties", () => {
    Object.values(tools).forEach((tool) => {
      const required = tool.inputSchema.required || [];
      const properties = Object.keys(tool.inputSchema.properties);
      required.forEach((field) => {
        expect(properties).toContain(field);
      });
    });
  });
});
