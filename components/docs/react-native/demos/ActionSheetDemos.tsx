import { ActionSheet, Button, Text } from '@plexui/react-native';
import { CameraPhoto, Copy, Folder, Images, RemoveTrash, Share } from '@plexui/react-native/icons';
import { useState } from 'react';
import { View } from 'react-native';

const column = { alignItems: 'center', gap: 8 } as const;

export function Overview() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState('nothing yet');
  return (
    <View style={column}>
      <Button color="secondary" variant="soft" onPress={() => setOpen(true)}>
        Photo actions
      </Button>
      <Text variant="footnote" color="secondary">
        Last: {last}
      </Text>
      <ActionSheet
        open={open}
        onOpenChange={setOpen}
        title="Photo"
        message="What would you like to do with it?"
        actions={[
          { label: 'Share', icon: <Share />, onPress: () => setLast('Share') },
          { label: 'Duplicate', icon: <Copy />, onPress: () => setLast('Duplicate') },
          { label: 'Delete', icon: <RemoveTrash />, destructive: true, onPress: () => setLast('Delete') },
        ]}
      />
    </View>
  );
}

export function ActionsOnly() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState('nothing yet');
  return (
    <View style={column}>
      <Button color="secondary" variant="soft" onPress={() => setOpen(true)}>
        Add a photo
      </Button>
      <Text variant="footnote" color="secondary">
        Last: {last}
      </Text>
      <ActionSheet
        open={open}
        onOpenChange={setOpen}
        cancelLabel="Not now"
        actions={[
          { label: 'Take Photo', icon: <CameraPhoto />, disabled: true },
          { label: 'Photo Library', icon: <Images />, onPress: () => setLast('Photo Library') },
          { label: 'Browse Files', icon: <Folder />, onPress: () => setLast('Browse Files') },
        ]}
      />
    </View>
  );
}
