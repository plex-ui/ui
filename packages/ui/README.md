# @plexui/ui

React components of [Plex UI](https://plexui.com): 50 accessible components on Radix primitives, one 9-size scale across every control, three-layer design tokens and dark mode. Built for AI agents, with an MCP server, an agent skill and `llms.txt`.

The same components for Vue: [`@plexui/vue`](https://www.npmjs.com/package/@plexui/vue).

[Docs](https://plexui.com) · [Components](https://plexui.com/components) · [GitHub](https://github.com/plex-ui/ui)

## Install

```bash
npm install @plexui/ui
```

Requires React 19 and Tailwind CSS 4.

```css
/* globals.css */
@layer theme, base, components, utilities;
@import "tailwindcss";
@import "@plexui/ui/css";
@source "../node_modules/@plexui/ui";
```

On Vite, add `plexui()` from `@plexui/ui/vite` and drop the `@layer` line. Wrap the app in `PlexUIProvider` to set the link component (for example Next.js `Link`):

```tsx
import { PlexUIProvider } from "@plexui/ui/components/PlexUIProvider";

<PlexUIProvider linkComponent={Link}>{children}</PlexUIProvider>
```

## Use

```tsx
import { Button } from "@plexui/ui/components/Button";

<Button color="primary" size="lg">Get started</Button>
```

Every component has its own subpath: `@plexui/ui/components/<Name>`. Hooks live in `@plexui/ui/hooks/<name>`, shared types in `@plexui/ui/types`, theme helpers in `@plexui/ui/theme`.

## Size scale

Controls share one `size` scale: `3xs` 22px, `2xs` 24px, `xs` 26px, `sm` 28px, `md` 32px (default), `lg` 36px, `xl` 40px, `2xl` 44px, `3xl` 48px.

## Dark mode

Set `data-theme="dark"` (or `"light"`) on `<html>`; it also works on any element for a nested scope. `applyDocumentTheme`, `getDocumentTheme` and `useDocumentTheme` from `@plexui/ui/theme` read and set it. See [Dark mode](https://plexui.com/docs/concepts#dark-mode).

## License

[MIT](./LICENSE)
