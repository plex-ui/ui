# 🔴 Rule 0 — never hardcode styles that a component already ships

**If Plex UI has a component for the thing, USE IT.** Do not recreate `Card.Title`, `Card.Description`, `Label`, `Separator`, `Field`, or any other shipped component with inline `style={{ fontSize, fontWeight, color, margin }}` props.

Forbidden pattern:

```tsx
// ❌ inline recreation
<div style={{ fontSize: 16, fontWeight: 600 }}>Billing Address</div>
<div style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>…</div>
```

Correct pattern:

```tsx
// ✅ use the compound parts
<Card.Header>
  <Card.Title>Billing Address</Card.Title>
  <Card.Description>…</Card.Description>
</Card.Header>
```

Only **outer layout containers** (flex/grid with `gap`) may carry inline styles. Typography, color, spacing inside belongs to components. Inline hardcode next to a proper component is a code smell — fix it as part of any change that touches the area.

Full decision with examples and rationale: [`.memory/decisions/0000-no-inline-hardcoded-styles-when-component-exists.md`](.memory/decisions/0000-no-inline-hardcoded-styles-when-component-exists.md)

---

# Persistent Memory — `.memory/` (FIRST ACTION EVERY SESSION)

`.memory/` is a **git submodule** pointing at the private repo [`plex-ui/docs-memory`](https://github.com/plex-ui/docs-memory). It holds planning docs, decisions, bug notes, and session state that is not meant for the public parent repo.

**Full protocol & file templates:** [`.memory/MEMORY_PROTOCOL.md`](.memory/MEMORY_PROTOCOL.md)
**Submodule workflow reference:** [`.memory/domains/submodule-workflow.md`](.memory/domains/submodule-workflow.md)

## Session start — MANDATORY

```bash
# If .memory/ is empty or missing, the submodule isn't cloned yet:
git submodule update --init --recursive
```

Then read [`.memory/working-context.md`](.memory/working-context.md). If the task touches a specific domain — also read the matching file under `.memory/domains/`.

## Fresh clone on a new machine

```bash
# Option 1 — clone with submodules in one go:
git clone --recurse-submodules https://github.com/plex-ui/docs.git

# Option 2 — already cloned without submodules:
cd docs
git submodule update --init --recursive
```

Requires GitHub auth with access to the private `plex-ui/docs-memory` repo (same `gh auth` as parent).

## Commit cycle (TWO commits — inside, then outside)

When you change anything in `.memory/*`:

```bash
# 1. Commit inside the submodule FIRST
cd .memory
git add -A
git commit -m "Update working-context after Card foundation step"
git push

# 2. Then bump the pointer in the parent repo
cd ..
git add .memory
git commit -m "Bump .memory pointer"
git push
```

If you forget step 2, teammates/CI won't see the update — parent repo still points at the old submodule commit.

## Pull updates from teammates

```bash
git pull --recurse-submodules
# or, if you already pulled:
git submodule update --remote --merge
```

### 🔴 After ANY `git pull` that touched `packages/ui/**` — REBUILD

**Same gate as for your own changes.** A `git pull` brings new `src/` for `packages/ui` but does NOT rebuild `dist/`, and Next.js consumes `dist/` — so the docs site keeps serving the OLD compiled component until you rebuild. Symptom: docs page shows a stale/broken version, the Vercel deploy works fine, and you scratch your head.

**Trigger:** `git pull` diff includes any path under `packages/styles/` or `packages/ui/`.

```bash
npm run build:styles && npm run build:ui
rm -rf .next
# preview_stop / preview_start via Claude Preview MCP
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/components/<affected-route>
# Must be 200.
```

This is identical to the post-edit verification gate — the rule is the same regardless of whether the `src/` change came from your edit or from a teammate's pull.

Prior incident: 2026-04-28 — pulled TagInput sm/pill commits, docs page kept showing the old version because `dist/` was a day stale.

## Never

- `rm -rf .memory/` — that deletes the submodule working tree. Use `git submodule deinit .memory` instead if you really need to unmount.
- Commit `.memory/screenshots/` — gitignored inside the submodule.
- Store secrets, API keys, or credentials anywhere in `.memory/` (even though the repo is private).
- Forget the two-commit cycle — submodule change + parent pointer bump.

### 🔴 Private content lives in `.memory/plans/`, NOT in the docs repo

`plex-ui/docs` is **public**. Anything committed there is visible to the world (and stays in history forever — force-push doesn't undo forks/caches). The following categories are private and belong in `.memory/plans/`:

- **Launch / promo drafts** — Dev.to, HN, Reddit, Product Hunt, Twitter, anything pre-publication. (`.memory/plans/launch/`)
- **SEO action plans, audits, scoring** — strategy material with file:line references. (`.memory/plans/ACTION-PLAN.md`, `FULL-AUDIT-REPORT.md`, etc.)
- **Internal roadmaps, OKRs, post-mortems, incident reports.**
- **Debug artifacts** — screenshots used in audits, perf traces, etc. (Plain debug screenshots that don't need to sync — delete them.)

Root `.gitignore` blocks `launch/`, `/ACTION-PLAN.md`, `/FULL-AUDIT-REPORT.md`, `/SEO-*.md`, `/AUDIT-*.md`, `/PLAN-*.md`. Add new patterns when in doubt — false positives are cheap, leaks are not.

If a Claude session finds itself about to write a strategy / audit / launch doc to the working tree of `plexui-docs`, the answer is **always** to write it under `.memory/plans/` instead, even if the user didn't say so. Commit + push goes to the private submodule.

Prior incident: 2026-04-28 — `launch/*.md`, `ACTION-PLAN.md`, `FULL-AUDIT-REPORT.md` accidentally lived in the public repo's working tree and were partially shipped via commit `d9b9a039`. Cleanup was minimal-plan (delete from current master, no force-push) — historical exposure could not be reversed.

---

# 🔴 Avoid em-dashes (`—` and `–`) in user-facing copy

Long em-dash (`—`) and en-dash (`–`) are a strong tell of AI-generated text. Marketing pages, landing copy, blog post bodies, and any prose visible to a customer must avoid them. Use a period, comma, colon, parentheses, or restructure the sentence instead.

Forbidden examples:
```
The bridge returns design token names — so your AI generates production CSS.
Works with any AI model — Claude, GPT, Cursor.
Local-first — designs never leave your machine.
```

Replacements (pick whichever flows best):
```
The bridge returns design token names. Your AI generates production CSS.
Works with any AI model: Claude, GPT, Cursor.
Local-first. Designs never leave your machine.
```

**Where the rule applies:**
- Landing pages: `app/(home)/**/*.tsx`, `app/page.tsx`
- Blog post bodies: `content/blog/**/*.mdx`
- Marketing emails, in-app empty/error copy, social posts in `.memory/plans/launch/`
- Component descriptions and docs prose under `content/docs/**/*.mdx`

**Where dashes ARE fine:**
- Code, identifiers, file paths, URLs
- Numeric ranges (`5–7 business days` is acceptable but a hyphen `5-7` is even better)
- AGENTS.md / `.memory/` internal notes (this file uses dashes deliberately for editorial structure)

When auditing existing copy, treat any em-dash as a candidate for replacement and only keep it when no rewrite reads more naturally.

Prior incident: 2026-04-28 — `/bridge` landing copy and FAQ shipped with em-dashes. The user flagged them as AI-tells and asked for cleanup. Replaced with periods and colons across the page.

---

# Canonical domain — `plexui.com`

The project is hosted at **https://plexui.com**. Use it for sample data
in demos, OG/SEO, links, and anywhere a "your-company" placeholder is
needed.

- ✅ `ada@plexui.com`, `grace@plexui.com` — sample emails in component demos.
- ❌ `plex.dev`, `plex.com`, `plex-ui.*` — none of these are us.

Full rationale: [`.memory/domains/canonical-domain.md`](.memory/domains/canonical-domain.md).

---

# «Полный синк» — `bash scripts/sync-all.sh`

When the maintainer says **"полный синк"** / **"full sync"** / **"sync
everything"**, the canonical action is:

```bash
cd ~/github/plexui-docs && bash scripts/sync-all.sh
```

This pulls parent, `.memory`, and the `figma-ai-bridge` plugin, runs
whitelist cleanup on `figma/`, builds the plugin zip, and triggers the
`packages/ui` rebuild gate if needed. **Don't reimplement the steps
manually** — the script is the only source of truth and changes often.

Reporting style: paste the script's final summary block, no narration:

```
✓ Full sync complete
  main:    <sha>
  .memory: <sha>
  plugin:  <sha>
```

Surface failures or a fired rebuild gate. Otherwise stay quiet.

Full doc: [`.memory/domains/full-sync.md`](.memory/domains/full-sync.md).

---

# Component registration / modification checklist

**When adding or modifying a component in `packages/ui/src/components/*`, you MUST walk this list.** There is no safety net — the lists are hand-curated.

## Every change (add OR modify)

1. `content/docs/changelog.mdx` — entry under `## Unreleased → ### Added` (or `### Changed` / `### Fixed`)
2. `packages/ui/package.json` — bump `version` (minor for new component / feature, patch for fix)

## New component (in addition to the above)

3. `content/docs/components/meta.json` — add slug alphabetically
4. `content/docs/components/index.mdx` — add `<ComponentCard title="…" href="…" />` (do **not** pass `isNew` — retired, see [decision 0002](.memory/decisions/0002-no-new-badges.md))
5. `app/(home)/_components/Footer.tsx` — add `{ label, href }` in Components links, alphabetically in correct column
6. `public/r/index.json` + `public/r/<slug>.json` — shadcn registry entries

**Audit with one grep:**

```bash
rg "<slug>" content/docs/components/meta.json content/docs/components/index.mdx \
  app/\(home\)/_components/Footer.tsx public/r/
```

Full record: [`.memory/domains/component-registration-checklist.md`](.memory/domains/component-registration-checklist.md)

---

# Deploy hygiene — Vercel verification is mandatory

**After EVERY `git push` to `master`, verify the production Vercel deploy succeeded.**

```bash
gh api /repos/plex-ui/docs/commits/HEAD/status \
  --jq '.statuses[] | select(.context=="Vercel") | {state, target_url}'
```

- `state: success` → done.
- `state: pending` → wait, re-check.
- `state: failure` → open `target_url` in authorized Chrome, expand Build Logs, find the first red line, fix, repush.

Local `npx tsc --noEmit` can pass while Vercel fails — Next.js production build is stricter. Do not move on to the next task with a red deploy.

Full record: [`.memory/decisions/0005-always-verify-vercel-deploy.md`](.memory/decisions/0005-always-verify-vercel-deploy.md)

---

# 🔴 Use `npm run dev:all` to avoid the Turbopack restart cycle

**Default to `npm run dev:all` at the repo root**, not `npm run dev`. `dev:all` builds `packages/styles` once, then runs in parallel:

1. `packages/styles` in watch mode — a chokidar-less fs.watch watcher that rebuilds `dist/es/**/*.css` on every CSS edit under `packages/styles/src/` (component CSS modules and token files live there), plus `tsc -w` for its `vite` and `types` entries
2. `packages/ui` in watch mode — `tsc -w` for TS
3. `next dev` — Turbopack serves the docs app

With this setup, **CSS-only changes** in `packages/styles/src/` hot-reload end-to-end without any restart: watcher → rebuild dist → Next.js picks the new CSS up via HMR.

**TSX-level changes** (new component directory, new export, new `data-slot`, new compound sub-component) still need one restart because Turbopack caches the `@plexui/ui` package.json exports graph at startup. Symptom: `Module not found: Can't resolve '@plexui/ui/components/Foo'` even though `dist/` is correct. When you see that:

```bash
# Nuke the Turbopack cache + restart — CSS watcher keeps running
lsof -ti:3000 | xargs kill -9
rm -rf .next
npm run dev:all
```

Do **not** try to recover via plain HMR or by clearing only `.next/cache` — only a full dev-server restart invalidates the cached exports resolution. The symptom looks identical to a real build error but `npm run build` at the root passes cleanly; that's the tell.

If you can't kill the dev server yourself (the user started it manually), finish your commit + push, then tell the user: "restart the dev server to clear the Turbopack cache — see AGENTS.md `dev:all` section."

**Prior incidents** (this rule exists because the same issue hit repeatedly): Accordion addition, ButtonGroup addition, ButtonGroup demo reload after `dist/` rebuild, Input.AdornmentButton addition — user explicitly asked to stop restarting on every change ("это пиздец какой-то же — нет разве?"). The answer: `dev:all` handles CSS iterations; restart only on TSX export surface changes.

Full record: [`.claude/projects/.../memory/feedback_turbopack_restart_after_new_component.md`](.claude/projects/-Users-sergey-github-plexui-docs/memory/feedback_turbopack_restart_after_new_component.md)

---

# 🔴 Interactive demos must render client-only — never SSR

**Every `components/docs/*Demos.tsx` file that composes Plex form controls (`SelectControl`, `Menu`, `Popover`, `Dialog`, `Slider`, `Switch`, `Checkbox`, `RadioGroup`, `SegmentedControl`, `DateRangePicker`, `Combobox`, `MarkdownEditor`, etc.) must be loaded via `next/dynamic` with `ssr: false` from every SSR consumer (landing sections under `app/(home)/_components/*Section.tsx`, any `page.tsx`).**

```tsx
// ✅ CORRECT — loaded only on the client, no hydration to mismatch
import dynamic from 'next/dynamic';

const SizingOverviewDemo = dynamic(
  () => import('@/components/docs/SizingDemos').then((m) => m.SizingOverviewDemo),
  { ssr: false },
);
```

```tsx
// ❌ FORBIDDEN from landing/page.tsx — SSR renders Radix Slot + useId, client shifts, hydration breaks
import { SizingOverviewDemo } from '@/components/docs/SizingDemos';
```

**Why this rule exists:** React 19's `useId()` is deterministic **only** if the server and client render the exact same subtree in the exact same order. Any drift — a Suspense boundary resolving differently, a Radix internal allocating a different Slot, an effect-triggered conditional — shifts every downstream id, producing:

> A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up.

in the Next dev overlay. The issue has repeated three times: Slider in `ProgressDemos`, `SizingOverviewDemo` on the landing, and an earlier `SelectControl`. Auditing every demo for every possible cause of tree drift is not worth it — force-client the whole demo chunk and the class of bug vanishes.

**Full record:** [`.claude/projects/.../memory/feedback_no_ssr_for_interactive_demos.md`](.claude/projects/-Users-sergey-github-plexui-docs/memory/feedback_no_ssr_for_interactive_demos.md)

**Exception:** MDX pages under `content/docs/components/*.mdx` import demos directly — this is fine because Fumadocs already wraps the docs render with its own client boundary. The rule applies specifically to the landing (`app/(home)/_components/*Section.tsx`) and raw `app/**/page.tsx` files that do not wrap the demo themselves.

---

# MDX authoring rules

## Canonical component-page structure — same shape on every page

Every file under `content/docs/components/*.mdx` uses the Plex skeleton. No `## Usage`, no `## API Reference`, no floating first `<ComponentPreview>` outside `## Examples`, no shadcn section names ported in verbatim.

```mdx
---
title: …
description: …
---

<imports>

<UsageBlock>{`import { … } from "@plexui/ui/components/…";`}</UsageBlock>

[optional single paragraph pointing at a related component]

## Examples

### Overview
<ComponentPreview …><Demo /></ComponentPreview>

### <Other demo>
<ComponentPreview …><Demo /></ComponentPreview>

## API

### <ComponentName>
| Prop | Type | Default | Description |

## Styling

- `--token-name` — purpose
```

Diff any new page against `card.mdx` / `separator.mdx` before shipping. Full record: [`.memory/decisions/0007-mdx-component-page-structure.md`](.memory/decisions/0007-mdx-component-page-structure.md)

---

## No inline code (backticks) in headings

Never wrap a heading's text in backticks in `content/docs/**/*.mdx`. Fumadocs renders headings into the right-rail TOC verbatim, so backtick-wrapped headings show up as `<code>…</code>` pills while neighboring entries are plain text — the sidebar looks broken. Inline code inside prose/tables is fine; only the heading stays plain.

Correct: `### Separator` — Wrong: `` ### `Separator` ``

Full record: [`.memory/decisions/0006-no-code-in-mdx-headings.md`](.memory/decisions/0006-no-code-in-mdx-headings.md)

---

# Component composition rules

## Pill consistency inside Card / form surfaces

**Inside a `Card` (or any form surface), every interactive control must share one pill style. Standard for Plex UI forms is `pill={false}` (rectangular, token-driven radius).**

`Button`, `Select` and `Input` are rectangular by default (`pill` is false or unset since ui 0.16.0) and `Textarea` has no pill option, so a form needs no prop. `DatePicker` and `DateRangePicker` still default to `pill = true`: set `pill={false}` on them inside a form. Passing `pill={false}` explicitly is harmless and many demos still do; the violation is mixing in a single `pill` control.

Spot-check before committing a new demo:

```js
[...document.querySelectorAll('[class*=Card] button, [class*=Card] [role=combobox]')]
  .map(el => getComputedStyle(el).borderRadius)
// any 9999px is a violation
```

Full record: [`.memory/decisions/0001-pill-consistency-in-cards.md`](.memory/decisions/0001-pill-consistency-in-cards.md)

---

# Figma AI Bridge Plugin

## Location

`figma/plugin/figma-ai-bridge/` — files: `code.js`, `manifest.json`, `ui.html`, `server.mjs`, `VERSION`, `build-zip.sh`

The plugin source lives in a separate **private** GitHub repo: `plex-ui/figma-ai-bridge`. The whole `figma/` tree is in this repo's `.gitignore` — the plugin syncs only via its own private repo, not via `plexui-docs`.

## First-time setup on a new machine (Claude command)

> "клонируй приватный плагин Figma AI Bridge в figma/plugin"

Expands to:
```bash
cd ~/github/plexui-docs/figma/plugin
git clone https://github.com/plex-ui/figma-ai-bridge.git figma-ai-bridge
chmod +x figma-ai-bridge/build-zip.sh figma-ai-bridge/start-bridge.command
```

## Sync command (run on either machine, before/after work)

> "запусти полный синк" / "полный синк" / "синхронизируй всё"

Expands to:
```bash
bash scripts/sync-all.sh
```

The script ([scripts/sync-all.sh](scripts/sync-all.sh)) is idempotent and does:
1. `git pull --no-recurse-submodules` for main `plex-ui/docs`
2. `git pull` inside `.memory` (tracks `master` directly — parent submodule pointer may lag)
3. Cleans legacy artifacts in `figma/plugin/` (`figma-mcp-bridge`, `plex-ui`, stale `figma-ai-bridge-v*.zip`, `.DS_Store`) — these are NOT part of the product and not synced
4. Pulls `figma/plugin/figma-ai-bridge/` if it's a valid clone, else wipes + clones fresh from `plex-ui/figma-ai-bridge` (private)
5. If main pull touched `packages/styles/` or `packages/ui/`, runs the rebuild gate (decision 0008): `npm run build:styles` + `npm run build:ui` + `rm -rf .next`. Restart the dev server via Claude Preview MCP if it was running.

Final line of the script prints the resolved short SHAs of all three repos for confirmation.

## Versioning + release workflow

Version source of truth: `figma/plugin/figma-ai-bridge/VERSION` (single line, e.g. `1.0.0`).

To cut a release:
```bash
cd ~/github/plexui-docs/figma/plugin/figma-ai-bridge
echo "1.0.1" > VERSION
./build-zip.sh                # writes ../figma-ai-bridge-v1.0.1.zip
                              # also rewrites const PLUGIN_VERSION in code.js
git add VERSION code.js
git commit -m "Bump to v1.0.1"
git push
git tag v1.0.1 -m "v1.0.1 — short note"
git push origin v1.0.1        # CI builds + publishes GitHub Release as backup
```

Manual upload: take `figma/plugin/figma-ai-bridge-v1.0.1.zip` and replace the Lemon Squeezy product file. CI release on GitHub is a backup mirror only.

The plugin window title in Figma reads `Figma AI Bridge vX.Y.Z` because `code.js` sets `figma.showUI(__html__, { …, title: PLUGIN_TITLE })` with `PLUGIN_VERSION` synced from `VERSION` by `build-zip.sh`. Both dev mode (running plugin from source via Plugins → Development → Import from manifest) and production zip show the same version because the build script rewrites the literal in source code.js, not just in the zip.

The CI release workflow refuses to run if the git tag and `VERSION` disagree.

## Architecture

```
HTTP Client (curl)          UI (ui.html)              Plugin (code.js)
   ──── POST :8867 ────►  WebSocket :8866  ────►   Figma Plugin API
   ◄─── JSON response ──  ◄──────────────  ◄───   (read/write document)
```

- **HTTP API**: `http://localhost:8867` — send commands, check status
- **WebSocket**: `ws://localhost:8866` — internal bridge between UI and server (don't use directly)
- Plugin must be **running in Figma** for commands to work

## Usage

### Check status
```bash
curl http://localhost:8867/status
```

### Single command
```bash
curl -X POST http://localhost:8867/command -H "Content-Type: application/json" \
  -d '{"command":"<name>","params":{...}}'
```

### Batch (multiple commands)
```bash
curl -X POST http://localhost:8867/batch -H "Content-Type: application/json" \
  -d '{"commands":[{"command":"...","params":{...}},...]}'
```

**IMPORTANT**: Use `params` key, NOT `args`.

## Available Commands

### Document Navigation
| Command | Params | Description |
|---------|--------|-------------|
| `set-page` | `name` | Switch to page by name |
| `get-selection` | — | Get current selection |

### Create Nodes
| Command | Params | Description |
|---------|--------|-------------|
| `create-frame` | `name, parentId, x, y, width, height, layoutMode, itemSpacing, paddingLeft/Right/Top/Bottom, primaryAxisSizingMode, counterAxisSizingMode, primaryAxisAlignItems, counterAxisAlignItems, fills, clipsContent, opacity` | Create auto-layout frame |
| `create-rectangle` | `name, parentId, x, y, width, height, fill, cornerRadius` | Create rectangle |
| `create-text` | `name, parentId, x, y, width, height, characters, style{fontFamily, fontStyle, fontSize, fontWeight, textAlignHorizontal, textAlignVertical, letterSpacing, lineHeight}` | Create text node (auto-loads font) |
| `create-component` | `name, parentId, x, y, width, height` | Create component |
| `create-instance` | `componentId OR componentKey, name, parentId, x, y, scaleX, scaleY` | Create instance of component |
| `create-component-set` | `componentIds[], name, parentId, x, y` | Combine components into variant set |

### Modify Nodes
| Command | Params | Description |
|---------|--------|-------------|
| `update-node` | `nodeId, properties{key: value}` | Update any node property (supports `resize: [w,h]`, `componentProperties`) |
| `update-text-in-instance` | `instanceId + textName OR nodeId, characters` | Update text inside instance (auto-loads fonts) |
| `set-fill` | `nodeId, fill{type, color{r,g,b,a}}` | Set fill color |
| `set-stroke` | `nodeId, stroke{type, color{r,g,b}}, strokeWeight` | Set stroke |
| `set-effects` | `nodeId, effects[{type, color, offset, radius, visible, blendMode}]` | Set effects (shadows etc.) |
| `set-instance-props` | `nodeId, componentProperties, visible, opacity, name, resize, layoutAlign, layoutGrow` | Set instance properties |
| `set-variant-property` | `nodeId, propertyName, type, defaultValue, options[]` | Add/update variant property on COMPONENT_SET; or set `variantName` on COMPONENT |

### Query Nodes
| Command | Params | Description |
|---------|--------|-------------|
| `get-node-props` | `nodeId` | Get node properties (type, size, layout, component props) |
| `find-children` | `nodeId, type?, name?` | Find children with optional type/name filter |
| `get-bound-variables` | `nodeId` | Get all variable bindings on node |
| `list-components` | — | List all components in document |
| `list-variables` | `nameFilter?, typeFilter?, limit?` | List variable collections and variables |

### Variables
| Command | Params | Description |
|---------|--------|-------------|
| `bind-variable` | `nodeId, field, variableId` | Bind variable to property. Fields: `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`, `itemSpacing`, `cornerRadius` (sizing), `fills`, `strokes` (color, with optional `index`), `fontSize`, `lineHeight`, `letterSpacing`, `fontFamily`, `fontStyle` (text — node must be TEXT) |

### Other
| Command | Params | Description |
|---------|--------|-------------|
| `clone-node` | `nodeId, name?, x?, y?, parentId?` | Clone node |
| `swap-instance` | `nodeId, componentId` | Swap instance to different component |
| `insert-before` | `parentId, nodeId, beforeId` | Reorder child before another |
| `delete-node` | `nodeId` | Delete node |
| `export-node` | `nodeId, format? (PNG), scale?` | Export node as base64 |

## Rules

1. **Always check status first** — `GET /status` before sending commands
2. **Use `params`, never `args`** — commands fail silently with wrong key
3. **Parent-first creation** — create parent frames before children
4. **Font loading is automatic** — `create-text` and `update-text-in-instance` handle it
5. **Colors are 0–1 floats** — `{r: 1, g: 0, b: 0}` = red, NOT `{r: 255, ...}`
6. **Variable binding requires existing fill** — for `fills`/`strokes` binding, node must have at least one fill/stroke, or the command creates a black solid first
7. **Text variable binding** — `fontSize`, `lineHeight`, `fontFamily`, `fontStyle`, `letterSpacing` only work on TEXT nodes
8. **Component sets** — first create individual COMPONENTs with variant-encoded names (e.g. `state=default, size=md`), then `create-component-set` to combine them
9. **Batch for performance** — use `/batch` endpoint when sending 3+ related commands

---

# Figma Component Architecture Guide

## Overview

This project uses a **three-layer component architecture** in Figma, mirroring the React component hierarchy. Every Figma component page follows this exact structure.

## Page Layout (4 Sections)

Each component page is a CANVAS containing 4 SECTION nodes:

```
CANVAS "Component Name"
  SECTION "" (main content)       — Preview frames with light/dark panels
  SECTION "" (Components)         — .title + COMPONENT_SET items
  SECTION "examples"              — Reusable compositions of component instances
  SECTION ".internal"             — Atomic sub-components (building blocks)
```

## Build Order (Bottom-Up)

**ALWAYS build in this order:**

1. `.internal` — Atomic sub-components (icon wrappers, indicators, adornments)
2. `Components` — Main component sets that compose .internal pieces
3. `examples` — Compositions of component instances
4. Preview frames — Instances from examples placed into light/dark panels

**NEVER skip layers. NEVER use raw frames where components should exist.**

## .internal Section

Contains atomic COMPONENT_SET sub-components. Named with `.` prefix.

### Pattern (from Menu reference):

```
.internal/
  .start          — COMPONENT_SET: start adornment slot
                    Variants: type (icon 2xl/xl/lg/md/sm/xs, radio, checkbox)
                    Each variant: wrapper frame with INSTANCE of actual element
                    Bound vars: paddingRight, size

  .end            — COMPONENT_SET: end adornment slot
                    Variants: type (sub trigger, action, radio, checkbox)
                    Bound vars: paddingLeft, paddingRight, size

  .start-danger   — COMPONENT_SET: danger-colored start adornment
  .end-danger     — COMPONENT_SET: danger-colored end adornment
```

### Key Rules for .internal:
- Every size gets its own sub-component if sizing affects internal structure
- All spacing/sizing properties MUST be bound to design token variables
- Icon instances reference the shared `icon` component with size variable
- Padding values use variable bindings, NOT hardcoded numbers

## Components Section

Contains the main COMPONENT_SET items that users interact with.

### Pattern (from Menu reference):

```
Components/
  menu-item       — COMPONENT_SET
                    Variant axes: state (default/hover/disabled/action hover), danger (False/True)
                    Boolean props: start adornment, end adornment
                    Internal structure:
                      FRAME "background" — hover highlight layer (absolute-positioned, fills parent)
                      INSTANCE ".start"  — from .internal
                      TEXT "label"       — main text
                      INSTANCE ".end"    — from .internal

  menu-item-separator  — COMPONENT_SET
                         Variant: gradient-fade (False/True)

  menu-item-content    — COMPONENT (single, no variants)
                         TEXT "title" + TEXT "description"

  menu-item-info       — COMPONENT
                         Boolean props: start/end adornment
```

### Key Rules for Components:
- Use INSTANCE references to .internal sub-components (NOT raw frames)
- Boolean properties control visibility of optional slots
- State variants (default/hover/active/disabled) as VARIANT axis
- All fills bound to color variables (semantic tokens)
- All text bound to typography variables (fontSize, lineHeight, fontFamily, fontStyle, letterSpacing)
- All padding/spacing bound to sizing variables
- **background** frame is absolute-positioned (constraints: stretch all), fills entire component area
  - In default state: fill is transparent (opacity 0)
  - In hover state: fill bound to `ui/menu/item/background`
  - Radius bound to component-specific radius variable

## Variable Binding Pattern

### Three-Layer Token System:

```
Primitive tokens → Semantic tokens → Component CSS custom properties
```

### Variable Collections:
1. **color** — Semantic colors with Light/Dark modes
   - `text`, `text/primary`, `text/secondary`, `text/tertiary`, `text/disabled`
   - `surface`, `surface/secondary`, `surface/tertiary`, `surface/elevated`
   - `background/primary/ghost/hover`, `background/primary/ghost/active`, `background/primary/ghost/selected`
   - `ui/menu/item/background`, `ui/menu/separator/background`

2. **color primitive** — Raw color values
   - `base.white`, `base.black`
   - `gray.50` through `gray.950`
   - `alpha.*` opacity values

3. **sizing** — All dimensional values
   - `radius/none` through `radius/full`
   - `spacing/2xs` through `spacing/11xl`
   - `control/size/3xs` through `control/size/3xl`
   - `control/gutter/*`, `control/icon-size/*`
   - `menu/*` component-specific tokens

4. **typography** — Font properties
   - `size/text/sm` (14px), `size/text/md` (16px), etc.
   - `line/text/sm` (20px), `line/text/md` (24px), etc.
   - `weight/normal`, `weight/medium`, `weight/semibold`, `weight/bold`
   - `family/text`, `tracking/text/sm-normal`

### Binding via Bridge:
```bash
# Bind sizing variable
curl -X POST http://localhost:8867/command -H "Content-Type: application/json" \
  -d '{"command":"bind-variable","params":{"nodeId":"ID","field":"paddingLeft","variableId":"VariableID:..."}}'

# Bind color variable (fills)
curl -X POST http://localhost:8867/command -H "Content-Type: application/json" \
  -d '{"command":"bind-variable","params":{"nodeId":"ID","field":"fills","variableId":"VariableID:..."}}'
```

## Complete Variable ID Reference

### Color Variables (Semantic)
| Token | Variable ID | Usage |
|-------|-------------|-------|
| `text` | `VariableID:6037:164054` | Primary text (legacy) |
| `text/primary` | `VariableID:6037:164055` | Primary text color |
| `text/secondary` | `VariableID:6037:164056` | Secondary text |
| `text/tertiary` | `VariableID:6037:164057` | Tertiary/muted text |
| `text/disabled` | `VariableID:6037:164065` | Disabled text |
| `text/danger` | `VariableID:6037:164061` | Danger text |
| `surface` | `VariableID:6037:163865` | Primary surface |
| `surface/secondary` | `VariableID:6037:163866` | Secondary surface |
| `background/primary/ghost/hover` | `VariableID:6037:163968` | Ghost hover bg |
| `background/primary/ghost/active` | `VariableID:6037:163976` | Ghost active bg |
| `background/primary/ghost/selected` | `VariableID:6156:13296` | Ghost selected bg |
| `background/primary/soft-alpha` | `VariableID:6037:163887` | Soft alpha bg |
| `ui/menu/item/background` | `VariableID:6037:164137` | Menu item hover bg |
| `ui/menu/separator/background` | `VariableID:6182:278380` | Menu separator line |

### Sizing Variables
| Token | Variable ID | Value |
|-------|-------------|-------|
| `spacing/xs` | `VariableID:6037:229946` | 4px |
| `spacing/sm` | `VariableID:6037:229947` | 6px |
| `spacing/md` | `VariableID:6037:229948` | 8px |
| `spacing/lg` | `VariableID:6037:229949` | 12px |
| `spacing/xl` | `VariableID:6037:229950` | 16px |
| `control/size/sm` | `VariableID:6037:229964` | 28px |
| `control/size/md` | `VariableID:6037:229965` | 32px |
| `control/size/lg` | `VariableID:6037:229966` | 36px |
| `control/gutter/xs` | `VariableID:6225:14671` | 8px |
| `control/gutter/sm` | `VariableID:6225:14672` | 10px |
| `control/gutter/md` | `VariableID:6225:14673` | 12px |
| `control/icon-size/sm` | `VariableID:6225:14677` | 16px |
| `control/icon-size/md` | `VariableID:6225:14678` | 18px |
| `control/icon-size/lg` | `VariableID:6225:14679` | 20px |
| `radius/sm` | `VariableID:6037:229936` | 6px |
| `radius/md` | `VariableID:6037:229937` | 8px |
| `radius/lg` | `VariableID:6037:229938` | 10px |
| `radius/xl` | `VariableID:6037:229939` | 12px |

### Menu-Specific Sizing
| Token | Variable ID | Value |
|-------|-------------|-------|
| `menu/gutter` | `VariableID:6177:14781` | 6px |
| `menu/item/gap` | `VariableID:6177:14785` | 6px |
| `menu/item/radius` | `VariableID:6177:14786` | 6px |
| `menu/item/padding/top-bottom` | `VariableID:6177:14783` | 6px |
| `menu/item/padding/left-right` | `VariableID:6177:14784` | 8px |
| `menu/separator/padding/top-bottom` | `VariableID:6177:14790` | 6px |
| `menu/slot-height` | `VariableID:6181:278245` | 20px |
| `menu/icon-size/sm` | `VariableID:6184:279525` | → control/icon-size/sm |
| `menu/icon-size/md` | `VariableID:6184:279526` | → control/icon-size/md |
| `menu/icon-size/lg` | `VariableID:6184:279527` | → control/icon-size/lg |

### Typography Variables
| Token | Variable ID | Value |
|-------|-------------|-------|
| `size/text/xs` | `VariableID:6003:702` | 12px |
| `size/text/sm` | `VariableID:6003:703` | 14px |
| `size/text/md` | `VariableID:6003:704` | 16px |
| `line/text/sm` | `VariableID:6003:758` | 20px |
| `weight/normal` | `VariableID:6003:686` | Regular |
| `weight/medium` | `VariableID:6003:696` | Medium |
| `weight/semibold` | `VariableID:6003:690` | Semi Bold |
| `family/text` | `VariableID:6003:700` | Inter |
| `tracking/text/sm-normal` | `VariableID:6003:833` | -0.14px |

## Text Node Binding Pattern

Every TEXT node must have ALL these bindings:

```
fontSize      → size/text/sm (VariableID:6003:703)
lineHeight    → line/text/sm (VariableID:6003:758)
fontFamily    → family/text (VariableID:6003:700)
fontStyle     → weight/normal (VariableID:6003:686)
letterSpacing → tracking/text/sm-normal (VariableID:6003:833)
fills[0].color → text/primary (VariableID:6037:164055)
```

## Examples Section

Contains COMPONENT compositions (NOT just frames) that group multiple instances.

### Key Rules for Examples:
- Each example IS a COMPONENT (can be instantiated in previews)
- Contains only INSTANCES of Components section items
- VERTICAL auto-layout with appropriate spacing
- Named descriptively: `{component} {variant} {size}`
- Width matches expected container width

## Mobile vs Desktop Variants

Components that differ between mobile and desktop should have:
- `size` variant axis: `sm` (mobile), `md` (desktop)
- Mobile items: 28px height (control/size/sm), larger touch targets
- Desktop items: 32px height (control/size/md)
- Mobile may hide certain elements (badges, actions)

## Preview Frame Structure

```
FRAME "preview" (VERTICAL, auto-height)
  FRAME "content" (HORIZONTAL, bg: #f3f3f3)
    FRAME "light" (VERTICAL, bg: white, 1024px)
      [INSTANCE from examples or Components] — centered
      FRAME "icon" (40x40, sun icon)
    FRAME "dark" (VERTICAL, bg: #212121, 1024px)
      [INSTANCE from examples or Components] — centered
      FRAME "icon" (40x40, moon icon)
```

## Plugin Bridge Commands

Available via HTTP API at `http://localhost:8867/command`.
**IMPORTANT**: Use `params` key (NOT `args`) for command parameters.

### Request Format:
```bash
curl -X POST http://localhost:8867/command -H "Content-Type: application/json" \
  -d '{"command":"<name>","params":{...}}'
```

### Batch:
```bash
curl -X POST http://localhost:8867/batch -H "Content-Type: application/json" \
  -d '{"commands":[{"command":"...","params":{...}},...]}'
```

### Status: `GET http://localhost:8867/status`

### Core Commands:
- `create-frame`, `create-text`, `create-rectangle`
- `create-component`, `create-component-set`
- `create-instance`
- `update-node`, `delete-node`
- `set-fill`, `set-stroke`, `set-effects`
- `find-children`, `get-node-props`
- `set-instance-props`, `insert-before`
- `export-node`, `list-components`, `set-page`

### Variable Commands:
- `list-variables` — List collections (params: filter, collection)
- `bind-variable` — Bind property to variable (params: nodeId, field, variableId)
- `get-bound-variables` — Get all bindings (params: nodeId)

## Figma API Reference

- File ID: `NjWXNCiJeb6mfICN1IN7OR`
- Plugin API (via bridge) is READ-WRITE
- Bridge: WebSocket 8866 (plugin), HTTP 8867 (commands)

### Page Node IDs:
| Page | Node ID |
|------|---------|
| Menu (reference) | `6177:14717` |
| Dropdown (reference) | `6430:44087` |
| Select (reference) | `6133:63065` |
| Sidebar (target) | `6568:185519` |
| Icons (source) | `2100:26850` |

## Reference Files

- `/figma/reference/figma-colors.json` — Color variables
- `/figma/reference/figma-sizing.json` — Sizing variables
- `/figma/reference/figma-typography.json` — Typography variables

---

## Sidebar Component Architecture

Source of truth: `http://localhost:3000/docs/components/sidebar`

### React Components (from docs)

| Component | Purpose |
|-----------|---------|
| `SidebarProvider` | Handles collapsible state, context. Props: `collapsible` ("offcanvas"/"icon"/"none"), `defaultOpen`, `open`, `onOpenChange` |
| `SidebarLayout` | Wrapper for sidebar + main content |
| `Sidebar` | Container. Props: `variant` ("sidebar"/"docs"), `side` ("left"/"right") |
| `SidebarHeader` / `SidebarFooter` | Sticky top/bottom |
| `SidebarContent` | Scrollable area |
| `SidebarGroup` | Section with optional label |
| `SidebarGroupLabel` | Section label. Props: `size` ("sm"/"lg") — sm=compact/tertiary, lg=larger/primary |
| `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` | Nav items. `isActive`, `tooltip` |
| `SidebarMenuSub` / `SidebarMenuSubButton` | Nested submenu. `open`, `hasIcons` |
| `SidebarCard` | CTA card in footer. `dismissible`, `onDismiss` |
| `SidebarInset` | Main content area next to sidebar |
| `SidebarTrigger` | Collapse toggle button |

### All Examples (from docs — each needs a Figma example)

| # | Example | Key Features |
|---|---------|-------------|
| 1 | **Overview** | Group labels + menu items with icons + badge ("New") + active state |
| 2 | **Scrollable Content** | Long list that scrolls, multiple groups |
| 3 | **Text-Only Navigation** | No icons, settings-style, collapsible="none" |
| 4 | **Collapse Modes** | collapsible="icon" — icon rail when collapsed, tooltips |
| 5 | **Nested Navigation** | Deep nested submenus (3+ levels), expandable tree |
| 6 | **Mobile Menu** | Mobile drawer variant, toggle controls |
| 7 | **Search** | Search input fixed at top, content scrolls |
| 8 | **Skeleton** | Loading state with skeleton placeholders |
| 9 | **Group Label Sizes** | size="sm" vs size="lg" comparison |
| 10 | **Badges** | Badge variants: "New", "Beta", count "3", "Updated", "Deprecated" |
| 11 | **Footer Cards** | CTA card at bottom, upgrade prompt |

### .internal Section

```
.sidebar-start       — COMPONENT_SET
                       Variants: type=icon lg, type=icon md, type=icon sm
                       Each: wrapper frame + icon INSTANCE sized by control/icon-size/*

.sidebar-end         — COMPONENT_SET
                       Variants: type=badge, type=notification, type=expand-arrow, type=action
                       badge: pill with count (text/tertiary bg, text/secondary color)
                       notification: dot indicator
                       expand-arrow: chevron icon
                       action: icon button

.sidebar-start-active — COMPONENT_SET (accent-colored start variants)
```

### Components Section

```
sidebar-menu-item     — COMPONENT_SET
                        Axes: state (default/hover/active/disabled) × size (sm/md)
                        Boolean: start adornment, end adornment
                        Internal: background + .sidebar-start + label + .sidebar-end
                        Bindings: menu/item/padding/*, menu/item/gap, menu/item/radius

sidebar-group-label   — COMPONENT_SET
                        Axes: size (sm/lg), collapsible (False/True)
                        sm: text/tertiary, size/text/xs, weight/semibold — compact
                        lg: text/primary, size/text/sm, weight/medium — larger with more spacing

sidebar-separator     — COMPONENT_SET
                        Axes: gradient-fade (False/True)
                        Color: ui/menu/separator/background

sidebar-card          — COMPONENT_SET
                        Axes: size (sm/md)
                        Background: surface/secondary, radius/md
                        Children: title (text/primary, weight/medium), description (text/secondary, weight/normal)
                        Optional: CTA button, dismiss button

sidebar-sub-item      — COMPONENT_SET (nested items)
                        Axes: state (default/hover/active) × depth (1/2/3)
                        Extra paddingLeft per depth level
                        Tree line indicator on left

sidebar-menu-skeleton — COMPONENT_SET (loading placeholder)
                        Axes: size (sm/md)
                        Shimmer rectangles mimicking menu items

sidebar-search        — COMPONENT_SET (search input)
                        Axes: state (default/focused)
                        Fixed at top of sidebar, above scrollable content
```

### Examples Section (COMPONENT_SETs with size=sm/md variants)

Each example is a COMPONENT_SET with `size=sm, size=md` variants.

```
sidebar overview         — Group labels + icons + active item + badge "New"
sidebar scrollable       — Long list with scroll, multiple groups
sidebar text-only        — Without icons, settings style
sidebar collapse-icon    — Icon rail mode (collapsed state)
sidebar nested           — Deep nested tree navigation (3+ levels)
sidebar mobile           — Mobile drawer variant
sidebar search           — Search input at top
sidebar skeleton         — Loading state with skeleton items
sidebar group-sizes      — sm vs lg group labels side by side
sidebar badges           — Items with badge variants (New, Beta, count, Updated, Deprecated)
sidebar footer-card      — CTA upgrade card at bottom
```

### Preview Section Structure (Standard Template)

Each page uses the "New Component Template" pattern (page `6568:184519`):

```
SECTION "" (preview)
  GROUP "group"
    FRAME "group" (VERTICAL, auto)
      INSTANCE ".title" (componentId: 6330:78705, variant: "notes + description")
        — Text: component name + description

      For each example:
        INSTANCE ".subtitle" (componentId: 6151:90929, variant: "Full width")
          — Text: example section name (e.g. "Overview", "Badges")
        INSTANCE ".description" (componentId: 6155:71546)
          — Text: brief description of the example
        FRAME "preview" (VERTICAL, auto, paddingBottom→figma/preview/gap)
          FRAME "content" (HORIZONTAL, gap→spacing/xl, padding→spacing/xl, fill→surface/tertiary)
            FRAME "light" (VERTICAL, 1024px, fill→surface, stroke→border, radius→radius/2xl, gap→figma/group/gap)
              INSTANCE "slot" — from examples section
              FRAME "icon" (40×40, sun icon)
            FRAME "dark" (VERTICAL, 1024px, fill→surface, stroke→border, radius→radius/2xl, gap→figma/group/gap)
              INSTANCE "slot" — from examples section
              FRAME "icon" (40×40, moon icon)
```

Key variable bindings for preview:
- content: `spacing/xl` (VariableID:6037:229950) for padding + itemSpacing, `surface/tertiary` (VariableID:6037:163867) fill
- light/dark: `breakpoints/lg` (VariableID:6155:67310) width, `radius/2xl` (VariableID:6037:229940) corners, `surface` (VariableID:6037:163865) fill, `border` (VariableID:6037:163984) stroke, `figma/group/gap` (VariableID:6193:27026) itemSpacing
- preview frame: `figma/preview/gap` (VariableID:6413:82922) paddingBottom

Template component IDs:
- `.title` component: `6330:78705`
- `.subtitle` component: `6151:90929`
- `.description` component: `6155:71546`


---

## npm Publishing
When user says "опубликуй" — bump versions, commit, push, create a GitHub Release. The release runs `.github/workflows/publish.yml`, which publishes the packages.
```bash
# 1. Bump the version of every package that changed:
#    packages/styles, packages/ui, packages/vue, packages/mcp (package.json "version").
#    ui and vue depend on @plexui/styles: a CSS change needs a styles bump too.

# 2. Commit & push all changes (not just package.json — include any code changes)
git add <paths>
git commit -m "<descriptive message>"
git push origin master

# 3. Create the GitHub Release (tag v{ui version}); it triggers publish.yml
gh release create v0.20.0 --repo plex-ui/ui --title "Release v0.20.0" --target master --generate-notes
```
`publish.yml` (also runnable by hand from the Actions tab) checks each package's version on npm and publishes only the ones that are missing, in order: `@plexui/styles` → `@plexui/ui` → `@plexui/vue` → `@plexui/mcp`. Before ui and vue it runs the same guards as the local scripts (`check-styles-published.mjs`, `check-published-types.mjs`) and waits until a just-published styles version is visible on npm.

**Auth:**
- npm Trusted Publishing (OIDC, with provenance): each package needs `plex-ui/ui` + `publish.yml` set as its trusted publisher on npmjs.com (package Settings → Trusted publishing). `@plexui/ui` has it (CI releases up to v0.19.1 used it). `@plexui/mcp` 0.1.0 was published by hand, so check its settings before a CI release.
- A package that is not on npm yet cannot have a trusted publisher. For its first publish, either add a repository secret `NPM_BOOTSTRAP_TOKEN` (granular token with publish access to `@plexui`; the workflow falls back to it) or publish once locally (`npm login`, then `npm run publish:styles` / `publish:vue`). Then set its trusted publisher and delete the secret. The old `NPM_TOKEN` secret (from before OIDC) is not used.
- `package.json` `repository.url` must point at `https://github.com/plex-ui/ui.git` (the repo was `plex-ui/docs`), or provenance verification rejects the publish.

**Local fallback:** `npm run publish:styles`, `publish:ui`, `publish:vue`, `publish:mcp` (same guards; needs `npm login`). After a local ui publish, rebuild: `npm publish` triggers `build:clean`, which deletes `dist/`.

**Key details:**
- Pushing needs the `stomashevsky` gh account (see memory); release tag format: `v{version}` (e.g. `v0.20.0`)

---

## Figma-to-CSS Verification (MANDATORY)

When implementing CSS from Figma designs, you MUST run the verification script after writing CSS. Never eyeball values.

### Workflow

1. Fetch Figma data: `mcp_figma-read_get_figma_data(fileKey, nodeId, depth=10)`
2. Extract all style values from `globalVars.styles` into a JSON file with `cssSelector` mapping
3. Write CSS module
4. Run verification:
```bash
node scripts/verify-figma-css.mjs --figma /tmp/figma-spec.json --css packages/styles/src/components/MyComponent/MyComponent.module.css
```
5. Fix ALL mismatches before considering the task done

### JSON format
```json
{
  "node-name": {
    "cssSelector": ".CSSClassName",
    "gap": "10px",
    "padding": "12px 21px",
    "fontSize": 14,
    "fontWeight": 400,
    "colors": ["#0D0D0D"],
    "dimensions": { "width": 20, "height": 20 },
    "margin-left": "-4px"
  }
}
```

### Key rules
- Every padding, gap, dimension, color, font property, border-radius, margin offset from Figma MUST be in the JSON
- Use `cssSelector` to map Figma nodes to CSS selectors exactly
- Negative Figma paddings (e.g. `padding: 0px 0px 0px -4px`) = CSS negative margins
- Script exit code 1 = mismatches exist, fix them
- Never skip this step. The script exists because manual transfer is error-prone.
- **Do NOT hardcode inherited defaults.** Figma shows ALL properties on every node (including inherited). Do NOT transfer these to CSS if they match the inherited/default value:
  - `font-family` — inherited from body/root, never hardcode
  - `font-weight: 400` — CSS default, omit unless differs
  - `color` matching parent — use CSS variable or inherit
  - `text-align: left` — CSS default
  - `display: block` — CSS default for div

---

## Turbopack Cache Fix (MANDATORY after UI package rebuild)

When you run `npm run build` in `packages/ui/`, the `build:clean` step deletes `dist/`. Turbopack caches stale references to those deleted files and will fail with `Can't resolve '...variables-semantic.css'` or similar errors even after the rebuild recreates them.

**ALWAYS do this immediately after any `packages/ui` build:**
```bash
rm -rf .next
```

Then restart the dev server if it was running:
```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; rm -rf .next && npm run dev:all &
```

**CRITICAL: Do NOT use `> /dev/null 2>&1` or any output suppression** — this causes the bash tool to hang waiting for the background process. Always let output stream naturally, and use a short timeout (3-5s) on the bash call since the server will keep running in background.

Do NOT wait for the user to report the error — proactively nuke `.next` every time you rebuild the UI package.

### Post-rebuild verification — mandatory five-step gate

The Turbopack restart **alone** is not the rule. The rule is: **the task is not done until HTTP 200 is observed on the affected route**. After every `packages/ui` rebuild:

```bash
# 1. Rebuild packages/styles, then packages/ui, FULLY (one-shot, sequential, completes before next step)
npm run build:styles && npm run build:ui

# 2. Nuke Turbopack cache
rm -rf .next

# 3. Restart via Claude Preview MCP — uses plain `next dev` only (NOT `dev:all`)
#    See decision 0009: dev:all races packages/ui's build:clean against next dev startup,
#    producing phantom `Can't resolve '../packages/ui/dist/...'` 500s on every route.
mcp__Claude_Preview__preview_stop  # if a previous serverId is alive
mcp__Claude_Preview__preview_start name="Next.js docs dev"

# 4. Wait for cold compile + verify the route the user reported
sleep 8
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/docs/<route>

# 5. If status != 200, read the dev-server log file and fix the actual error
#    BEFORE reporting back to the user. Saying "you might need to restart"
#    is the wrong escape hatch — agent has shell access and owns the restart.
```

**Prior incidents that this gate prevents:**
- Accordion missing-module error after icon SVG fix (2026-04-25)
- ButtonGroup ×2; Input.AdornmentButton
- `dev:all`-vs-`next dev` race producing phantom `Can't resolve '../packages/ui/dist/es/styles/variables-primitive.css'` 500s on every route through Claude Preview MCP (2026-04-25)
- User feedback: "ты обещал мне что все исправил"

Canonical decision files:
- [`.memory/decisions/0008-post-change-verification-mandatory.md`](.memory/decisions/0008-post-change-verification-mandatory.md) — the verification gate
- [`.memory/decisions/0009-launch-uses-plain-next-dev-not-dev-all.md`](.memory/decisions/0009-launch-uses-plain-next-dev-not-dev-all.md) — why `.claude/launch.json` uses plain `dev`, not `dev:all`