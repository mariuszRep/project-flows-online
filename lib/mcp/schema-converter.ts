/**
 * Converts workflow node parameters to JSON Schema format for MCP tool registration
 * Extracts parameters from workflow_nodes.data JSONB and transforms to valid inputSchema
 */

interface WorkflowParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: any;
}

interface JSONSchemaProperty {
  type: string;
  description?: string;
  default?: any;
  items?: { type: string };
}

interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

/**
 * Converts workflow node data to MCP-compatible JSON Schema
 *
 * @param nodeData - The workflow_nodes.data JSONB object
 * @returns JSON Schema object for MCP inputSchema
 *
 * @example
 * const nodeData = {
 *   parameters: [
 *     { name: 'to', type: 'string', description: 'Email recipient', required: true },
 *     { name: 'subject', type: 'string', description: 'Email subject', required: true },
 *     { name: 'body', type: 'string', description: 'Email body', required: false }
 *   ]
 * };
 *
 * const schema = convertNodeToSchema(nodeData);
 * // Returns:
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     to: { type: 'string', description: 'Email recipient' },
 * //     subject: { type: 'string', description: 'Email subject' },
 * //     body: { type: 'string', description: 'Email body' }
 * //   },
 * //   required: ['to', 'subject']
 * // }
 */
export function convertNodeToSchema(nodeData: any): JSONSchema {
  const parameters = nodeData?.parameters || [];

  const schema: JSONSchema = {
    type: 'object',
    properties: {},
  };

  const required: string[] = [];

  for (const param of parameters) {
    if (!param.name || !param.type) {
      continue; // Skip invalid parameters
    }

    const property: JSONSchemaProperty = {
      type: param.type,
    };

    if (param.description) {
      property.description = param.description;
    }

    if (param.default !== undefined) {
      property.default = param.default;
    }

    // Handle array types
    if (param.type === 'array') {
      property.items = { type: 'string' }; // Default to string array
    }

    schema.properties[param.name] = property;

    if (param.required) {
      required.push(param.name);
    }
  }

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Validates that a workflow has the minimum required structure for MCP tool registration
 *
 * @param workflow - Workflow object from database
 * @returns True if workflow can be registered as MCP tool
 */
export function canRegisterAsTool(workflow: any): boolean {
  // Must have name and description
  if (!workflow.name || !workflow.description) {
    return false;
  }

  // Must be published
  if (workflow.status !== 'published') {
    return false;
  }

  return true;
}

/**
 * Sanitizes workflow name for use as MCP tool name
 * Tool names must be lowercase alphanumeric with underscores
 *
 * @param name - Workflow name
 * @returns Sanitized tool name
 *
 * @example
 * sanitizeToolName("Send Email") // => "send_email"
 * sanitizeToolName("Create-Task") // => "create_task"
 */
export function sanitizeToolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
