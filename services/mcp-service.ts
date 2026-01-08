import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { AuthContext } from "@/lib/mcp/auth-context";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { convertNodeToSchema, convertJsonSchemaToZod, canRegisterAsTool, sanitizeToolName } from "@/lib/mcp/schema-converter";
import { WorkflowExecutor, type SessionExecutionContext } from "@/lib/mcp/workflow-executor";
import { sanitizeActionParams } from "@/lib/mcp/param-sanitizer";

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
        status,
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

    console.log(`[MCP] Query returned ${workflows?.length || 0} workflows`);
    console.log(`[MCP] Workflows data:`, JSON.stringify(workflows, null, 2));

    if (!workflows || workflows.length === 0) {
      console.warn('[MCP] No workflows found for organization', organizationId);
      return [];
    }

    const tools: WorkflowTool[] = [];

    for (const workflow of workflows) {
      console.log(`[MCP] Processing workflow: ${workflow.name} (${workflow.id})`);
      console.log(`[MCP]   - Description: ${workflow.description || 'MISSING'}`);

      // Validate workflow can be registered
      if (!canRegisterAsTool(workflow)) {
        console.warn(`[MCP] Workflow ${workflow.id} failed canRegisterAsTool validation`);
        continue;
      }

      // Find start node
      const nodes = (workflow as any).workflow_nodes;
      console.log(`[MCP]   - Nodes count: ${nodes?.length || 0}`);
      console.log(`[MCP]   - Node types: ${nodes?.map((n: any) => n.type).join(', ') || 'none'}`);
      const startNode = nodes?.find((node: any) => node.type === 'start');

      if (!startNode) {
        console.warn(`[MCP] Workflow ${workflow.id} has no start node, skipping`);
        continue;
      }

      console.log(`[MCP]   - Found start node: ${startNode.id}`);

      // Convert node parameters to JSON Schema, then to Zod
      const jsonSchema = convertNodeToSchema(startNode.data);
      const zodSchema = convertJsonSchemaToZod(jsonSchema);

      tools.push({
        id: workflow.id,
        name: sanitizeToolName(workflow.name),
        description: workflow.description || '',
        inputSchema: zodSchema,
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
export async function createMcpServer(
  authContext?: AuthContext,
  sessionContext?: SessionExecutionContext
): Promise<McpServer> {
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

        const { sanitized, removedKeys } = sanitizeActionParams(params);
        if (removedKeys.length > 0) {
          console.warn(
            `[MCP][Security] Rejected workflow invocation with sensitive params: ${removedKeys.join(', ')}`
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  error: "Sensitive credential parameters are not allowed in workflow inputs.",
                }),
              },
            ],
          };
        }

        // Execute the workflow
        const result = await executor.executeWorkflow(tool.id, sanitized, authContext, sessionContext);

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
