import { Button, IconButton } from '@plexui/react-native';
import { ArrowRightSm, Plus, Search, Star } from '@plexui/react-native/icons';
import { useState } from 'react';
import { View } from 'react-native';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' } as const;

export function Overview() {
  const [count, setCount] = useState(0);
  return (
    <View style={row}>
      <Button onPress={() => setCount((n) => n + 1)}>Pressed {count}</Button>
      <Button variant="soft">Soft</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </View>
  );
}

export function Colors() {
  return (
    <View style={{ gap: 8 }}>
      {(['solid', 'soft'] as const).map((variant) => (
        <View key={variant} style={row}>
          {(['primary', 'secondary', 'danger', 'success', 'info'] as const).map((color) => (
            <Button key={color} color={color} variant={variant} size="sm">
              {color}
            </Button>
          ))}
        </View>
      ))}
    </View>
  );
}

export function Sizes() {
  return (
    <View style={row}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="xl">Large</Button>
    </View>
  );
}

export function Icons() {
  return (
    <View style={row}>
      <Button>
        <Search />
        Search
      </Button>
      <Button variant="soft">
        Continue
        <ArrowRightSm />
      </Button>
      <IconButton icon={<Plus />} variant="soft" accessibilityLabel="Add" />
    </View>
  );
}

export function States() {
  const [selected, setSelected] = useState(true);
  return (
    <View style={row}>
      <Button variant="soft" selected={selected} onPress={() => setSelected((value) => !value)}>
        <Star />
        {selected ? 'Saved' : 'Save'}
      </Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
    </View>
  );
}

export function Block() {
  return (
    <View style={{ gap: 8, alignSelf: 'stretch' }}>
      <Button block size="xl">
        Continue
      </Button>
      <Button block size="xl" variant="soft">
        Not now
      </Button>
    </View>
  );
}
