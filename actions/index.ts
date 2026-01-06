import type { ActionMetadata } from '@/types/actions';

/**
 * Action Registry
 * Maps action IDs to their module paths for dynamic loading
 *
 * To add a new action:
 * 1. Create a new file in actions/ directory (e.g., actions/send-email.ts)
 * 2. Export default ActionFunction from that file
 * 3. Add mapping here: 'send-email': './send-email'
 * 4. Add metadata to actionMetadata below
 *
 * The action ID is stored in workflow_nodes.data.action_id
 */
export const actionRegistry: Record<string, string> = {
  'hello-world': './hello-world',
  // Add more actions here as needed
  // 'send-email': './send-email',
  // 'create-task': './create-task',
  // 'http-request': './http-request',
};

/**
 * Action Metadata for UI Display
 * Provides human-readable information and parameter schemas for the workflow editor
 */
export const actionMetadata: Record<string, ActionMetadata> = {
  'hello-world': {
    id: 'hello-world',
    name: 'Hello World',
    description: 'Greets user with a personalized message and returns timestamp',
    inputSchema: {
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet (optional, defaults to "World")',
          required: false,
          default: 'World',
        },
      },
    },
  },
  // Add metadata for new actions here
};
