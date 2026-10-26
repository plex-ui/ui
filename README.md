<div align="center">

# Plex UI

**Design system for React and Vue, built for AI agents.**

[![@plexui/ui](https://img.shields.io/npm/v/@plexui/ui?color=black&label=%40plexui%2Fui)](https://www.npmjs.com/package/@plexui/ui)
[![@plexui/vue](https://img.shields.io/npm/v/@plexui/vue?color=black&label=%40plexui%2Fvue)](https://www.npmjs.com/package/@plexui/vue)
[![MIT License](https://img.shields.io/badge/license-MIT-black.svg)](./packages/ui/LICENSE)
[![MCP server](https://img.shields.io/badge/MCP-server-black)](https://plexui.com/docs/mcp)

[Docs](https://plexui.com) · [Components](https://plexui.com/components) · [Vue guide](https://plexui.com/docs/vue) · [Changelog](https://plexui.com/docs/changelog)

</div>

## Why Plex UI

- **50 accessible components** with one 9-size scale (3xs to 3xl) across every control
- **React and Vue** render the same markup from the same CSS, checked by parity tests
- **Design tokens** in three layers (primitive, semantic, component) with dark mode
- **Built for Claude and Codex**: MCP server, agent skill, `llms.txt` and a shadcn registry

## Packages

| Package | |
| --- | --- |
| [`@plexui/ui`](./packages/ui) | React 19 components on Radix |
| [`@plexui/vue`](./packages/vue) | Vue 3 components on Reka UI, same API |
| [`@plexui/styles`](./packages/styles) | Shared tokens and component CSS |
| [`@plexui/mcp`](https://plexui.com/docs/mcp) | MCP server with the component API for AI agents |

## Quick start

**React**

```bash
npm install @plexui/ui
```

```css
@layer theme, base, components, utilities;
@import "tailwindcss";
@import "@plexui/ui/css";
@source "../node_modules/@plexui/ui";
```

```tsx
import { Button } from "@plexui/ui/components/Button";

<Button color="primary">Ship it</Button>
```

**Vue**

```bash
npm install @plexui/vue @plexui/styles
```

```css
@layer theme, base, components, utilities;
@import "tailwindcss";
@import "@plexui/styles/css";
@source "../node_modules/@plexui/vue";
```

```vue
<script setup lang="ts">
import { Button } from "@plexui/vue/components/Button"
</script>

<template>
  <Button color="primary">Ship it</Button>
</template>
```

Requires Tailwind CSS 4. Full setup, including the Vite plugin and SSR: [Installation](https://plexui.com/docs/installation), [Vue guide](https://plexui.com/docs/vue).

## AI agents

```bash
# Claude Code
/plugin marketplace add plex-ui/ui
/plugin install plex-ui@plex-ui

# Codex
npx degit plex-ui/ui/skills/plexui/skills/plex-ui .agents/skills/plex-ui
```

Also: [MCP server](https://plexui.com/docs/mcp), [`llms.txt`](https://plexui.com/llms.txt), and the [shadcn registry](https://plexui.com/docs/registry) (`npx shadcn@latest add https://plexui.com/r/button.json`, Vue: `https://plexui.com/r/vue/button.json`).

## Contributing

```bash
npm install
npm run dev          # docs site
npm run test:parity  # React vs Vue parity tests
```

[Contributing guide](./CONTRIBUTING.md) · [Issues](https://github.com/plex-ui/ui/issues) · [Discussions](https://github.com/plex-ui/ui/discussions) · [Security](./SECURITY.md)

## License

[MIT](./packages/ui/LICENSE)
