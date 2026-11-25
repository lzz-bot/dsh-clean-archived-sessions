// Host-half behavior tests with mocked DSH services: `node --test test/`.
import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, test } from 'node:test'
import { apply, inject, name } from '../index.js'

const roots = []
after(async () => { await Promise.all(roots.map(root => rm(root, { recursive: true, force: true }))) })

/** Build a temporary DSH home plus mocked services, and apply the plugin to it. */
async function setup({ cache = {}, schedules = [] } = {}) {
  const home = await mkdtemp(join(tmpdir(), 'clean-archived-sessions-'))
  roots.push(home)
  const project = join(home, 'sessions', '--proj--')
  const cacheDir = join(home, 'storages', 'session_projcache', 'sessions')
  await mkdir(cacheDir, { recursive: true })
  const sessions = {
    archivedRoot: { events: [{ type: 'turn/start' }] },
    archivedChild: { events: [{ type: 'turn/start' }], header: { origin: 'subagent', parentSession: 'archivedRoot' } },
    orphan: { events: [{ type: 'turn/start' }], header: { origin: 'subagent', parentSession: 'gone' } },
    ungroupedUsed: { events: [{ type: 'turn/start' }], header: { cwd: '/elsewhere' } },
    ungroupedBlank: { events: [], header: { cwd: '/elsewhere' } },
    noCwdBlank: { events: [], header: { cwd: undefined } },
    blank: { events: [{ type: 'sandbox/mode' }] },
    scheduledBlank: { events: [] },
    staleBlank: { events: [{ type: 'turn/start' }] },
    normal: { events: [{ type: 'turn/start' }] },
    busy: { events: [], locked: true },
  }
  for (const [id, session] of Object.entries(sessions)) {
    await mkdir(join(project, id), { recursive: true })
    await writeFile(join(project, id, 'session.v4.jsonl.zstd'), 'x')
    await writeFile(join(cacheDir, `${id}.json`), '{}')
    session.header = { id, createdAt: Date.now(), cwd: '/work', isSeeded: false, ...session.header }
  }
  const removed = new Set()
  const calls = []
  const state = { archived: ['archivedRoot', 'busy'], schedules: [...schedules], onLock: undefined }
  const workspace = {
    path: '/work',
    get sessionIds() { return ['blank', 'scheduledBlank', 'staleBlank', 'normal'].filter(id => !removed.has(id)) },
    detachSession: async (id) => { calls.push(['detach', id]) },
  }
  const routes = new Map()
  const ctx = {
    webServer: { register: (route) => { routes.set(route.path, route); return () => routes.delete(route.path) } },
    workspaceRegistry: {
      get archivedSessionIds() { return state.archived },
      pinnedSessionIds: [],
      list: () => [workspace],
      unarchiveSession: async (id) => { calls.push(['unarchive', id]); state.archived = state.archived.filter(x => x !== id) },
      unpinSession: async () => {},
    },
    sessionPersistence: {
      list: async () => Object.entries(sessions).filter(([id]) => !removed.has(id)).map(([id, session]) => ({
        header: session.header, sizeBytes: 1, location: { kind: 'jsonl', path: join(project, id, 'session.v4.jsonl.zstd') },
      })),
      open: async (id, mode) => {
        if (mode === 'write' && sessions[id].locked) throw Object.assign(new Error('owned'), { name: 'SessionAlreadyOwnedError' })
        calls.push(['open', id, mode])
        if (mode === 'write') state.onLock?.(id)
        return { id, read: async () => ({ events: sessions[id].events }), close: async () => { calls.push(['close', id, mode]) } }
      },
    },
    get: (key) => {
      if (key === 'sessionProjectionCache') {
        return { cachedSnapshot: header => cache[header.id] === undefined ? undefined : { asOfSeq: 0, values: cache[header.id] } }
      }
      if (key === 'schedule') {
        return {
          catalog: async () => state.schedules,
          edit: async ({ id }) => { calls.push(['schedule-delete', id]); state.schedules = state.schedules.filter(entry => entry.id !== id); return { id, deleted: true } },
        }
      }
      return undefined
    },
    waterfall: async () => [],
    emit: (...args) => { calls.push(['emit', ...args]) },
    effect: fn => fn(),
    logger: { debug() {}, info() {}, warn() {} },
  }
  apply(ctx, {})

  async function call(path, method, body, principal = 'owner') {
    const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
    const req = { method, headers: { 'content-type': 'application/json' }, async *[Symbol.asyncIterator]() { yield* chunks } }
    const res = {
      status: 0, payload: undefined, writableEnded: false, setHeader() {}, on() {},
      set statusCode(v) { this.status = v },
      end(text) { this.writableEnded = true; this.payload = text === undefined ? undefined : JSON.parse(text) },
    }
    await routes.get(path).handler(req, res, { principal: { kind: principal } })
    return res
  }
  const remove = async (id) => {
    const res = await call('/clean-archived-sessions/delete', 'POST', { sessionId: id })
    if (res.status === 200) {
      removed.add(id)
      for (const [child, session] of Object.entries(sessions)) if (session.header.parentSession === id) removed.add(child)
    }
    return res
  }
  const exists = id => access(join(project, id)).then(() => true, () => false)
  return { home, cacheDir, sessions, routes, calls, state, call, remove, exists }
}

