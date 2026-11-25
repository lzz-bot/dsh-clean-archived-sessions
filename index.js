/**
 * Host half of the clean-archived-sessions bundle: lists archived Sessions, unlisted
 * Sessions (root Sessions that no registered Workspace accounts and that are
 * not archived, typically left behind when a Workspace was removed), and blank
 * Workspace members (never started a turn, hidden by the sidebar),
 * and permanently deletes one of them together with its subagent descendants.
 * Both operations are owner-only HTTP routes that the Client half calls with
 * document-relative fetches.
 *
 * Deletion contract:
 * - Only an archived Session, an unlisted Session, or a blank Workspace member
 *   (no `turn/start`, not live, rechecked under the write lock) can be deleted;
 *   any other Session must be archived first.
 * - Every Session of the tree (root plus recursive `origin: 'subagent'`
 *   descendants) must be idle and not live in this process; the persistence
 *   write lock of every member is held while files are removed, so no Agent
 *   can resume them meanwhile. A live Session cannot be released without a
 *   restart, so the request is refused with `in-use`.
 * - Ordinary forks are independent conversations and are never removed.
 * - Shared content-addressed attachments are never removed.
 */

import { mkdir, rename, rm, unlink } from 'node:fs/promises'
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

/** Collect a bounded UTF-8 body; null past the ceiling (stream drained). */
async function readBoundedBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      req.resume()
      return null
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size).toString('utf8')
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

