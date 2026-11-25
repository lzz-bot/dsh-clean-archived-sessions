/**
 * Host half of the clean-archived-sessions bundle. It lists and permanently
 * deletes three kinds of Sessions that the sidebar cannot clean up:
 *
 * - archived Sessions (the Workspace registry's archive set);
 * - empty Sessions: root Sessions with a working directory that never started
 *   a turn, are not live, and no schedule targets. The sidebar hides them, so
 *   they cannot be archived there;
 * - orphaned subagent Sessions whose parent Session no longer exists.
 *
 * Non-empty Sessions outside every Workspace are deliberately excluded: the
 * sidebar lists them under Ungrouped, where they can be archived, and other
 * profiles (CLI, ACP, SDK) sharing the sessions root may still resume them.
 *
 * Deletion contract:
 * - Every Session of the tree (root plus recursive `origin: 'subagent'`
 *   descendants) must be idle and not live in this process. The persistence
 *   write lock of every member is held from before the eligibility recheck
 *   until the files are gone, so no Agent can resume them meanwhile. A live
 *   Session cannot be released without a restart (`in-use`).
 * - Eligibility and activity are checked again under the locks. The directory
 *   move into the trash directory is the commit point; schedules, workspace
 *   membership, pins, caches, and the archive entry are cleaned only after it.
 * - Ordinary forks and shared content-addressed attachments are never removed.
 */

import { mkdir, readdir, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'

export const name = 'clean-archived-sessions'
export const inject = ['webServer', 'workspaceRegistry', 'sessionPersistence']

const LIST_PATH = '/clean-archived-sessions/list'
const DELETE_PATH = '/clean-archived-sessions/delete'
const MAX_BODY_BYTES = 4096
const MAX_ID_LENGTH = 256
/**
 * Stored logs larger than this are never read to test blankness; a blank log
 * holds only a few setup events and stays far below it.
 */
const DEFAULT_BLANK_SCAN_MAX_BYTES = 256 * 1024
/** Session descriptions and blankness reads in flight per listing. */
const LIST_CONCURRENCY = 4
/** Marker file that proves this plugin created the trash directory. */
const TRASH_MARKER = '.dsh-clean-archived-sessions'
/** Name of a staged Session directory: `<session directory>-<epoch ms>`. */
const STAGED_NAME = /^.+-\d{13,}$/
/** Projection keys read from the projection cache as zero-I/O hints. */
const CACHED_KEYS = ['sessionListMetadata', 'turnOutline', 'title']

/** Failure with a stable code the Client localizes. */
class DeleteRefusal extends Error {
  /**
   * @param {string} code - stable refusal code.
   * @param {string} message - English diagnostic.
   * @param {number} status - HTTP status.
   */
  constructor(code, message, status = 409) {
    super(message)
    this.code = code
    this.status = status
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function sendMethodNotAllowed(res, allow) {
  res.statusCode = 405
  res.setHeader('allow', allow)
  res.end()
}

/** Collect a bounded UTF-8 body; null past the ceiling, after draining the rest. */
async function readBoundedBody(req) {
  const chunks = []
  let size = 0
  let overflow = false
  // Keep consuming past the ceiling: leaving the loop early would destroy the
  // request and the 413 response could never be delivered.
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) overflow = true
    else chunks.push(chunk)
  }
  return overflow ? null : Buffer.concat(chunks).toString('utf8')
}

function isOwner(peer) {
  return peer?.principal?.kind === 'owner'
}

function isENOENT(error) {
  return error !== null && typeof error === 'object' && error.code === 'ENOENT'
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error)
}

/** Abort signal that fires when the connection closes before the response finishes. */
function requestSignal(res) {
  const controller = new AbortController()
  // `res` closes after the response is sent or when the client goes away;
  // only the second case aborts. The request stream's own `close` fires as
  // soon as a GET body is consumed, so it is not a disconnect signal.
  res.on?.('close', () => { if (!res.writableEnded) controller.abort() })
  return controller.signal
}

/**
 * Validate the optional row config; misconfiguration fails at load.
 * @param {unknown} config - the row's `config`.
 * @returns {{ trashDir?: string, projectionCacheDir?: string, blankScanMaxBytes: number }}
 */
