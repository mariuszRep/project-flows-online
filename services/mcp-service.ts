import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

/**
 * Creates a new MCP server instance with registered tools
 * This function is called per-request to avoid shared state in Next.js
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "project-flows-online",
    version: "1.0.0",
  });

  // Register tools using the modern SDK API
  server.registerTool(
    "hello_mcp",
    {
      title: "Hello MCP",
      description: "Test function that returns greeting message with timestamp",
      inputSchema: {
        name: z.string().optional().describe("Your name for personalized greeting"),
      },
    },
    async ({ name }) => {
      const greeting = name || "World";
      const message = `Hello, ${greeting}!`;
      const timestamp = new Date().toISOString();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                data: {
                  message,
                  timestamp,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Add more tools here as needed
  // server.registerTool('another_tool', { ... }, async (params) => { ... });

  return server;
}
