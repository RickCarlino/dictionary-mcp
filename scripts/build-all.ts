#!/usr/bin/env bun

import { $ } from "bun";
import { mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const DIST_DIR = "dist";
const ENTRY_POINT = "src/index.ts";

const TARGETS = [
  { name: "bun", desc: "Bun runtime" },
  { name: "node", desc: "Node.js runtime" },
  { name: "bun-linux-x64", desc: "Linux x64 standalone" },
  { name: "bun-linux-arm64", desc: "Linux ARM64 standalone" },
  { name: "bun-darwin-x64", desc: "macOS x64 standalone" },
  { name: "bun-darwin-arm64", desc: "macOS ARM64 (Apple Silicon) standalone" },
  { name: "bun-windows-x64", desc: "Windows x64 standalone" },
];

async function clean() {
  if (existsSync(DIST_DIR)) {
    console.log("🧹 Cleaning dist directory...");
    await rm(DIST_DIR, { recursive: true, force: true });
  }
  await mkdir(DIST_DIR, { recursive: true });
}

async function buildTarget(target: { name: string; desc: string }) {
  console.log(`\n📦 Building for ${target.desc}...`);

  const isWindows = target.name.includes("windows");
  const outfile = target.name.startsWith("bun-")
    ? path.join(
        DIST_DIR,
        `dictionary-mcp-${target.name.replace("bun-", "")}${isWindows ? ".exe" : ""}`,
      )
    : path.join(DIST_DIR, `index.${target.name}.js`);

  try {
    if (target.name.startsWith("bun-")) {
      await $`bun build ${ENTRY_POINT} --compile --target=${target.name} --outfile=${outfile}`;
      if (!isWindows) {
        await $`chmod +x ${outfile}`;
      }
    } else {
      await $`bun build ${ENTRY_POINT} --target=${target.name} --outfile=${outfile}`;
      if (target.name === "bun") {
        await $`chmod +x ${outfile}`;
      }
    }
    console.log(`✅ Built: ${outfile}`);
  } catch (error) {
    console.error(`❌ Failed to build ${target.name}:`, error);
  }
}

async function createEntryPoints() {
  console.log("\n🔧 Creating entry point scripts...");

  const bunScript = `#!/usr/bin/env bun
import "./index.bun.js";
`;
  await Bun.write(path.join(DIST_DIR, "index.js"), bunScript);
  await $`chmod +x ${path.join(DIST_DIR, "index.js")}`;

  const nodeScript = `#!/usr/bin/env node
import("./index.node.js");
`;
  await Bun.write(path.join(DIST_DIR, "index.node"), nodeScript);
  await $`chmod +x ${path.join(DIST_DIR, "index.node")}`;

  console.log("✅ Entry points created");
}

async function createReadme() {
  const readme = `# Dictionary MCP - Distribution Files

This directory contains pre-built binaries for different platforms.

## Runtime-specific builds

- \`index.js\` - Main entry point (uses Bun if available, falls back to Node)
- \`index.bun.js\` - Bun runtime build
- \`index.node.js\` - Node.js runtime build

## Standalone executables

- \`dictionary-mcp-linux-x64\` - Linux x64 standalone executable
- \`dictionary-mcp-linux-arm64\` - Linux ARM64 standalone executable  
- \`dictionary-mcp-darwin-x64\` - macOS x64 standalone executable
- \`dictionary-mcp-darwin-arm64\` - macOS ARM64 (Apple Silicon) standalone executable
- \`dictionary-mcp-windows-x64.exe\` - Windows x64 standalone executable

## Usage

### With runtime
\`\`\`bash
# Using Bun
bun run dist/index.js

# Using Node.js
node dist/index.node.js
\`\`\`

### Standalone
\`\`\`bash
# Linux/macOS
./dist/dictionary-mcp-[platform]

# Windows
./dist/dictionary-mcp-windows-x64.exe
\`\`\`
`;

  await Bun.write(path.join(DIST_DIR, "README.md"), readme);
  console.log("✅ README created");
}

async function main() {
  console.log("🚀 Building Dictionary MCP for all targets...\n");

  await clean();

  for (const target of TARGETS) {
    await buildTarget(target);
  }

  await createEntryPoints();
  await createReadme();

  console.log("\n✨ Build complete! Check the dist/ directory for all builds.");
}

main().catch(console.error);
