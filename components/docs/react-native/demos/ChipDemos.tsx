import { useState } from 'react';
import { Chip, Input, List, ListItem, Menu, NavigationButton, Text, Toolbar, useTheme } from '@plexui/react-native';
import { AvatarProfile, Filter, SearchSm, Star } from '@plexui/react-native/icons';
import { ScrollView, View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

const APPEARANCES = ['glass', 'tag'] as const;

// The places a search for breakfast finds, as Maps lists them under its filters
const PLACES = [
  { name: 'Portobello Horno', kind: 'Cafe', distance: 700, open: 'Open till 21:00', openNow: true, rating: 4.5 },
  { name: 'Del Mundo Bistro', kind: 'Brunch restaurant', distance: 100, open: 'Open till 23:30', openNow: true, rating: 4.0 },
  { name: 'Soho Café', kind: 'Coffee shop', distance: 100, open: 'Closed', openNow: false, rating: 4.2 },
  { name: 'Milk and Butter', kind: 'Brunch restaurant', distance: 2100, open: 'Open till 15:00', openNow: true, rating: 4.6 },
  { name: 'Pasteleria La Moderna', kind: 'Dessert shop', distance: 150, open: 'Closed', openNow: false, rating: 4.4 },
];
const FILTERS = [
  { value: 'rated', label: 'Top Rated' },
  { value: 'open', label: 'Open Now' },
] as const;
const SORTS = [
  { value: 'match', label: 'Best Match' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Ratings' },
] as const;

const meters = (distance: number) => (distance < 1000 ? `${distance} m` : `${(distance / 1000).toFixed(1)} km`);

/** Maps' search bar: the field and Close, in the bar over the grouped screen (the theme read inside the screen) */
function SearchBar({ query, onQueryChange }: { query: string; onQueryChange: (query: string) => void }) {
  const theme = useTheme();
  return (
    <Toolbar background="soft" canvasColor={theme.colors.groupedBackground}>
      <Toolbar.Content fill>
        <Input
          variant="soft"
          pill
          inputMode="search"
          returnKeyType="search"
          placeholder="Search Maps"
          accessibilityLabel="Search places"
          startAdornment={<SearchSm />}
          value={query}
          onChangeText={onQueryChange}
          onClear={() => onQueryChange('')}
        />
      </Toolbar.Content>
      <Toolbar.Trailing>
        <NavigationButton action="close" accessibilityLabel="Close search" />
      </Toolbar.Trailing>
    </Toolbar>
  );
}

/**
 * A search's filters, as in iOS 26 Maps: under the search field a row of glass chips over the results, the filter
 * button first. Top Rated and Open Now are filter chips that move to the start of the row once on; Sort by is a menu
 * chip that shows the chosen order. On iOS `appearance` turns the row's glass to the gray tags; `icon` puts a symbol
 * before the filters' labels and `disabled` dims them.
 */
export const Overview = docsDemo(function Overview() {
  const ios = useNativePlatform() !== 'android';
  const [appearance, setAppearance] = useState<(typeof APPEARANCES)[number]>('glass');
  const [icon, setIcon] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [query, setQuery] = useState('Breakfast');
  const [on, setOn] = useState<string[]>([]);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('match');
  const sortLabel = SORTS.find((option) => option.value === sort)?.label ?? 'Best Match';
  // Maps moves a filter that is on to the start of the row, in the order they were turned on
  const filters = [...on.map((value) => FILTERS.find((filter) => filter.value === value)!), ...FILTERS.filter((filter) => !on.includes(filter.value))];
  const places = PLACES.filter((place) => (!on.includes('open') || place.openNow) && (!on.includes('rated') || place.rating >= 4.5)).sort((a, b) =>
    sort === 'distance' ? a.distance - b.distance : sort === 'rating' ? b.rating - a.rating : 0,
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {ios && <Segments name="appearance" options={APPEARANCES} value={appearance} onChange={setAppearance} />}
        <DemoControlBoolean name="icon" value={icon} onChange={setIcon} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen screen grouped minHeight={520}>
        <View style={{ flex: 1 }}>
          <SearchBar query={query} onQueryChange={setQuery} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
            <Chip appearance={appearance} icon={<Filter />} accessibilityLabel="Filters" disabled={disabled} onPress={() => {}} />
            {filters.map((filter) => (
              <Chip
                key={filter.value}
                appearance={appearance}
                icon={icon ? <Star /> : undefined}
                disabled={disabled}
                selected={on.includes(filter.value)}
                onSelectedChange={(next: boolean) => setOn((list) => (next ? [...list, filter.value] : list.filter((value) => value !== filter.value)))}
              >
                {filter.label}
              </Chip>
            ))}
            <Menu open={sortOpen} onOpenChange={setSortOpen}>
              <Menu.Trigger>
                <Chip appearance={appearance} menu expanded={sortOpen} disabled={disabled} accessibilityLabel={`Sort by, ${sortLabel}`}>
                  {`Sort by ${sortLabel}`}
                </Chip>
              </Menu.Trigger>
              <Menu.Content aria-label="Sort by">
                {SORTS.map((option) => (
                  <Menu.Item key={option.value} checked={option.value === sort} onSelect={() => setSort(option.value)}>
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu>
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
            <List>
              {places.map((place) => (
                <ListItem
                  key={place.name}
                  label={place.name}
                  description={`${place.kind} · ${meters(place.distance)}\n${place.open} · ★ ${place.rating.toFixed(1)}`}
                />
              ))}
            </List>
          </ScrollView>
        </View>
      </RNScreen>
    </>
  );
});

const PRICES = ['$', '$$', '$$$'];
const AMENITIES = ['Contactless payments', 'Credit cards', 'Good for groups', 'Wi-Fi', 'Good for kids', 'Reservations', 'Outdoor seating'];

/** A wrapping row of chips, 8 apart both ways, inside a card's 16pt padding */
const cloud = { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 } as const;

/**
 * The Filters sheet of the same search: the gray `tag` chips of iOS in grouped cards, a price and the amenities,
 * many on at once, each in the accent while on.
 */
export const Filters = docsDemo(function Filters() {
  const [prices, setPrices] = useState<string[]>(['$$']);
  const [amenities, setAmenities] = useState<string[]>(['Good for groups']);
  const toggle = (set: typeof setPrices, value: string) => (next: boolean) =>
    set((list) => (next ? [...list, value] : list.filter((item) => item !== value)));
  return (
    <RNScreen grouped minHeight={520}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 24 }}>
        <List header="Prices">
          <View style={cloud}>
            {PRICES.map((price) => (
              <Chip key={price} appearance="tag" selected={prices.includes(price)} onSelectedChange={toggle(setPrices, price)}>
                {price}
              </Chip>
            ))}
          </View>
        </List>
        <List header="Amenities">
          <View style={cloud}>
            {AMENITIES.map((amenity) => (
              <Chip key={amenity} appearance="tag" selected={amenities.includes(amenity)} onSelectedChange={toggle(setAmenities, amenity)}>
                {amenity}
              </Chip>
            ))}
          </View>
        </List>
      </ScrollView>
    </RNScreen>
  );
});

const RECIPIENTS = [
  { value: 'anna', label: 'Anna Kim' },
  { value: 'ben', label: 'Ben Carter' },
  { value: 'maya', label: 'Maya Patel' },
];

/**
 * Input chips, the recipients of a message: `onRemove` puts a cross after the label, a button of its own named by
 * `removeLabel`, that takes the recipient back.
 */
export function Removable() {
  const [shown, setShown] = useState(RECIPIENTS.map((recipient) => recipient.value));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Text size="md" color="secondary">
        To:
      </Text>
      {RECIPIENTS.filter((recipient) => shown.includes(recipient.value)).map((recipient) => (
        <Chip
          key={recipient.value}
          icon={<AvatarProfile />}
          onRemove={() => setShown((list) => list.filter((value) => value !== recipient.value))}
          removeLabel={`Remove ${recipient.label}`}
        >
          {recipient.label}
        </Chip>
      ))}
      {shown.length < RECIPIENTS.length && (
        <Chip onPress={() => setShown(RECIPIENTS.map((recipient) => recipient.value))}>Add back</Chip>
      )}
    </View>
  );
}

/**
 * Disabled chips keep their state, as the React Toggle Group page's Disabled example keeps its items: Email stays on,
 * as account emails cannot be turned off, and SMS stays off until there is a phone number.
 */
export function Disabled() {
  return (
    <View style={{ alignItems: 'flex-start', gap: 12 }}>
      <Text size="md">Notify me by</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8 }}>
        <Chip disabled defaultSelected>
          Email
        </Chip>
        <Chip defaultSelected>Push</Chip>
        <Chip disabled defaultSelected={false}>
          SMS
        </Chip>
      </View>
      <Text size="sm" color="secondary">
        Account emails are always on. Add a phone number to get SMS.
      </Text>
    </View>
  );
}
