/**
 * DAG (Directed Acyclic Graph) utilities for workflow execution
 * Implements topological sorting using Kahn's algorithm
 */

export interface WorkflowNode {
  id: string;
  type: string;
  data: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  source_handle?: string;
  target_handle?: string;
}

export class DAGTraverser {
  private adjacencyList: Map<string, Set<string>> = new Map();
  private inDegree: Map<string, number> = new Map();

  /**
   * Builds the graph from workflow edges
   */
  buildGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
    // Initialize adjacency list and in-degree for all nodes
    for (const node of nodes) {
      this.adjacencyList.set(node.id, new Set());
      this.inDegree.set(node.id, 0);
    }

    // Build graph from edges
    for (const edge of edges) {
      const sourceId = edge.source;
      const targetId = edge.target;

      if (!this.adjacencyList.has(sourceId) || !this.adjacencyList.has(targetId)) {
        continue; // Skip edges with invalid nodes
      }

      this.adjacencyList.get(sourceId)!.add(targetId);
      this.inDegree.set(targetId, (this.inDegree.get(targetId) || 0) + 1);
    }
  }

  /**
   * Performs topological sort using Kahn's algorithm
   * Returns array of node IDs in execution order
   *
   * @throws Error if cycle detected
   */
  topologicalSort(): string[] {
    const result: string[] = [];
    const queue: string[] = [];

    // Start with nodes that have no incoming edges
    for (const [nodeId, degree] of this.inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // Process neighbors
      const neighbors = this.adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        const newDegree = (this.inDegree.get(neighbor) || 0) - 1;
        this.inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If result doesn't include all nodes, there's a cycle
    if (result.length !== this.adjacencyList.size) {
      throw new Error('Cycle detected in workflow graph');
    }

    return result;
  }

  /**
   * Validates that the workflow graph is a valid DAG
   *
   * @returns True if valid DAG, false if cycle detected
   */
  validateDAG(): boolean {
    try {
      this.topologicalSort();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Finds the start node (type='start')
   */
  static findStartNode(nodes: WorkflowNode[]): WorkflowNode | null {
    return nodes.find((node) => node.type === 'start') || null;
  }

  /**
   * Finds all end nodes (nodes with no outgoing edges)
   */
  findEndNodes(): string[] {
    const endNodes: string[] = [];

    for (const [nodeId, neighbors] of this.adjacencyList.entries()) {
      if (neighbors.size === 0) {
        endNodes.push(nodeId);
      }
    }

    return endNodes;
  }
}
