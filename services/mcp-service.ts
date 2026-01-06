import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { AuthContext } from "@/lib/mcp/auth-context";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { convertNodeToSchema, canRegisterAsTool, sanitizeToolName } from "@/lib/mcp/schema-converter";
import { WorkflowExecutor } from "@/lib/mcp/workflow-executor";

interface WorkflowTool {
  id: string;
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * Loads published workflows from database and transforms them into MCP tool definitions
 *
 * @param authContext - Auth context containing organization ID for filtering
 * @returns Array of workflow tools ready for registration
 */
async function loadToolsFromDatabase(authContext?: AuthContext): Promise<WorkflowTool[]> {
  if (!authContext) {
    return [];
  }

  const organizationId = authContext.getOrganizationId();
  const supabase = createServiceRoleClient();

  try {
    // Query published workflows with their start nodes
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select(`
        id,
        name,
        description,
        workflow_nodes!inner(
          id,
          type,
          data
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'published');

    if (error) {
      console.error('[MCP] Failed to load workflows:', error);
      return [];
    }

    if (!workflows || workflows.length === 0) {
      return [];
    }

    const tools: WorkflowTool[] = [];

    for (const workflow of workflows) {
      // Validate workflow can be registered
      if (!canRegisterAsTool(workflow)) {
        continue;
      }

      // Find start node
      const nodes = (workflow as any).workflow_nodes;
      const startNode = nodes?.find((node: any) => node.type === 'start');

      if (!startNode) {
        console.warn(`[MCP] Workflow ${workflow.id} has no start node, skipping`);
        continue;
      }

      // Convert node parameters to JSON Schema
      const inputSchema = convertNodeToSchema(startNode.data);

      tools.push({
        id: workflow.id,
        name: sanitizeToolName(workflow.name),
        description: workflow.description || '',
        inputSchema,
      });
    }

    console.log(`[MCP] Loaded ${tools.length} workflow tools for org ${organizationId}`);
    return tools;
  } catch (error) {
    console.error('[MCP] Error loading workflow tools:', error);
    return [];
  }
}

/**
 * Creates a new MCP server instance with registered tools
 * This function is called per-request to avoid shared state in Next.js
 * Dynamically loads and registers published workflows as MCP tools
 *
 * @param authContext - Validated authentication context for organization filtering
 */
export async function createMcpServer(authContext?: AuthContext): Promise<McpServer> {
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

  // Dynamically load and register workflow tools
  const workflowTools = await loadToolsFromDatabase(authContext);

  // Create workflow executor instance
  const executor = new WorkflowExecutor();

  for (const tool of workflowTools) {
    server.registerTool(
      tool.name,
      {
        title: tool.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async ({ ...params }) => {
        if (!authContext) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "Authentication required",
                }),
              },
            ],
          };
        }

        // Execute the workflow
        const result = await executor.executeWorkflow(tool.id, params, authContext);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );
  }

  console.log(`[MCP] Registered ${workflowTools.length + 1} tools (${workflowTools.length} workflows + 1 test tool)`);

  return server;
}
