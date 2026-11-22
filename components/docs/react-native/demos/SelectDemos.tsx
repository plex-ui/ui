import { Select, Text } from '@plexui/react-native';
import { useState } from 'react';
import { View } from 'react-native';

const stack = { alignSelf: 'stretch', gap: 12 } as const;

/** The docs see @plexui/react-native untyped: the option a Select passes to onChange. */
type Option = { value: string; label: string };

const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', description: 'Ripe this week' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'durian', label: 'Durian', disabled: true },
];

export function Overview() {
  const [fruit, setFruit] = useState<string | null>('banana');
  return (
    <View style={stack}>
      <Select aria-label="Fruit" options={FRUITS} value={fruit} onChange={(option: Option) => setFruit(option.value)} />
      <Text variant="footnote" color="secondary">
        Fruit: {fruit ?? 'none'}
      </Text>
    </View>
  );
}

export function Placeholder() {
  const [fruit, setFruit] = useState<string | null>(null);
  return <Select aria-label="Fruit" options={FRUITS} value={fruit} onChange={(option: Option) => setFruit(option.value)} placeholder="Choose a fruit" />;
}

export function Variants() {
  const [outline, setOutline] = useState('apple');
  const [soft, setSoft] = useState('cherry');
  const [ghost, setGhost] = useState('banana');
  return (
    <View style={stack}>
      <Select aria-label="Outline" options={FRUITS} value={outline} onChange={(option: Option) => setOutline(option.value)} />
      <Select aria-label="Soft" variant="soft" options={FRUITS} value={soft} onChange={(option: Option) => setSoft(option.value)} />
      <Select aria-label="Ghost" variant="ghost" options={FRUITS} value={ghost} onChange={(option: Option) => setGhost(option.value)} />
    </View>
  );
}

export function States() {
  return (
    <View style={stack}>
      <Select aria-label="Invalid" options={FRUITS} value={null} onChange={() => {}} placeholder="Required" invalid />
      <Select aria-label="Disabled" options={FRUITS} value="apple" onChange={() => {}} disabled />
    </View>
  );
}

const SORTS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price', label: 'Lowest price' },
];

export function Hug() {
  const [sort, setSort] = useState('recent');
  return <Select aria-label="Sort by" options={SORTS} value={sort} onChange={(option: Option) => setSort(option.value)} block={false} pill />;
}
