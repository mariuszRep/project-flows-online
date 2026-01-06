import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { AuthContext } from "@/lib/mcp/auth-context";

/**
 * Creates a new MCP server instance with registered tools
 * This function is called per-request to avoid shared state in Next.js
 *
 * @param authContext - Validated authentication context for organization filtering
 */
export function createMcpServer(authContext?: AuthContext): McpServer {
  const server = new McpServer({
    name: "project-flows-online",
    version: "1.0.0",
  });

  // Register tools using the modern SDK API
  server.registerTool(
    "hello_mcp",
    {
      title: "Hello MCP",
      description: "Test function that returns greeting message with timestamp and auth context",
      inputSchema: {
        name: z.string().optional().describe("Your name for personalized greeting"),
      },
    },
    async ({ name }) => {
      const greeting = name || "World";
      const message = `Hello, ${greeting}!`;
      const timestamp = new Date().toISOString();

      // Include auth context information if available
      const authInfo = authContext ? {
        userId: authContext.getUserId(),
        organizationId: authContext.getOrganizationId(),
        scopes: authContext.getScopes(),
      } : null;

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
                  auth: authInfo,
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
  // When adding tools that access organization data, use authContext for filtering:
  //
  // server.registerTool('get_projects', { ... }, async (params) => {
  //   const orgId = authContext?.getOrganizationId();
  //   if (!orgId) {
  //     throw new Error('Organization context required');
  //   }
  //   // Query data filtered by orgId
  //   const projects = await getProjectsByOrganization(orgId);
  //   return { content: [{ type: 'text', text: JSON.stringify(projects) }] };
  // });

  return server;
}
