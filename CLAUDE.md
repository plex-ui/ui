# Claude — project instructions

**All rules live in [`AGENTS.md`](./AGENTS.md)** (single source of truth). This file exists because Claude Code scans `CLAUDE.md` at session start; it's a thin alias that points to `AGENTS.md`.

## Hot-cross-reference — rules that have bitten repeatedly

- 🔴 [Rule 0 — never hardcode styles that a component already ships](./AGENTS.md#🔴-rule-0--never-hardcode-styles-that-a-component-already-ships)
- 🔴 [**Post-change verification is MANDATORY** — rebuild → `rm -rf .next` → restart preview → curl 200, every time](.memory/decisions/0008-post-change-verification-mandatory.md)
- 🔴 [**Same gate after `git pull` that touches `packages/ui/`** — pull only updates `src/`, `dist/` stays stale and docs serve the old compiled component](./AGENTS.md#🔴-after-any-git-pull-that-touched-packagesui--rebuild)
- 🔴 [**Never run dev server from Bash — always Claude Preview MCP `preview_start`**](.memory/decisions/0010-never-bash-the-dev-server.md)
- 🔴 [Restart Next dev after adding a new packages/ui component](./AGENTS.md#🔴-restart-next-dev-after-adding-a-new-packagesui-component)
- 🔴 [Interactive demos must render client-only — never SSR](./AGENTS.md#🔴-interactive-demos-must-render-client-only--never-ssr)
- [Deploy hygiene — verify every Vercel push](./AGENTS.md#deploy-hygiene--vercel-verification-is-mandatory)
- [MDX canonical component-page structure](./AGENTS.md#mdx-authoring-rules)
- [Component registration checklist (6 files)](./AGENTS.md#component-registration--modification-checklist)

Read `AGENTS.md` before making any change. Read `.memory/` on session start for the private decision log.

## After every change touching `packages/styles/` or `packages/ui/` — non-negotiable

```bash
npm run build:styles && npm run build:ui
rm -rf .next
```

Then restart Claude Preview MCP (NOT `nohup npm run dev` from Bash — that
orphans into ppid 1 and breaks the next session, see decision 0010):

```
mcp__Claude_Preview__preview_stop   serverId=<id from preview_list>
mcp__Claude_Preview__preview_start  name="Next.js docs dev"
```

Then verify:

```bash
PORT=$(jq -r '.[0].port' <<< "$(... preview_list ...)")
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:$PORT/docs/<affected-route>
# Must be 200. If not, fix the error — do NOT report "done" to the user.
```

Full rationale + history of why these rules exist:
- [`.memory/decisions/0008-post-change-verification-mandatory.md`](.memory/decisions/0008-post-change-verification-mandatory.md)
- [`.memory/decisions/0010-never-bash-the-dev-server.md`](.memory/decisions/0010-never-bash-the-dev-server.md)
