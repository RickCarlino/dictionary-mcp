#!/usr/bin/env bun

import { DictionaryServer } from "./server.js";

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  const packageJson = require("../package.json");
  console.log(packageJson.version);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Dictionary MCP Server

Usage:
  dictionary-mcp              Start the MCP server
  dictionary-mcp --version    Show version information
  dictionary-mcp --help       Show this help message

This is a Model Context Protocol server that should be used with an MCP client.
`);
  process.exit(0);
}

const server = new DictionaryServer();

async function main() {
  try {
    await server.initialize();
    await server.run();
  } catch (error) {
    process.stderr.write(`Server error: ${error}\n`);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});

main().catch((err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
});
