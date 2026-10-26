# Plex UI -- AI Agent Reference

React 19 component library with 652 icons, utility hooks, and a three-layer design token system with light and dark themes switched by the `data-theme` attribute.

## Quick Start

Requires React 19 (React 18 is not supported) and Tailwind CSS 4.

```bash
npm install @plexui/ui
```

```css
/* global stylesheet (e.g. main.css), imported before any component renders */
@layer theme, base, components, utilities;

@import "tailwindcss";
@import "@plexui/ui/css";
/* Required for Tailwind to find class references in Plex UI components */
@source "../node_modules/@plexui/ui";
```

On Vite, add the plugin instead of the `@layer` line: `import plexui from "@plexui/ui/vite"` and `plugins: [plexui()]`.

```tsx
// root (optional): router link for ButtonLink, TextLink, Menu.Link and Card with href
import { PlexUIProvider } from "@plexui/ui/components/PlexUIProvider"
import { Link } from "react-router"

declare global {
  interface PlexUIConfig {
    LinkComponent: typeof Link
  }
}

export function Providers({ children }) {
  return <PlexUIProvider linkComponent={Link}>{children}</PlexUIProvider>
}
```

`linkComponent` is required on `PlexUIProvider` (`Link` from `next/link` in Next.js, or `"a"`). Without the provider, link components render a plain `<a>` unless you pass `as`.

All imports use subpath pattern for tree-shaking (the package has no root export):

```tsx
import { Button } from "@plexui/ui/components/Button"
import { Input } from "@plexui/ui/components/Input"
import { Search, SettingsCog } from "@plexui/ui/components/Icon"
```

---

## Components

### Button

**Import:** `@plexui/ui/components/Button` -- exports `Button`, `ButtonLink`, `CopyButton`

| Prop | Type | Default |
|------|------|---------|
| color | `"primary" \| "secondary" \| "danger" \| "success" \| "info" \| "discovery" \| "caution" \| "warning"` | `"primary"` |
| variant | `"solid" \| "soft" \| "outline" \| "ghost"` | `"solid"` |
| size | `ControlSize` | `"md"` |
| pill | `boolean` | `false` |
| block | `boolean` | `false` |
| disabled | `boolean` | `false` |
| loading | `boolean` | `false` |
| selected | `boolean` | `false` |
| uniform | `boolean` | `false` |
| iconSize | `"sm" \| "md" \| "lg" \| "xl" \| "2xl"` | -- |
| gutterSize | `"3xs" \| "2xs" \| "xs" \| "sm" \| "md" \| "lg" \| "xl"` | -- |

Plus all standard HTML button attributes. `ButtonLink` takes the same styling props plus `href`, `external` and `as`. `CopyButton` takes Button props plus `copyValue`.

### Input

**Import:** `@plexui/ui/components/Input`

| Prop | Type | Default |
|------|------|---------|
| variant | `"outline" \| "soft"` | `"outline"` |
| size | `ControlSize` | `"md"` |
| disabled | `boolean` | `false` |
| invalid | `boolean` | `false` |
| pill | `boolean` | `false` |
| onClear | `() => void` | -- (shows clear button when provided) |
| startAdornment | `ReactNode` | -- |
| endAdornment | `ReactNode` | -- |

Plus all standard HTML input attributes.

### Textarea

**Import:** `@plexui/ui/components/Textarea`

| Prop | Type | Default |
|------|------|---------|
| variant | `"outline" \| "soft"` | `"outline"` |
| size | `ControlSize` | `"md"` |
| rows | `number` | `3` |
| autoResize | `boolean` | `false` |
| maxRows | `number` | `Math.max(rows, 10)` |
| disabled | `boolean` | `false` |
| invalid | `boolean` | `false` |

### Select

**Import:** `@plexui/ui/components/Select` -- exports `Select` and the types `Option`, `OptionGroup`

