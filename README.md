# dsh-clean-archived-sessions

English | [简体中文](README.zh.md)

A DeepSeek Harness bundle that adds **Settings > Clean up archived sessions** (设置 > 清理归档会话). The page lists three groups of sessions that the sidebar cannot clean up and permanently deletes them from this computer, one at a time or a whole group at once:

- **Archived sessions**: sessions archived from the sidebar. Each row can also be unarchived.
- **Empty sessions**: sessions with a working directory that never received a message. The sidebar hides them, so they cannot be archived there. Sessions that are open now or targeted by a scheduled task are not listed. A session outside every workspace is marked **Ungrouped**.
- **Orphaned subagent sessions**: subagent sessions whose parent session no longer exists.

Any other session, including a non-empty session in the sidebar's **Ungrouped** section, must be archived from the sidebar first. Other profiles that share the DSH home (CLI, ACP, SDK) store their sessions in the same folder and may resume them, so the plugin never offers them unless they are archived, empty, or orphaned.

Each row shows the cached title, first prompt, number of turns, last message time, size, and subagent count when DSH has them cached. The page follows the DeepSeek Harness interface language (English or Simplified Chinese).

## What deletion removes

- The session directory under `<DSH home>/sessions/<project>/<session>/`, together with every subagent session it created, recursively.
- The projection cache files `<DSH home>/storages/session_projcache/sessions/<id>.json`.
- Schedules that target the session, its pin, its workspace membership, and finally its archive entry.

## What deletion does not remove

- Forks, because they are independent conversations.
- Content-addressed attachments, which other sessions may share.
- Spill files outside the session directory, which the spill store retains by age rather than by session lifecycle.
- Git worktrees created by the session. The plugin warns only when the worktree service reports a retained or failed cleanup for an archived session in the current run; it does not detect other worktrees.

## Safety

- Only the owner of the DSH instance can call the routes (`GET /clean-archived-sessions/list`, `POST /clean-archived-sessions/delete`).
- Every session in the tree is locked with the persistence write lock, root first, before anything changes. Under the locks the plugin checks again that the session is still archived, empty, or orphaned, and that no work is running.
- Moving all directories of the tree into the trash directory is the commit point. If any move fails, the moved directories are put back and nothing else changes. Schedules, workspace membership, pins, caches, and the archive entry are cleaned only after the move.
- DSH has no API to release a session that was opened during the current run. Such a session is shown as in use and can be deleted after a restart.
- A session whose files this DSH version cannot read (corrupt or from a newer format) is refused instead of deleted.

## Requirements

- DeepSeek Harness `^0.2.3-alpha.2` (`engines.dsh`). DSH plugin APIs are pre-stable; recheck after upgrading to 0.3.
- A Web or Desktop profile (`webServer`, `workspaceRegistry`, `sessionPersistence`). In a profile without them the plugin stays inactive.
- The shipped JSONL session storage. With another storage backend the page still lists sessions, but deletion is refused.

## Installation

Install from GitHub with a pinned tag, either through **Plugins > Add plugin** or by letting an agent call `plugin_manager` `install_bundle`:

```text
github:lzz-bot/dsh-clean-archived-sessions#v1.0.1
```

The installation stays on that tag; install the bundle again with a newer tag to upgrade. To install a local checkout instead, pass its absolute directory path, or run `npm pack` in it and install the resulting `.tgz`.

## Versioning

The plugin has its own semantic version in `package.json`, independent of DeepSeek Harness; release tags are `v<version>`, starting with `v1.0.0`. The supported DeepSeek Harness versions are declared separately in `engines.dsh`. The earlier tags `v0.2.3-alpha.2` and `v0.2.3-alpha.3` predate this scheme.

## Configuration

Optional fields of the `clean-archived-sessions` row in the profile `cordis.patch.yml`:

| Field | Default | Meaning |
|---|---|---|
| `trashDir` | `<DSH home>/trash/clean-archived-sessions` | Absolute staging directory that neither contains nor lies inside the sessions root. The plugin claims it with a `.dsh-clean-archived-sessions` marker file only while it is new or empty, and refuses to use a non-empty folder it did not create. Directories are moved here and then removed; the next deletion removes only leftover staged directories (`<name>-<epoch ms>`). On another filesystem the move is impossible and directories are removed in place, which is not atomic |
| `projectionCacheDir` | `<DSH home>/storages/session_projcache/sessions` | Absolute projection cache directory, for profiles that move the storage root |
| `blankScanMaxBytes` | `262144` | Largest stored log that is read to check whether a session is empty |

## Development

`npm test` runs the Host-half tests with mocked DSH services (`node --test`, no dependencies).

## License

MIT