let env
beforeEach(async () => {
  env = await setup({
    cache: {
      normal: { sessionListMetadata: { blank: false, lastPromptAt: 5 } },
      archivedRoot: {
        sessionListMetadata: { blank: false, lastPromptAt: 7 },
        turnOutline: [{ turn: 1, seq: 3, prompt: 'first prompt', response: '' }],
        title: { title: 'Cached title' },
      },
    },
    schedules: [
      { id: 'task-blank', status: 'paused', target: { kind: 'session', sessionId: 'scheduledBlank' } },
      { id: 'task-archived', status: 'active', target: { kind: 'session', sessionId: 'archivedRoot' } },
    ],
  })
})

test('exports and routes', () => {
  assert.equal(name, 'clean-archived-sessions')
  assert.deepEqual(inject, ['webServer', 'workspaceRegistry', 'sessionPersistence'])
  assert.deepEqual([...env.routes.keys()], ['/clean-archived-sessions/list', '/clean-archived-sessions/delete'])
})

test('lists archived, empty, and orphaned sessions only', async () => {
  const { status, payload } = await env.call('/clean-archived-sessions/list', 'GET')
  assert.equal(status, 200)
  assert.deepEqual(payload.items.map(item => item.sessionId), ['archivedRoot', 'busy'])
  const [root] = payload.items
  assert.equal(root.subagentCount, 1)
  assert.equal(root.title, 'Cached title')
  assert.equal(root.preview, 'first prompt')
  assert.equal(root.turnCount, 1)
  assert.equal(root.lastPromptAt, 7)
  // Empty: grouped and ungrouped, but not scheduled, not without cwd, and not with a turn.
  assert.deepEqual(payload.blank.map(item => [item.sessionId, item.ungrouped]).sort(),
    [['blank', false], ['ungroupedBlank', true]])
  assert.deepEqual(payload.orphans.map(item => item.sessionId), ['orphan'])
  // Non-empty ungrouped sessions stay with the sidebar's Ungrouped section.
  assert.ok(!JSON.stringify(payload).includes('ungroupedUsed'))
  // A cached `blank: false` skips reading the log.
  assert.ok(!env.calls.some(([kind, id]) => kind === 'open' && id === 'normal'))
})