| Prop | Type | Default |
|------|------|---------|
| options | `Option[] \| OptionGroup[]` | required |
| value | `string \| string[]` | required |
| onChange | `(option: Option) => void` (`(options: Option[]) => void` with `multiple`) | required |
| multiple | `boolean` | `false` |
| clearable | `boolean` | `false` |
| loading | `boolean` | `false` |
| placeholder | `string` | `"Select..."` |
| variant | `"outline" \| "soft" \| "ghost"` | `"outline"` |
| size | `ControlSize` | `"md"` |
| pill | `boolean` | `false` |
| block | `boolean` | `true` |
| TriggerView | `React.FC` | -- (custom trigger) |

A search field appears automatically when there are more than 15 options.

```typescript
type Option = {
  value: string
  label: string
  disabled?: boolean
  description?: ReactNode
  tooltip?: { content: ReactNode; maxWidth?: number }
}

type OptionGroup = { label: string; options: Option[] }
```

### Menu

**Import:** `@plexui/ui/components/Menu`

Props: `forceOpen`, `onOpen`, `onClose`, `modal` (default: false)

Sub-components:
- `Menu.Trigger` -- renders its child element as the trigger (pass a `Button`)
- `Menu.Content` -- container; props: `side`, `align`, `sideOffset` (5), `width`, `minWidth` (300), `maxHeight`, `layout` ("vertical" | "horizontal")
- `Menu.Item` -- props: `onSelect`, `onClick`, `description`, `disabled`
- `Menu.Link` -- link item; props: `href`, `as`, `disabled`
- `Menu.ItemActions` / `Menu.ItemAction` -- action buttons within an item
- `Menu.Separator` -- divider
- `Menu.Label`, `Menu.Group` -- labelled groups
- `Menu.Sub` / `Menu.SubTrigger` / `Menu.SubContent` -- nested menu
- `Menu.RadioGroup` / `Menu.RadioItem` -- radio selection
- `Menu.CheckboxItem` -- checkbox option

### Sidebar

**Import:** `@plexui/ui/components/Sidebar` -- 40+ exports

**SidebarProvider** props: `defaultOpen` (true), `open`, `onOpenChange`, `collapsible` ("offcanvas" | "icon" | "none", default "offcanvas")

**Sidebar** props: `side` ("left" | "right"), `variant` ("sidebar" | "docs")

Sub-components: `SidebarLayout`, `SidebarInset`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel` (props: `size` "sm"|"lg"), `SidebarGroupContent`, `SidebarGroupAction`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` (props: `isActive`, `tooltip`, `asChild`), `SidebarMenuButtonIcon`, `SidebarMenuButtonLabel`, `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton`, `SidebarMenuBadge`, `SidebarMenuAction`, `SidebarMenuSkeleton`, `SidebarCard` (props: `variant` "default"|"elevated", `dismissible`, `onDismiss`), `SidebarSeparator`, `SidebarTrigger`, `SidebarRail`, `SidebarInput`

Hook: `useSidebar()` -- returns sidebar state

### Alert

**Import:** `@plexui/ui/components/Alert`

| Prop | Type | Default |
|------|------|---------|
| color | `"primary" \| "danger" \| "success" \| "info" \| "discovery" \| "caution" \| "warning"` | `"primary"` |
| variant | `"solid" \| "soft" \| "outline"` | `"outline"` |
| title | `ReactNode` | -- |
| description | `ReactNode` | -- |
| actions | `ReactNode` | -- |
| actionsPlacement | `"end" \| "bottom"` | -- |
| indicator | `ReactNode \| false` | -- |
| onDismiss | `() => void` | -- (shows dismiss button) |

### Badge

**Import:** `@plexui/ui/components/Badge`

| Prop | Type | Default |
|------|------|---------|
| variant | `"solid" \| "soft" \| "outline"` | `"soft"` |
| size | `"sm" \| "md" \| "lg"` | `"sm"` |
| color | `"secondary" \| "success" \| "danger" \| "warning" \| "info" \| "discovery" \| "caution"` | `"secondary"` |
| pill | `boolean` | `false` |

### Checkbox

**Import:** `@plexui/ui/components/Checkbox`

