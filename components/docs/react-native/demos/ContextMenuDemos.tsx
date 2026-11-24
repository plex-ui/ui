import { useState } from 'react';
import { ContextMenu, List, ListItem, Toolbar } from '@plexui/react-native';
import { Copy, RemoveTrash, Share } from '@plexui/react-native/icons';
import { ScrollView, View } from 'react-native';
import { RNScreen, docsDemo } from '../RNScreen';

const NOTES = [
  { id: 'groceries', title: 'Groceries', detail: 'Milk, eggs, bread' },
  { id: 'trip', title: 'Trip to Lisbon', detail: 'Flights on Friday' },
  { id: 'ideas', title: 'Gift ideas', detail: 'A book, a plant' },
  { id: 'books', title: 'Books to read', detail: 'Three on the list' },
];

/**
 * The notes of an app: a touch and hold on a note opens its menu (Copy, Share, Delete), the note lifted over the
 * dimmed screen on iOS; a tap still opens the note. Delete takes the note off the list.
 */
export const Overview = docsDemo(function Overview() {
  const [notes, setNotes] = useState(NOTES);
  return (
    <RNScreen screen grouped minHeight={520}>
      <View style={{ flex: 1 }}>
        <Toolbar>
          <Toolbar.Title>Notes</Toolbar.Title>
        </Toolbar>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <List>
            {notes.map((note) => (
              <ContextMenu key={note.id}>
                <ContextMenu.Trigger>
                  <ListItem label={note.title} description={note.detail} onPress={() => {}} />
                </ContextMenu.Trigger>
                <ContextMenu.Content aria-label={note.title}>
                  <ContextMenu.Item icon={<Copy />} onSelect={() => {}}>
                    Copy
                  </ContextMenu.Item>
                  <ContextMenu.Item icon={<Share />} onSelect={() => {}}>
                    Share
                  </ContextMenu.Item>
                  <ContextMenu.Separator />
                  <ContextMenu.Item icon={<RemoveTrash />} danger onSelect={() => setNotes((rest) => rest.filter((item) => item.id !== note.id))}>
                    Delete
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu>
            ))}
          </List>
        </ScrollView>
      </View>
    </RNScreen>
  );
});
