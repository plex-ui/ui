---
name: plex-ui
description: Manages Plex UI components and projects — installing, composing, styling, and debugging UI. Provides component APIs, design token conventions, and usage patterns. Applies when working with @plexui/ui, Plex UI components, or any project importing from @plexui/ui. Also triggers for Plex UI setup, theming, dark mode, responsive design, or icon usage.
---

# Plex UI

A production-grade React 19 component library with 652 icons, utility hooks, a three-layer design token system, and a unified 9-step control size scale, powered by Radix primitives and Tailwind CSS 4.

> **IMPORTANT:** Components are imported from `@plexui/ui/components/<Folder>`. Hooks from `@plexui/ui/hooks/<module>`. Never import from the package root (it has no root export).

## Installation & Setup

Requires React 19 (React 18 is not supported) and Tailwind CSS 4.

```bash
npm install @plexui/ui
```

### Global stylesheet (e.g. `main.css` or `globals.css`):

```css
/* Pin the cascade-layer order so Plex UI's reset wins over Tailwind preflight */
@layer theme, base, components, utilities;

@import "tailwindcss";
@import "@plexui/ui/css";
/* Required for Tailwind to find class references in Plex UI components */
@source "../node_modules/@plexui/ui";
```

> **Vite:** use the official plugin instead of the manual `@layer` line: `import plexui from "@plexui/ui/vite"` and `plugins: [plexui()]` in `vite.config.ts`. Then `main.css` only needs the three imports.

### Import the stylesheet before rendering (e.g. `main.tsx` or `layout.tsx`):

```tsx
import "./main.css";
```

### Configure the router link (optional) with PlexUIProvider:

`PlexUIProvider` sets the link component used by `ButtonLink`, `TextLink`, `Menu.Link` and `Card` with `href`. Without it they render a plain `<a>` (or take a router link through their `as` prop). When you use it, `linkComponent` is required.

```tsx
import { PlexUIProvider } from "@plexui/ui/components/PlexUIProvider";
import { Link } from "react-router";

declare global {
  interface PlexUIConfig {
    LinkComponent: typeof Link;
  }
}

export function Root({ children }: { children: React.ReactNode }) {
  return <PlexUIProvider linkComponent={Link}>{children}</PlexUIProvider>;
}
```

> **Next.js:** Pass `linkComponent={Link}` from `next/link` for client-side routing. Use `linkComponent="a"` for plain links.

## Principles

1. **Use existing components first.** Check the component list below before writing custom markup.
2. **Use the unified size scale.** Button, Input, Textarea, InputGroup, Select, SelectControl, DatePicker, DateRangePicker, Tabs and Field share the same 9-step `size` prop. Use it consistently.
3. **Use semantic colors.** `color="primary"`, `text-secondary`, `bg-surface`. Never raw palette classes like `bg-blue-500`.
4. **Use CSS variable tokens.** Token colors use `light-dark()` and switch with the `data-theme` attribute.
5. **Compose, don't reinvent.** Dashboard = Sidebar + Menu + Tabs + components. Form = Field + Input + Select + Button.

## Critical Rules

These rules are **always enforced**. Each links to a detailed reference file.

### Imports & Structure -> [components.md](./rules/components.md)

- **Always import from subpaths.** `import { Button } from "@plexui/ui/components/Button"`, never from root.
- **PlexUIProvider is for link routing.** Wrap the app when `ButtonLink` / `TextLink` / `Menu.Link` should use your router's link; pass `linkComponent`.
- **Use `"use client"` when needed.** Plex UI's interactive components already carry the directive. Your own components that use state, effects, or event handlers need it in the Next.js App Router.

### Styling & Tokens -> [styling.md](./rules/styling.md)

- **Use semantic color props.** `color="primary"`, `color="danger"`, not Tailwind color classes.
- **Use the `variant` prop.** Button takes `"solid"` (default), `"soft"`, `"outline"`, `"ghost"`. Other components take a subset (see styling.md).
- **Use the `size` prop.** 9-step scale from `3xs` to `3xl`. Default is `md`.
- **Dark mode is driven by `data-theme`.** Set `data-theme="dark"` or `"light"` on `<html>` (or a subtree). It sets `color-scheme` for the `light-dark()` tokens, switches the shadow tokens, and drives Tailwind's `dark:` variant. Setting `color-scheme` alone flips only the colors. Without `data-theme`, the light theme applies.
- **Use Plex UI utility classes.** `text-primary`, `text-secondary`, `bg-surface`, `border-default`, not raw colors.

