# Component Rules

## Imports

All Plex UI components use **subpath imports**. Never import from the package root.

```tsx
// Correct
import { Button, ButtonLink } from "@plexui/ui/components/Button";
import { Input } from "@plexui/ui/components/Input";
import { Select, type Option } from "@plexui/ui/components/Select";
import { useBreakpoint } from "@plexui/ui/hooks/useBreakpoints";
import type { ControlSize } from "@plexui/ui/types";

// Wrong: root imports don't exist
import { Button } from "@plexui/ui";
import { Button } from "@plexui/ui/components";
```

## PlexUIProvider

`PlexUIProvider` supplies the link component that `ButtonLink`, `TextLink`, `Menu.Link` and `Card` with `href` render. It is optional; when you use it, `linkComponent` is required.

```tsx
// Correct: with Next.js Link
import Link from "next/link";
import { PlexUIProvider } from "@plexui/ui/components/PlexUIProvider";

<PlexUIProvider linkComponent={Link}>
  {children}
</PlexUIProvider>

// Correct: plain HTML links
<PlexUIProvider linkComponent="a">
  {children}
</PlexUIProvider>

// Type the `as` / link props for your router (optional)
declare global {
  interface PlexUIConfig {
    LinkComponent: typeof Link;
  }
}

// No provider: <ButtonLink href="/settings"> renders a plain <a> (full page load).
// Pass a router link per component instead: <ButtonLink as={Link} href="/settings">
```

## Component Composition

### Menu

Menu is a compound component with dot-notation parts. `Menu.Trigger` renders its child element as the trigger, so pass a single element such as a `Button`.

```tsx
import { Menu } from "@plexui/ui/components/Menu";

<Menu>
  <Menu.Trigger>
    <Button color="secondary">Options</Button>
  </Menu.Trigger>
  <Menu.Content>
    <Menu.Item onSelect={handleEdit}>Edit</Menu.Item>
    <Menu.Item onSelect={handleDuplicate}>Duplicate</Menu.Item>
    <Menu.Separator />
    <Menu.Item onSelect={handleDelete}>Delete</Menu.Item>
  </Menu.Content>
</Menu>
```

Other parts: `Menu.Link`, `Menu.Label`, `Menu.Group`, `Menu.Sub` / `Menu.SubTrigger` / `Menu.SubContent`, `Menu.CheckboxItem`, `Menu.RadioGroup` / `Menu.RadioItem`, `Menu.ItemActions` / `Menu.ItemAction`.

### Select

Select is data-driven: pass `options` (or option groups), not child elements. `onChange` receives the selected option object (an array when `multiple`).

```tsx
import { Select } from "@plexui/ui/components/Select";

const roles = [
  {
    label: "Roles",
    options: [
      { value: "admin", label: "Admin" },
      { value: "editor", label: "Editor" },
      { value: "viewer", label: "Viewer" },
    ],
  },
];

<Select
  size="md"
  placeholder="Choose role"
  options={roles}
  value={role}
  onChange={(option) => setRole(option.value)}
/>
```

### Sidebar

Sidebar supports multiple collapse modes and has a rich sub-component structure. With `collapsible="icon"`, give every menu button an icon so the collapsed rail is not empty.

```tsx
import {
  Sidebar,
  SidebarProvider,
  SidebarLayout,
  SidebarInset,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuButtonIcon,
  SidebarMenuButtonLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from "@plexui/ui/components/Sidebar";
import { Home } from "@plexui/ui/components/Icon";

<SidebarProvider collapsible="icon" defaultOpen>
  <SidebarLayout>
    <Sidebar>
      <SidebarHeader>
        Logo
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive tooltip="Dashboard">
                <SidebarMenuButtonIcon><Home /></SidebarMenuButtonIcon>
                <SidebarMenuButtonLabel>Dashboard</SidebarMenuButtonLabel>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>User</SidebarFooter>
    </Sidebar>
    <SidebarInset>Content</SidebarInset>
  </SidebarLayout>
</SidebarProvider>
```

### Dialog

