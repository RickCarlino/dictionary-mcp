# Setting up Dictionary MCP with Claude Desktop and Claude Code

## Quick Setup

1. **Build the server** (already done):

   ```bash
   bun run build
   ```

2. **Find your Claude Desktop configuration file**:

   - Linux: `~/.config/Claude/claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. **Add the Dictionary MCP server** to your `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "dictionary": {
         "command": "/home/rick/code/dictionary-mcp/dist/dictionary-mcp-linux-x64",
         "args": [],
         "env": {
           "DATABASE_PATH": "/home/rick/.local/share/dictionary-mcp/dictionary.db"
         }
       }
     }
   }
   ```

4. **Create the database directory**:

   ```bash
   mkdir -p ~/.local/share/dictionary-mcp
   ```

5. **Restart Claude Desktop** to load the new MCP server

## Alternative Configurations

### Using Bun (if you have Bun installed):

```json
{
  "mcpServers": {
    "dictionary": {
      "command": "bun",
      "args": ["run", "/home/rick/code/dictionary-mcp/dist/index.bun.js"],
      "env": {
        "DATABASE_PATH": "/home/rick/.local/share/dictionary-mcp/dictionary.db"
      }
    }
  }
}
```

### Using Node.js (if you have Node.js installed):

```json
{
  "mcpServers": {
    "dictionary": {
      "command": "node",
      "args": ["/home/rick/code/dictionary-mcp/dist/index.node.js"],
      "env": {
        "DATABASE_PATH": "/home/rick/.local/share/dictionary-mcp/dictionary.db"
      }
    }
  }
}
```

## Testing the Connection

After restarting Claude Desktop, you can test the connection by:

1. Opening Claude Desktop
2. Using the `/mcp` command - it should show "dictionary" as an available server
3. Try using a dictionary tool like creating a new dictionary

## Setting up with Claude Code

Claude Code uses the `claude mcp add` command to configure MCP servers. You have three options:

### Option 1: Local Scope (recommended for personal use)

Add the server for the current project only:

```bash
claude mcp add dictionary /home/rick/code/dictionary-mcp/dist/dictionary-mcp-linux-x64 \
  -e DATABASE_PATH=/home/rick/.local/share/dictionary-mcp/dictionary.db
```

### Option 2: User Scope (available across all projects)

Add the server globally for your user:

```bash
claude mcp add dictionary -s user /home/rick/code/dictionary-mcp/dist/dictionary-mcp-linux-x64 \
  -e DATABASE_PATH=/home/rick/.local/share/dictionary-mcp/dictionary.db
```

### Option 3: Project Scope (for team sharing)

Add the server to `.mcp.json` for sharing with your team:

```bash
claude mcp add dictionary -s project /home/rick/code/dictionary-mcp/dist/dictionary-mcp-linux-x64 \
  -e DATABASE_PATH=/home/rick/.local/share/dictionary-mcp/dictionary.db
```

After adding the server, you can manage it with:

- `claude mcp list` - View all configured MCP servers
- `claude mcp remove dictionary` - Remove the server
- `/mcp` command in Claude Code - Interact with MCP servers

## Troubleshooting

- Make sure the path to the executable is absolute (not relative)
- Ensure the database directory exists and is writable
- Check that the built executable has execute permissions:
  ```bash
  chmod +x /home/rick/code/dictionary-mcp/dist/dictionary-mcp-linux-x64
  ```
- If Claude Desktop doesn't recognize the server, check the logs in Claude Desktop's developer console
- For Claude Code, use `claude mcp list` to verify the server is configured correctly