| Prop | Type | Default |
|------|------|---------|
| checked | `boolean \| "indeterminate"` | -- |
| defaultChecked | `boolean \| "indeterminate"` | -- |
| label | `ReactNode` | -- |
| onCheckedChange | `(next: boolean) => void` | -- |
| disabled | `boolean` | `false` |
| orientation | `"left" \| "right"` | `"left"` |
| pill | `boolean` | `false` |
| variant | `"solid" \| "ghost"` | `"solid"` |

### Switch

**Import:** `@plexui/ui/components/Switch`

| Prop | Type | Default |
|------|------|---------|
| checked | `boolean` | -- |
| defaultChecked | `boolean` | -- |
| label | `ReactNode` | -- |
| description | `ReactNode` | -- |
| onCheckedChange | `(next: boolean) => void` | -- |
| disabled | `boolean` | `false` |
| labelPosition | `"start" \| "end"` | `"end"` |

### RadioGroup

**Import:** `@plexui/ui/components/RadioGroup`

Props: `value`, `defaultValue`, `onChange`, `direction` ("row" | "col", default: "row"), `disabled`, `name`, `aria-label`

Sub: `RadioGroup.Item` -- props: `value`, `disabled`, `orientation`, `block`, `children`

### Tooltip

**Import:** `@plexui/ui/components/Tooltip` -- exports `Tooltip`, `CopyTooltip`

| Prop | Type | Default |
|------|------|---------|
| content | `ReactNode` | required |
| maxWidth | `number \| "none"` | `300` |
| forceOpen | `boolean` | -- |
| openDelay | `number` | `150` |
| interactive | `boolean` | -- |
| compact | `boolean` | -- |
| side | `"top" \| "right" \| "bottom" \| "left"` | `"top"` |
| sideOffset | `number` | `5` |
| align | `"start" \| "center" \| "end"` | `"center"` |

`CopyTooltip` props: `copyValue` (required), `openDelay`, `side`, `align`.

### Popover

**Import:** `@plexui/ui/components/Popover` -- exports `Popover`, `usePopoverController`

Props: `open`, `onOpenChange`, `showOnHover`, `hoverOpenDelay` (150)

Sub: `Popover.Trigger`, `Popover.Content` (props: `side` ("bottom"), `align`, `sideOffset` (8), `width`, `minWidth` (300), `maxWidth`)

### Avatar

**Import:** `@plexui/ui/components/Avatar` -- exports `Avatar`, `AvatarGroup`

| Prop | Type | Default |
|------|------|---------|
| size | `number` (px) | -- |
| name | `string` | -- (for initials) |
| imageUrl | `string` | -- |
| Icon | `React.ComponentType` | -- |
| color | `"primary" \| "secondary" \| "success" \| "info" \| "discovery" \| "danger"` | `"secondary"` |
| variant | `"soft" \| "solid"` | `"soft"` |
| overflowCount | `number` | -- (renders a "+N" avatar) |

`AvatarGroup` props: `size` (number, px), `stack` ("start" | "end", default "start")

### Tabs

**Import:** `@plexui/ui/components/Tabs` (`SegmentedControl` from `@plexui/ui/components/SegmentedControl` is the same component)

