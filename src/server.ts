
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { realpath, readFile, stat } from "node:fs/promises";
import path from "node:path";
import * as z from "zod/v4";

const exec = promisify(execFile);
const root = await realpath(
  process.env.WORKSPACE_ROOT ?? process.cwd()
);

const server = new McpServer({
  name: "devflow-mcp",
  version: "0.1.0"
});

function result(data: unknown) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(data)
    }]
  };
}

async function git(args: string[]) {
  const { stdout } = await exec(
    "git",
    ["-C", root, ...args],
    {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
        GIT_NO_LAZY_FETCH: "1",
        GIT_TERMINAL_PROMPT: "0"
      }
    }
  );
  return stdout.trim();
}

// Tool 1: Workspace information
server.registerTool(
  "workspace_info",
  {
    description: "Identify the configured workspace",
    inputSchema: z.object({})
  },
  async () => {
    return result({
      root,
      node: process.version,
      platform: process.platform
    });
  }
);

// Tool 2: Git status
server.registerTool(
  "git_status",
  {
    description: "Get current branch and Git status",
    inputSchema: z.object({})
  },
  async () => {
    try {
      const [branch, status] = await Promise.all([
        git(["branch", "--show-current"]),
        git(["status", "--short", "--untracked-files=normal"])
      ]);

      return result({ branch, status });
    } catch {
      return {
        isError: true,
        ...result({ error: "Git inspection failed" })
      };
    }
  }
);

// Tool 3: Read workspace file
server.registerTool(
  "repo_read",
  {
    description: "Read a bounded UTF-8 workspace file",
    inputSchema: z.object({
      file: z.string().min(1).max(4096)
    })
  },
  async ({ file }) => {
    try {
      const resolved = await realpath(
        path.resolve(root, file)
      );

      // Reject paths outside the authorized workspace.
      const relative = path.relative(root, resolved);

      if (
        relative === ".." ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative)
      ) {
        throw new Error("Path outside workspace");
      }

      const metadata = await stat(resolved);

      if (!metadata.isFile() || metadata.size > 65536) {
        throw new Error("Not a regular file or file too large");
      }

      // Exact files are verified before reading; concurrent
      // filesystem changes still require stronger OS isolation.
      const content = await readFile(resolved, "utf8");

      return result({
        file: relative,
        content
      });
    } catch {
      return {
        isError: true,
        ...result({ error: "File unavailable or unauthorized" })
      };
    }
  }
);

await server.connect(new StdioServerTransport());
