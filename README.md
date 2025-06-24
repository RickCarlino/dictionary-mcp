# Dictionary MCP Server

A Model Context Protocol (MCP) server to maintain internal or specialized vocabulary. Stores words in a centralized dictionary for internal terms, acronyms, and specialized language. Built with TypeScript and Bun.

## Project Status

This project is in the idea phase and has not undergone extensive testing.

## Features

- **📚 Multi-Dictionary Support** - Create separate dictionaries for different teams, projects, or domains
- **🔍 Smart Search** - Advanced search with fuzzy matching, prefix search, and multi-field queries
- **🤖 AI-Powered Term Extraction** - Automatically identify technical terms and jargon using OpenAI or Anthropic
- **📝 Rich Definitions** - Support multiple definitions per term with context and examples
- **🔄 Import/Export** - Bulk operations with JSON and CSV formats
- **⚡ Real-time Text Scanning** - Instantly identify dictionary terms in any text
- **🎨 Text Highlighting** - Highlight recognized terms in HTML or Markdown format

## Installation

**Don't care and just want to add it to Claude code?** See [MCP Setup](./MCP_SETUP.md)

```bash
# Using npx (recommended)
npx @dictionary/mcp

# Or install globally
npm install -g @dictionary/mcp

# Or use with Claude Desktop directly (see Configuration below)
```

### From Source

```bash
# Clone the repository
git clone https://github.com/rickcarlino/dictionary-mcp.git
cd dictionary-mcp

# Install dependencies
bun install

# Run in development
bun run dev

# Or build for production
bun run build
bun run start
```

## Configuration

### Claude Desktop/Code Integration

See official docs or [MCP_SETUP.md](./MCP_SETUP.md)

### Environment Variables

Create a `.env` file for optional features:

```env
# Optional: Enable AI-powered term extraction
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Choose provider (defaults to openai)
LLM_PROVIDER=anthropic

# Optional: Customize model
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_MODEL=claude-3-opus-20240229

# Optional: Database location (defaults to ./dictionary.db)
DATABASE_PATH=/path/to/dictionaries.db
```

## Quick Start

### 1. Create a Dictionary

```javascript
// Create a dictionary for your engineering team
await dictionary_create(
  "Engineering",
  "Technical terms used by the engineering team"
);
```

### 2. Add Terms

```javascript
// Add common engineering terms
await term_add("Engineering", "API", "Application Programming Interface");
await term_add(
  "Engineering",
  "CI/CD",
  "Continuous Integration/Continuous Deployment"
);
await term_add(
  "Engineering",
  "PR",
  "Pull Request - A method of submitting contributions"
);
```

### 3. Search and Discover

```javascript
// Search for terms
await term_search("API");
// Returns: All definitions of "API" across all dictionaries

// Advanced search with fuzzy matching
await term_search_advanced("aip", {
  match_type: "fuzzy",
  search_in: ["term", "definition"],
});
```

### 4. Analyze Text

```javascript
// Scan text for known terms
const text = "Please review the PR before the CI/CD pipeline runs.";
await text_scan(text);
// Returns: Found terms with positions and definitions

// With AI: Extract unknown technical terms
await text_index(text, "Engineering");
// AI identifies and adds new technical terms to your dictionary
```

## MCP Tools Reference

### Dictionary Management

| Tool                | Description             | Required Parameters           |
| ------------------- | ----------------------- | ----------------------------- |
| `dictionary_create` | Create a new dictionary | `name`, `description?`        |
| `dictionary_list`   | List all dictionaries   | -                             |
| `dictionary_get`    | Get dictionary details  | `id`                          |
| `dictionary_update` | Update dictionary info  | `id`, `name?`, `description?` |
| `dictionary_delete` | Delete a dictionary     | `id`                          |

### Term Management

| Tool                   | Description                        | Required Parameters                |
| ---------------------- | ---------------------------------- | ---------------------------------- |
| `term_add`             | Add a term with initial definition | `dictionary`, `term`, `definition` |
| `term_get`             | Get all definitions for a term     | `term`                             |
| `term_search`          | Basic term search                  | `query`, `dictionary?`             |
| `term_search_advanced` | Advanced search with options       | `query`, `options?`                |
| `term_update`          | Update term text                   | `id`, `term`                       |
| `term_delete`          | Delete a term                      | `id`                               |

### Definition Management