test('refuses non-owners and sessions outside the deletable groups', async () => {
  assert.equal((await env.call('/clean-archived-sessions/delete', 'POST', { sessionId: 'archivedRoot' }, 'guest')).status, 403)
  for (const id of ['normal', 'staleBlank', 'ungroupedUsed', 'noCwdBlank', 'scheduledBlank']) {
    assert.equal((await env.remove(id)).payload.code, 'not-deletable', id)
    assert.ok(await env.exists(id), id)
  }
  assert.equal((await env.remove('archivedChild')).payload.code, 'subagent')
  assert.equal((await env.remove('busy')).payload.code, 'in-use')
  assert.ok(await env.exists('busy'))
})

test('deletes an archived tree after the commit point, then cleans references', async () => {
  const res = await env.remove('archivedRoot')
  assert.equal(res.status, 200)
  assert.equal(res.payload.deletedSessions, 2)
  assert.equal(res.payload.removedSchedules, 1)
  assert.equal(await env.exists('archivedRoot'), false)
  assert.equal(await env.exists('archivedChild'), false)
  const caches = await readdir(env.cacheDir)
  assert.ok(!caches.includes('archivedRoot.json') && !caches.includes('archivedChild.json'))
  assert.ok(env.calls.some(([kind, id]) => kind === 'unarchive' && id === 'archivedRoot'))
  assert.ok(env.calls.some(([kind, id]) => kind === 'emit' && id === 'api-session/removed'))
  assert.deepEqual(await readdir(join(env.home, 'trash', 'clean-archived-sessions')), [])
  // Root is locked before its descendants, and every lock is released.
  const locks = env.calls.filter(([kind, , mode]) => kind === 'open' && mode === 'write').map(([, id]) => id)
  assert.deepEqual(locks, ['archivedRoot', 'archivedChild'])
  assert.equal(env.calls.filter(([kind, , mode]) => kind === 'close' && mode === 'write').length, 2)
  // Archived sessions are not listed in the workspace, so nothing is detached.
  assert.ok(!env.calls.some(([kind]) => kind === 'detach'))
})

test('deletes empty and orphaned sessions and keeps the rest', async () => {
  assert.equal((await env.remove('blank')).status, 200)
  assert.equal((await env.remove('ungroupedBlank')).status, 200)
  assert.equal((await env.remove('orphan')).status, 200)
  for (const id of ['blank', 'ungroupedBlank', 'orphan']) assert.equal(await env.exists(id), false, id)
  assert.deepEqual(env.calls.filter(([kind]) => kind === 'detach').map(([, id]) => id), ['blank'])
  for (const id of ['normal', 'staleBlank', 'ungroupedUsed', 'scheduledBlank']) assert.ok(await env.exists(id), id)
})

test('rechecks eligibility under the locks', async () => {
  // Unarchived from another tab after the first check, while the locks are taken.
  env.state.onLock = (id) => { if (id === 'archivedRoot') env.state.archived = env.state.archived.filter(x => x !== 'archivedRoot') }
  assert.equal((await env.remove('archivedRoot')).payload.code, 'not-deletable')
  assert.ok(await env.exists('archivedRoot'))
  assert.ok(!env.calls.some(([kind]) => kind === 'schedule-delete'))
  // A message sent to an empty session before the lock.
  env.state.onLock = (id) => { if (id === 'blank') env.sessions.blank.events = [{ type: 'turn/start' }] }
  assert.equal((await env.remove('blank')).payload.code, 'not-deletable')
  assert.ok(await env.exists('blank'))
})

test('a failed move deletes nothing and keeps references', async () => {
  // A file where the trash directory should be makes every move fail.
  await mkdir(join(env.home, 'trash'), { recursive: true })
  await writeFile(join(env.home, 'trash', 'clean-archived-sessions'), 'not a directory')
  const res = await env.remove('archivedRoot')
  assert.equal(res.status >= 400, true)
  assert.ok(await env.exists('archivedRoot'))
  assert.ok(await env.exists('archivedChild'))
  assert.ok(!env.calls.some(([kind]) => kind === 'schedule-delete' || kind === 'unarchive'))
  assert.deepEqual(env.state.archived, ['archivedRoot', 'busy'])
})
