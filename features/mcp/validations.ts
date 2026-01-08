import { z } from 'zod';

/**
 * Validation schema for creating an MCP connection
 */
export const createConnectionSchema = z.object({
  name: z
    .string()
    .min(3, 'Connection name must be at least 3 characters')
    .max(50, 'Connection name must be less than 50 characters')
    .optional(),
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
