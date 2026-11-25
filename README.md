# dsh-clean-archived-sessions

A DeepSeek Harness bundle that adds **Settings > Clean up archived sessions** (设置 > 清理归档会话). The page lists three groups of sessions and permanently deletes them from this computer:

- **Archived sessions**: sessions archived from the sidebar. Each row can also be unarchived.
- **Sessions outside every workspace**: sessions whose workspace was removed from the sidebar. DSH keeps their files, but they can no longer be opened or archived.
- **Empty sessions**: sessions in a workspace that never received a message. The sidebar hides them. The empty session currently open is not listed.

## What deletion removes

- The session directory under `<DSH home>/sessions/<project>/<session>/`, together with every subagent session it created, recursively.
- The projection cache files `<DSH home>/storages/session_projcache/sessions/<id>.json`.
- Schedules that target the session, its pin, its workspace membership, and finally its archive entry.

## What deletion does not remove

- Forks, because they are independent conversations.
- Content-addressed attachments, which other sessions may share.
- Spill files outside the session directory, which the spill store retains by age rather than by session lifecycle.
- Git worktrees created by the session; the plugin only reports cleanup state when the worktree service is mounted.

## Safety

- Only the owner of the DSH instance can call the routes (`GET /archived-sessions/list`, `POST /archived-sessions/delete`).
- Every session in the tree is locked with the persistence write lock while its files are moved out of the sessions root and removed, so no Agent can resume it meanwhile.
- DSH has no API to release a session that was opened during the current run. Such a session is shown as in use and can be deleted after a restart.
- An empty session is checked again under the lock; if it received a message in the meantime, deletion is refused.

## Requirements

- DeepSeek Harness `^0.2.3-alpha.2` (`engines.dsh`). DSH plugin APIs are pre-stable; recheck after upgrading to 0.3.
- A Web or Desktop profile (`webServer`, `workspaceRegistry`, `sessionPersistence`). In a profile without them the plugin stays inactive.
- The shipped JSONL session storage. With another storage backend the page still lists sessions, but deletion is refused.

## Installation

Install the directory with **Plugins > Add plugin**, or let an agent call `plugin_manager` `install_bundle` with the absolute directory path. To share it, copy the directory or run `npm pack` in it and install the resulting `.tgz`.

## Configuration

Optional fields of the `clean-archived-sessions` row in the profile `cordis.patch.yml`:

| Field | Default | Meaning |
|---|---|---|
| `trashDir` | `<DSH home>/trash/archived-sessions` | Absolute staging directory outside the sessions root; directories are moved here and then removed |
| `projectionCacheDir` | `<DSH home>/storages/session_projcache/sessions` | Absolute projection cache directory, for profiles that move the storage root |
| `blankScanMaxBytes` | `262144` | Largest stored log that is read to check whether a session is empty |

## License

MIT