### Icons -> [icons.md](./rules/icons.md)

- **Import icons from `@plexui/ui/components/Icon`.** Named exports without a prefix: `Search`, `Check`, `ChevronDown`, `Plus`, `X`.
- **Icons auto-size inside Button.** No manual `w-4 h-4` needed; Button sizes its icons from the `size` prop.
- **Use `iconSize` to override.** On `Button` / `ButtonLink`, use `iconSize="sm"` etc. when the default icon size doesn't fit.

## Component Reference

Import each component from its folder: `import { X } from "@plexui/ui/components/X"`. When a component lives in another folder, the table names it (e.g. `ButtonLink` comes from `Button`). `Menu`, `Dialog`, `Popover`, `Tabs`, `Card` and others use dot-notation parts (`Menu.Item`), not separate imports.

### Controls (unified size scale)

| Component | Key Props | Description |
|-----------|-----------|-------------|
| `Button` | `color`, `variant`, `size`, `pill`, `block`, `loading`, `disabled`, `iconSize` | Primary action element |
| `ButtonLink` | Same as Button + `href` (from `Button`) | Button that renders as a link |
| `CopyButton` | Button props + `copyValue` (from `Button`) | Button that copies to the clipboard |
| `Input` | `size`, `variant`, `placeholder`, `disabled`, `invalid`, `onClear` | Text input field |
| `Textarea` | `size`, `rows`, `autoResize`, `maxRows` | Multi-line text input |
| `InputGroup` | `size`; parts `.Input`, `.Textarea`, `.Addon`, `.Button`, `.Text` | Input with attached addons |
| `FloatingLabelInput` | `label`, `errorMessage`, `invalid`, `description` | Input with animated floating label |
| `DateInput` | `value`, `onChange` (Luxon `DateTime`), `clearable` + Input props | Masked date text input |
| `Select` | `options`, `value`, `onChange`, `multiple`, `size`, `placeholder` | Dropdown select (search appears above 15 options) |
| `SelectControl` | `size`, `variant`, `selected`, `onClearClick`, `StartIcon` | Select trigger shell for custom dropdowns |
| `FloatingLabelSelect` | `label`, `selected`, `errorMessage`, `onClearClick` | Select trigger with floating label |
| `Checkbox` | `checked` (`boolean \| "indeterminate"`), `onCheckedChange`, `label` | Checkbox control |
| `RadioGroup` | `value`, `onChange`, `direction`; part `RadioGroup.Item` | Radio button group |
| `Switch` | `checked`, `onCheckedChange`, `label` | Toggle switch |
| `SegmentedControl` | `value`, `onChange`, `aria-label`, `size`; part `.Option` | Alias of `Tabs` (segmented variant) |
| `Slider` | `value`, `onChange`, `min`, `max`, `step`, `range` | Range slider |
| `TagInput` | `value`, `onChange`, `size` (`sm` to `3xl`, default `xl`), `validator`, `maxTags` | Multi-value tag input |
| `OTPInput` | `length` (default 6), `value`, `onChange`, `onComplete` | One-time password input |
| `DatePicker` | `value`, `onChange` (Luxon `DateTime`), `size`, `min`, `max` | Date selection |
| `DateRangePicker` | `value` (`[DateTime, DateTime] \| null`), `onChange`, `shortcuts`, `size` | Date range selection |
| `FileUpload` | `value`, `onValueChange`, `accept`, `multiple`, `variant` | File picker and drop zone |
| `MarkdownEditor` | `value`, `onChange`, `placeholder`, `variant` | Rich text editor with markdown in and out |

### Display