| Prop | Type | Default |
|------|------|---------|
| value | `string` | required (controlled) |
| onChange | `(value: string) => void` | -- |
| aria-label | `string` | required |
| variant | `"segmented" \| "underline"` | `"segmented"` |
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` |
| size | `ControlSize` | `"md"` |
| pill | `boolean` | `true` (segmented only) |
| block | `boolean` | `false` |
| flush | `boolean` | `false` (underline only) |
| disabled | `boolean` | -- |

Sub: `Tabs.Tab` (alias `Tabs.Option`) -- props: `value`, `icon`, `badge`, `disabled`, `aria-label`

Tabs renders the tab buttons only; render the panel for the active `value` yourself.

### Dialog

**Import:** `@plexui/ui/components/Dialog`

Props: `open`, `onOpenChange`

Sub: `Dialog.Trigger` (renders its child), `Dialog.Content` (props: `width` (480), `showClose` (true)), `Dialog.Header`, `Dialog.Title`, `Dialog.Description`, `Dialog.Footer`, `Dialog.Close` (renders its child)

### DatePicker

**Import:** `@plexui/ui/components/DatePicker`

Props: `value` (DateTime | null), `onChange`, `id`, `min`, `max`, `disabled`, `placeholder`, `variant`, `size`, `pill`, `clearable`, `showTime`, `side`, `align`

Uses Luxon `DateTime`.

### DateRangePicker

**Import:** `@plexui/ui/components/DateRangePicker` -- also exports the types `DateRange`, `DateRangeShortcut`

Props: `value` (`[DateTime, DateTime] | null`), `onChange(range, shortcut?)`, `min`, `max`, `maxRangeDays`, `shortcuts` (`{ label, getDateRange }[]`), `size`, `variant`, `pill`, `clearable`

### TagInput

**Import:** `@plexui/ui/components/TagInput`

Props: `value` / `defaultValue` (Tag[]), `onChange`, `placeholder`, `disabled`, `size` ("sm" to "3xl", default "xl"), `pill`, `maxTags`, `validator`, `delimiters`

```typescript
type Tag = { value: string; valid: boolean }
```

### Slider

**Import:** `@plexui/ui/components/Slider`

Single: `value` (number), `onChange`, `min`, `max`, `step` (all three required), `label`, `marks`, `unit`, `disabled`
Range: `range={true}`, `value` (number[]), `onChange`

### Skeleton

**Import:** `@plexui/ui/components/Skeleton`

Props: `circle` (boolean, default: false). Standard div attributes.

### Table

**Import:** `@plexui/ui/components/Table`

Named exports: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableFooter`, `TableCaption`

### DataTable

**Import:** `@plexui/ui/components/DataTable` -- also exports `DataTablePagination`, `DataTableColumnHeader`, column helpers and the `ColumnDef` type

Props: `columns` (ColumnDef[] from @tanstack/react-table), `data`, `pageSize` (10), `showPagination` (true), `initialSorting`, `columnVisibility`, `globalFilter`, `enableRowSelection`, `rowSelection`, `onRowClick`, `variant` ("default" | "bordered")

### Icon

**Import:** `@plexui/ui/components/Icon`

652 SVG icons (674 export names, counting aliases such as `Check` for `CheckMd`). Each renders inline SVG with `fill="currentColor"`, `width="1em"`, `height="1em"`, `aria-hidden="true"`. Icons scale with font size and inherit text color. Names have no `Icon` prefix.

```tsx
import { Search, ChevronDown, SettingsCog, Bell, Star, Home, Plus, X } from "@plexui/ui/components/Icon"
```

### Indicators

**Import:** `@plexui/ui/components/Indicator`

- `LoadingIndicator` -- props: `size` (number | string, default "1em"), `strokeWidth`
- `LoadingDots`
- `CircularProgress` -- props: `progress` (0-100; omit to simulate progress over `maxDuration`), `done`, `size` (default 28px), `strokeWidth`

### Transitions

**Import:** `@plexui/ui/components/Transition`

Exports: `Animate`, `AnimateLayout`, `AnimateLayoutGroup`, `TransitionGroup`, `SlotTransitionGroup`

### Other Components

