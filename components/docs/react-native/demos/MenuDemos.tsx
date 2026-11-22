import { Button, IconButton, Menu, Text } from '@plexui/react-native';
import { Archive, Copy, DotsHorizontal, Flag, Pencil, RemoveTrash, Share } from '@plexui/react-native/icons';
import { useState } from 'react';
import { View } from 'react-native';

const column = { alignItems: 'center', gap: 8 } as const;

export function Overview() {
  const [last, setLast] = useState('nothing yet');
  return (
    <View style={column}>
      <Menu>
        <Menu.Trigger style={{ alignSelf: 'center' }}>
          <Button color="secondary" variant="soft">
            Actions
          </Button>
        </Menu.Trigger>
        <Menu.Content aria-label="Actions">
          <Menu.Item icon={<Pencil />} onSelect={() => setLast('Rename')}>
            Rename
          </Menu.Item>
          <Menu.Item icon={<Copy />} onSelect={() => setLast('Duplicate')}>
            Duplicate
          </Menu.Item>
          <Menu.Item icon={<Share />} onSelect={() => setLast('Share')}>
            Share
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item icon={<RemoveTrash />} danger onSelect={() => setLast('Delete')}>
            Delete
          </Menu.Item>
        </Menu.Content>
      </Menu>
      <Text variant="footnote" color="secondary">
        Last: {last}
      </Text>
    </View>
  );
}

export function LabelsAndDescriptions() {
  const [last, setLast] = useState('nothing yet');
  return (
    <View style={column}>
      <Menu>
        <Menu.Trigger style={{ alignSelf: 'center' }}>
          <Button color="secondary" variant="soft">
            Document
          </Button>
        </Menu.Trigger>
        <Menu.Content aria-label="Document">
          <Menu.Label>Document</Menu.Label>
          <Menu.Item icon={<Pencil />} onSelect={() => setLast('Rename')}>
            Rename
          </Menu.Item>
          <Menu.Item icon={<Copy />} description="A copy in the same folder" onSelect={() => setLast('Duplicate')}>
            Duplicate
          </Menu.Item>
          <Menu.Item icon={<Share />} disabled>
            Share
          </Menu.Item>
          <Menu.Separator />
          <Menu.Label>Danger zone</Menu.Label>
          <Menu.Item icon={<RemoveTrash />} danger description="It cannot be undone" onSelect={() => setLast('Delete')}>
            Delete
          </Menu.Item>
        </Menu.Content>
      </Menu>
      <Text variant="footnote" color="secondary">
        Last: {last}
      </Text>
    </View>
  );
}

export function Controlled() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState('nothing yet');
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text weight="semibold">Inbox</Text>
        <Menu open={open} onOpenChange={setOpen}>
          <Menu.Trigger>
            <IconButton icon={<DotsHorizontal />} variant="soft" color="secondary" accessibilityLabel="More" />
          </Menu.Trigger>
          <Menu.Content align="end" aria-label="More">
            <Menu.Item icon={<Archive />} onSelect={() => setLast('Archive')}>
              Archive
            </Menu.Item>
            <Menu.Item icon={<Flag />} onSelect={() => setLast('Flag')}>
              Flag
            </Menu.Item>
          </Menu.Content>
        </Menu>
      </View>
      <Text variant="footnote" color="secondary">
        {open ? 'Open' : 'Closed'}, last: {last}
      </Text>
    </View>
  );
}