| Component | Key Props | Description |
|-----------|-----------|-------------|
| `Badge` | `color`, `variant`, `size` (`sm`, `md`, `lg`), `pill` | Status indicator label |
| `Avatar` | `imageUrl`, `name`, `size` (px), `color`, `variant` | User avatar with initials fallback |
| `AvatarGroup` | `size`, `stack` (from `Avatar`) | Stacked avatar group |
| `Indicator` | (folder) `LoadingIndicator`, `LoadingDots`, `CircularProgress` | Loading indicators |
| `Progress` | `value` (omit for indeterminate), `max` | Progress bar |
| `Skeleton` | `circle` + div props (size it with `className`) | Loading placeholder |
| `EmptyMessage` | `fill`; parts `.Icon`, `.Title`, `.Description`, `.ActionRow` | Empty state component |
| `StatCard` | `label`, `value`, `trend`, `description` | Statistics display card |
| `ShimmerText` | `children`, `as` (`ShimmerableText` adds `shimmer`) | Animated shimmer text effect |
| `Card` | `variant`, `size`, `interactive`; parts `.Header`, `.Title`, `.Description`, `.Content`, `.Footer`, `.Action` | Content container |
| `Table` | `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (named exports) | Static table parts |
| `DataTable` | `columns`, `data`, `pageSize`, `enableRowSelection` | TanStack-powered data table |
| `Separator` | `orientation` | Divider line |
| `Accordion` | Radix Accordion props (`type`); parts `.Item`, `.Trigger`, `.Content` | Expandable sections |

### Navigation & Layout

| Component | Key Props | Description |
|-----------|-----------|-------------|
| `Sidebar` | `SidebarProvider` (`collapsible`, `defaultOpen`), `Sidebar` (`side`, `variant`) | App sidebar with multiple collapse modes |
| `Menu` | parts `Menu.Trigger`, `.Content`, `.Item`, `.Separator`, `.Sub` | Dropdown/context menu system |
| `Tabs` | `value`, `onChange`, `aria-label`, `variant`, `size`; part `Tabs.Tab` | Tab navigation |
| `ProgressSteps` | `current`, `total`; parts `.Step`, `.Title`, `.Description` | Step progress indicator |
| `TextLink` | `href`, `primary`, `underline` | Styled text hyperlink |
| `ButtonGroup` | `orientation`; parts `.Separator`, `.Text` | Grouped buttons |

### Overlay & Feedback

| Component | Key Props | Description |
|-----------|-----------|-------------|
| `Dialog` | `open`, `onOpenChange`; parts `.Trigger`, `.Content`, `.Header`, `.Title`, `.Description`, `.Footer`, `.Close` | Modal dialog |
| `Popover` | `open`, `onOpenChange`, `showOnHover`; parts `.Trigger`, `.Content` | Floating popover |
| `Tooltip` | `content`, `side`, `maxWidth` | Hover tooltip |
| `Alert` | `color`, `variant`, `title`, `description`, `onDismiss` | Inline alert message |
| `Toast` | `Toaster` (render once), `toast()` | Toast notifications (sonner) |

### Content

| Component | Key Props | Description |
|-----------|-----------|-------------|
| `Markdown` | `children` (string), `components` | Render markdown content |
| `CodeBlock` | `children` (code string), `language` | Syntax-highlighted code with copy button |
| `CopyTooltip` | `copyValue` (from `Tooltip`) | Copy-to-clipboard with tooltip |
| `Icon` | Named exports | 652 icons |
| `Image` | `src`, `alt` | `<img>` that fades in once loaded |

### Form Helpers

| Component | Key Props | Description |
|-----------|-----------|-------------|
| `Field` | `label`, `description`, `errorMessage`, `required`, `size` | Labels a single control and wires `id` / `aria-*` |
| `FieldError` | `children` | Validation error display |
| `Label` | `htmlFor` | Standalone form label |

### Animation

All from `@plexui/ui/components/Transition`.

| Component | Key Props | Description |
|-----------|-----------|-------------|
| `Animate` | `enter`, `exit`, `initial` | Enter/exit transitions for keyed children |
| `AnimateLayout` | `children` | Layout animation wrapper |
| `AnimateLayoutGroup` | `children` | Grouped layout animations |
| `TransitionGroup` | `enterDuration`, `exitDuration` | Low-level enter/exit state management |

## Hooks

Import from the module file: `import { useX } from "@plexui/ui/hooks/<module>"`. The module name matches the hook, except `useBreakpoint`, which lives in `useBreakpoints`.

| Hook | Purpose |
|------|---------|
| `useBreakpoint` (module `useBreakpoints`) | Responsive breakpoint detection |
| `useScrollable` | Scroll state and overflow detection |
| `useAutoGrowTextarea` | Auto-growing textarea height |
| `useDocumentVisible` | Document visibility state |
| `useEscCloseStack` | Stacked ESC-to-close behavior |
| `useIsMounted` | Component mount state |
| `useLatestValue` | Latest ref value without re-renders |
| `usePrevious` | Previous render value |
| `useSimulatedProgress` | Fake progress bar animation |
| `useStableCallback` | Stable callback reference |
| `useTextSelection` | Text selection state |
| `useTrailingValue` | Delayed value updates |
| `useAnimatedScrollTo` | Smooth scroll animation |
| `useCharactersPerSecond` | Typing speed measurement |

Theme helpers (`useDocumentTheme`, `applyDocumentTheme`, `getDocumentTheme`) come from `@plexui/ui/theme`.

## Size Scale

Controls that take the shared `size` prop use one height scale:

| Size | Height | Use case |
|------|--------|----------|
| `3xs` | 22px | Ultra-compact UI, dense tables |
| `2xs` | 24px | Compact toolbars |
| `xs` | 26px | Small controls |
| `sm` | 28px | Compact forms |
| **`md`** | **32px** | **Default, most UI** |
| `lg` | 36px | Prominent actions |
| `xl` | 40px | Hero sections |
| `2xl` | 44px | Large touch targets |
| `3xl` | 48px | Marketing CTAs |

## Color System

### Semantic colors (for `color` prop)

`primary`, `secondary`, `danger`, `success`, `warning`, `caution`, `discovery`, `info` (Button takes all eight; some components take a subset, e.g. Badge has no `primary` and Alert has no `secondary`)

### Tailwind utility classes (from Plex UI tokens)

```
text-primary, text-secondary, text-tertiary, text-disabled
bg-surface, bg-surface-secondary, bg-surface-tertiary, bg-surface-elevated
border-default, border-subtle, border-strong
```

## Dark Mode

The `data-theme` attribute is the switch. Plex UI does not follow `prefers-color-scheme` on its own.

```html
<html data-theme="light">  <!-- light theme (also the default without the attribute) -->
<html data-theme="dark">   <!-- dark theme -->
<div data-theme="light">   <!-- nested scope inside a dark page -->
```

`data-theme` sets `color-scheme` (so `light-dark()` tokens resolve), switches the shadow tokens, and drives Tailwind's `dark:` variant. Setting `color-scheme` yourself flips only the colors. To follow the OS, set `data-theme` from `prefers-color-scheme`:

```tsx
import { applyDocumentTheme } from "@plexui/ui/theme";

