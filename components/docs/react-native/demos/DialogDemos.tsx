import { Button, Dialog, Input, Text, useTheme } from '@plexui/react-native';
import { useState } from 'react';
import { View } from 'react-native';

const column = { alignItems: 'center', gap: 8 } as const;

export function Overview() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState('nothing yet');
  return (
    <View style={column}>
      <Button color="secondary" variant="soft" onPress={() => setOpen(true)}>
        Delete photo
      </Button>
      <Text variant="footnote" color="secondary">
        Last: {last}
      </Text>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this photo?"
        description="It will be removed from all your devices."
        actions={[
          { label: 'Cancel', variant: 'cancel', onPress: () => setLast('Cancel') },
          { label: 'Delete', variant: 'destructive', onPress: () => setLast('Delete') },
        ]}
      />
    </View>
  );
}

export function ThreeActions() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState('nothing yet');
  return (
    <View style={column}>
      <Button color="secondary" variant="soft" onPress={() => setOpen(true)}>
        Close document
      </Button>
      <Text variant="footnote" color="secondary">
        Last: {last}
      </Text>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Unsaved changes"
        description="Save the changes to this document before closing?"
        actions={[
          { label: 'Save', preferred: true, onPress: () => setLast('Save') },
          { label: "Don't Save", variant: 'destructive', onPress: () => setLast("Don't Save") },
          { label: 'Cancel', variant: 'cancel', onPress: () => setLast('Cancel') },
        ]}
      />
    </View>
  );
}

export function WithField() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Untitled folder');
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <View style={column}>
      <Button color="secondary" variant="soft" onPress={() => setOpen(true)}>
        New folder
      </Button>
      <Text variant="footnote" color="secondary">
        {saved ? `Created: ${saved}` : 'No folder yet'}
      </Text>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New folder"
        description="Enter a name for this folder."
        actions={[
          { label: 'Cancel', variant: 'cancel' },
          { label: 'Save', preferred: true, disabled: !name.trim(), onPress: () => setSaved(name.trim()) },
        ]}
      >
        <Input variant="soft" size="3xl" pill={theme.isIOS} value={name} onChangeText={setName} accessibilityLabel="Name" />
      </Dialog>
    </View>
  );
}