| Tool                | Description                     | Required Parameters        |
| ------------------- | ------------------------------- | -------------------------- |
| `definition_add`    | Add definition to existing term | `term`, `text`, `context?` |
| `definition_update` | Update definition text          | `id`, `text`               |
| `definition_delete` | Delete a definition             | `id`                       |

### Text Processing

| Tool             | Description                   | Required Parameters             |
| ---------------- | ----------------------------- | ------------------------------- |
| `text_scan`      | Find dictionary terms in text | `text`, `dictionaries?`         |
| `text_index`     | Extract new terms using AI    | `text`, `dictionary`, `prompt?` |
| `text_highlight` | Highlight terms in text       | `text`, `format?`               |

### Import/Export

| Tool                | Description          | Required Parameters |
| ------------------- | -------------------- | ------------------- |
| `import_dictionary` | Import from JSON/CSV | `format`, `data`    |
| `export_dictionary` | Export to JSON/CSV   | `id`, `format`      |

## Advanced Usage

### Search Options

```javascript
await term_search_advanced("api", {
  dictionaries: ["Engineering", "Product"], // Search specific dictionaries
  match_type: "fuzzy", // fuzzy, exact, prefix, contains
  search_in: ["term", "definition"], // Where to search
  limit: 10, // Max results
  offset: 0, // Pagination
});
```

### Import/Export

```javascript
// Export dictionary to JSON
const data = await export_dictionary("dict-id", "json");

// Import from CSV
const csvData = `dictionary_name,term,definition,context
Engineering,API,Application Programming Interface,REST APIs
Engineering,SDK,Software Development Kit,Used for integrations`;

await import_dictionary("csv", csvData);
```

### Custom AI Prompts

```javascript
// Use custom prompt for specialized term extraction
await text_index(
  documentText,
  "Medical",
  "Extract medical terms, drug names, and clinical abbreviations from the following text:"
);
```

## Example Dictionaries

The repository includes example dictionaries in the `examples/` directory:

- **Engineering** - Software development terminology
- **Business & Finance** - Corporate and financial terms
- **Project-Specific** - Example of internal project vocabulary

Import them with:

```bash
bun run examples/import-all.ts
```

## Development

### Running Tests

```bash
bun test                    # Run all tests
bun test dictionary         # Run specific test file
bun run typecheck          # TypeScript type checking
```

### Building

The project can be built for multiple platforms and targets:

```bash
# Build for all platforms (recommended)
bun run build

# Build for specific targets
bun run build:simple        # Bun runtime only
bun run build:node         # Node.js compatible build
bun run build:standalone   # Linux x64 standalone executable

# Clean build directory
bun run clean
```

#### Build Outputs

Running `bun run build` creates the following in the `dist/` directory:

- **Runtime builds**:

  - `index.js` - Main entry point (auto-detects runtime)
  - `index.bun.js` - Optimized for Bun runtime
  - `index.node.js` - Compatible with Node.js

- **Standalone executables** (no runtime required):
  - `dictionary-mcp-linux-x64` - Linux x64
  - `dictionary-mcp-linux-arm64` - Linux ARM64
  - `dictionary-mcp-darwin-x64` - macOS Intel
  - `dictionary-mcp-darwin-arm64` - macOS Apple Silicon
  - `dictionary-mcp-windows-x64.exe` - Windows x64

#### Automated Builds

GitHub Actions automatically builds all targets when:

- A new tag is pushed (e.g., `v1.0.0`)
- Manually triggered via GitHub Actions UI

Releases include pre-built binaries for all platforms.

### Project Structure

```
dictionary-mcp/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server implementation
│   ├── tools.ts          # Tool definitions
│   ├── handlers/         # Business logic
│   ├── db/              # Database layer
│   └── utils/           # Utilities
├── tests/               # Test files
├── examples/            # Example dictionaries
├── scripts/
│   └── build-all.ts     # Multi-platform build script
├── dist/                # Build output (git ignored)
└── package.json
```

## Performance

- **Fast Startup** - Bun runtime provides instant startup
- **Efficient Search** - Indexed full-text search with sub-millisecond queries
- **Lightweight** - Minimal dependencies, SQLite database
- **Scalable** - Handles thousands of terms across multiple dictionaries

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/rickcarlino/dictionary-mcp/issues)

Built with ❤️ using [Model Context Protocol](https://modelcontextprotocol.org) and [Bun](https://bun.sh)