| Component | Import | Key Props |
|-----------|--------|-----------|
| Field | `@plexui/ui/components/Field` | `label` (required), `description`, `errorMessage`, `required`, `size`, `orientation`, `children` (single control) |
| FieldError | `@plexui/ui/components/FieldError` | `children` |
| Label | `@plexui/ui/components/Label` | Radix label props (`htmlFor`) |
| EmptyMessage | `@plexui/ui/components/EmptyMessage` | `fill`; sub: `.Icon`, `.Title`, `.Description`, `.ActionRow` |
| TextLink | `@plexui/ui/components/TextLink` | `href`, `primary`, `underline` (true), `forceExternal`, `as` |
| CodeBlock | `@plexui/ui/components/CodeBlock` | `children` (code string), `language` |
| Markdown | `@plexui/ui/components/Markdown` | `children` (string), `components` |
| MarkdownEditor | `@plexui/ui/components/MarkdownEditor` | `value`, `defaultValue`, `onChange(markdown)`, `placeholder`, `variant` |
| FloatingLabelInput | `@plexui/ui/components/FloatingLabelInput` | `label` (required), `errorMessage`, `invalid`, `description`, `startAdornment`, `endAdornment`, `onClear`, `multiline` + input attributes |
| FloatingLabelSelect | `@plexui/ui/components/FloatingLabelSelect` | Trigger shell: `label`, `selected`, `errorMessage`, `invalid`, `onClearClick`, `children` |
| InputGroup | `@plexui/ui/components/InputGroup` | `size`, `variant`; sub: `.Input`, `.Textarea`, `.Addon`, `.Button`, `.Text` |
| DateInput | `@plexui/ui/components/DateInput` | `value` (DateTime \| null), `onChange`, `min`, `max`, `clearable` + Input props |
| OTPInput | `@plexui/ui/components/OTPInput` | `value`, `onChange`, `onComplete`, `length` (6), `grouping`, `invalid`, `disabled` |
| ProgressSteps | `@plexui/ui/components/ProgressSteps` | `current` (1-indexed), `total`, `size`, `orientation`; sub: `.Step`, `.Title`, `.Description` |
| Progress | `@plexui/ui/components/Progress` | `value` (omit for indeterminate), `max` (100) |
| SelectControl | `@plexui/ui/components/SelectControl` | Select trigger shell for custom dropdowns: `variant`, `size`, `selected`, `onClearClick`, `StartIcon`, `children` |
| ShimmerText | `@plexui/ui/components/ShimmerText` | `children`, `as`; `ShimmerableText` adds `shimmer` |
| StatCard | `@plexui/ui/components/StatCard` | `label`, `value`, `description`, `trend` (`{ value, label? }`), `icon` |
| Card | `@plexui/ui/components/Card` | `variant` ("outline" \| "solid" \| "ghost"), `size`, `interactive`, `href`; sub: `.Header`, `.Title`, `.Description`, `.Content`, `.Footer`, `.Action` |
| Accordion | `@plexui/ui/components/Accordion` | Radix Accordion props (`type`, `collapsible`); sub: `.Item`, `.Trigger`, `.Content` |
| ButtonGroup | `@plexui/ui/components/ButtonGroup` | `orientation`; sub: `.Separator`, `.Text` |
| Separator | `@plexui/ui/components/Separator` | `orientation`, `decorative` |
| FileUpload | `@plexui/ui/components/FileUpload` | `value`, `onValueChange`, `accept`, `multiple`, `maxFiles`, `maxSize`, `variant` ("compact" \| "area"); also `FileCard`, `FileCardGroup` |
| Toast | `@plexui/ui/components/Toast` | `Toaster` (render once), `toast()` (from sonner) |
| Image | `@plexui/ui/components/Image` | Standard img attributes; fades in once loaded, renders nothing if it fails |

---

## Types

Import from `@plexui/ui/types`:

```typescript
type ControlSize = "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
type Size = "5xs" | "4xs" | "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl"
type Radius = "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full"
type TextColor = "base" | "emphasis" | "secondary" | "tertiary"
type SemanticColor = "primary" | "secondary" | "danger" | "success" | "warning" | "caution" | "discovery" | "info"
type Variant = "solid" | "soft" | "outline" | "ghost"
type Alignment = "start" | "center" | "end"
type FontWeight = "inherit" | "normal" | "medium" | "semibold" | "bold"
```

## Control Size Scale

Font and icon sizes below are Button's. Other controls share the heights but can step font size differently (Input uses 16px from `xl` up).

| Size | Height | Font Size | Icon Size |
|------|--------|-----------|-----------|
| 3xs  | 22px   | 12px      | 14px      |
| 2xs  | 24px   | 12px      | 16px      |
| xs   | 26px   | 14px      | 16px      |
| sm   | 28px   | 14px      | 18px      |
| **md** | **32px** | **14px** | **18px** |
| lg   | 36px   | 14px      | 18px      |
| xl   | 40px   | 14px      | 18px      |
| 2xl  | 44px   | 16px      | 20px      |
| 3xl  | 48px   | 16px      | 20px      |

