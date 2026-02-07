# Contribution guide for Plex UI

Plex UI is a modern design system for building high-quality applications. Plex UI provides styling foundations, CSS variable design tokens, and a library of well-crafted, accessible components.

- **Design tokens** – defined across colors, typography, spacing, sizing, shadows, surfaces, and more.
- **Tailwind 4** – fully integrated and pre-configured with Plex UI's design tokens.
- **Component library** – high-quality components built on top of Radix for consistent accessibility patterns.
- **Utilities** – helpful tools for handling core concepts like dark mode, responsiveness, and more across React and CSS.

Keep this goal and context in mind as you contribute code to the repository. This code is the foundation for many other projects, and changes should be robust, well-considered, and workable for many different contexts.

## Repository overview

You should make changes only in the `src/` folder:

- `components/` - React component implementations (e.g., Button, Chat, Tooltip)
- `hooks/` - Reusable React hooks (e.g., useAutoGrowTextarea, useBreakpoints)
- `lib/` - Utility functions (theme helpers, attachment helpers, etc.)
- `styles/` - Global CSS config, Tailwind setup, and design token definitions
- `**/*.stories.tsx` - Storybook stories definition for a given component
- `**/*.mdx` - Storybook documentation, often referring to sibling `.stories.tsx` file
- `types.ts` - Shared TypeScript types
- `vite-env.d.ts` - Vite type declarations

When adding new functionality or docs, place files in the appropriate `src/*` location.

# Components

## File Naming Conventions

- Component: `ComponentName.tsx`
- Styles: `ComponentName.module.css`
- Tests: `ComponentName.test.tsx`
- Storybook:
  - `ComponentName.stories.tsx`
  - `ComponentName.mdx`

## Component library

Below is a quick reference of all provided components:

| Component              | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| **Alert**              | Call attention to a specific message or warning.                      |
| **Animate**            | Animate components as they mount and unmount.                         |
| **AnimateLayout**      | Animate width & height of components as they mount and unmount.       |
| **AnimateLayoutGroup** | Animate width & height of lists of components as they enter and exit. |
| **Avatar**             | Display user identities with either text, photo, or an icon.          |
| **AvatarGroup**        | Display avatars as a single stack.                                    |
| **Badge**              | Emphasize details with a status indicator.                            |
| **Button**             | Create actions in many different styles.                              |
| **ButtonLink**         | `<Button>` but as a semantic anchor element.                          |
| **Checkbox**           | Toggle control for on and off states.                                 |
| **CodeBlock**          | Display syntax‑highlighted code snippets.                             |
| **CopyTooltip**        | Allow users to easily copy to clipboard.                              |
| **EmptyMessage**       | Gracefully inform users when there's nothing to see.                  |
| **Icon**               | Collection of SVG icons exported as React components.                 |
| **Image**              | Load remote images with optional aspect ratio and cover mode.         |
| **Indicator**          | Loading dots and circular progress indicators.                        |
| **Input**              | Semantic input text collection.                                       |
| **Markdown**           | Render rich formatted content.                                        |
| **Menu**               | Structured actions in a dropdown list.                                |
| **Modal**              | Capture focus for essential tasks or details.                         |
| **PlexUIProvider**     | React provider for shared context (e.g., link component).             |
| **Popover**            | Generic floating UI utility for contextual actions.                   |
| **RadioGroup**         | Radio button group selection component.                               |
| **SegmentedControl**   | Toggle through grouped options.                                       |
| **Select**             | Choose from a dropdown of options.                                    |
| **SelectControl**      | Alternative select control component with enhanced features.          |
| **Slider**             | Fine-tune values within a set range.                                  |
| **Switch**             | Toggle control for on and off states.                                 |
| **TagInput**           | Enter multiple unique tags.                                           |
| **TextLink**           | Semantic link used for both internal and external links.              |
| **Textarea**           | Autosizable text input area with optional validation.                 |
| **Tooltip**            | Brief and informative hover text.                                     |
| **TransitionGroup**    | Primitive for rendering components over time.                         |

## Documentation & Storybook

All components should be thoroughly documented in Storybook, using the `.mdx` and `.stories` sidecar files.

