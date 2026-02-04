# Create Plex UI Component

Use this skill when the user asks to create a new component for Plex UI, especially when they mention external references like shadcn, untitleduico, or websites like platform.openai.com.

## Trigger Phrases

- "Create a new component"
- "Add [ComponentName] component"
- "Look at shadcn/untitleduico for reference"
- "Make it like [external site]"

## Reference Repositories

When looking for implementation patterns:

| Repository             | Path to Components      | Use For                                    |
| ---------------------- | ----------------------- | ------------------------------------------ |
| **shadcn/ui**          | `packages/ui/src/*.tsx` | Radix integration, API design, composition |
| **untitleduico/react** | `components/**/*.tsx`   | React Aria patterns, accessibility         |

## Reference Websites

For visual inspiration, use Browser MCP:

| Site                 | Use For                                   |
| -------------------- | ----------------------------------------- |
| platform.openai.com  | Modern UI patterns, animations, dark mode |
| ui.shadcn.com        | Component demos, variant examples         |
| untitledui.com/react | Component gallery, design tokens          |

## Workflow

### Step 1: Gather Requirements

Ask the user (if not specified):

1. What component to create?
2. Any specific reference to look at?
3. Any specific variants or features needed?

### Step 2: Research External References

If a reference repository is specified:

```bash
# Clone temporarily or use GitHub API to fetch specific files
# Look at the component implementation
```

Key things to extract:

- **Props API**: What props are exposed? What are sensible defaults?
- **Radix primitive**: Which `@radix-ui/*` package is used?
- **Subcomponents**: Is it a compound component? (e.g., Tabs.Root, Tabs.List, Tabs.Trigger)
- **Accessibility**: Keyboard navigation, ARIA attributes
- **Edge cases**: Loading states, disabled states, error handling

If a website is specified, use Browser MCP:

1. Navigate to the page with the component
2. Take a screenshot for visual reference
3. Inspect DOM structure if needed

### Step 3: Create Component Following Plex UI Patterns

#### File Structure

Create these files in `src/components/[ComponentName]/`:

```
ComponentName/
├── ComponentName.tsx          # Main component
├── ComponentName.module.css   # Styles
├── ComponentName.stories.tsx  # Storybook stories
├── ComponentName.mdx          # Documentation
└── index.tsx                  # Exports
```

#### Component Implementation Pattern

Follow Plex UI conventions:

```tsx
// ComponentName.tsx
import * as RadixPrimitive from "@radix-ui/react-[primitive]"
import styles from "./ComponentName.module.css"

export interface ComponentNameProps {
  variant?: "default" | "outline"
  size?: "sm" | "md" | "lg"
  // ... other props
}

export function ComponentName({
  variant = "default",
  size = "md",
  className,
  ...props
}: ComponentNameProps) {
  return (
    <RadixPrimitive.Root
      className={clsx(styles.ComponentName, className)}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  )
}

// For compound components:
ComponentName.Item = Item
ComponentName.Trigger = Trigger
ComponentName.Content = Content
```

#### CSS Module Pattern

```css
/* ComponentName.module.css */
.ComponentName {
  /* Use component-specific CSS variables */
  --component-size: var(--control-size-md);
  --component-gap: var(--space-2);

  /* Base styles */
  display: flex;
  gap: var(--component-gap);
}

/* Variant styles via data attributes */
&[data-variant="outline"] {
  border: 1px solid var(--color-border-primary);
}

/* Size variants */
&[data-size="sm"] {
  --component-size: var(--control-size-sm);
}

&[data-size="lg"] {
  --component-size: var(--control-size-lg);
}

/* States */
&[data-disabled] {
  opacity: 0.5;
  pointer-events: none;
}
```

#### Story Pattern

```tsx
// ComponentName.stories.tsx
import type { Meta, StoryObj } from "@storybook/react"
import { ComponentName } from "./ComponentName"

const meta = {
  title: "Components/ComponentName",
  component: ComponentName,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ComponentName>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: "Example",
  },
}

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem" }}>
      <ComponentName variant="default">Default</ComponentName>
      <ComponentName variant="outline">Outline</ComponentName>
    </div>
  ),
}
```

#### MDX Documentation Pattern

```mdx
{/* ComponentName.mdx */}
import { Canvas, Meta, ArgTypes, Controls } from '@storybook/blocks'
import \* as Stories from './ComponentName.stories'

<Meta of={Stories} />

# ComponentName

Brief description of what the component does.

## Usage

<Canvas of={Stories.Default} />

## Variants

<Canvas of={Stories.Variants} />

## API Reference

<ArgTypes of={Stories.Default} />
```

### Step 4: Export from Index

Add export to `src/components/index.tsx`:

```tsx
export { ComponentName } from "./ComponentName"
export type { ComponentNameProps } from "./ComponentName"
```

### Step 5: Verify

Run these commands before committing:

```bash
npm run format:fix
npm run lint
npm run types
npm run test
```

## Design Tokens Reference

Common tokens to use (from `src/styles/`):

**Sizing:**

- `--control-size-sm`, `--control-size-md`, `--control-size-lg`
- `--control-gutter-sm`, `--control-gutter-md`, `--control-gutter-lg`

**Spacing:**

- `--space-1` through `--space-12`

**Colors:**

- `--color-background-*`
- `--color-text-*`
- `--color-border-*`

**Typography:**

- `--font-size-*`
- `--font-weight-*`
- `--line-height-*`

## Radix Primitives Reference

Common Radix packages for components:

| Component Type  | Radix Package                     |
| --------------- | --------------------------------- |
| Accordion       | `@radix-ui/react-accordion`       |
| Tabs            | `@radix-ui/react-tabs`            |
| Dialog/Modal    | `@radix-ui/react-dialog`          |
| Collapsible     | `@radix-ui/react-collapsible`     |
| Navigation Menu | `@radix-ui/react-navigation-menu` |
| Progress        | `@radix-ui/react-progress`        |
| Scroll Area     | `@radix-ui/react-scroll-area`     |
| Separator       | `@radix-ui/react-separator`       |
| Toggle          | `@radix-ui/react-toggle`          |
| Toggle Group    | `@radix-ui/react-toggle-group`    |
| Toolbar         | `@radix-ui/react-toolbar`         |

## Example: Creating Tabs Component

User: "Create Tabs component, look at shadcn for reference"

1. **Research shadcn**: Look at `packages/ui/src/tabs.tsx`

   - Uses `@radix-ui/react-tabs`
   - Compound: Tabs, TabsList, TabsTrigger, TabsContent
   - Props: defaultValue, value, onValueChange

2. **Create files**:

   - `src/components/Tabs/Tabs.tsx`
   - `src/components/Tabs/Tabs.module.css`
   - `src/components/Tabs/Tabs.stories.tsx`
   - `src/components/Tabs/Tabs.mdx`
   - `src/components/Tabs/index.tsx`

3. **Implement** following Plex UI patterns (data-attributes, CSS modules, tokens)

4. **Document** with stories and MDX

5. **Export** from `src/components/index.tsx`