export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig)
  const registry = ctx.workspaceRegistry
  const persistence = ctx.sessionPersistence
  let queue = Promise.resolve()

  /** Serialize deletions so two requests never fence or rename the same tree. */
  const serialized = (operation) => {
    const result = queue.then(operation)
    queue = result.then(() => {}, () => {})
    return result
  }

  const isLive = id => ctx.get('agents')?.get(id) !== undefined || ctx.get('sessions')?.get(id) !== undefined

  /**
   * Root id plus recursive subagent descendants, root first.
   * @param {string} rootId - tree root.
   * @param {readonly any[]} snapshots - persistence listing.
   */
  function collectTree(rootId, snapshots) {
    const children = new Map()
    for (const snapshot of snapshots) {
      const header = snapshot.header
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

  async function readTitle(id) {
    const query = ctx.get('sessionQuery')
    if (query === undefined) return undefined
    try {
      const snapshot = await query.readTitle(id)
      return typeof snapshot?.title === 'string' && snapshot.title.trim() !== '' ? snapshot.title : undefined
    } catch (error) {
      ctx.logger.debug('clean-archived-sessions: title of %s unavailable: %s', id, errorText(error))
      return undefined
    }
  }

  /**
   * Root Sessions that no grouping surface shows: neither archived nor a
   * member of any registered Workspace. Subagent children count as roots only
   * when their parent Session no longer exists.
   * @param {readonly any[]} snapshots - persistence listing.
   * @returns {string[]} ids, newest first.
   */
  function collectUnlisted(snapshots) {
    const stored = new Set(snapshots.map(snapshot => snapshot.header.id))
    const archived = new Set(registry.archivedSessionIds)
    const members = new Set()
    for (const workspace of registry.list()) for (const id of workspace.sessionIds) members.add(id)
    return snapshots
      .filter(({ header }) => {
        if (archived.has(header.id) || members.has(header.id)) return false
        if (header.origin === 'subagent') return header.parentSession === undefined || !stored.has(header.parentSession)
        return true
      })
      .sort((left, right) => right.header.createdAt - left.header.createdAt)
      .map(snapshot => snapshot.header.id)
  }

  /** Whether an open handle's log has no `turn/start`, the Host's own blankness rule. */
  async function handleIsBlank(handle) {
    const { events } = await handle.read()
    return !events.some(event => event.type === 'turn/start')
  }

  /**
   * Whether a cold stored Session never started a turn. Logs above the scan
   * limit and unreadable logs count as not blank, so they are never offered.
   */
  async function storedIsBlank(snapshot) {
    if (typeof snapshot.sizeBytes !== 'number' || snapshot.sizeBytes > config.blankScanMaxBytes) return false
    let handle
    try {
      handle = await persistence.open(snapshot.header.id, 'read')
      return await handleIsBlank(handle)
    } catch (error) {
      ctx.logger.debug('clean-archived-sessions: blankness of %s unavailable: %s', snapshot.header.id, errorText(error))
      return false
    } finally {
      await handle?.close().catch(() => {})
    }
  }

  /**
   * Workspace members that never started a turn and are not live. The sidebar
   * hides such Sessions except the selected provisional one, so they cannot be
   * archived there. Live blank Sessions (for example an open New session) are
   * excluded.
   * @param {readonly any[]} snapshots - persistence listing.
   * @returns {Promise<string[]>} ids, newest first.
   */
  async function collectBlank(snapshots) {
    const archived = new Set(registry.archivedSessionIds)
    const members = new Set()
    for (const workspace of registry.list()) for (const id of workspace.sessionIds) members.add(id)
    const candidates = snapshots
      .filter(({ header }) => members.has(header.id) && !archived.has(header.id)
        && header.origin !== 'subagent' && !isLive(header.id))
      .sort((left, right) => right.header.createdAt - left.header.createdAt)
    const blank = []
    for (const snapshot of candidates) {
      if (await storedIsBlank(snapshot)) blank.push(snapshot.header.id)
    }
    return blank
  }

  async function describe(sessionId, byId, snapshots) {
    const snapshot = byId.get(sessionId)
    if (snapshot === undefined) return { sessionId, missing: true, live: isLive(sessionId), subagentCount: 0 }
    const tree = collectTree(sessionId, snapshots)
    let sizeBytes = 0
    for (const id of tree) sizeBytes += byId.get(id)?.sizeBytes ?? 0
    return {
      sessionId,
      title: await readTitle(sessionId),
      cwd: snapshot.header.cwd,
      createdAt: snapshot.header.createdAt,
      sizeBytes,
      subagentCount: tree.length - 1,
      subagent: snapshot.header.origin === 'subagent',
      live: tree.some(isLive),
      missing: false,
    }
  }

  /** Describe every archived, unlisted, and blank Session without activating any of them. */
  async function listCandidates() {
    const archived = [...registry.archivedSessionIds]
    const snapshots = await persistence.list()
    const byId = new Map(snapshots.map(snapshot => [snapshot.header.id, snapshot]))
    const items = []
    for (const sessionId of archived) items.push(await describe(sessionId, byId, snapshots))
    const unlisted = []
    for (const sessionId of collectUnlisted(snapshots)) unlisted.push(await describe(sessionId, byId, snapshots))
    const blank = []
    for (const sessionId of await collectBlank(snapshots)) blank.push({ ...await describe(sessionId, byId, snapshots), blank: true })
    return { items, unlisted, blank }
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
    for (const entry of await schedule.catalog()) {
      if (entry.target?.sessionId === undefined || !members.has(entry.target.sessionId)) continue
      try {
        const result = await schedule.edit({ id: entry.id, action: 'delete' })
        if (result?.deleted === true) removed += 1
      } catch (error) {
        warnings.push({ code: 'schedule-delete-failed', scheduleId: entry.id, message: errorText(error) })
      }
    }
    return removed
  }

  async function forgetInRegistry(ids, warnings) {
    // `sessionIds` hides accounted ids whose cwd no longer validates, so detach
    // from every Workspace; detaching an absent id writes nothing.
    for (const workspace of registry.list()) {
      for (const id of ids) {
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

  /** Move one Session directory out of the scanned root, then remove it. */
  async function removeSessionDirectory(directory, trashDir, warnings) {
    const target = join(trashDir, `${basename(directory)}-${Date.now()}`)
    await rename(directory, target)
    try {
      await rm(target, { recursive: true, force: true })
    } catch (error) {
      warnings.push({ code: 'trash-cleanup-failed', path: target, message: errorText(error) })
    }
  }

  /**
   * Permanently delete one archived or unlisted Session tree.
   * @param {string} sessionId - archived root Session, or a root no Workspace lists.
   * @returns {Promise<object>} deletion summary.
   */
  async function deleteSession(sessionId) {
    const warnings = []
    const snapshots = await persistence.list()
    const byId = new Map(snapshots.map(snapshot => [snapshot.header.id, snapshot]))
    const archived = registry.archivedSessionIds.includes(sessionId)
    const unlisted = !archived && collectUnlisted(snapshots).includes(sessionId)
    // A visible workspace member qualifies only while blank; that is rechecked under the write lock.
    const requireBlank = !archived && !unlisted
    if (requireBlank) {
      const snapshot = byId.get(sessionId)
      const member = registry.list().some(workspace => workspace.sessionIds.includes(sessionId))
      if (snapshot === undefined || !member || snapshot.header.origin === 'subagent' || !(await storedIsBlank(snapshot))) {
        throw new DeleteRefusal('not-deletable', `session '${sessionId}' is not archived, not outside every workspace, and not blank`)
      }
    }
    const root = byId.get(sessionId)
    if (root === undefined) {
      // Only an archived id can lack files: drop the stale registry entries only.
      if (isLive(sessionId)) throw new DeleteRefusal('in-use', `session '${sessionId}' is live in this process`)
      await forgetInRegistry([sessionId], warnings)
      await registry.unarchiveSession(sessionId)
      return { sessionId, deletedSessions: 0, removedSchedules: 0, warnings, alreadyMissing: true }
    }
    const parent = root.header.parentSession
    if (root.header.origin === 'subagent' && parent !== undefined && byId.has(parent)) {
      throw new DeleteRefusal('subagent', `session '${sessionId}' is a subagent child; delete its root instead`)
    }

    const tree = collectTree(sessionId, snapshots)
    if (tree.some(isLive)) throw new DeleteRefusal('in-use', `session '${sessionId}' or a descendant is live in this process`)
    const activity = await ctx.waterfall('workspace/session-activity', { sessionId }, () => Promise.resolve([]))
    if (activity.length > 0) {
      throw new DeleteRefusal('active', `session '${sessionId}' is active: ${activity.map(entry => entry.kind).join(', ')}`)
    }

    const rootDirectory = sessionDirectoryOf(root, undefined)
    const sessionsRoot = dirname(dirname(rootDirectory))
    const home = dirname(sessionsRoot)
    const trashDir = config.trashDir ?? join(home, 'trash', 'clean-archived-sessions')
    const projectionCacheDir = config.projectionCacheDir ?? join(home, 'storages', 'session_projcache', 'sessions')
    if (trashDir === sessionsRoot || trashDir.startsWith(sessionsRoot + sep)) {
      throw new DeleteRefusal('bad-config', `trashDir '${trashDir}' must lie outside '${sessionsRoot}'`, 500)
    }
    const directories = new Map(tree.map(id => [id, sessionDirectoryOf(byId.get(id), sessionsRoot)]))

    // Fence: hold every member's write lock, leaves first, so nothing resumes them meanwhile.
    const handles = []
    let removedSchedules = 0
    try {
      for (const id of [...tree].reverse()) {
        try {
          handles.push(await persistence.open(id, 'write'))
        } catch (error) {
          if (error?.name === 'SessionAlreadyOwnedError') {
            throw new DeleteRefusal('in-use', `session '${id}' is held by a writer`)
          }
          throw new DeleteRefusal('open-failed', `session '${id}' could not be locked: ${errorText(error)}`, 500)
        }
      }
      if (tree.some(isLive)) throw new DeleteRefusal('in-use', `session '${sessionId}' became live`)
      if (requireBlank) {
        const rootHandle = handles.find(handle => handle.id === sessionId)
        if (rootHandle === undefined || !(await handleIsBlank(rootHandle))) {
          throw new DeleteRefusal('not-blank', `session '${sessionId}' started a conversation`)
        }
      }

      await settleWorktreeCleanup(tree, warnings)
      removedSchedules = await removeSchedules(tree, warnings)
      await forgetInRegistry(tree, warnings)

      await mkdir(trashDir, { recursive: true, mode: 0o700 })
      let removedDirectories = 0
      for (const id of [...tree].reverse()) {
        try {
          await removeSessionDirectory(directories.get(id), trashDir, warnings)
        } catch (error) {
          if (removedDirectories === 0) throw error
          throw new DeleteRefusal('partial', `removed ${removedDirectories} of ${tree.length} sessions, then failed: ${errorText(error)}`, 500)
        }
        removedDirectories += 1
        try {
          await unlink(join(projectionCacheDir, `${id}.json`))
        } catch (error) {
          if (!isENOENT(error)) warnings.push({ code: 'cache-delete-failed', sessionId: id, message: errorText(error) })
        }
      }
    } finally {
      for (const handle of handles) {
        try {
          await handle.close()
        } catch (error) {
          ctx.logger.warn('clean-archived-sessions: releasing %s failed: %s', handle.id, errorText(error))
        }
      }
    }

    // Last: leave the archive set only after the files are gone.
    for (const id of tree) {
      if (!registry.archivedSessionIds.includes(id)) continue
      await registry.unarchiveSession(id)
    }
    ctx.emit('api-session/removed', sessionId)
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
      try {
        sendJson(res, 200, await listCandidates())
      } catch (error) {
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
