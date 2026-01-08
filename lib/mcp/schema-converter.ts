/**
 * Converts workflow node parameters to JSON Schema format for MCP tool registration
 * Extracts parameters from workflow_nodes.data JSONB and transforms to valid inputSchema
 */

import * as z from 'zod';

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
  const parameters = nodeData?.parameters || {};

  const schema: JSONSchema = {
    type: 'object',
    properties: {},
  };

  // Handle both array format (schema definitions) and object format (parameter values)
  if (Array.isArray(parameters)) {
    // Array format: parameter schema definitions
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
  } else if (typeof parameters === 'object') {
    // Object format: infer schema from parameter values
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const inferredType = Array.isArray(paramValue)
        ? 'array'
        : typeof paramValue === 'number'
          ? 'number'
          : typeof paramValue === 'boolean'
            ? 'boolean'
            : 'string';

      const property: JSONSchemaProperty = {
        type: inferredType,
      };

      if (paramValue !== null && paramValue !== undefined) {
        property.default = paramValue;
      }

      if (inferredType === 'array') {
        property.items = { type: 'string' };
      }

      schema.properties[paramName] = property;
    }
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
 * Converts JSON Schema to Zod schema for MCP tool registration
 *
 * @param jsonSchema - JSON Schema object from convertNodeToSchema
 * @returns Record of Zod schemas for MCP SDK
 */
export function convertJsonSchemaToZod(jsonSchema: JSONSchema): Record<string, z.ZodTypeAny> {
  const zodSchema: Record<string, z.ZodTypeAny> = {};

  for (const [propName, propDef] of Object.entries(jsonSchema.properties)) {
    let zodType: z.ZodTypeAny;

    // Create base type
    switch (propDef.type) {
      case 'string':
        zodType = z.string();
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'array':
        zodType = z.array(z.string()); // Default to string array
        break;
      case 'object':
        zodType = z.record(z.string(), z.any());
        break;
      default:
        zodType = z.any();
    }

    // Add description if present
    if (propDef.description) {
      zodType = zodType.describe(propDef.description);
    }

    // Make optional if not required
    const isRequired = jsonSchema.required?.includes(propName);
    if (!isRequired) {
      zodType = zodType.optional();
    }

    // Add default if present
    if (propDef.default !== undefined) {
      zodType = zodType.default(propDef.default);
    }

    zodSchema[propName] = zodType;
  }

  return zodSchema;
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
