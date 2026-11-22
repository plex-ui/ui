import { PageControl, Text } from '@plexui/react-native';
import { useState } from 'react';
import { View } from 'react-native';

const PAGES = [
  { title: 'Save places', body: 'Keep the places you love in one list.' },
  { title: 'Plan a trip', body: 'Put saved places on a map, day by day.' },
  { title: 'Share it', body: 'Send the plan to the people you travel with.' },
  { title: 'Go offline', body: 'Download maps for when you have no signal.' },
];

export function Overview() {
  const [page, setPage] = useState(0);
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 4, minHeight: 72 }}>
        <Text variant="title3" weight="semibold">
          {PAGES[page].title}
        </Text>
        <Text variant="subheadline" color="secondary" align="center">
          {PAGES[page].body}
        </Text>
      </View>
      <PageControl count={PAGES.length} value={page} onChange={setPage} />
    </View>
  );
}

export function ManyPages() {
  const [page, setPage] = useState(5);
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <PageControl count={12} value={page} onChange={setPage} />
      <Text variant="footnote" color="secondary">
        Page {page + 1} of 12
      </Text>
    </View>
  );
}

export function Background() {
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      {(['automatic', 'prominent', 'minimal'] as const).map((background) => (
        <View key={background} style={{ alignItems: 'center' }}>
          <PageControl count={5} defaultValue={1} background={background} aria-label={`Pages, ${background}`} />
          <Text variant="caption1" color="tertiary">
            {background}
          </Text>
        </View>
      ))}
    </View>
  );
}
