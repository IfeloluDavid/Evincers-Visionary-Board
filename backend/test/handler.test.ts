import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it } from 'vitest';
import { handle } from '../src/handler.js';
import type { Store } from '../src/store.js';
import { createMemoryStore } from '../dev/memoryStore.js';

let store: Store;
beforeEach(() => {
  store = createMemoryStore();
});

function call(
  method: string,
  path: string,
  opts: { user?: string | null; name?: string; body?: unknown } = {},
) {
  const user = opts.user === undefined ? 'user-a' : opts.user;
  const event = {
    rawPath: path,
    isBase64Encoded: false,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    requestContext: {
      http: { method },
      authorizer: user ? { jwt: { claims: { sub: user, name: opts.name ?? 'Grace Adeyemi' } } } : undefined,
    },
  } as unknown as APIGatewayProxyEventV2;
  return handle(event, store).then((r) => ({
    status: r.statusCode as number,
    json: r.body ? JSON.parse(r.body as string) : undefined,
  }));
}

describe('auth', () => {
  it('rejects requests without verified claims', async () => {
    const res = await call('GET', '/visions', { user: null });
    expect(res.status).toBe(401);
  });
});

describe('visions', () => {
  it('creates a vision with sensible defaults', async () => {
    const res = await call('POST', '/visions', { body: { title: '  Run a half marathon ' } });
    expect(res.status).toBe(201);
    expect(res.json.vision).toMatchObject({
      title: 'Run a half marathon',
      category: 'other',
      status: 'active',
      visibility: 'private',
      stepsTotal: 0,
      stepsDone: 0,
      ownerName: 'Grace Adeyemi',
    });
  });

  it('validates input', async () => {
    expect((await call('POST', '/visions', { body: {} })).status).toBe(400);
    expect((await call('POST', '/visions', { body: { title: 'x', category: 'nope' } })).status).toBe(400);
    expect((await call('POST', '/visions', { body: { title: 'x', targetDate: '31/12/2027' } })).status).toBe(400);
    expect((await call('POST', '/visions', { body: [] })).status).toBe(400);
  });

  it('updates partially and tracks achievedAt', async () => {
    const { json } = await call('POST', '/visions', { body: { title: 'Plant a church', category: 'ministry' } });
    const id = json.vision.id;
    const res = await call('PATCH', `/visions/${id}`, { body: { status: 'achieved', targetDate: '2027-01-01' } });
    expect(res.json.vision).toMatchObject({ title: 'Plant a church', category: 'ministry', status: 'achieved' });
    expect(res.json.vision.achievedAt).toBeTruthy();
    const back = await call('PATCH', `/visions/${id}`, { body: { status: 'active', targetDate: null } });
    expect(back.json.vision.achievedAt).toBeNull();
    expect(back.json.vision.targetDate).toBeNull();
  });

  it("never exposes another member's vision", async () => {
    const { json } = await call('POST', '/visions', { body: { title: 'Private goal' } });
    const id = json.vision.id;
    expect((await call('GET', `/visions/${id}`, { user: 'user-b' })).status).toBe(404);
    expect((await call('PATCH', `/visions/${id}`, { user: 'user-b', body: { title: 'hacked' } })).status).toBe(404);
    expect((await call('DELETE', `/visions/${id}`, { user: 'user-b' })).status).toBe(404);
    expect((await call('GET', '/visions', { user: 'user-b' })).json.visions).toHaveLength(0);
  });
});

describe('steps and progress', () => {
  async function seed() {
    const v = (await call('POST', '/visions', { body: { title: 'Read the Bible in a year' } })).json.vision;
    return v.id as string;
  }

  it('keeps progress counters in sync', async () => {
    const id = await seed();
    const s1 = (await call('POST', `/visions/${id}/steps`, { body: { title: 'Pick a plan' } })).json.step;
    const s2 = (await call('POST', `/visions/${id}/steps`, { body: { title: 'Read daily', dueDate: '2027-12-31' } })).json;
    expect(s2.vision).toMatchObject({ stepsTotal: 2, stepsDone: 0 });

    const done = await call('PATCH', `/visions/${id}/steps/${s1.id}`, { body: { done: true } });
    expect(done.json.step.doneAt).toBeTruthy();
    expect(done.json.vision).toMatchObject({ stepsTotal: 2, stepsDone: 1 });

    const undone = await call('PATCH', `/visions/${id}/steps/${s1.id}`, { body: { done: false } });
    expect(undone.json.step.doneAt).toBeNull();
    expect(undone.json.vision.stepsDone).toBe(0);

    const del = await call('DELETE', `/visions/${id}/steps/${s2.step.id}`);
    expect(del.json.vision.stepsTotal).toBe(1);

    const detail = await call('GET', `/visions/${id}`);
    expect(detail.json.steps).toHaveLength(1);
  });

  it('cascades deletes', async () => {
    const id = await seed();
    await call('POST', `/visions/${id}/steps`, { body: { title: 'one' } });
    expect((await call('DELETE', `/visions/${id}`)).status).toBe(204);
    expect(await store.listAllSteps('user-a')).toHaveLength(0);
  });

  it('lists upcoming open steps by due date, skipping paused visions', async () => {
    const a = await seed();
    const b = (await call('POST', '/visions', { body: { title: 'Paused', status: 'paused' } })).json.vision.id;
    await call('POST', `/visions/${a}/steps`, { body: { title: 'later', dueDate: '2027-06-01' } });
    await call('POST', `/visions/${a}/steps`, { body: { title: 'sooner', dueDate: '2027-01-01' } });
    await call('POST', `/visions/${a}/steps`, { body: { title: 'finished', dueDate: '2026-01-01', done: true } });
    await call('POST', `/visions/${b}/steps`, { body: { title: 'ignored', dueDate: '2026-01-01' } });

    const res = await call('GET', '/steps/upcoming');
    expect(res.json.steps.map((s: { title: string }) => s.title)).toEqual(['sooner', 'later']);
    expect(res.json.steps[0].visionTitle).toBe('Read the Bible in a year');
  });
});

describe('community feed', () => {
  it('shows only church-visible visions and hides identifiers', async () => {
    await call('POST', '/visions', { body: { title: 'Secret' } });
    const shared = await call('POST', '/visions', {
      body: { title: 'Mission trip', visibility: 'church', category: 'ministry' },
    });

    const res = await call('GET', '/community', { user: 'user-b', name: 'Tunde' });
    expect(res.json.visions).toHaveLength(1);
    expect(res.json.visions[0]).toMatchObject({ id: shared.json.vision.id, ownerName: 'Grace Adeyemi', mine: false });
    expect(res.json.visions[0]).not.toHaveProperty('userId');

    const mine = await call('GET', '/community');
    expect(mine.json.visions[0].mine).toBe(true);
  });

  it('removes a vision from the feed when it goes private again', async () => {
    const id = (await call('POST', '/visions', { body: { title: 'Temp', visibility: 'church' } })).json.vision.id;
    await call('PATCH', `/visions/${id}`, { body: { visibility: 'private' } });
    expect((await call('GET', '/community')).json.visions).toHaveLength(0);
  });
});

describe('routing', () => {
  it('returns 404 for unknown routes and 400 for bad JSON', async () => {
    expect((await call('GET', '/nope')).status).toBe(404);
    const event = {
      rawPath: '/visions',
      isBase64Encoded: false,
      body: '{not json',
      requestContext: { http: { method: 'POST' }, authorizer: { jwt: { claims: { sub: 'u' } } } },
    } as unknown as APIGatewayProxyEventV2;
    expect((await handle(event, store)).statusCode).toBe(400);
  });
});
