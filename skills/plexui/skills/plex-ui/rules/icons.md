# Icon Rules

## Imports

All icons are named exports from `@plexui/ui/components/Icon`:

```tsx
import { Search, Check, ChevronDown, Plus } from "@plexui/ui/components/Icon";
```

There are **652 icons** available. Names are plain PascalCase with no `Icon` prefix (`Search`, not `IconSearch`). Many glyphs come in size or style variants named by suffix: `CheckMd` / `CheckLg`, `ChevronDownSm` / `ChevronDownMd` / `ChevronDownLg`, `Bell` / `BellFilled`. A few short aliases also exist, e.g. `Check` (= `CheckMd`), `ChevronRight` (= `ChevronRightMd`), `Trash` and `Delete` (= `RemoveTrash`).

Each icon renders an inline `<svg>` with `width="1em"`, `height="1em"`, `fill="currentColor"` and `aria-hidden="true"`, and accepts any SVG prop.

## Usage in Components

### Inside Button

Icons auto-size to match the button's `size` prop. **Never add manual size classes.**

```tsx
// Correct: icon auto-sizes
<Button color="primary" size="md">
  <Search />
  Search
</Button>

// Correct: icon-only button (uniform makes it square)
<Button color="secondary" variant="ghost" size="md" uniform aria-label="Add">
  <Plus />
</Button>

// Wrong: manual sizing overrides the design system
<Button color="primary">
  <Search className="w-4 h-4" />
  Search
</Button>
```

### Standalone icons

When using icons outside of components, you can set size via className:

```tsx
// Standalone icon with custom size
<Check className="size-5 text-primary" />

// Inside a custom container
<div className="flex items-center gap-2">
  <Search className="size-4 text-secondary" />
  <span>Search results</span>
</div>
```

Plex UI also ships `icon-xs`, `icon-sm`, `icon-md`, `icon-lg`, `icon-xl` and `icon-2xl` utilities (14px to 24px) that match the control icon sizes. Without a class, an icon is `1em`, so it scales with the surrounding font size.

### Override icon size in components

Use the `iconSize` prop on `Button` / `ButtonLink` when the default icon size doesn't fit:

```tsx
// Override icon size independently of control size
<Button color="primary" size="lg" iconSize="sm">
  <Search />
  Search
</Button>
```

Icon size scale:

| `iconSize` | Pixels |
|-----------|--------|
| `sm` | 16px |
| `md` | 18px |
| `lg` | 20px |
| `xl` | 22px |
| `2xl` | 24px |

## Icon Color

Icons inherit text color by default. Use Tailwind text color utilities for standalone icons:

```tsx
// Inherits parent color
<Check />

// Explicit color
<Check className="text-primary" />
<Check className="text-danger" />
<Check className="text-secondary" />
```

Inside components like Button, icon color is handled automatically by the `color` and `variant` props.

## Common Icons

| Icon | Name | Usage |
|------|------|-------|
| Search | `Search` | Search inputs, search actions |
| Check | `Check`, `CheckMd`, `CheckCircle` | Success states, checkmarks |
| Close/X | `X` | Close buttons, dismiss |
| Plus | `Plus` | Add/create actions |
| Chevron | `ChevronDown`, `ChevronRight` (also `ChevronDownMd`, `ChevronRightMd`, ...) | Dropdowns, expand |
| Arrow | `ArrowLeftSm`, `ArrowRightSm` (also `ArrowLeftLg`, `ArrowRightLg`) | Navigation |
| Settings | `SettingsCog` | Settings/gear |
| User | `User` | Profile, accounts |
| Trash | `Trash` (alias of `RemoveTrash`) | Delete actions |
| Edit | `EditPencil` | Edit actions |
| Copy | `Copy` | Copy to clipboard |
| External link | `ExternalLink` | External navigation |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `import { IconSearch } from "@plexui/ui/components/Icon"` | `import { Search } from "@plexui/ui/components/Icon"` |
| `<Search className="w-4 h-4" />` inside Button | Remove size classes; Button sizes its icons |
| `import { Search } from "lucide-react"` | Use `import { Search } from "@plexui/ui/components/Icon"` |
| String-based icon lookup | Render the component (`<Check />`), or pass it where a prop expects one (`<SelectControl StartIcon={Calendar}>`, `<Avatar Icon={User} />`) |
| Manual SVG for common icons | Check the 652 built-in icons first |
