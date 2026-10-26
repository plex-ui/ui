# Contributing to Plex UI

Thanks for taking the time to contribute. This project welcomes issues, pull requests, and discussion.

## TL;DR

1. Open an issue before starting non-trivial work so we can align on direction.
2. Fork → branch → PR against `master`.
3. `npm install && npm run dev` — open http://localhost:3000.
4. Before submitting a PR, run `npm run lint`.

## What you can contribute

- **Bug fixes** — no issue needed for clear-cut fixes.
- **New components** — please open a "component request" issue first so we can discuss API.
- **Documentation** — examples, clarifications, typo fixes. Always welcome.
- **AI skill improvements** — tighten the skill markdown, add missing prop descriptions, new code snippets.
- **Tests** — we're growing coverage; PRs welcome.

## Repo layout

```
plexui-docs/
├── app/                    Next.js docs site
├── content/docs/           MDX documentation
├── components/docs/        Demo React components used in docs
├── packages/
│   ├── ui/                 @plexui/ui — the component library (MIT)
│   └── mcp/                @plexui/mcp — MCP server (MIT)
├── skills/                 Claude Code plugin + Codex skill
└── public/r/               shadcn-compatible registry entries
```

## Writing a PR

- Keep PRs scoped — one component or one concern.
- Include a short "why" in the PR description; link the issue you're addressing.
- Update docs if you change a public prop or behavior.
- Add a changelog entry under `content/docs/changelog.mdx` for user-visible changes.

## Running tests / lint

```bash
npm run lint           # ESLint
npm run lint:docs-code # check docs code snippets for duplicates
```

## Design principles

Before adding a new component, check that it passes these:

1. **Accessible by default** — built on Radix Primitives where applicable.
2. **Controllable** — every behavior must be controllable via props.
3. **Composable** — small parts you can recombine, not monolithic props sprawl.
4. **Token-driven** — all sizes, colors, spacings route through CSS variables defined in `packages/ui/src/styles/`. No hardcoded values.
5. **Dark mode ready** — no extra prop needed; use semantic tokens.
6. **AI-friendly** — prop names must be self-explanatory. If an LLM can't guess it, rename.

## Reporting security issues

Please **don't** open public issues for security bugs. See [SECURITY.md](./SECURITY.md).

## Code of conduct

Be kind, be curious, be specific. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Questions?

[Open a discussion](https://github.com/plex-ui/docs/discussions) — no question is too small.