const media = window.matchMedia("(prefers-color-scheme: dark)");
const sync = () => applyDocumentTheme(media.matches ? "dark" : "light");
sync();
media.addEventListener("change", sync);
```

## Key Patterns

```tsx
// Correct: subpath imports
import { Button } from "@plexui/ui/components/Button";
import { Input } from "@plexui/ui/components/Input";
import { Select } from "@plexui/ui/components/Select";
import { Search } from "@plexui/ui/components/Icon";

// Correct: semantic color + variant
<Button color="primary" variant="solid" size="md">Save</Button>
<Button color="danger" variant="ghost" size="sm">Delete</Button>

// Correct: icon inside button (auto-sized)
<Button color="primary">
  <Search />
  Search
</Button>

// Correct: consistent size across form
<Input size="lg" placeholder="Email" />
<Select size="lg" placeholder="Role" options={roles} value={role} onChange={(o) => setRole(o.value)} />
<Button size="lg" color="primary">Submit</Button>

// Correct: dark mode via data-theme
<html data-theme={isDark ? "dark" : "light"}>

// Wrong: raw Tailwind colors
<Button className="bg-blue-500 text-white">Save</Button>  // WRONG
// Wrong: root import
import { Button } from "@plexui/ui";  // WRONG
// Wrong: manual icon sizing inside components
<Button><Search className="w-4 h-4" />Search</Button>  // WRONG
// Wrong: color-scheme alone (shadows and dark: utilities stay light)
<html style={{ colorScheme: "dark" }}>  // WRONG
```

## Detailed References

- [rules/components.md](./rules/components.md): Component composition, imports, provider setup
- [rules/styling.md](./rules/styling.md): Tokens, colors, variants, size scale, dark mode
- [rules/icons.md](./rules/icons.md): Icon imports, sizing, usage patterns

## Full Documentation

- [Installation](https://plexui.com/docs/installation)
- [Components](https://plexui.com/components)
- [Design Tokens](https://plexui.com/docs/foundations/design-tokens)
- [Colors](https://plexui.com/docs/foundations/colors)
- [Icons](https://plexui.com/icons/plex)
- [Dark Mode](https://plexui.com/docs/concepts/dark-mode)
- [Typography](https://plexui.com/docs/foundations/typography)
