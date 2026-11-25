/** Client half of the clean-archived-sessions bundle: the Settings > Clean up archived sessions page. */
window.__ModuleLoader__.load({
  id: 'dsh-clean-archived-sessions',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'cleanArchivedSessions'
    const LIST_ROUTE = 'clean-archived-sessions/list'
    const DELETE_ROUTE = 'clean-archived-sessions/delete'

    const messages = {
      en: {
        nav: 'Clean up archived sessions',
        title: 'Clean up archived sessions',
        intro: 'Archived sessions are hidden from the sidebar. Deleting one permanently removes its conversation log, its subagent sessions, and cached data from this computer. Forks and attachments are kept.',
        loading: 'Loading archived sessions…',
        empty: 'No archived sessions.',
        loadFailed: 'Could not load archived sessions.',
        retry: 'Retry',
        untitled: 'Untitled session',
        created: 'Created {date}',
        'subagents.one': '{count} subagent session',
        'subagents.other': '{count} subagent sessions',
        missing: 'Files already removed',
        blank: 'Empty session',
        orphanSubagent: 'Subagent session whose parent was deleted',
        unlistedTitle: 'Sessions outside every workspace',
        unlistedIntro: 'These sessions do not belong to any workspace in the sidebar, usually because their workspace was removed, so they cannot be opened or archived. Their files remain on this computer until you delete them.',
        blankTitle: 'Empty sessions',
        blankIntro: 'These sessions were created but never received a message. The sidebar hides them, so they cannot be archived there. The empty session you have open now is not listed.',
        inUse: 'This session or one of its subagent sessions was opened in this run. Restart DeepSeek Harness to delete it.',
        unarchive: 'Unarchive',
        unarchiving: 'Unarchiving…',
        delete: 'Delete',
        deleting: 'Deleting…',
        confirm: 'Permanently delete this session? This cannot be undone.',
        confirmDelete: 'Delete permanently',
        cancel: 'Cancel',
        dismiss: 'Dismiss',
        deleted: 'Deleted “{title}”.',
        deletedWithWarnings: 'Deleted “{title}”, but some cleanup needs attention:',
        'warning.worktree-retained': 'A Git worktree created by this session was kept on disk. Remove it with git worktree remove if you no longer need it.',
        'warning.worktree-unknown': 'The state of a Git worktree created by this session could not be checked.',
        'warning.schedule-delete-failed': 'A scheduled task targeting this session could not be deleted. Delete it from the task manager.',
        'warning.detach-failed': 'The session could not be removed from its workspace list. It will be cleaned up after a restart.',
        'warning.unpin-failed': 'The session could not be unpinned. It will be cleaned up after a restart.',
        'warning.trash-cleanup-failed': 'Some files were left in the DeepSeek Harness trash folder (~/.dsh/trash).',
        'warning.cache-delete-failed': 'A cached summary of the session could not be removed.',
        'warning.other': 'Another cleanup step failed.',
        'error.in-use': 'The session is in use in this run. Restart DeepSeek Harness, then delete it.',
        'error.active': 'The session still has running work. Stop it first.',
        'error.not-deletable': 'Only archived sessions, sessions outside every workspace, and empty sessions can be deleted.',
        'error.not-blank': 'This session now has messages. Archive it first if you want to delete it.',
        'error.subagent': 'Subagent sessions are deleted together with their parent session.',
        'error.unsupported-storage': 'This session storage is not supported for deletion.',
        'error.forbidden': 'Only the owner of this DeepSeek Harness can delete sessions.',
        'error.partial': 'Deletion stopped partway; part of the session was already removed. Retry to finish.',
        'error.generic': 'Delete failed. Details: {message}',
      },
      zh: {
        nav: '清理归档会话',
        title: '清理归档会话',
        intro: '已归档的会话不会显示在侧边栏中。删除后，会话日志、它的子智能体会话和缓存数据会从本机永久移除；分叉会话和附件会保留。',
        loading: '正在加载已归档会话…',
        empty: '没有已归档的会话。',
        loadFailed: '无法加载已归档会话。',
        retry: '重试',
        untitled: '未命名会话',
        created: '创建于 {date}',
        'subagents.one': '{count} 个子智能体会话',
        'subagents.other': '{count} 个子智能体会话',
        missing: '文件已不存在',
        blank: '空会话',
        orphanSubagent: '父会话已删除的子智能体会话',
        unlistedTitle: '不属于任何工作区的会话',
        unlistedIntro: '这些会话不属于侧边栏中的任何工作区（通常是所在工作区已被移除），因此无法打开或归档，但文件仍保留在本机，直到你删除它们。',
        blankTitle: '空会话',
        blankIntro: '这些会话创建后从未发送过消息。侧边栏会隐藏它们，因此无法在那里归档。你当前打开的空会话不会列在这里。',
        inUse: '该会话或它的子智能体会话在本次运行中打开过，重启 DeepSeek Harness 后才能删除。',
        unarchive: '取消归档',
        unarchiving: '正在取消归档…',
        delete: '删除',
        deleting: '正在删除…',
        confirm: '永久删除这个会话？此操作无法撤销。',
        confirmDelete: '永久删除',
        cancel: '取消',
        dismiss: '关闭',
        deleted: '已删除“{title}”。',
        deletedWithWarnings: '已删除“{title}”，但以下清理需要留意：',
        'warning.worktree-retained': '该会话创建的 Git worktree 仍保留在磁盘上。不再需要时，可用 git worktree remove 删除。',
        'warning.worktree-unknown': '无法确认该会话创建的 Git worktree 的状态。',
        'warning.schedule-delete-failed': '有指向该会话的定时任务未能删除，请在任务管理中删除。',
        'warning.detach-failed': '未能把会话从工作区列表中移除，重启后会自动清理。',
        'warning.unpin-failed': '未能取消置顶，重启后会自动清理。',
        'warning.trash-cleanup-failed': '部分文件留在了 DeepSeek Harness 回收目录（~/.dsh/trash）中。',
        'warning.cache-delete-failed': '未能删除该会话的缓存摘要。',
        'warning.other': '另有一个清理步骤失败。',
        'error.in-use': '该会话在本次运行中正在使用。请重启 DeepSeek Harness 后再删除。',
        'error.active': '该会话仍有正在运行的任务，请先停止。',
        'error.not-deletable': '只能删除已归档的会话、不属于任何工作区的会话或空会话。',
        'error.not-blank': '该会话现在已有消息。如需删除，请先归档。',
        'error.subagent': '子智能体会话会随父会话一起删除。',
        'error.unsupported-storage': '当前的会话存储方式不支持删除。',
        'error.forbidden': '只有这台 DeepSeek Harness 的所有者可以删除会话。',
        'error.partial': '删除中途停止，会话的一部分已被移除。请重试以完成删除。',
        'error.generic': '删除失败。详情：{message}',
      },
    }

    const KNOWN_ERRORS = new Set(['in-use', 'active', 'not-deletable', 'not-blank', 'subagent', 'unsupported-storage', 'forbidden', 'partial'])
    const KNOWN_WARNINGS = new Set([
      'worktree-retained', 'worktree-unknown', 'schedule-delete-failed', 'detach-failed', 'unpin-failed',
      'trash-cleanup-failed', 'cache-delete-failed',
    ])

    const css = `
.dshCleanArchived-page { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 720px; min-width: 0; color: var(--dsw-alias-label-primary); }
.dshCleanArchived-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
.dshCleanArchived-title:focus { outline: none; }
.dshCleanArchived-subtitle { margin: 12px 0 0; font-size: 14px; line-height: 22px; font-weight: 500; }
.dshCleanArchived-intro { margin: 0 0 4px; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-tertiary); }
.dshCleanArchived-card { display: flex; flex-direction: column; min-width: 0; box-sizing: border-box; margin: 0; padding: 4px 16px; list-style: none; border: 0.5px solid var(--dsw-alias-settings-card-stroke); border-radius: var(--dsw-radius-xl); background: var(--dsw-alias-settings-card-fill); }
.dshCleanArchived-row { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; min-width: 0; }
.dshCleanArchived-row + .dshCleanArchived-row { border-top: 0.5px solid var(--dsw-alias-border-l2); }
.dshCleanArchived-main { display: flex; align-items: center; gap: 12px; min-width: 0; }
.dshCleanArchived-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.dshCleanArchived-name { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshCleanArchived-meta { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dshCleanArchived-path { font-family: var(--dsw-font-mono); }
.dshCleanArchived-caution { display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 8px 12px; border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-state-warn-tertiary); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-primary); }
.dshCleanArchived-cautionIcon { flex: none; margin-top: 2px; color: var(--dsw-alias-state-warn-primary); }
.dshCleanArchived-cautionBody { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.dshCleanArchived-cautionBody p, .dshCleanArchived-cautionBody ul { margin: 0; }
.dshCleanArchived-cautionBody ul { padding-inline-start: 1.2em; }
.dshCleanArchived-error { margin: 0; padding: 8px 12px; border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); font-size: 13px; line-height: 20px; color: var(--dsw-alias-state-error-primary); overflow-wrap: anywhere; }
.dshCleanArchived-status { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dshCleanArchived-actions { display: flex; flex: none; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 8px; }
.dshCleanArchived-confirm { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; padding: 8px 12px; border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); }
.dshCleanArchived-confirmText { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-state-error-primary); }
.dshCleanArchived-button { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; height: 28px; padding: 0 10px; border: 0.5px solid transparent; border-radius: var(--dsw-radius-sm); font: inherit; font-size: 12px; line-height: 18px; white-space: nowrap; cursor: pointer; color: var(--dsw-alias-label-primary); background: transparent; box-shadow: inset 0 0 0 0.5px var(--dsw-alias-border-l3); }
.dshCleanArchived-button:disabled { cursor: not-allowed; opacity: 0.4; }
.dshCleanArchived-button:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); outline-offset: 1px; }
.dshCleanArchived-danger { color: var(--dsw-alias-state-error-primary); }
.dshCleanArchived-dangerFilled { color: var(--dsw-alias-label-primary-foreground); background: var(--dsw-alias-state-error-primary); box-shadow: none; }
@media (hover: hover) {
  .dshCleanArchived-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
  .dshCleanArchived-danger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger, var(--dsw-alias-interactive-bg-hover)); }
  .dshCleanArchived-dangerFilled:hover:not(:disabled) { background: var(--dsw-alias-state-error-primary); opacity: 0.88; }
}
`

    /** Error carrying the Host refusal code. */
    class RouteError extends Error {
      constructor(code, message) {
        super(message)
        this.code = code
      }
    }

    async function readJson(response) {
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        throw new RouteError(body?.code ?? `http-${response.status}`, body?.message ?? `HTTP ${response.status}`)
      }
      return body
    }

    async function fetchList(signal) {
      return readJson(await fetch(LIST_ROUTE, { method: 'GET', headers: { accept: 'application/json' }, signal }))
    }

    async function postDelete(sessionId) {
      return readJson(await fetch(DELETE_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }))
    }

    function formatBytes(bytes) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return ''
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }

    function errorMessage(t, error) {
      const code = error instanceof RouteError ? error.code : undefined
      if (code !== undefined && KNOWN_ERRORS.has(code)) return t(`error.${code}`)
      return t('error.generic', { message: error instanceof Error ? error.message : String(error) })
    }

    function warningMessages(t, warnings) {
      const codes = [...new Set((warnings ?? []).map(warning => warning.code))]
      return codes.map(code => t(KNOWN_WARNINGS.has(code) ? `warning.${code}` : 'warning.other'))
    }

    function WarningIcon() {
      return h('svg', { className: 'dshCleanArchived-cautionIcon', width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true },
        h('path', { d: 'M8 1.5 15 14H1z', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round' }),
        h('path', { d: 'M8 6v4M8 11.6v.4', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }))
    }

    function ArchivedRow({ t, item, title, blank, busyKind, formatDate, onDelete, onUnarchive }) {
      const [confirming, setConfirming] = React.useState(false)
      const [error, setError] = React.useState(null)
      const deleteButton = React.useRef(null)
      const ids = React.useMemo(() => {
        const base = `dshCleanArchived-${item.sessionId.replace(/[^A-Za-z0-9_-]/g, '_')}`
        return { note: `${base}-note`, confirm: `${base}-confirm` }
      }, [item.sessionId])
      const busy = busyKind !== null
      const meta = []
      if (item.cwd) meta.push(h('span', { key: 'cwd', className: 'dshCleanArchived-path' }, item.cwd))
      if (typeof item.createdAt === 'number') meta.push(h('span', { key: 'at' }, t('created', { date: formatDate(item.createdAt) })))
      if (item.sizeBytes !== undefined) meta.push(h('span', { key: 'size' }, formatBytes(item.sizeBytes)))
      if (item.subagentCount > 0) {
        meta.push(h('span', { key: 'sub' }, t(item.subagentCount === 1 ? 'subagents.one' : 'subagents.other', { count: String(item.subagentCount) })))
      }
      if (item.missing) meta.push(h('span', { key: 'missing' }, t('missing')))
      if (blank || item.blank === true) meta.push(h('span', { key: 'blank' }, t('blank')))
      if (item.subagent) meta.push(h('span', { key: 'orphan' }, t('orphanSubagent')))
      const joined = meta.flatMap((part, index) => index === 0 ? [part] : [' · ', part])
      const cancel = () => {
        setConfirming(false)
        // The button row re-renders after this commit; focus it on the next frame.
        requestAnimationFrame(() => deleteButton.current?.focus())
      }
      const run = async (operation) => {
        setError(null)
        try {
          await operation()
        } catch (reason) {
          setError(errorMessage(t, reason))
        }
      }
      return h('li', { className: 'dshCleanArchived-row', 'aria-busy': busy || undefined },
        h('div', { className: 'dshCleanArchived-main' },
          h('div', { className: 'dshCleanArchived-text' },
            h('p', { className: 'dshCleanArchived-name', title }, title),
            h('p', { className: 'dshCleanArchived-meta' }, joined)),
          !confirming && h('div', { className: 'dshCleanArchived-actions' },
            onUnarchive !== undefined && h('button', {
              type: 'button', className: 'dshCleanArchived-button', disabled: busy,
              onClick: () => { void run(() => onUnarchive(item.sessionId)) },
            }, busyKind === 'unarchive' ? t('unarchiving') : t('unarchive')),
            h('button', {
              ref: deleteButton,
              type: 'button', className: 'dshCleanArchived-button dshCleanArchived-danger', disabled: busy || item.live,
              'aria-describedby': item.live ? ids.note : undefined,
              onClick: () => { setError(null); setConfirming(true) },
            }, busyKind === 'delete' ? t('deleting') : t('delete')))),
        item.live && h('div', { className: 'dshCleanArchived-caution', id: ids.note },
          h(WarningIcon), h('div', { className: 'dshCleanArchived-cautionBody' }, h('p', null, t('inUse')))),
        confirming && h('div', {
          className: 'dshCleanArchived-confirm', role: 'group', 'aria-label': t('confirmDelete'), 'aria-describedby': ids.confirm,
          onKeyDown: (event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            cancel()
          },
        },
        h('p', { className: 'dshCleanArchived-confirmText', id: ids.confirm }, t('confirm')),
        h('div', { className: 'dshCleanArchived-actions' },
          h('button', { type: 'button', className: 'dshCleanArchived-button', autoFocus: true, onClick: cancel }, t('cancel')),
          h('button', {
            type: 'button', className: 'dshCleanArchived-button dshCleanArchived-dangerFilled',
            onClick: () => { setConfirming(false); void run(() => onDelete(item.sessionId, title)) },
          }, t('confirmDelete')))),
        error !== null && h('p', { className: 'dshCleanArchived-error', role: 'alert' }, error))
    }

    function ArchivedSessionsPage({ t, useWorkspaces, useSessions, loadArchived, deleteSession, unarchiveSession, formatDate }) {
      const archivedIds = useWorkspaces(state => state.archivedSessionIds)
      const summaries = useSessions(state => state.byId)
      const [state, setState] = React.useState({ phase: 'loading', items: [], unlisted: [], blank: [], error: null })
      const [busy, setBusy] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [reloadToken, setReloadToken] = React.useState(0)
      const heading = React.useRef(null)
      const sessionCount = useSessions(state => state.ids.length)
      const key = `${archivedIds.join('\n')}#${sessionCount}`

      React.useEffect(() => {
        const controller = new AbortController()
        setState(previous => ({ ...previous, phase: previous.items.length === 0 ? 'loading' : 'ready', error: null }))
        loadArchived(controller.signal).then(
          body => { if (!controller.signal.aborted) setState({ phase: 'ready', items: body.items ?? [], unlisted: body.unlisted ?? [], blank: body.blank ?? [], error: null }) },
          (reason) => {
            if (controller.signal.aborted) return
            setState(previous => ({ ...previous, phase: 'error', error: reason }))
          })
        return () => controller.abort()
      }, [key, reloadToken, loadArchived])

      const titleOf = (item) => {
        const summary = summaries?.[item.sessionId]
        const local = typeof summary?.title === 'string' && summary.title.trim() !== '' ? summary.title : undefined
        return local ?? item.title ?? t('untitled')
      }
      const onDelete = async (sessionId, title) => {
        setBusy({ id: sessionId, kind: 'delete' })
        setNotice(null)
        try {
          const result = await deleteSession(sessionId, title)
          const warnings = warningMessages(t, result?.warnings)
          if (warnings.length > 0) setNotice({ title, warnings })
          heading.current?.focus()
        } finally {
          setBusy(null)
          setReloadToken(value => value + 1)
        }
      }
      const onUnarchive = async (sessionId) => {
        setBusy({ id: sessionId, kind: 'unarchive' })
        try {
          await unarchiveSession(sessionId)
        } finally {
          setBusy(null)
        }
      }

      const rowsOf = (items, label, unarchive) => h('ul', { className: 'dshCleanArchived-card', 'aria-label': label },
        items.map(item => h(ArchivedRow, {
          key: item.sessionId, t, item, title: titleOf(item), formatDate,
          blank: summaries?.[item.sessionId]?.blank === true,
          busyKind: busy?.id === item.sessionId ? busy.kind : null,
          onDelete, onUnarchive: unarchive,
        })))

      const group = (id, title, intro, items) => items.length === 0 ? null
        : h('section', { className: 'dshCleanArchived-page', 'aria-labelledby': id },
          h('h3', { className: 'dshCleanArchived-subtitle', id }, title),
          h('p', { className: 'dshCleanArchived-intro' }, intro),
          rowsOf(items, title, undefined))

      let body
      let unlisted = null
      let blank = null
      if (state.phase === 'loading') {
        body = h('p', { className: 'dshCleanArchived-status', role: 'status' }, t('loading'))
      } else if (state.phase === 'error') {
        body = h('div', { className: 'dshCleanArchived-actions', style: { justifyContent: 'flex-start' } },
          h('p', { className: 'dshCleanArchived-error', role: 'alert' }, t('loadFailed')),
          h('button', { type: 'button', className: 'dshCleanArchived-button', onClick: () => setReloadToken(value => value + 1) }, t('retry')))
      } else {
        body = state.items.length === 0
          ? h('p', { className: 'dshCleanArchived-status' }, t('empty'))
          : rowsOf(state.items, t('title'), onUnarchive)
        unlisted = group('dshCleanArchived-unlisted', t('unlistedTitle'), t('unlistedIntro'), state.unlisted)
        blank = group('dshCleanArchived-blank', t('blankTitle'), t('blankIntro'), state.blank)
      }
      return h('section', { className: 'dshCleanArchived-page', 'aria-label': t('title') },
        h('style', null, css),
        h('h2', { className: 'dshCleanArchived-title', ref: heading, tabIndex: -1 }, t('title')),
        h('p', { className: 'dshCleanArchived-intro' }, t('intro')),
        notice !== null && h('div', { className: 'dshCleanArchived-caution', role: 'status' },
          h(WarningIcon),
          h('div', { className: 'dshCleanArchived-cautionBody' },
            h('p', null, t('deletedWithWarnings', { title: notice.title })),
            h('ul', null, notice.warnings.map(text => h('li', { key: text }, text)))),
          h('button', { type: 'button', className: 'dshCleanArchived-button', onClick: () => setNotice(null) }, t('dismiss'))),
        body,
        unlisted,
        blank)
    }

    return {
      inject: ['slots', 'locale', 'contextMenus', 'workspaces', 'sessions'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, messages), 'clean-archived-sessions: locale')
        const t = ctx.locale.bind(NS)

        const deleteSession = async (sessionId, title) => {
          const result = await postDelete(sessionId)
          await ctx.sessions.refresh().catch(() => {})
          // Warnings stay on the page as a dismissible notice instead of a transient success toast.
          if ((result?.warnings ?? []).length === 0) ctx.contextMenus.notify(t('deleted', { title }), true)
          return result
        }
        const unarchiveSession = sessionId => ctx.workspaces.unarchiveSession(sessionId)
        const formatDate = (ms) => {
          try {
            return new Date(ms).toLocaleString(ctx.locale.getLocale().active)
          } catch {
            // An unsupported locale tag falls back to the runtime default.
            return new Date(ms).toLocaleString()
          }
        }

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'clean-archived-sessions',
          order: 25,
          label: () => t('nav'),
          locale: NS,
          inject: () => ({ loadArchived: fetchList, deleteSession, unarchiveSession, formatDate }),
        }, ArchivedSessionsPage))
      },
    }
  },
})