- You should not need to run Storybook locally, so ignore the `pnpm run storybook` command
- Update or create `.mdx` and `.stories.tsx` files when adding new components or features.
- Keep usage examples simple and focused. Refer to documentation examples like `Avatar`, `Badge`, and `Button` for guidance.
- **Sidebar sorting**: Components must always be sorted alphabetically in the Storybook sidebar. When adding a new component, update the `storySort.order` array in `.storybook-base/preview.tsx` to include it in the correct alphabetical position.

## Docs site: controls and code (reference: Sidebar)

When building or updating component documentation (e.g. in a docs site that consumes Plex UI), **controls under preview** and **code blocks** must follow the same pattern as the **Sidebar** component docs. Use this repo (`/storybook`) as the source of truth for the list of components; align all component docs to this standard.

### Controls under preview

- **Placement**: One full-width controls block directly under the preview area (no gap), so the preview and controls read as one unit.
- **Layout**: Table-like block with:
  - Container: `background: var(--color-surface-secondary)`, `margin: 24px -24px -24px -24px`, `width: calc(100% + 48px)` so it spans the full preview width.
  - Rows: `display: flex`, `alignItems: center`, `justifyContent: space-between`, `padding: 6px 16px 6px 8px`, `borderTop: 1px solid var(--color-fd-border)` (no extra border under the last row).
- **Row types**:
  - Boolean: label (monospace, small, pill-style) + **Switch** (use a shared `DemoControlBoolean`-style component).
  - Other (e.g. size, variant): label + control (e.g. **SegmentedControl**) in a `DemoControlRow`-style row.
- **Label style**: Monospace font, small size, subtle pill background so the control name is clearly associated with the control.
- **When migrating from Storybook**: For every story that has `<Controls of={...} />` in the Storybook `.mdx`, the docs site must have an equivalent controls block under that preview (same args, e.g. `open`, `size`, `icons`, `pill`). Build the demo so it renders both the preview and the controls block (e.g. Root + Preview + Controls in one exported component).

### Code blocks

- **Usage / import snippets** (e.g. in a “Usage” section): Use a single block (e.g. **UsageBlock**) that shows the code and a copy button. Ensure long lines do not truncate: the code element must have `min-width: 0` in its flex container and `overflow-x: auto` (and `white-space: pre`) so horizontal scroll appears when needed.
- **Demo code** (under “View code”): One preview area, then a “View code” / “Hide code” toggle, then the code block (e.g. **DynamicCodeBlock** with `allowCopy: true`). No Preview/Code tabs; code is shown on demand. Code block container should have no inner border/radius so it aligns visually with the preview.

### Token / code styling (Structure and Reference)

- **Structure section**: Use backticks for component and API names (e.g. `SidebarProvider`, `SidebarLayout`), not bold. That way they get the same “token” style as prose code (grey pill with border) and match the look of values like `"expanded"` or `"collapsed"` in hook descriptions.
- **Reference (PropsTable)**: Style `code` in Prop, Type, and Default columns like prose code: `border: 1px solid var(--color-fd-border)`, `background: var(--color-fd-muted)`, `border-radius: 5px`, so tokens look consistent across Structure, Reference, and body text.

All component documentation should be updated so that every component page uses this controls-under-preview and code pattern consistently.

# Contributing

When working on features or documentation, avoid making unrelated changes to the current task. Do not add comments for obvious behaviors, and do not change build settings.

## Setup instructions

- Use Node version specified in `.node-version`
- Install dependencies with `npm install`

## Required commands before commit

1. `npm run format:fix` - Auto-fixes any formatting issues
2. `npm run lint` - Runs ESLint (TS) and Stylelint (CSS)
3. `npm run types` - Runs TypeScript type checking
4. `npm run test` - Executes unit tests via Vitest

Ignore all other script commands, as they will be irrelevant to your work.

## Figma Plugin

When making changes to the Figma plugin code (`figma/plugin/code.ts`), you **must always compile the plugin** after making changes:

```bash
cd figma/plugin
npm run build
```

This compiles TypeScript to JavaScript (`code.ts` → `code.js`), which is what Figma actually runs. Without compilation, changes to `code.ts` will not be reflected in the plugin.

For development, you can use watch mode to automatically recompile on file changes:

```bash
cd figma/plugin
npm run watch
```