function resolveConfig(config) {
  const value = config ?? {}
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('clean-archived-sessions: config must be an object')
  const out = { blankScanMaxBytes: DEFAULT_BLANK_SCAN_MAX_BYTES }
  const limit = value.blankScanMaxBytes
  if (limit !== undefined && limit !== null) {
    if (!Number.isSafeInteger(limit) || limit < 0) {
      throw new TypeError('clean-archived-sessions: config.blankScanMaxBytes must be a non-negative integer')
    }
    out.blankScanMaxBytes = limit
  }
  for (const key of ['trashDir', 'projectionCacheDir']) {
    const field = value[key]
    if (field === undefined || field === null) continue
    if (typeof field !== 'string' || !isAbsolute(field)) {
      throw new TypeError(`clean-archived-sessions: config.${key} must be an absolute path`)
    }
    out[key] = resolve(field)
  }
  return out
}

/** Map with at most `limit` operations in flight, preserving input order. */
async function mapLimited(values, limit, operation) {
  const results = new Array(values.length)
  let next = 0
  const worker = async () => {
    while (next < values.length) {
      const index = next++
      results[index] = await operation(values[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker))
  return results
}

export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig)
  const registry = ctx.workspaceRegistry
  const persistence = ctx.sessionPersistence
  let queue = Promise.resolve()

  /** Serialize deletions so two requests never fence or move the same tree. */
  const serialized = (operation) => {
    const result = queue.then(operation)
    queue = result.then(() => {}, () => {})
    return result
  }

  const isLive = id => ctx.get('agents')?.get(id) !== undefined || ctx.get('sessions')?.get(id) !== undefined

  /** Root id plus recursive subagent descendants, root first. */
  function collectTree(rootId, snapshots) {
    const children = new Map()
    for (const { header } of snapshots) {
      if (header.origin !== 'subagent' || header.parentSession === undefined) continue
      const list = children.get(header.parentSession)
      if (list === undefined) children.set(header.parentSession, [header.id])
      else list.push(header.id)
    }
    const order = []
    const seen = new Set()
    const pending = [rootId]
    while (pending.length > 0) {
      const id = pending.shift()
      if (seen.has(id)) continue
      seen.add(id)
      order.push(id)
      for (const child of children.get(id) ?? []) pending.push(child)
    }
    return order
  }

  /**
   * Cached projection values, or undefined. The cache may lag the log, so it
   * is only a hint: `blank: false` is final because blankness only ever turns
   * false, while `blank: true` still needs the log.
   */
  function cachedValues(header) {
    try {
      return ctx.get('sessionProjectionCache')?.cachedSnapshot(header, CACHED_KEYS)?.values
    } catch (error) {
      ctx.logger.debug('clean-archived-sessions: cached projections of %s unavailable: %s', header.id, errorText(error))
      return undefined
    }
  }

  /** Whether an open handle's log has no `turn/start`, the Host's own blankness rule. */
  async function handleIsBlank(handle, signal) {
    const { events } = await handle.read(undefined, undefined, { signal })
    return !events.some(event => event.type === 'turn/start')
  }

  /** Whether a cold stored Session never started a turn; unreadable or large logs count as not blank. */
  async function storedIsBlank(snapshot, signal) {
    if (typeof snapshot.sizeBytes !== 'number' || snapshot.sizeBytes > config.blankScanMaxBytes) return false
    if (cachedValues(snapshot.header)?.sessionListMetadata?.blank === false) return false
    let handle
    try {
      handle = await persistence.open(snapshot.header.id, 'read', { signal })
      return await handleIsBlank(handle, signal)
    } catch (error) {
      if (signal?.aborted) throw error
      ctx.logger.debug('clean-archived-sessions: blankness of %s unavailable: %s', snapshot.header.id, errorText(error))
      return false
    } finally {
      await handle?.close().catch(() => {})
    }
  }

  /** Session ids any stored schedule targets; such Sessions are never offered as empty. */
  async function scheduledIds() {
    const schedule = ctx.get('schedule')
    if (schedule === undefined) return new Set()
    const ids = new Set()
    for (const entry of await schedule.catalog()) {
      if (entry.status !== 'ended' && typeof entry.target?.sessionId === 'string') ids.add(entry.target.sessionId)
    }
    return ids
  }

  /**
   * Classify one stored root without reading its log.
   * @returns {'archived' | 'orphan' | 'blank-candidate' | undefined}
   */
  function classifyHeader(header, stored, archived, scheduled) {
    if (archived.has(header.id)) return 'archived'
    if (header.origin === 'subagent') {
      return header.parentSession === undefined || !stored.has(header.parentSession) ? 'orphan' : undefined
    }
    if (header.cwd === undefined || scheduled.has(header.id) || isLive(header.id)) return undefined
    return 'blank-candidate'
  }

  function describe(sessionId, byId, snapshots, members) {
    const snapshot = byId.get(sessionId)
    if (snapshot === undefined) return { sessionId, missing: true, live: isLive(sessionId), subagentCount: 0 }
    const tree = collectTree(sessionId, snapshots)
    let sizeBytes = 0
    for (const id of tree) sizeBytes += byId.get(id)?.sizeBytes ?? 0
    const cached = cachedValues(snapshot.header)
    const turns = Array.isArray(cached?.turnOutline) ? cached.turnOutline : undefined
    const preview = turns?.find(entry => typeof entry?.prompt === 'string' && entry.prompt.trim() !== '')?.prompt
    const lastPromptAt = cached?.sessionListMetadata?.lastPromptAt
    const title = cached?.title?.title
    return {
      sessionId,
      ...(typeof title === 'string' && title.trim() !== '' ? { title } : {}),
      cwd: snapshot.header.cwd,
      createdAt: snapshot.header.createdAt,
      ...(typeof lastPromptAt === 'number' ? { lastPromptAt } : {}),
      ...(turns === undefined ? {} : { turnCount: turns.length }),
      ...(preview === undefined ? {} : { preview }),
      sizeBytes,
      subagentCount: tree.length - 1,
      subagent: snapshot.header.origin === 'subagent',
      ungrouped: !members.has(sessionId),
      live: tree.some(isLive),
      missing: false,
    }
  }

  function memberIds() {
    const members = new Set()
    for (const workspace of registry.list()) for (const id of workspace.sessionIds) members.add(id)
    return members
  }

  /** Describe archived, empty, and orphaned Sessions without activating any of them. */
  async function listCandidates(signal) {
    const snapshots = await persistence.list({ signal })
    const byId = new Map(snapshots.map(snapshot => [snapshot.header.id, snapshot]))
    const stored = new Set(byId.keys())
    const archived = new Set(registry.archivedSessionIds)
    const scheduled = await scheduledIds()
    const members = memberIds()
    const orphans = []
    const candidates = []
    for (const snapshot of [...snapshots].sort((left, right) => right.header.createdAt - left.header.createdAt)) {
      const kind = classifyHeader(snapshot.header, stored, archived, scheduled)
      if (kind === 'orphan') orphans.push(snapshot.header.id)
      else if (kind === 'blank-candidate') candidates.push(snapshot)
    }
    const flags = await mapLimited(candidates, LIST_CONCURRENCY, snapshot => storedIsBlank(snapshot, signal))
    signal?.throwIfAborted()
    const describeAll = ids => ids.map(id => describe(id, byId, snapshots, members))
    return {
      items: describeAll([...registry.archivedSessionIds]),
      blank: describeAll(candidates.filter((_, index) => flags[index]).map(snapshot => snapshot.header.id))
        .map(item => ({ ...item, blank: true })),
      orphans: describeAll(orphans),
    }
  }

  /**
   * Why one stored root may be deleted, or a refusal.
   * @param {(snapshot) => Promise<boolean>} isBlank - blankness test (cold read, or the held handle).
   * @returns {Promise<'archived' | 'orphan' | 'blank'>}
   */
  async function eligibility(sessionId, snapshots, isBlank) {
    const byId = new Map(snapshots.map(snapshot => [snapshot.header.id, snapshot]))
    const snapshot = byId.get(sessionId)
    if (snapshot === undefined) throw new DeleteRefusal('not-deletable', `session '${sessionId}' is not stored`)
    const kind = classifyHeader(snapshot.header, new Set(byId.keys()), new Set(registry.archivedSessionIds), await scheduledIds())
    if (kind === 'archived' || kind === 'orphan') return kind
    if (kind === 'blank-candidate' && await isBlank(snapshot)) return 'blank'
    if (snapshot.header.origin === 'subagent') {
      throw new DeleteRefusal('subagent', `session '${sessionId}' is a subagent child; delete its root instead`)
    }
    throw new DeleteRefusal('not-deletable', `session '${sessionId}' is not archived, empty, or an orphaned subagent`)
  }

  async function assertIdle(sessionId, tree) {
    if (tree.some(isLive)) throw new DeleteRefusal('in-use', `session '${sessionId}' or a descendant is live in this process`)
    const activity = await ctx.waterfall('workspace/session-activity', { sessionId }, () => Promise.resolve([]))
    if (activity.length > 0) {
      throw new DeleteRefusal('active', `session '${sessionId}' is active: ${activity.map(entry => entry.kind).join(', ')}`)
    }
  }

  /** Session directory of one stored Session, validated to lie under `sessionsRoot`. */
  function sessionDirectoryOf(snapshot, sessionsRoot) {
    const location = snapshot.location
    if (location === undefined || location.kind !== 'jsonl' || typeof location.path !== 'string') {
      throw new DeleteRefusal('unsupported-storage', `session '${snapshot.header.id}' has no JSONL file location`)
    }
    const directory = dirname(resolve(location.path))
    if (sessionsRoot !== undefined && dirname(dirname(directory)) !== sessionsRoot) {
      throw new DeleteRefusal('unsupported-storage', `session '${snapshot.header.id}' lies outside '${sessionsRoot}'`)
    }
    return directory
  }

  /** Take the write lock of one Session, retrying once when a related generation was just published. */
  async function lock(id) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await persistence.open(id, 'write')
      } catch (error) {
        if (error?.name === 'SessionAlreadyOwnedError') throw new DeleteRefusal('in-use', `session '${id}' is held by a writer`)
        if (error?.name === 'JsonlGenerationSourceChangedError' && attempt === 0) continue
        if (error?.name === 'SessionPersistenceCorruptionError' || error?.name === 'SessionFormatUnsupportedError') {
          throw new DeleteRefusal('unreadable', `session '${id}' cannot be read: ${errorText(error)}`)
        }
        throw new DeleteRefusal('open-failed', `session '${id}' could not be locked: ${errorText(error)}`, 500)
      }
    }
  }

  async function settleWorktreeCleanup(ids, warnings) {
    const worktrees = ctx.get('worktrees')
    if (worktrees === undefined) return
    for (const id of ids) {
      try {
        let cleanup = await worktrees.cleanupOf(id, null)
        if (cleanup?.status === 'scheduled') cleanup = await worktrees.cleanupOf(id, cleanup.revision)
        if (cleanup?.status === 'retained' || cleanup?.status === 'failed') {
          warnings.push({ code: 'worktree-retained', sessionId: id })
        }
      } catch (error) {
        warnings.push({ code: 'worktree-unknown', sessionId: id, message: errorText(error) })
      }
    }
  }

  async function removeSchedules(ids, warnings) {
    const schedule = ctx.get('schedule')
    if (schedule === undefined) return 0
    const members = new Set(ids)
    let removed = 0
    try {
      for (const entry of await schedule.catalog()) {
        if (entry.target?.sessionId === undefined || !members.has(entry.target.sessionId)) continue
        try {
          const result = await schedule.edit({ id: entry.id, action: 'delete' })
          if (result?.deleted === true) removed += 1
        } catch (error) {
          warnings.push({ code: 'schedule-delete-failed', scheduleId: entry.id, message: errorText(error) })
        }
      }
    } catch (error) {
      warnings.push({ code: 'schedule-delete-failed', message: errorText(error) })
    }
    return removed
  }

  async function forgetInRegistry(ids, warnings) {
    // Detach only where the id is listed: any Workspace mutation also prunes
    // every accounted id whose cwd no longer validates (entity `mutate`).
    for (const workspace of registry.list()) {
      for (const id of ids) {
        if (!workspace.sessionIds.includes(id)) continue
        try {
          await workspace.detachSession(id)
        } catch (error) {
          warnings.push({ code: 'detach-failed', sessionId: id, message: errorText(error) })
        }
      }
    }
    for (const id of ids) {
      if (!registry.pinnedSessionIds.includes(id)) continue
      try {
        await registry.unpinSession(id)
      } catch (error) {
        warnings.push({ code: 'unpin-failed', sessionId: id, message: errorText(error) })
      }
    }
  }

  async function leaveArchive(ids, warnings) {
    for (const id of ids) {
      if (!registry.archivedSessionIds.includes(id)) continue
      try {
        await registry.unarchiveSession(id)
      } catch (error) {
        warnings.push({ code: 'unarchive-failed', sessionId: id, message: errorText(error) })
      }
    }
  }

  /**
   * Make sure the trash directory exists and belongs to this plugin. A new or
   * empty directory is claimed with a marker file; an existing non-empty
   * directory without the marker is refused, so a `trashDir` pointed at a
   * shared folder never has its contents touched.
   */
  async function claimTrash(trashDir) {
    await mkdir(trashDir, { recursive: true, mode: 0o700 })
    const entries = await readdir(trashDir)
    if (entries.includes(TRASH_MARKER)) return
    if (entries.length > 0) {
      throw new DeleteRefusal('bad-config', `trashDir '${trashDir}' is not empty and was not created by this plugin`, 500)
    }
    await writeFile(join(trashDir, TRASH_MARKER), 'Staging directory of dsh-clean-archived-sessions.\n', { flag: 'wx' })
      .catch((error) => { if (error?.code !== 'EEXIST') throw error })
  }

  /** Remove leftovers of earlier deletions whose final removal failed; only this plugin's staged directories match. */
  async function sweepTrash(trashDir) {
    for (const entry of await readdir(trashDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !STAGED_NAME.test(entry.name)) continue
      await rm(join(trashDir, entry.name), { recursive: true, force: true }).catch((error) => {
        ctx.logger.warn('clean-archived-sessions: trash leftover %s not removed: %s', entry.name, errorText(error))
      })
    }
  }

  /**
   * Commit point: move every directory into the trash directory, or none.
   * A trash directory on another filesystem cannot take a rename; the tree is
   * then removed in place, which can stop partway.
   * @returns {Promise<string[]>} staged paths to remove afterwards.
   */
  async function stageDirectories(directories, trashDir) {
    const stamp = Date.now()
    const moved = []
    for (const directory of directories) {
      const target = join(trashDir, `${basename(directory)}-${stamp}`)
      try {
        await rename(directory, target)
        moved.push([directory, target])
      } catch (error) {
        if (error?.code === 'EXDEV' && moved.length === 0) return removeInPlace(directories)
        for (const [original, staged] of moved.reverse()) {
          await rename(staged, original).catch((rollback) => {
            ctx.logger.warn('clean-archived-sessions: restoring %s failed: %s', original, errorText(rollback))
          })
        }
        throw new DeleteRefusal('move-failed', `moving '${directory}' failed: ${errorText(error)}`, 500)
      }
    }
    return moved.map(([, staged]) => staged)
  }

  async function removeInPlace(directories) {
    let removed = 0
    for (const directory of directories) {
      try {
        await rm(directory, { recursive: true, force: true })
      } catch (error) {
        if (removed === 0) throw new DeleteRefusal('move-failed', `removing '${directory}' failed: ${errorText(error)}`, 500)
        throw new DeleteRefusal('partial', `removed ${removed} of ${directories.length} sessions, then failed: ${errorText(error)}`, 500)
      }
      removed += 1
    }
    return []
  }

  /**
   * Permanently delete one archived, empty, or orphaned Session tree.
   * @param {string} sessionId - root Session to delete.
   * @returns {Promise<object>} deletion summary.
   */
  async function deleteSession(sessionId) {
    const warnings = []
    const before = await persistence.list()
    const byIdBefore = new Map(before.map(snapshot => [snapshot.header.id, snapshot]))
    if (!byIdBefore.has(sessionId)) {
      // An archived id whose files are gone, or whose header DSH cannot read.
      if (!registry.archivedSessionIds.includes(sessionId)) {
        throw new DeleteRefusal('not-deletable', `session '${sessionId}' is not stored`)
      }
      if (isLive(sessionId)) throw new DeleteRefusal('in-use', `session '${sessionId}' is live in this process`)
      await forgetInRegistry([sessionId], warnings)
      await leaveArchive([sessionId], warnings)
      return { sessionId, deletedSessions: 0, removedSchedules: 0, warnings, alreadyMissing: true }
    }
    await eligibility(sessionId, before, snapshot => storedIsBlank(snapshot))
    const treeBefore = collectTree(sessionId, before)
    await assertIdle(sessionId, treeBefore)

    const rootDirectory = sessionDirectoryOf(byIdBefore.get(sessionId), undefined)
    const sessionsRoot = dirname(dirname(rootDirectory))
    const home = dirname(sessionsRoot)
    const trashDir = config.trashDir ?? join(home, 'trash', 'clean-archived-sessions')
    const projectionCacheDir = config.projectionCacheDir ?? join(home, 'storages', 'session_projcache', 'sessions')
    // The trash directory must neither contain nor lie inside the sessions root.
    if (trashDir === sessionsRoot || trashDir.startsWith(sessionsRoot + sep) || sessionsRoot.startsWith(trashDir + sep)) {
      throw new DeleteRefusal('bad-config', `trashDir '${trashDir}' must not contain or lie inside '${sessionsRoot}'`, 500)
    }

    // Fence: lock root first, then descendants, so publishing a migrated root
    // generation happens before its children change.
    const handles = new Map()
    let tree
    let staged = []
    try {
      for (const id of treeBefore) handles.set(id, await lock(id))
      await settleWorktreeCleanup(treeBefore, warnings)

      // Recheck everything under the locks, right before the commit point.
      const now = await persistence.list()
      tree = collectTree(sessionId, now)
      for (const id of tree) if (!handles.has(id)) handles.set(id, await lock(id))
      await eligibility(sessionId, now, () => handleIsBlank(handles.get(sessionId)))
      await assertIdle(sessionId, tree)
      const byId = new Map(now.map(snapshot => [snapshot.header.id, snapshot]))
      const directories = [...tree].reverse().map(id => sessionDirectoryOf(byId.get(id), sessionsRoot))

      await claimTrash(trashDir)
      await sweepTrash(trashDir)
      staged = await stageDirectories(directories, trashDir)
    } finally {
      for (const handle of handles.values()) {
        try {
          await handle.close()
        } catch (error) {
          ctx.logger.warn('clean-archived-sessions: releasing %s failed: %s', handle.id, errorText(error))
        }
      }
    }

    // After the commit point: clean references, then the staged files.
    const removedSchedules = await removeSchedules(tree, warnings)
    await forgetInRegistry(tree, warnings)
    for (const id of tree) {
      try {
        await unlink(join(projectionCacheDir, `${id}.json`))
      } catch (error) {
        if (!isENOENT(error)) warnings.push({ code: 'cache-delete-failed', sessionId: id, message: errorText(error) })
      }
    }
    for (const path of staged) {
      try {
        await rm(path, { recursive: true, force: true })
      } catch (error) {
        warnings.push({ code: 'trash-cleanup-failed', path, message: errorText(error) })
      }
    }
    await leaveArchive(tree, warnings)
    for (const id of tree) ctx.emit('api-session/removed', id)
    ctx.logger.info('clean-archived-sessions: deleted session %s (%d sessions)', sessionId, tree.length)
    return { sessionId, deletedSessions: tree.length, removedSchedules, warnings, alreadyMissing: false }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    auth: 'required',
    path: LIST_PATH,
    handler: async (req, res, peer) => {
      if (!isOwner(peer)) return sendJson(res, 403, { code: 'forbidden', message: 'owner access required' })
      if (req.method !== 'GET') return sendMethodNotAllowed(res, 'GET')
      const signal = requestSignal(res)
      try {
        sendJson(res, 200, await listCandidates(signal))
      } catch (error) {
        if (signal.aborted) return
        ctx.logger.warn('clean-archived-sessions: listing failed: %s', errorText(error))
        sendJson(res, 500, { code: 'list-failed', message: errorText(error) })
      }
    },
  }), `clean-archived-sessions: GET ${LIST_PATH}`)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    auth: 'required',
    path: DELETE_PATH,
    handler: async (req, res, peer) => {
      if (!isOwner(peer)) return sendJson(res, 403, { code: 'forbidden', message: 'owner access required' })
      if (req.method !== 'POST') return sendMethodNotAllowed(res, 'POST')
      const essence = String(req.headers['content-type']).split(';', 1)[0]?.trim().toLowerCase()
      if (essence !== 'application/json') {
        return sendJson(res, 415, { code: 'unsupported-media-type', message: 'content-type must be application/json' })
      }
      let text
      try {
        text = await readBoundedBody(req)
      } catch {
        // Connection errors mid-body leave nothing to answer precisely.
        return sendJson(res, 400, { code: 'bad-request', message: 'request body unreadable' })
      }
      if (text === null) return sendJson(res, 413, { code: 'payload-too-large', message: 'request body is too large' })
      let sessionId
      try {
        sessionId = JSON.parse(text)?.sessionId
      } catch {
        // Malformed JSON is reported as a bad request below.
        sessionId = undefined
      }
      if (typeof sessionId !== 'string' || sessionId === '' || sessionId.length > MAX_ID_LENGTH) {
        return sendJson(res, 400, { code: 'bad-request', message: 'body must be JSON with a string "sessionId"' })
      }
      try {
        sendJson(res, 200, await serialized(() => deleteSession(sessionId)))
      } catch (error) {
        if (error instanceof DeleteRefusal) {
          return sendJson(res, error.status, { code: error.code, message: error.message })
        }
        ctx.logger.warn('clean-archived-sessions: deleting %s failed: %s', sessionId, errorText(error))
        sendJson(res, 500, { code: 'delete-failed', message: errorText(error) })
      }
    },
  }), `clean-archived-sessions: POST ${DELETE_PATH}`)
}
