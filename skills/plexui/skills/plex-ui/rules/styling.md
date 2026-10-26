# Styling Rules

## Three-Layer Token System

Plex UI uses a three-layer design token architecture:

```
Primitive tokens  ->  Semantic tokens  ->  Component CSS custom properties
(raw values)          (contextual)          (per-component)
```

All tokens are CSS custom properties. Colors are written with the CSS `light-dark()` function, and the `data-theme` attribute picks the side (see Dark Mode below). Plex UI tokens need no `dark:` prefix.

## Size Scale (9 steps)

Controls that take the shared `size` prop (`ControlSize`: Button, ButtonLink, Input, Textarea, InputGroup, Select, SelectControl, DatePicker, DateRangePicker, Tabs / SegmentedControl, Field) use one height scale:

```
3xs(22px) - 2xs(24px) - xs(26px) - sm(28px) - md(32px) - lg(36px) - xl(40px) - 2xl(44px) - 3xl(48px)
```

Other components have their own `size` set: Badge `sm` / `md` / `lg`, TagInput `sm` to `3xl` (default `xl`), Avatar takes pixels. Checkbox, Switch, RadioGroup, Slider and OTPInput have no `size` prop.

On Button, the `size` prop adjusts height, padding, font size, icon size, and border radius. **Never manually set these with className when a `size` prop exists.**

```tsx
// Correct
<Button size="lg" color="primary">Submit</Button>

// Wrong: manual sizing defeats the token system
<Button className="h-9 px-4 text-sm" color="primary">Submit</Button>
```

### Size Guidelines

| Context | Recommended Size |
|---------|-----------------|
| Dense data tables | `3xs` to `xs` |
| Compact toolbars | `2xs` to `sm` |
| Standard forms | `md` (default) |
| Prominent actions | `lg` |
| Hero/marketing CTA | `xl` to `3xl` |
| Touch targets (mobile) | `lg` to `2xl` |

## Semantic Colors

### Component `color` prop

Available values: `primary`, `secondary`, `danger`, `success`, `warning`, `caution`, `discovery`, `info`

Button takes all eight. Other components accept a subset: Badge has no `primary` (default `secondary`), Alert has no `secondary` (default `primary`), Avatar takes `primary`, `secondary`, `success`, `info`, `discovery`, `danger`.

```tsx
<Button color="primary">Save</Button>
<Button color="danger" variant="ghost">Delete</Button>
<Alert color="success" title="Saved!" />
<Badge color="warning">Beta</Badge>
```

### Tailwind utility classes (from Plex UI tokens)

Plex UI ships semantic Tailwind utilities. Use these instead of raw Tailwind colors:

```css
/* Text */
text-primary          /* Main text (same color as text-default) */
text-secondary        /* Supporting text */
text-tertiary         /* Muted text */
text-disabled         /* Disabled text */
text-danger           /* Also text-success, text-warning, text-caution, text-info, text-discovery */

/* Backgrounds */
bg-surface            /* Primary surface */
bg-surface-secondary  /* Secondary surface */
bg-surface-tertiary   /* Tertiary surface */
bg-surface-elevated   /* Popovers, menus, modals */

/* Borders */
border-default        /* Standard border */
border-subtle         /* Subtle border */
border-strong         /* Strong border */
```

```tsx
// Correct: semantic tokens
<div className="bg-surface text-primary border border-default rounded-lg p-4">
  <p className="text-secondary">Description text</p>
</div>

// Wrong: palette colors skip the semantic layer (bg-white never changes with the theme)
<div className="bg-white text-gray-900 border border-gray-200 rounded-lg p-4">
  <p className="text-gray-500">Description text</p>
</div>
```

`@plexui/ui/css` replaces Tailwind's color palette with Plex's (`gray`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `white`, `black`, `alpha`). Palettes such as `slate` or `emerald` are not generated.

## Variants

The `variant` values differ per component:

| Component | `variant` values (default first) |
|-----------|----------------------------------|
| Button, ButtonLink | `solid`, `soft`, `outline`, `ghost` |
| Badge | `soft`, `solid`, `outline` |
| Alert | `outline`, `solid`, `soft` |
| Input, Textarea, InputGroup, MarkdownEditor | `outline`, `soft` |
| Select, SelectControl, DatePicker, DateRangePicker | `outline`, `soft`, `ghost` |
| Card | `outline`, `solid`, `ghost` |
| Avatar | `soft`, `solid` |
| Checkbox | `solid`, `ghost` |
| Tabs | `segmented`, `underline` |

