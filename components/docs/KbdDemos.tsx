'use client';

import { Button } from '@plexui/ui/components/Button';
import { Search } from '@plexui/ui/components/Icon';
import { Kbd } from '@plexui/ui/components/Kbd';
import { Menu } from '@plexui/ui/components/Menu';
import { Tooltip } from '@plexui/ui/components/Tooltip';

export function KbdOverviewDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <p className="text-sm text-secondary">
        Press <Kbd>/</Kbd> to search, <Kbd>Esc</Kbd> to close.
      </p>
    </div>
  );
}

export function KbdShortcutDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center gap-6 py-12 w-full">
      <Kbd.Group>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </Kbd.Group>
      <Kbd.Group>
        <Kbd>Ctrl</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>P</Kbd>
      </Kbd.Group>
    </div>
  );
}

export function KbdSizesDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center gap-4 py-12 w-full">
      {(['soft', 'outline'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-4">
          <Kbd size="xs" variant={variant}>⌘K</Kbd>
          <Kbd size="sm" variant={variant}>⌘K</Kbd>
          <Kbd size="md" variant={variant}>⌘K</Kbd>
        </div>
      ))}
    </div>
  );
}

export function KbdInContextDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center gap-4 py-12 w-full">
      <Tooltip
        content={
          <span className="flex items-center gap-2">
            Search
            <Kbd.Group>
              <Kbd size="xs">⌘</Kbd>
              <Kbd size="xs">K</Kbd>
            </Kbd.Group>
          </span>
        }
      >
        <Button color="secondary" variant="outline" uniform aria-label="Search" aria-keyshortcuts="Meta+K">
          <Search />
        </Button>
      </Tooltip>
      <Menu>
        <Menu.Trigger>
          <Button color="secondary" variant="soft">Edit</Button>
        </Menu.Trigger>
        <Menu.Content minWidth={220}>
          <Menu.Item onSelect={() => {}}>
            <span className="flex-1">Undo</span>
            <Kbd size="xs" variant="outline">⌘Z</Kbd>
          </Menu.Item>
          <Menu.Item onSelect={() => {}}>
            <span className="flex-1">Redo</span>
            <Kbd size="xs" variant="outline">⇧⌘Z</Kbd>
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  );
}
