# Dictionary MCP Setup Guide

This guide explains how to set up the Dictionary MCP server with Claude Desktop and Claude Code.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Claude Desktop Setup](#claude-desktop-setup)
  - [1. Locate your configuration file](#1-locate-your-configuration-file)
  - [2. Add the Dictionary MCP server](#2-add-the-dictionary-mcp-server)
  - [3. Alternative runtime options](#3-alternative-runtime-options)
  - [4. Restart Claude Desktop](#4-restart-claude-desktop)
  - [5. Verify the connection](#5-verify-the-connection)
- [Claude Code Setup](#claude-code-setup)
  - [Installation options](#installation-options)
  - [Managing the server](#managing-the-server)
- [Troubleshooting](#troubleshooting)
  - [Common issues](#common-issues)
  - [Platform-specific notes](#platform-specific-notes)
  - [Debugging](#debugging)

## Prerequisites

- Built the server by running `bun run build`
- Created the database directory: `mkdir -p ~/.local/share/dictionary-mcp`

## Claude Desktop Setup

### 1. Locate your configuration file

- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 2. Add the Dictionary MCP server

Edit your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "dictionary": {
      "command": "/path/to/dictionary-mcp/dist/dictionary-mcp-linux-x64",
      "args": [],
      "env": {
        "DATABASE_PATH": "~/.local/share/dictionary-mcp/dictionary.db"
      }
    }
  }
}
```

**Note**: Replace `/path/to/dictionary-mcp` with the actual path to your project directory.

### 3. Alternative runtime options

#### Using Bun (if installed):
```json
{
  "mcpServers": {
    "dictionary": {
      "command": "bun",
      "args": ["run", "/path/to/dictionary-mcp/dist/index.bun.js"],
      "env": {
        "DATABASE_PATH": "~/.local/share/dictionary-mcp/dictionary.db"
      }
    }
  }
}
```

#### Using Node.js (if installed):
```json
{
  "mcpServers": {
    "dictionary": {
      "command": "node",
      "args": ["/path/to/dictionary-mcp/dist/index.node.js"],
      "env": {
        "DATABASE_PATH": "~/.local/share/dictionary-mcp/dictionary.db"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

After saving the configuration, restart Claude Desktop to load the MCP server.

### 5. Verify the connection

1. Open Claude Desktop
2. Use the `/mcp` command - "dictionary" should appear as an available server
3. Try creating a dictionary to test functionality

## Claude Code Setup

Claude Code uses the `claude mcp add` command to configure MCP servers.

### Installation options

#### Option 1: Local Scope (current project only)
```bash
claude mcp add dictionary /path/to/dictionary-mcp/dist/dictionary-mcp-linux-x64 \
  -e DATABASE_PATH=~/.local/share/dictionary-mcp/dictionary.db
```

#### Option 2: User Scope (all projects)
```bash
claude mcp add dictionary -s user /path/to/dictionary-mcp/dist/dictionary-mcp-linux-x64 \
  -e DATABASE_PATH=~/.local/share/dictionary-mcp/dictionary.db
```

#### Option 3: Project Scope (for team sharing)
```bash
claude mcp add dictionary -s project /path/to/dictionary-mcp/dist/dictionary-mcp-linux-x64 \
  -e DATABASE_PATH=~/.local/share/dictionary-mcp/dictionary.db
```

This creates a `.mcp.json` file in your project that can be committed to version control.

### Managing the server

- `claude mcp list` - View all configured MCP servers
- `claude mcp remove dictionary` - Remove the server
- `/mcp` command in Claude Code - Interact with MCP servers

## Troubleshooting

### Common issues

1. **Path issues**: Use absolute paths, not relative paths
2. **Permissions**: Ensure the executable has execute permissions:
   ```bash
   chmod +x /path/to/dictionary-mcp/dist/dictionary-mcp-linux-x64
   ```
3. **Database directory**: Verify it exists and is writable:
   ```bash
   mkdir -p ~/.local/share/dictionary-mcp
   ```

### Platform-specific notes

- **Windows**: Use forward slashes in paths or escape backslashes
- **macOS**: May need to allow the executable in System Preferences > Security & Privacy
- **Linux**: Ensure the database directory has appropriate permissions

### Debugging

- **Claude Desktop**: Check developer console for error logs
- **Claude Code**: Use `claude mcp list` to verify configuration
- **Both**: Ensure the MCP server process can start independently:
  ```bash
  /path/to/dictionary-mcp/dist/dictionary-mcp-linux-x64
  ```