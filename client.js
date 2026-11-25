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
        missing: 'Session files not found or unreadable',
        blank: 'Empty session',
        ungrouped: 'Ungrouped',
        orphanSubagent: 'Subagent session whose parent was deleted',
        orphansTitle: 'Orphaned subagent sessions',
        orphansIntro: 'These subagent sessions belonged to a session that no longer exists, so nothing can open them.',
        blankTitle: 'Empty sessions',
        blankIntro: 'These sessions were created but never received a message. The sidebar hides them, so they cannot be archived there. Sessions that are open now or targeted by a scheduled task are not listed.',
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
        'warning.unarchive-failed': 'The archive entry could not be removed. It will be cleaned up after a restart.',
        'warning.other': 'Another cleanup step failed.',
        'error.in-use': 'The session is in use in this run. Restart DeepSeek Harness, then delete it.',
        'error.active': 'The session still has running work. Stop it first.',
        'error.not-deletable': 'Only archived sessions, empty sessions, and orphaned subagent sessions can be deleted. To delete another session, archive it first.',
        'error.unreadable': 'The session files cannot be read by this version of DeepSeek Harness, so they are not deleted.',
        'error.move-failed': 'The session files could not be moved; nothing was deleted. Retry, or check the folder permissions.',
        unarchiveFailed: 'Could not unarchive the session.',
        'error.not-blank': 'This session now has messages. Archive it first if you want to delete it.',
        'error.subagent': 'Subagent sessions are deleted together with their parent session.',
        'error.unsupported-storage': 'This session storage is not supported for deletion.',
        'error.forbidden': 'Only the owner of this DeepSeek Harness can delete sessions.',
        'error.partial': 'Deletion stopped partway; part of the session was already removed. Retry to finish.',
        'error.generic': 'Delete failed. Details: {message}',
        'turns.one': '{count} turn',
        'turns.other': '{count} turns',
        lastPrompt: 'Last message {date}',
        deleteAll: 'Delete all ({count})',
        confirmAll: 'Permanently delete all {count} sessions in this group? This cannot be undone.',
        confirmAllSkipped: 'Permanently delete {count} sessions in this group? {skipped} in use will be skipped. This cannot be undone.',
        bulkProgress: 'Deleting {done} of {total}…',
        bulkDone: 'Deleted {count} sessions.',
        bulkSummary: 'Deleted {deleted} of {total} sessions. Details:',
        bulkSkipped: '{count} sessions in use were skipped. Restart DeepSeek Harness to delete them.',
        bulkFailed: '{title}: {message}',
        loadForbidden: 'Only the owner of this DeepSeek Harness can view this page.',
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
        missing: '会话文件不存在或无法读取',
        blank: '空会话',
        ungrouped: '未分组',
        orphanSubagent: '父会话已删除的子智能体会话',
        orphansTitle: '孤立的子智能体会话',
        orphansIntro: '这些子智能体会话所属的会话已不存在，没有任何地方能再打开它们。',
        blankTitle: '空会话',
        blankIntro: '这些会话创建后从未发送过消息。侧边栏会隐藏它们，因此无法在那里归档。当前打开着的会话，以及被定时任务使用的会话不会列在这里。',
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
        'warning.unarchive-failed': '未能移除归档记录，重启后会自动清理。',
        'warning.other': '另有一个清理步骤失败。',
        'error.in-use': '该会话在本次运行中正在使用。请重启 DeepSeek Harness 后再删除。',
        'error.active': '该会话仍有正在运行的任务，请先停止。',
        'error.not-deletable': '只能删除已归档的会话、空会话和孤立的子智能体会话。要删除其他会话，请先归档。',
        'error.unreadable': '当前版本的 DeepSeek Harness 无法读取该会话文件，因此不会删除。',
        'error.move-failed': '无法移动会话文件，没有删除任何内容。请重试，或检查文件夹权限。',
        unarchiveFailed: '无法取消归档该会话。',
        'error.not-blank': '该会话现在已有消息。如需删除，请先归档。',
        'error.subagent': '子智能体会话会随父会话一起删除。',
        'error.unsupported-storage': '当前的会话存储方式不支持删除。',
        'error.forbidden': '只有这台 DeepSeek Harness 的所有者可以删除会话。',
        'error.partial': '删除中途停止，会话的一部分已被移除。请重试以完成删除。',
        'error.generic': '删除失败。详情：{message}',
        'turns.one': '{count} 轮对话',
        'turns.other': '{count} 轮对话',
        lastPrompt: '最后发消息于 {date}',
        deleteAll: '全部删除（{count}）',
        confirmAll: '永久删除这一组的全部 {count} 个会话？此操作无法撤销。',
        confirmAllSkipped: '永久删除这一组的 {count} 个会话？正在使用的 {skipped} 个会跳过。此操作无法撤销。',
        bulkProgress: '正在删除 {done}/{total}…',
        bulkDone: '已删除 {count} 个会话。',
        bulkSummary: '已删除 {deleted}/{total} 个会话。详情：',
        bulkSkipped: '{count} 个正在使用的会话已跳过，重启 DeepSeek Harness 后可删除。',
        bulkFailed: '{title}：{message}',
        loadForbidden: '只有这台 DeepSeek Harness 的所有者可以查看此页面。',
      },
    }

    const KNOWN_ERRORS = new Set(['in-use', 'active', 'not-deletable', 'not-blank', 'subagent', 'unsupported-storage', 'forbidden', 'partial', 'unreadable', 'move-failed'])
    const KNOWN_WARNINGS = new Set([
      'worktree-retained', 'worktree-unknown', 'schedule-delete-failed', 'detach-failed', 'unpin-failed',
      'trash-cleanup-failed', 'cache-delete-failed', 'unarchive-failed',
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
.dshCleanArchived-preview { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshCleanArchived-groupHeader { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; margin-top: 12px; }
.dshCleanArchived-groupHeader .dshCleanArchived-subtitle, .dshCleanArchived-groupHeader .dshCleanArchived-title { margin: 0; }
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

    function ArchivedRow({ t, item, title, blank, busyKind, locked, orphanGroup, formatDate, onDelete, onUnarchive }) {
      const [confirming, setConfirming] = React.useState(false)
      const [error, setError] = React.useState(null)
      const deleteButton = React.useRef(null)
      const ids = React.useMemo(() => {
        const base = `dshCleanArchived-${item.sessionId.replace(/[^A-Za-z0-9_-]/g, '_')}`
        return { note: `${base}-note`, confirm: `${base}-confirm` }
      }, [item.sessionId])
      const busy = busyKind !== null || locked
      const meta = []
      if (item.cwd) meta.push(h('span', { key: 'cwd', className: 'dshCleanArchived-path' }, item.cwd))
      if (typeof item.createdAt === 'number') meta.push(h('span', { key: 'at' }, t('created', { date: formatDate(item.createdAt) })))
      if (item.sizeBytes !== undefined) meta.push(h('span', { key: 'size' }, formatBytes(item.sizeBytes)))
      if (item.subagentCount > 0) {
        meta.push(h('span', { key: 'sub' }, t(item.subagentCount === 1 ? 'subagents.one' : 'subagents.other', { count: String(item.subagentCount) })))
      }
      if (typeof item.turnCount === 'number' && item.turnCount > 0) {
        meta.push(h('span', { key: 'turns' }, t(item.turnCount === 1 ? 'turns.one' : 'turns.other', { count: String(item.turnCount) })))
      }
      if (typeof item.lastPromptAt === 'number') meta.push(h('span', { key: 'last' }, t('lastPrompt', { date: formatDate(item.lastPromptAt) })))
      if (item.blank === true && item.ungrouped === true) meta.push(h('span', { key: 'ungrouped' }, t('ungrouped')))
      if (item.missing) meta.push(h('span', { key: 'missing' }, t('missing')))
      if (blank || item.blank === true) meta.push(h('span', { key: 'blank' }, t('blank')))
      if (item.subagent && !orphanGroup) meta.push(h('span', { key: 'orphan' }, t('orphanSubagent')))
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
          // The confirmation row is gone; return focus to the row's own action.
          requestAnimationFrame(() => deleteButton.current?.focus())
        }
      }
      return h('li', { className: 'dshCleanArchived-row', 'aria-busy': busy || undefined },
        h('div', { className: 'dshCleanArchived-main' },
          h('div', { className: 'dshCleanArchived-text' },
            h('p', { className: 'dshCleanArchived-name', title }, title),
            item.preview && h('p', { className: 'dshCleanArchived-preview', title: item.preview }, item.preview),
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

    /** Group heading with a guarded "Delete all" action. */
    function GroupHeader({ t, id, level, title, items, bulk, disabled, onDeleteAll }) {
      const [confirming, setConfirming] = React.useState(false)
      const deletable = items.filter(item => !item.live)
      const skipped = items.length - deletable.length
      const running = bulk !== null && bulk.group === id
      const heading = h(level, { className: level === 'h2' ? 'dshCleanArchived-title' : 'dshCleanArchived-subtitle', id, tabIndex: -1 }, title)
      return h('div', null,
        h('div', { className: 'dshCleanArchived-groupHeader' },
          heading,
          deletable.length > 1 && !confirming && h('button', {
            type: 'button', className: 'dshCleanArchived-button dshCleanArchived-danger', disabled: disabled || running,
            onClick: () => setConfirming(true),
          }, running ? t('bulkProgress', { done: String(bulk.done), total: String(bulk.total) }) : t('deleteAll', { count: String(deletable.length) }))),
        confirming && h('div', {
          className: 'dshCleanArchived-confirm', role: 'group', 'aria-label': t('confirmDelete'), 'aria-describedby': `${id}-confirm`,
          style: { marginTop: 8 },
          onKeyDown: (event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            setConfirming(false)
          },
        },
        h('p', { className: 'dshCleanArchived-confirmText', id: `${id}-confirm` }, skipped > 0
          ? t('confirmAllSkipped', { count: String(deletable.length), skipped: String(skipped) })
          : t('confirmAll', { count: String(deletable.length) })),
        h('div', { className: 'dshCleanArchived-actions' },
          h('button', { type: 'button', className: 'dshCleanArchived-button', autoFocus: true, onClick: () => setConfirming(false) }, t('cancel')),
          h('button', {
            type: 'button', className: 'dshCleanArchived-button dshCleanArchived-dangerFilled',
            onClick: () => { setConfirming(false); void onDeleteAll(id, items) },
          }, t('confirmDelete')))))
    }

    function ArchivedSessionsPage({ t, useWorkspaces, useSessions, loadArchived, postDelete, refreshSessions, notify, unarchiveSession, formatDate }) {
      const archivedIds = useWorkspaces(state => state.archivedSessionIds)
      const summaries = useSessions(state => state.byId)
      const [state, setState] = React.useState({ phase: 'loading', loaded: false, items: [], blank: [], orphans: [], error: null })
      const [busy, setBusy] = React.useState(null)
      const [bulk, setBulk] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [reloadToken, setReloadToken] = React.useState(0)
      const heading = React.useRef(null)
      const key = archivedIds.join('\n')

      React.useEffect(() => {
        const controller = new AbortController()
        // Keep showing the previous lists while a refetch runs.
        setState(previous => ({ ...previous, phase: previous.loaded ? 'ready' : 'loading', error: null }))
        loadArchived(controller.signal).then(
          body => {
            if (controller.signal.aborted) return
            setState({ phase: 'ready', loaded: true, items: body.items ?? [], blank: body.blank ?? [], orphans: body.orphans ?? [], error: null })
          },
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
          const result = await postDelete(sessionId)
          await refreshSessions()
          const warnings = warningMessages(t, result?.warnings)
          // Warnings stay on the page as a dismissible notice instead of a transient success toast.
          if (warnings.length > 0) setNotice({ heading: t('deletedWithWarnings', { title }), lines: warnings })
          else notify(t('deleted', { title }))
          heading.current?.focus()
        } finally {
          setBusy(null)
          setReloadToken(value => value + 1)
        }
      }
      const onDeleteAll = async (group, items) => {
        const targets = items.filter(item => !item.live)
        const skipped = items.length - targets.length
        const lines = []
        let deleted = 0
        setNotice(null)
        setBulk({ group, done: 0, total: targets.length })
        try {
          for (const item of targets) {
            try {
              const result = await postDelete(item.sessionId)
              deleted += 1
              for (const text of warningMessages(t, result?.warnings)) lines.push(`${titleOf(item)}: ${text}`)
            } catch (reason) {
              lines.push(t('bulkFailed', { title: titleOf(item), message: errorMessage(t, reason) }))
            }
            setBulk(previous => previous === null ? null : { ...previous, done: previous.done + 1 })
          }
        } finally {
          await refreshSessions()
          setBulk(null)
          setReloadToken(value => value + 1)
        }
        if (skipped > 0) lines.push(t('bulkSkipped', { count: String(skipped) }))
        if (lines.length === 0) notify(t('bulkDone', { count: String(deleted) }))
        else setNotice({ heading: t('bulkSummary', { deleted: String(deleted), total: String(items.length) }), lines })
        heading.current?.focus()
      }
      const onUnarchive = async (sessionId) => {
        setBusy({ id: sessionId, kind: 'unarchive' })
        try {
          await unarchiveSession(sessionId)
        } finally {
          setBusy(null)
        }
      }

      const rowsOf = (items, label, unarchive, orphanGroup = false) => h('ul', { className: 'dshCleanArchived-card', 'aria-label': label },
        items.map(item => h(ArchivedRow, {
          key: item.sessionId, t, item, title: titleOf(item), formatDate,
          blank: summaries?.[item.sessionId]?.blank === true,
          busyKind: busy?.id === item.sessionId ? busy.kind : null,
          locked: bulk !== null || (busy !== null && busy.id !== item.sessionId),
          orphanGroup,
          onDelete, onUnarchive: unarchive,
        })))

      const headerOf = (id, level, title, items) => h(GroupHeader, {
        t, id, level, title, items, bulk, disabled: busy !== null || bulk !== null, onDeleteAll,
      })
      const group = (id, title, intro, items, orphanGroup = false) => items.length === 0 ? null
        : h('section', { className: 'dshCleanArchived-page', 'aria-labelledby': id },
          headerOf(id, 'h3', title, items),
          h('p', { className: 'dshCleanArchived-intro' }, intro),
          rowsOf(items, title, undefined, orphanGroup))

      let body
      let blank = null
      let orphans = null
      if (state.phase === 'loading') {
        body = h('p', { className: 'dshCleanArchived-status', role: 'status' }, t('loading'))
      } else if (state.phase === 'error') {
        body = h('div', { className: 'dshCleanArchived-actions', style: { justifyContent: 'flex-start' } },
          h('p', { className: 'dshCleanArchived-error', role: 'alert' },
            state.error instanceof RouteError && state.error.code === 'forbidden' ? t('loadForbidden') : t('loadFailed')),
          h('button', { type: 'button', className: 'dshCleanArchived-button', onClick: () => setReloadToken(value => value + 1) }, t('retry')))
      } else {
        body = state.items.length === 0
          ? h('p', { className: 'dshCleanArchived-status' }, t('empty'))
          : rowsOf(state.items, t('title'), onUnarchive)
        blank = group('dshCleanArchived-blank', t('blankTitle'), t('blankIntro'), state.blank)
        orphans = group('dshCleanArchived-orphans', t('orphansTitle'), t('orphansIntro'), state.orphans, true)
      }
      return h('section', { className: 'dshCleanArchived-page', 'aria-label': t('title') },
        h('style', null, css),
        h('div', { ref: heading, tabIndex: -1, style: { outline: 'none' } },
          state.phase === 'ready' && state.items.length > 0
            ? headerOf('dshCleanArchived-archived', 'h2', t('title'), state.items)
            : h('h2', { className: 'dshCleanArchived-title' }, t('title'))),
        h('p', { className: 'dshCleanArchived-intro' }, t('intro')),
        notice !== null && h('div', { className: 'dshCleanArchived-caution', role: 'status' },
          h(WarningIcon),
          h('div', { className: 'dshCleanArchived-cautionBody' },
            h('p', null, notice.heading),
            h('ul', null, notice.lines.map((text, index) => h('li', { key: index }, text)))),
          h('button', { type: 'button', className: 'dshCleanArchived-button', onClick: () => setNotice(null) }, t('dismiss'))),
        body,
        blank,
        orphans)
    }

    return {
      inject: ['slots', 'locale', 'contextMenus', 'workspaces', 'sessions'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, messages), 'clean-archived-sessions: locale')
        const t = ctx.locale.bind(NS)

        const refreshSessions = () => ctx.sessions.refresh().catch(() => {})
        const notify = text => ctx.contextMenus.notify(text, true)
        const unarchiveSession = async (sessionId) => {
          // The Workspace service reports failures as a result value instead of throwing.
          const result = await ctx.workspaces.unarchiveSession(sessionId)
          if (result?.ok === false) {
            throw new RouteError(result.error?.code ?? 'unarchive-failed', result.error?.message ?? t('unarchiveFailed'))
          }
        }
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
          inject: () => ({ loadArchived: fetchList, postDelete, refreshSessions, notify, unarchiveSession, formatDate }),
        }, ArchivedSessionsPage))
      },
    }
  },
})
