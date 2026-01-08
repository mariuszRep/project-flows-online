import type { ActionParams, SanitizedParams } from '@/types/actions';

const SENSITIVE_PARAM_KEYS = [
  'authorization',
  'bearer',
  'token',
  'apikey',
  'secretkey',
  'access_token',
  'refresh_token',
  'password',
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const NORMALIZED_SENSITIVE_KEYS = new Set(
  SENSITIVE_PARAM_KEYS.map((candidate) => normalizeKey(candidate))
);

function isSensitiveKey(key: string): boolean {
  return NORMALIZED_SENSITIVE_KEYS.has(normalizeKey(key));
}

export function sanitizeActionParams(
  params: ActionParams
): { sanitized: SanitizedParams; removedKeys: string[] } {
  const removedKeys = new Set<string>();

  const sanitizeValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (isPlainObject(value)) {
      const sanitizedObject: Record<string, unknown> = {};
      for (const [key, entryValue] of Object.entries(value)) {
        if (isSensitiveKey(key)) {
          removedKeys.add(key);
          continue;
        }
        sanitizedObject[key] = sanitizeValue(entryValue);
      }
      return sanitizedObject;
    }
    return value;
  };

  const sanitized = sanitizeValue(params) as SanitizedParams;

  return {
    sanitized,
    removedKeys: Array.from(removedKeys),
  };
}
