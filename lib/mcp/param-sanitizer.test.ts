import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeActionParams } from './param-sanitizer';

test('removes sensitive top-level keys and preserves safe fields', () => {
  const input = {
    authorization: 'Bearer top-secret',
    apiKey: 'abc',
    token: 'tkn',
    name: 'workflow',
    count: 2,
  };

  const { sanitized, removedKeys } = sanitizeActionParams(input);

  assert.deepEqual(sanitized, {
    name: 'workflow',
    count: 2,
  });
  assert.deepEqual(new Set(removedKeys), new Set(['authorization', 'apiKey', 'token']));
});

test('removes nested sensitive keys in objects and arrays', () => {
  const input = {
    headers: {
      Authorization: 'Bearer nested',
      'X-Request-Id': '123',
    },
    payload: {
      password: 'secret',
      nested: {
        refresh_token: 'refresh',
      },
    },
    items: [{ token: 'array-token', ok: true }, 'safe'],
  };

  const { sanitized, removedKeys } = sanitizeActionParams(input);

  assert.deepEqual(sanitized, {
    headers: {
      'X-Request-Id': '123',
    },
    payload: {
      nested: {},
    },
    items: [{ ok: true }, 'safe'],
  });
  assert.deepEqual(
    new Set(removedKeys),
    new Set(['Authorization', 'password', 'refresh_token', 'token'])
  );
});

test('preserves non-plain objects while sanitizing plain objects', () => {
  const timestamp = new Date('2025-01-01T00:00:00.000Z');
  const input = {
    createdAt: timestamp,
    meta: {
      secretKey: 'nope',
      status: 'ok',
    },
  };

  const { sanitized, removedKeys } = sanitizeActionParams(input);

  assert.equal(sanitized.createdAt, timestamp);
  assert.deepEqual(sanitized.meta, { status: 'ok' });
  assert.deepEqual(new Set(removedKeys), new Set(['secretKey']));
});
