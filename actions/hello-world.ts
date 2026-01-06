import type { ActionFunction } from '@/types/actions';

/**
 * Example action: Hello World
 * Demonstrates basic action structure
 *
 * Parameters:
 * - name (optional): Name to greet
 *
 * Returns:
 * - message: Greeting message
 * - timestamp: Execution timestamp
 */
const helloWorld: ActionFunction = async (params, context) => {
  try {
    const name = params.name || 'World';
    const message = `Hello, ${name}!`;

    return {
      success: true,
      data: {
        message,
        timestamp: new Date().toISOString(),
        workflowId: context.workflowId,
        nodeId: context.nodeId,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export default helloWorld;