Controls typed `ControlSize` share this scale: Button, ButtonLink, Input, Textarea, InputGroup, Select, SelectControl, DatePicker, DateRangePicker, Tabs, Field. TagInput uses `sm` to `3xl` (default `xl`).

---

## Hooks

All hooks import from `@plexui/ui/hooks/{module}`. The module is the hook name, except `useBreakpoint`, which lives in `useBreakpoints`: `import { useBreakpoint } from "@plexui/ui/hooks/useBreakpoints"`.

| Hook | Signature | Description |
|------|-----------|-------------|
| useBreakpoint | `(bp: "xs"\|"sm"\|"md"\|"lg"\|"xl"\|"2xl") => boolean` | Viewport at or above breakpoint (false on the first render) |
| useAutoGrowTextarea | `(ref, value) => void` | Auto-size textarea to content |
| useScrollable | `(ref) => { isScrollable, isAtStart, isAtEnd }` | Scroll state detection |
| useIsMounted | `() => boolean` | False on SSR, true after hydration |
| useIsMountedRef | `() => RefObject<boolean \| undefined>` | Mount state as a ref (module `useIsMounted`) |
| usePrevious | `(value: T) => T` | Previous render value |
| useStableCallback | `(fn: T) => T` | Stable callback identity |
| useEscCloseStack | `(listening, cb) => void` | Stacked ESC key handlers |
| useDocumentVisible | `() => boolean` | Document visibility state |
| useLatestValue | `(value: T) => RefObject<T>` | Latest value ref |
| useTrailingValue | `(value: T, delay: number) => T` | Delayed trailing value |
| useSimulatedProgress | `(startAt, maxDuration, completed?) => number` | Simulated progress 0-100 |
| useAnimatedScrollTo | `(scrollRef) => (target: number) => void` | Animated scroll |
| useCharactersPerSecond | `(text, streaming) => () => number` | Streaming text speed |
| useTextSelection | `(listening, cb) => void` | Text selection tracking |

---

## Utilities

Import from `@plexui/ui/helpers`:

- `toCssVariables(vars)` -- object to CSS custom properties (numbers become `px`)
- `focusableElements(el)` -- query focusable children
- `prefersReducedMotion()` -- check user motion preference
- `sleep(ms)` -- promise sleep
- `waitForAnimationFrame(cb, { frames }?)` -- run a callback after the next animation frame(s); returns a cancel function
- `groupByProperty(items, key, format?)` -- group array by property, keeping first-seen order
- `preventDefaultHandler(evt)` -- event handler that calls `preventDefault()`
- `toAngle`, `toOpacityProperty`, `toMsDurationProperty`, `toTransformProperty`, `toFilterProperty` -- CSS value formatters

Import from `@plexui/ui/theme`:

- `useDocumentTheme() => "light" | "dark"` -- reactive theme hook (returns "light" on the server and during hydration)
- `getDocumentTheme() => "light" | "dark"` -- get current theme
- `applyDocumentTheme(theme)` -- set `data-theme` (and `color-scheme`) on `<html>`

---

## Design Tokens

Three-layer CSS custom property system imported via `@import "@plexui/ui/css"`.

### Text Colors
```
--color-text              (primary text)
--color-text-secondary    (muted)
--color-text-tertiary     (subtle)
--color-text-inverse      (on dark backgrounds)
--color-text-disabled
```

### Surfaces
```
--color-surface            (primary bg)
--color-surface-secondary
--color-surface-tertiary
--color-surface-elevated   (popovers, modals)
```

### Borders
```
--color-border-subtle      (5-6% opacity)
--color-border             (10-12% opacity)
--color-border-strong      (15-20% opacity)
```

### Semantic Color Pattern

Each semantic color (primary, secondary, danger, success, warning, info, discovery, caution) provides 5 variant sets:

```
--color-background-{color}-solid          (+ hover, active)
--color-background-{color}-soft           (+ hover, active)
--color-background-{color}-soft-alpha     (+ hover, active)
--color-background-{color}-outline-hover  (+ active)
--color-background-{color}-ghost-hover    (+ active)
--color-text-{color}-solid
--color-text-{color}-soft
--color-border-{color}-outline            (+ hover)
```

