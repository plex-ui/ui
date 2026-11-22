import { Button, Text, toast, useTheme } from '@plexui/react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' } as const;

/** The buttons away from the toasts: at the bottom on iOS (banners from the top), at the top on Android (snackbars at the bottom). */
function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexGrow: 1, gap: 8, alignItems: 'center', justifyContent: theme.isAndroid ? 'flex-start' : 'flex-end' }}>
      {children}
    </View>
  );
}

export function Overview() {
  return (
    <Screen>
      <View style={row}>
        <Button color="secondary" variant="soft" onPress={() => toast('Saved to Photos')}>
          Plain
        </Button>
        <Button color="secondary" variant="soft" onPress={() => toast('Link copied', { description: 'Anyone with the link can view it.' })}>
          With description
        </Button>
      </View>
    </Screen>
  );
}

export function Types() {
  return (
    <Screen>
      <View style={row}>
        <Button color="secondary" variant="soft" onPress={() => toast.success('Payment sent', { description: '$24.00 to Jane' })}>
          Success
        </Button>
        <Button color="secondary" variant="soft" onPress={() => toast.error('Upload failed')}>
          Error
        </Button>
        <Button color="secondary" variant="soft" onPress={() => toast.warning('Storage almost full')}>
          Warning
        </Button>
        <Button color="secondary" variant="soft" onPress={() => toast.info('Update available')}>
          Info
        </Button>
      </View>
    </Screen>
  );
}

export function Actions() {
  const [last, setLast] = useState('nothing yet');
  return (
    <Screen>
      <View style={row}>
        <Button
          color="secondary"
          variant="soft"
          onPress={() => toast('Message deleted', { action: { label: 'Undo', onClick: () => setLast('Undo') } })}
        >
          With action
        </Button>
        <Button
          color="secondary"
          variant="soft"
          onPress={() =>
            toast('Connection lost', {
              action: { label: 'Retry', onClick: () => setLast('Retry') },
              closeButton: true,
              duration: Infinity,
            })
          }
        >
          Until closed
        </Button>
        <Button color="secondary" variant="ghost" onPress={() => toast.dismiss()}>
          Dismiss all
        </Button>
      </View>
      <Text variant="footnote" color="secondary">
        Last: {last}
      </Text>
    </Screen>
  );
}
