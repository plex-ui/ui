# @plexui/ui

A modern React component library with 35 production-ready components, 14 hooks, a three-layer design token system, and a unified 9-step size scale — all powered by Radix primitives and Tailwind CSS 4.

[Documentation](https://plexui.com) &bull; [GitHub](https://github.com/plex-ui/ui)

---

## Highlights

- **Production-grade** — components designed and tested for real products at scale.
- **9-step size scale** — all key controls (Button, Input, Select, SegmentedControl, etc.) share a unified `ControlSize` scale from `3xs` (22 px) to `3xl` (48 px). Most competitors offer only 3–4.
- **Three-layer design tokens** — primitive → semantic → component CSS custom properties with `light-dark()` theming, alpha transparency scale, and 4-level elevation system.
- **Radix + Tailwind 4** — accessible primitives under the hood, utility-first styling on top.
- **Built for AI code editors** — consistent naming, clear token system, and comprehensive props give Claude, Cursor, Codex & other AI tools the building blocks to generate professional UI.

---

## Installation

```bash
npm install @plexui/ui
```

### Peer dependencies

The package requires the following peers — install them if they are not already in your project:

```bash
npm install react react-dom tailwindcss
```

| Peer | Version |
|------|---------|
| `react` | `^18 \|\| ^19` |
| `react-dom` | `^18 \|\| ^19` |
| `tailwindcss` | `^4.0.10` |

---

## Setup

### 1. Import CSS

Add the Plex UI stylesheet to your global CSS file alongside Tailwind:

```css
/* app/globals.css */
@import "tailwindcss";
@import "@plexui/ui/css";
```

### 2. Wrap your app in PlexUIProvider

`PlexUIProvider` supplies shared context (e.g. the link component) to all Plex UI components.

```tsx
// app/layout.tsx (Next.js example)
import { PlexUIProvider } from "@plexui/ui/components/PlexUIProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PlexUIProvider linkComponent="a">
          {children}
        </PlexUIProvider>
      </body>
    </html>
  );
}
```

> **Next.js:** Pass your `<Link>` component from `next/link` as `linkComponent` so navigation links use client-side routing.

### 3. Use components

```tsx
import { Button } from "@plexui/ui/components/Button";

export function Example() {
  return (
    <Button color="primary" variant="solid" size="md">
      Get started
    </Button>
  );
}
```

---

## Exports

All exports use subpath imports for optimal tree-shaking.

### Components

```ts
import { Button, ButtonLink } from "@plexui/ui/components/Button";
import { Input } from "@plexui/ui/components/Input";
import { Select, Option } from "@plexui/ui/components/Select";
// ... 35 components total
```

<details>
<summary>Full component list</summary>

Alert, Avatar, AvatarGroup, Badge, Button, ButtonLink, Checkbox, CodeBlock, CopyTooltip, DateInput, DatePicker, DateRangePicker, EmptyMessage, FieldError, FloatingLabelInput, Icon, Image, Indicators (LoadingIndicator, LoadingDots, CircularProgress), Input, Markdown, Menu, PlexUIProvider, Popover, ProgressSteps, RadioGroup, SegmentedControl, Select, SelectControl, ShimmerText, Sidebar, Skeleton, Slider, Switch, TagInput, TextLink, Textarea, Tooltip, Transition (Animate, AnimateLayout, AnimateLayoutGroup, TransitionGroup)

</details>

### Hooks

```ts
import { useBreakpoints } from "@plexui/ui/hooks/useBreakpoints";
import { useScrollable } from "@plexui/ui/hooks/useScrollable";
// ... 14 hooks total
```

### Types

```ts
import type { ControlSize, SemanticColors, Variants } from "@plexui/ui/types";
```

### CSS

```css
@import "@plexui/ui/css";
```

### Utilities

```ts
import { theme } from "@plexui/ui/theme";
import { helpers } from "@plexui/ui/helpers";
import { dateUtils } from "@plexui/ui/dateUtils";
```

---

## Size scale

All key controls share a unified height scale:

| Size | Height |
|------|--------|
| `3xs` | 22 px |
| `2xs` | 24 px |
| `xs` | 26 px |
| `sm` | 28 px |
| **`md`** | **32 px** (default) |
| `lg` | 36 px |
| `xl` | 40 px |
| `2xl` | 44 px |
| `3xl` | 48 px |

---

## Dark mode

Plex UI uses the CSS `light-dark()` function. Toggle between themes by setting the `color-scheme` property on the root element:

```css
:root { color-scheme: light; }       /* light theme */
:root { color-scheme: dark; }        /* dark theme */
:root { color-scheme: light dark; }  /* follows OS preference */
```

---

## License

[MIT](./LICENSE)