What each Button variant is for:

| Variant | Usage |
|---------|-------|
| `solid` | Primary actions, high emphasis (default for Button) |
| `soft` | Secondary actions, medium emphasis |
| `outline` | Tertiary actions, low emphasis, visible borders |
| `ghost` | Minimal emphasis, no background until hover |

```tsx
<Button color="primary" variant="solid">Primary action</Button>
<Button color="primary" variant="soft">Secondary</Button>
<Button color="primary" variant="outline">Tertiary</Button>
<Button color="primary" variant="ghost">Minimal</Button>
```

## Dark Mode

The `data-theme` attribute (`light` / `dark`) on `<html>`, or on any subtree, is the switch. It:

- sets `color-scheme`, so every `light-dark()` color token resolves to the right side;
- switches the shadow tokens (`--shadow-100` to `--shadow-400`, `--shadow-hairline`);
- drives Tailwind's `dark:` variant.

Without `data-theme` the light theme applies; Plex UI does not follow `prefers-color-scheme` on its own. Setting `color-scheme` yourself (`:root { color-scheme: dark }`) flips only the colors, so shadows and `dark:` utilities stay light.

### Toggle theme:

```html
<html data-theme="light">           <!-- Force light -->
<html data-theme="dark">            <!-- Force dark -->
<section data-theme="light">        <!-- Light island inside a dark page -->
```

### In React:

```tsx
import { applyDocumentTheme, useDocumentTheme } from "@plexui/ui/theme";

// Sets data-theme (and color-scheme) on <html>
applyDocumentTheme("dark");

// Follow the OS preference
const media = window.matchMedia("(prefers-color-scheme: dark)");
const sync = () => applyDocumentTheme(media.matches ? "dark" : "light");
sync();
media.addEventListener("change", sync);

// Read the current theme reactively ("light" on the server and during hydration)
const theme = useDocumentTheme();
```

### Rules:

- **Never use `dark:` overrides for Plex UI tokens.** They switch with `data-theme` already. `dark:` is for your own non-token styles, and it follows `data-theme` too
- **Never override component colors** with raw Tailwind dark mode classes
- All semantic colors (`text-primary`, `bg-surface`, etc.) adapt to the theme set by `data-theme`

## Spacing & Layout

Use Tailwind's spacing utilities alongside Plex UI components:

```tsx
// Correct: flex + gap
<div className="flex flex-col gap-4">
  <Input size="md" />
  <Button size="md" color="primary">Submit</Button>
</div>

// Correct: className for layout, props for styling
<Button color="primary" size="md" className="mt-4">
  Button with top margin
</Button>
```

### className Guidelines:

- **Use `className` for:** margins, width, flex, grid, positioning (layout concerns)
- **Do NOT use `className` for:** colors, font sizes, padding, border radius; use props instead
- **Use `block` prop** for full-width buttons instead of `className="w-full"`

```tsx
// Correct
<Button color="primary" block>Full width</Button>

// Avoid
<Button color="primary" className="w-full">Full width</Button>
```

## CSS Custom Properties

For advanced theming, Plex UI exposes CSS custom properties at three levels:

```css
/* Primitive: raw color values */
--gray-50: ...;
--gray-900: ...;
--blue-500: ...;

/* Semantic: contextual meaning */
--color-text: ...;
--color-text-secondary: ...;
--color-surface: ...;
--color-border: ...;
--color-background-primary-solid: ...;

/* Component: per-component tokens */
--button-font-weight: ...;
--input-placeholder-text-color: ...;
```

Override semantic tokens in your CSS to customize the entire theme. The tokens are declared on `:root` and on every `[data-theme]` element, so target both, and use `light-dark()` to keep both themes:

```css
:root,
[data-theme] {
  --color-background-primary-solid: light-dark(var(--blue-500), var(--blue-400));
  --color-surface: light-dark(#ffffff, var(--gray-100));
}
```

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| `className="bg-blue-500 text-white"` | `color="primary" variant="solid"` |
| `className="h-10 px-4"` | `size="xl"` |
| `dark:bg-gray-800` | Use semantic tokens (they switch with `data-theme`) |
| `:root { color-scheme: dark }` | `<html data-theme="dark">` or `applyDocumentTheme("dark")` |
| `variant="surface"` | Not a variant; use the component's listed values |
| `className="text-gray-500"` | `className="text-secondary"` |
| Manual border radius on controls | Use `size` prop (includes radius) |
| `style={{ fontSize: 14 }}` | Use `size` prop or Tailwind class |
