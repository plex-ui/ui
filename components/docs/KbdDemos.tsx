'use client';

import { useState } from 'react';
import { controlsTableStyle, Segments } from './ButtonDemos';
import { Button } from '@plexui/ui/components/Button';
import { Search } from '@plexui/ui/components/Icon';
import { Kbd } from '@plexui/ui/components/Kbd';
import { Menu } from '@plexui/ui/components/Menu';
import { Tooltip } from '@plexui/ui/components/Tooltip';

type KbdKeys = 'key' | 'shortcut' | 'modifier';
type KbdModifierName = 'mod' | 'ctrl' | 'alt' | 'shift';

/**
 * The Overview, with every setting of a key (row 33: one example per content, owner 11.11): a key, a shortcut of keys
 * pressed together and a modifier as the reader's keyboard prints it, in each size and variant, were four examples of
 * the same key in a sentence.
 */
export function KbdOverviewDemo() {
  const [keys, setKeys] = useState<KbdKeys>('shortcut');
  const [name, setName] = useState<KbdModifierName>('mod');
  const [platform, setPlatform] = useState<'auto' | 'apple' | 'other'>('auto');
  const [size, setSize] = useState<'xs' | 'sm' | 'md'>('sm');
  const [variant, setVariant] = useState<'soft' | 'outline'>('soft');
  const props = { size, variant };

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="keys" options={['key', 'shortcut', 'modifier'] as const} value={keys} onChange={setKeys} />
        {keys === 'modifier' && (
          <>
            <Segments name="name" options={['mod', 'ctrl', 'alt', 'shift'] as const} value={name} onChange={setName} />
            <Segments name="platform" options={['auto', 'apple', 'other'] as const} value={platform} onChange={setPlatform} />
          </>
        )}
        <Segments name="size" options={['xs', 'sm', 'md'] as const} value={size} onChange={setSize} />
        <Segments name="variant" options={['soft', 'outline'] as const} value={variant} onChange={setVariant} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <p className="text-sm text-secondary">
          Press{' '}
          {keys === 'key' && <Kbd {...props}>/</Kbd>}
          {keys === 'shortcut' && (
            <Kbd.Group>
              <Kbd {...props}>⌘</Kbd>
              <Kbd {...props}>K</Kbd>
            </Kbd.Group>
          )}
          {keys === 'modifier' && (
            <Kbd.Group>
              <Kbd.Modifier {...props} name={name} platform={platform === 'auto' ? undefined : platform} />
              <Kbd {...props}>K</Kbd>
            </Kbd.Group>
          )}{' '}
          to search.
        </p>
      </div>
    </>
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
