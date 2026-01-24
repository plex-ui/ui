# Icon Migration Report

## Missing Icons

The following icons from the old set are not available in the new 616-icon set and need manual replacement:

### Beta

**Used in:**

- `src/components/Badge/Badge.mdx`
- `src/components/Badge/Badge.stories.tsx`
- `src/components/Popover/Popover.stories.tsx`
- `src/components/EmptyMessage/EmptyMessage.stories.tsx`

**Suggested replacements:**

- `Sparkle` - for beta/preview features
- `ProDiamond` - for premium/beta features
- Or remove the icon and use text-only badge

## Automatic Aliases Created

The following old icon names are automatically mapped to new icons via aliases in `src/components/Icon/aliases.ts`:

- `ArrowRight` → `ArrowRightSm`
- `ArrowUp` → `ArrowUpSm`
- `ArrowUpRight` → `ArrowTopRightSm`
- `CalendarAlt` → `Calendar`
- `Check` → `CheckMd`
- `ChevronDownVector` → `ChevronDownXl`
- `ChevronLeft` → `ChevronLeftMd`
- `ChevronRight` → `ChevronRightMd`
- `Clear` → `X`
- `Delete` → `RemoveTrash`
- `Documentation` → `FileDocument`
- `DropdownVector` → `DropdownXl`
- `Explore` → `AllProductsExplore`
- `Functions` → `Function`
- `Info` → `InfoCircle`
- `Mail` → `Email`
- `Wave` → `PhoneWaves`
- `Workspace` → `BuildingWorkspace`

## Removed Branded Icons

The following brand-specific icons have been removed:

- `MyGptProfileMe`
- `UserGpts`

These icons should not be replaced as they were brand-specific.