### Radius
```
--radius-2xs (2px)  --radius-xs (4px)   --radius-sm (6px)
--radius-md (8px)   --radius-lg (10px)  --radius-xl (12px)
--radius-2xl (16px) --radius-3xl (20px) --radius-4xl (24px)
--radius-full (9999px)
```

### Shadows
```
--shadow-100 through --shadow-400 (with -strong, -stronger variants)
--shadow-hairline (1px border-like shadow)
```

### Alpha Transparency
```
--alpha-02 through --alpha-70 (auto-inverts in dark mode)
```

### Typography
```
Headings: --font-heading-{5xl..xs}-size (72px down to 16px)
Text:     --font-text-{lg..3xs}-size (18px down to 8px)
Weights:  --font-weight-normal (400), -medium (500), -semibold (600), -bold (700)
Families: --font-sans (system stack), --font-mono
```

### Motion
```
--cubic-enter, --cubic-exit, --cubic-exit-snappy, --cubic-move
--transition-duration-basic: 150ms
```

### Breakpoints
```
xs: 380px, sm: 576px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
```

These are Plex's breakpoints, used by `useBreakpoint`. Tailwind's own breakpoints (`sm:` at 640px, no `xs:`) stay unchanged unless you also import `@plexui/ui/styles/variables-tailwind-theme.css`.

---

## Dark Mode

The switch is the `data-theme` attribute (`"light"` / `"dark"`) on `<html>` or on any subtree. It sets `color-scheme`, so the `light-dark()` color tokens resolve; it switches the shadow tokens; and it drives Tailwind's `dark:` variant. Without `data-theme` the light theme applies; Plex UI does not follow `prefers-color-scheme` on its own.

```html
<!-- HTML attribute -->
<html data-theme="dark">
  <div data-theme="light">Light island</div>
</html>
```

```tsx
// JavaScript
import { applyDocumentTheme } from "@plexui/ui/theme"
applyDocumentTheme("dark")

// Follow the OS preference
const media = window.matchMedia("(prefers-color-scheme: dark)")
const sync = () => applyDocumentTheme(media.matches ? "dark" : "light")
sync()
media.addEventListener("change", sync)
```

Setting `color-scheme` by itself (`:root { color-scheme: dark }`) flips only the `light-dark()` colors: shadows and `dark:` utilities stay light. Always set `data-theme`.

---

## Common Patterns

### Controlled vs Uncontrolled

```tsx
// Uncontrolled
<Input defaultValue="hello" />

// Controlled
const [value, setValue] = useState("hello")
<Input value={value} onChange={(e) => setValue(e.target.value)} />
```

### Composition (Menu, Sidebar, Tabs, Dialog)

```tsx
<Menu>
  <Menu.Trigger>
    <Button variant="outline">Open</Button>
  </Menu.Trigger>
  <Menu.Content>
    <Menu.Item onSelect={() => {}}>Edit</Menu.Item>
    <Menu.Separator />
    <Menu.Item onSelect={() => {}}>Delete</Menu.Item>
  </Menu.Content>
</Menu>
```

### Form Field with Validation

```tsx
<Field label="Email" errorMessage={errors.email} required>
  <Input type="email" invalid={!!errors.email} />
</Field>
```

### Button with Icon

```tsx
import { Button } from "@plexui/ui/components/Button"
import { Plus } from "@plexui/ui/components/Icon"

<Button size="md" variant="outline">
  <Plus /> Add item
</Button>
```

### Sidebar Layout

```tsx
<SidebarProvider>
  <SidebarLayout>
    <Sidebar>
      <SidebarHeader>Logo</SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive>
              <SidebarMenuButtonIcon><Home /></SidebarMenuButtonIcon>
              <SidebarMenuButtonLabel>Dashboard</SidebarMenuButtonLabel>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
    <SidebarInset>
      {/* main content */}
    </SidebarInset>
  </SidebarLayout>
</SidebarProvider>
```
