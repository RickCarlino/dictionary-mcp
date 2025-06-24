# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Dictionary MCP (Model Context Protocol) server that helps teams maintain consistent vocabulary by providing definitions for internal terms, acronyms, and specialized language. It's built with TypeScript and Bun, using SQLite for data persistence.

## Key Commands

```bash
# Development
bun run dev          # Start development server with file watching
bun run start        # Start production server
bun run build        # Build for production

# Testing & Quality
bun test             # Run all tests
bun test <file>      # Run specific test file
bun run typecheck    # Run TypeScript type checking

# Database
# Note: .db files are gitignored. Test databases are created/cleaned per test run.
```

## Important Note

- Run `bell.sh` when you are done working on a feature.

## Architecture Overview

### Core Protocol Layer

- `/src/index.ts` - Entry point that initializes the MCP server
- `/src/server.ts` - Main server class that handles MCP protocol and routes tool calls to appropriate handlers
- `/src/tools.ts` - MCP tool definitions (create_dictionary, add_term, search_terms, etc.)
- `/src/types.ts` - TypeScript interfaces for all domain models

### Data Model (Hierarchical)

```
Dictionaries (name, description)
  └─> Terms (term, normalized_term, dictionary_id)
       └─> Definitions (definition, examples, tags, related_terms)
```

### Handler Pattern

All business logic follows a consistent handler pattern:

1. Base handler (`/src/handlers/base.ts`) provides common database operations
2. Each entity has its own handler extending the base (dictionary.ts, term.ts, definition.ts, text.ts)
3. Handlers return standardized responses with success/error states

### Database Layer

- Schema defined in `/src/db/schema.ts` with 4 tables: dictionaries, terms, definitions, usage_stats
- Migration system in `/src/db/migrations.ts` for schema versioning
- Uses SQLite with foreign key constraints and CASCADE deletes

### Key Implementation Details

- Term normalization: All terms are stored with a normalized version (lowercase, trimmed) for case-insensitive matching
- Unique constraints: Dictionary names and normalized terms within a dictionary must be unique
- UUID generation for all IDs
- Text processing supports both HTML and Markdown output formats
- LLM integration is currently stubbed (logs what would be sent)

## Testing Approach

Tests use Bun's built-in test runner with a consistent pattern:

- Each test creates a fresh database
- Tests are organized by handler/functionality
- Integration tests in `/tests/integration/`
- Always clean up test databases after completion

## Development Notes

- The codebase follows strict TypeScript with no implicit any
- Error handling uses try-catch with descriptive error messages
- All handlers validate input and check for entity existence
- Database operations are wrapped in error handling for constraint violations
- The project uses Bun's native TypeScript support (no separate build step needed for development)
