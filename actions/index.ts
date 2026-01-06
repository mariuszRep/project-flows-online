/**
 * Action Registry
 * Maps action IDs to their module paths for dynamic loading
 *
 * To add a new action:
 * 1. Create a new file in actions/ directory (e.g., actions/send-email.ts)
 * 2. Export default ActionFunction from that file
 * 3. Add mapping here: 'send-email': './send-email'
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
