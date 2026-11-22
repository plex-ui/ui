import { BottomSheet, Button, Switch, Text } from '@plexui/react-native';
import { useState } from 'react';
import { View } from 'react-native';

const SONGS = [
  'Morning walk',
  'Harbor lights',
  'Paper planes',
  'Slow river',
  'Neon rain',
  'Small hours',
  'Glass garden',
  'Northern line',
  'Low tide',
  'Open window',
  'Last train home',
  'Quiet machines',
  'Copper sky',
  'Field notes',
  'Afterglow',
];

export function Overview() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ alignItems: 'center' }}>
      <Button color="secondary" variant="soft" onPress={() => setOpen(true)}>
        Open sheet
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Share">
        <View style={{ gap: 16 }}>
          <Text color="secondary">A sheet with content of its own. Drag it down or tap outside to close it.</Text>
          <Button block onPress={() => setOpen(false)}>
            Done
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}

export function Scrolling() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ alignItems: 'center' }}>
      <Button color="secondary" variant="soft" onPress={() => setOpen(true)}>
        Show queue
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} aria-label="Queue">
        <View style={{ gap: 4 }}>
          <Text variant="headline">Up next</Text>
          {SONGS.map((song, index) => (
            <View key={song} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}>
              <Text color="tertiary" style={{ width: 20 }}>
                {index + 1}
              </Text>
              <Text>{song}</Text>
            </View>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

export function NotDismissible() {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  return (
    <View style={{ alignItems: 'center' }}>
      <Button color="secondary" variant="soft" onPress={() => setOpen(true)}>
        Review terms
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} dismissible={false} title="Updated terms">
        <View style={{ gap: 16 }}>
          <Text color="secondary">The terms of the service changed. Accept them to go on.</Text>
          <Switch label="I have read the terms" checked={agreed} onCheckedChange={setAgreed} />
          <Button block disabled={!agreed} onPress={() => setOpen(false)}>
            Accept
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}
