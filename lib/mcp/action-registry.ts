import type { ActionFunction, ActionModule } from '@/types/actions';
import { actionRegistry } from '@/actions';

/**
 * Action Registry for dynamically loading and caching action functions
 * Uses ES module dynamic import for lazy loading
 */
export class ActionRegistry {
  private cache: Map<string, ActionFunction> = new Map();

  /**
   * Loads an action by ID, with caching
   *
   * @param actionId - The action ID (e.g., 'hello-world', 'send-email')
   * @returns The action function
   * @throws Error if action not found or fails to load
   */
  async loadAction(actionId: string): Promise<ActionFunction> {
    // Check cache first
    if (this.cache.has(actionId)) {
      return this.cache.get(actionId)!;
    }

    // Get module path from registry
    const modulePath = actionRegistry[actionId];
    if (!modulePath) {
      throw new Error(`Action '${actionId}' not found in registry`);
    }

    try {
      // Dynamically import the action module
      // Use the module path directly with the actions alias
      const module: ActionModule = await import(`@/actions/${modulePath.replace('./', '')}`);

      if (!module.default || typeof module.default !== 'function') {
        throw new Error(`Action '${actionId}' does not export a default function`);
      }

      const action = module.default;

      // Cache the loaded action
      this.cache.set(actionId, action);

      return action;
    } catch (error) {
      throw new Error(
        `Failed to load action '${actionId}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Checks if an action exists in the registry
   */
  hasAction(actionId: string): boolean {
    return actionId in actionRegistry;
  }

  /**
   * Gets all registered action IDs
   */
  getRegisteredActions(): string[] {
    return Object.keys(actionRegistry);
  }

  /**
   * Clears the action cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