Dialog uses dot-notation parts. `Dialog.Trigger` and `Dialog.Close` render their child element.

```tsx
import { Dialog } from "@plexui/ui/components/Dialog";

<Dialog>
  <Dialog.Trigger>
    <Button color="primary">Open</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm action</Dialog.Title>
      <Dialog.Description>This cannot be undone.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close>
        <Button color="secondary">Cancel</Button>
      </Dialog.Close>
      <Button color="danger">Delete</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

`Dialog.Content` takes `width` (default `480`) and `showClose` (default `true`).

### Tabs

Tabs is a controlled tab control (segmented by default, or `variant="underline"`). It renders the tab buttons only; render the matching panel yourself. `SegmentedControl` is the same component.

```tsx
import { Tabs } from "@plexui/ui/components/Tabs";

const [tab, setTab] = useState("general");

<Tabs value={tab} onChange={setTab} aria-label="Settings sections">
  <Tabs.Tab value="general">General</Tabs.Tab>
  <Tabs.Tab value="security">Security</Tabs.Tab>
</Tabs>
{tab === "general" ? <GeneralSettings /> : <SecuritySettings />}
```

### Form Layout

`Field` takes the label, description and error as props and wires `id`, `aria-describedby` and `aria-invalid` onto its single child control.

```tsx
import { Field } from "@plexui/ui/components/Field";
import { Input } from "@plexui/ui/components/Input";

<Field
  label="Email"
  description="We'll never share your email."
  errorMessage={errors.email}
>
  <Input size="md" placeholder="you@example.com" invalid={!!errors.email} />
</Field>
```

Use `FieldError` (`<FieldError>{message}</FieldError>`) only when you lay out a control without `Field`.

## Consistent Sizing

When building a form or action bar, use the same `size` across all controls:

```tsx
// Correct: consistent size
<div className="flex gap-2">
  <Input size="lg" placeholder="Search..." />
  <Select size="lg" placeholder="Filter" options={filters} value={filter} onChange={(o) => setFilter(o.value)} />
  <Button size="lg" color="primary">Go</Button>
</div>

// Wrong: mixed sizes look broken
<div className="flex gap-2">
  <Input size="md" placeholder="Search..." />
  <Select size="lg" placeholder="Filter" options={filters} value={filter} onChange={(o) => setFilter(o.value)} />
  <Button size="sm" color="primary">Go</Button>
</div>
```

## Animation Components

Plex UI includes motion primitives for enter/exit animations. `Animate` animates its keyed children as they mount and unmount; render them conditionally.

```tsx
import { Animate } from "@plexui/ui/components/Transition";

// Fade in/out (default)
<Animate>
  {isVisible && <div key="content">Content</div>}
</Animate>

// Scale in/out
<Animate enter={{ scale: 1 }} exit={{ scale: 0.5 }}>
  {isVisible && <div key="content">Content</div>}
</Animate>
```

### TransitionGroup for lists:

`TransitionGroup` applies no styles itself; it sets transition-state data attributes that your CSS targets.

```tsx
import { TransitionGroup } from "@plexui/ui/components/Transition";

<TransitionGroup enterDuration={200} exitDuration={150}>
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</TransitionGroup>
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `import { Button } from "@plexui/ui"` | `import { Button } from "@plexui/ui/components/Button"` |
| `<PlexUIProvider>` without `linkComponent` | Pass `linkComponent` (e.g. `Link` from `next/link`, or `"a"`) |
| `<Select><Option /></Select>` | Pass `options={[...]}` and read `option.value` in `onChange` |
| `MenuItem`, `DialogTitle`, `TabsTrigger` imports | Use dot notation: `Menu.Item`, `Dialog.Title`, `Tabs.Tab` |
| Using `className` for colors | Use `color` and `variant` props |
| Mixed `size` props in a row | Use same `size` for all controls in a group |
| `dark:` overrides for Plex UI colors | Use semantic tokens; they switch with `data-theme` |
| `<Search className="w-4 h-4" />` inside Button | Remove size classes; Button sizes its icons |
