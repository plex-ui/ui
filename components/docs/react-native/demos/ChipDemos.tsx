import { Button, Chip, Text } from '@plexui/react-native';
import { Calendar, Filter, MapPin, Star } from '@plexui/react-native/icons';
import { useState } from 'react';
import { View } from 'react-native';

const row = { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 } as const;
const stack = { alignSelf: 'stretch', gap: 4 } as const;

const FILTERS = ['Nearby', 'Open now', 'Top rated'];

export function Overview() {
  const [filters, setFilters] = useState(['Nearby']);
  const toggle = (name: string) => (on: boolean) => setFilters((list) => (on ? [...list, name] : list.filter((item) => item !== name)));
  return (
    <View style={stack}>
      <View style={row}>
        {FILTERS.map((name) => (
          <Chip key={name} selected={filters.includes(name)} onSelectedChange={toggle(name)}>
            {name}
          </Chip>
        ))}
      </View>
      <Text variant="footnote" color="secondary">
        Filters: {filters.join(', ') || 'none'}
      </Text>
    </View>
  );
}

export function Icons() {
  const [starred, setStarred] = useState(false);
  return (
    <View style={row}>
      <Chip icon={<MapPin />} defaultSelected>
        Nearby
      </Chip>
      <Chip icon={<Star />} selected={starred} onSelectedChange={setStarred}>
        Starred
      </Chip>
    </View>
  );
}

export function Actions() {
  const [last, setLast] = useState('nothing yet');
  return (
    <View style={stack}>
      <View style={row}>
        <Chip icon={<Filter />} onPress={() => setLast('Filters')}>
          Filters
        </Chip>
        <Chip icon={<Calendar />} onPress={() => setLast('Add to calendar')}>
          Add to calendar
        </Chip>
      </View>
      <Text variant="footnote" color="secondary">
        Pressed: {last}
      </Text>
    </View>
  );
}

const TAGS = ['Design', 'Mobile', 'Plex'];

export function Removable() {
  const [tags, setTags] = useState(TAGS);
  return (
    <View style={stack}>
      <View style={row}>
        {tags.map((tag) => (
          <Chip key={tag} onRemove={() => setTags((list) => list.filter((item) => item !== tag))} removeLabel={`Remove ${tag}`}>
            {tag}
          </Chip>
        ))}
      </View>
      {tags.length < TAGS.length ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button size="sm" variant="ghost" onPress={() => setTags(TAGS)}>
            Restore tags
          </Button>
        </View>
      ) : null}
    </View>
  );
}

export function Disabled() {
  return (
    <View style={row}>
      <Chip disabled defaultSelected>
        Selected
      </Chip>
      <Chip disabled onSelectedChange={() => {}}>
        Not selected
      </Chip>
      <Chip icon={<Star />} disabled onPress={() => {}}>
        Action
      </Chip>
    </View>
  );
}
