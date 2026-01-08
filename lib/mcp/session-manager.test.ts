import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager, setKVClientForTests } from './session-manager';

class FakeKV {
  private store = new Map<string, { value: any; expiresAt: number | null }>();

  private isExpired(entry: { expiresAt: number | null }): boolean {
    if (entry.expiresAt === null) {
      return false;
    }
    return Date.now() > entry.expiresAt;
  }

  private getEntry(key: string) {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async setex(key: string, ttlSeconds: number, value: any): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async get(key: string): Promise<any | null> {
    const entry = this.getEntry(key);
    return entry ? entry.value : null;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<number> {
    return this.getEntry(key) ? 1 : 0;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.getEntry(key);
    if (!entry) {
      return 0;
    }
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.getEntry(key);
    if (!entry) {
      return -2;
    }
    if (entry.expiresAt === null) {
      return -1;
    }
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }
}

test('session state CRUD uses Redis keys and merges updates', async () => {
  const kv = new FakeKV();
  setKVClientForTests(kv);

  const sessionId = await SessionManager.createSession('user-1', 'org-1');
  const stored = await SessionManager.setState(sessionId, 'user-1', { count: 1, label: 'init' });
  assert.equal(stored, true);

  const state = await SessionManager.getState<{ count: number; label: string }>(sessionId, 'user-1');
  assert.deepEqual(state, { count: 1, label: 'init' });

  const updated = await SessionManager.updateState(sessionId, 'user-1', { count: 2 });
  assert.deepEqual(updated, { count: 2, label: 'init' });

  const removed = await SessionManager.deleteState(sessionId, 'user-1');
  assert.equal(removed, true);

  const afterDelete = await SessionManager.getState(sessionId, 'user-1');
  assert.equal(afterDelete, null);

  setKVClientForTests();
});

test('extendSession refreshes TTL and keeps state alive', async () => {
  const kv = new FakeKV();
  setKVClientForTests(kv);

  const sessionId = await SessionManager.createSession('user-2', 'org-2');
  await SessionManager.setState(sessionId, 'user-2', { active: true });

  const sessionKey = `mcp_session:user-2:${sessionId}`;
  const stateKey = `mcp_session_state:user-2:${sessionId}`;

  await kv.expire(sessionKey, 5);
  await kv.expire(stateKey, 5);

  const extended = await SessionManager.extendSession(sessionId, 'user-2');
  assert.equal(extended, true);

  const sessionTtl = await kv.ttl(sessionKey);
  const stateTtl = await kv.ttl(stateKey);
  assert.ok(sessionTtl > 3000);
  assert.ok(stateTtl > 3000);

  setKVClientForTests();
});
