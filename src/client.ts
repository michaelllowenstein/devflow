
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from
  "@modelcontextprotocol/client/stdio";
import path from "node:path";

const workspace = process.env.WORKSPACE_ROOT;

if (!workspace) {
  throw new Error("WORKSPACE_ROOT is required");
}

const client = new Client({
  name: "engineering-cli",
  version: "0.1.0"
});

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    path.resolve("dist/server.js")
  ],
  env: {
    ...process.env,
    WORKSPACE_ROOT: workspace
  }
});

try {
  await client.connect(transport);

  // Capability discovery
  const tools = await client.listTools();

  console.log(
    "Available MCP tools:",
    tools.tools.map(t => t.name)
  );

  // Explicitly invoke a read-only tool
  const result = await client.callTool({
    name: "git_status",
    arguments: {}
  });

  console.dir(result, { depth: null });
} finally {
  await client.close();
}
