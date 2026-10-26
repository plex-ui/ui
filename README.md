<div align="center">

# Plex UI

**The React component library your AI agent actually understands.**

[![npm](https://img.shields.io/npm/v/@plexui/ui?color=black&label=%40plexui%2Fui)](https://www.npmjs.com/package/@plexui/ui)
[![npm downloads](https://img.shields.io/npm/dm/@plexui/ui?color=black)](https://www.npmjs.com/package/@plexui/ui)
[![GitHub stars](https://img.shields.io/github/stars/plex-ui/docs?style=flat&color=black)](https://github.com/plex-ui/docs/stargazers)
[![MIT License](https://img.shields.io/badge/license-MIT-black.svg)](./packages/ui/LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-black)](https://plexui.com/docs/overview/skills)
[![MCP server](https://img.shields.io/badge/MCP-server-black)](https://plexui.com/docs/overview/mcp)

[Docs](https://plexui.com) &nbsp;·&nbsp; [Components](https://plexui.com/components) &nbsp;·&nbsp; [AI Skill](https://plexui.com/docs/overview/skills) &nbsp;·&nbsp; [Figma Kit](https://plexui.com/#pricing) &nbsp;·&nbsp; [Threads](https://www.threads.com/@plex_uikit)

</div>

---

Plex UI is a production-grade React component library (Radix + CSS modules) with **first-class AI coding agent support**. Ship the same component library to your humans *and* your LLMs — via Claude Code, Cursor, Codex, MCP, or any agent that speaks the open Agent Skills format.

## Why Plex UI

- 🧑‍💻 **~50 accessible components** on Radix primitives, zero Tailwind dependency
- 🤖 **Installable AI skill** — Claude Code plugin + Codex skill + MCP server, all official
- 🎨 **Three-layer design tokens** — primitive → semantic → component, full dark mode
- 🧩 **shadcn-compatible registry** — mix with existing shadcn projects in one command
- 🟢 **Vue 3 too**: [`@plexui/vue`](./packages/vue) has every component with the same props, markup and styles
- 🧵 **Figma kit with 22,000+ variants** — 1:1 parity with the React components
- 📦 **~40K-token skill** fits the context window without blowing up your prompts

## Quick start

```bash
npm install @plexui/ui
```

```css
/* app/globals.css */
@import "@plexui/ui/css";
```

```tsx
import { Button } from "@plexui/ui/components/Button";

export function Example() {
  return <Button color="primary">Ship it</Button>;
}
```

### With shadcn CLI

If your project uses shadcn/ui, pull Plex UI components with one command each:

```bash
npx shadcn@latest add https://plexui.com/r/styles.json
npx shadcn@latest add https://plexui.com/r/button.json
# then: import { Button } from "@/components/ui/button"
```

See [shadcn Registry docs](https://plexui.com/docs/overview/shadcn-registry) for the full list.

### Vue

```bash
npm install @plexui/vue
```

```vue
<script setup lang="ts">
import { Button } from "@plexui/vue/components/Button"
</script>

<template>
  <Button color="primary">Ship it</Button>
</template>
```

Setup (styles, Vite plugin, SSR) is in the [Vue guide](https://plexui.com/docs/vue).

### With AI coding agents

```bash
# Claude Code
/plugin marketplace add plex-ui/docs
/plugin install plex-ui@plex-ui

# Codex
npx degit plex-ui/docs/skills/plexui/skills/plex-ui .agents/skills/plex-ui
```

See [Skills](https://plexui.com/docs/overview/skills) for Cursor, Windsurf, Copilot, and any other Agent-Skills-compatible editor.

## What you get

| | Humans | Agents |
|---|---|---|
| **Components** | React + TypeScript | Typed skill with prop signatures |
| **Styling** | CSS modules + tokens | Tokens documented for generation |
| **Docs** | [plexui.com](https://plexui.com) | Indexed by skill / MCP |
| **Examples** | MDX with live preview | Copy-paste-ready in skill |
| **Figma** | 22,000+ variants | — |

## Components (excerpt)

Alert · Avatar · Badge · Button · Checkbox · CodeBlock · DataTable · DateInput · DatePicker · Dialog · EmptyMessage · Field · FileUpload · FloatingLabelInput · Input · Markdown · Menu · OTPInput · Popover · RadioGroup · SegmentedControl · Select · Sidebar · Skeleton · Switch · Tabs · TagInput · Textarea · Tooltip · …

See the [full list →](https://plexui.com/components)

## Figma Design System PRO

22,000+ meticulously crafted variants built entirely on Figma Variables.

**[Get the Figma Kit →](https://plexui.com/#pricing)**

| Personal | Team | Unlimited |
|:--:|:--:|:--:|
| **$49** | **$149** | **$299** |
| 1 designer, 1 project | Up to 5 designers | Unlimited |
| Lifetime updates | Lifetime updates | Lifetime updates |

## Star ⭐ if you find this useful

Stars help other developers find Plex UI in GitHub search and signal that the project is worth following. If you've shipped anything with it — or just want to see where it goes — a star takes one click and means a lot.

## Community & support

- 🐛 [Report an issue](https://github.com/plex-ui/docs/issues/new/choose)
- 💡 [Request a component](https://github.com/plex-ui/docs/issues/new?labels=component-request)
- 📬 [Discussions](https://github.com/plex-ui/docs/discussions) — questions, ideas, show & tell
- 🧵 [@plex_uikit on Threads](https://www.threads.com/@plex_uikit)
- 📧 [plexuikit@gmail.com](mailto:plexuikit@gmail.com)
- 🔐 [Security policy](./SECURITY.md)
- 🤝 [Contributing guide](./CONTRIBUTING.md)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

React library: [MIT](./packages/ui/LICENSE)  ·  Figma Kit: commercial via [plexui.com](https://plexui.com/#pricing)
