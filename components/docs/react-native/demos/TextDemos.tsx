import { Heading, Text } from '@plexui/react-native';
import { View } from 'react-native';

const VARIANTS = ['largeTitle', 'title1', 'title2', 'title3', 'headline', 'body', 'callout', 'subheadline', 'footnote', 'caption1', 'caption2'] as const;
const SIZES = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg'] as const;
const HEADINGS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'] as const;
const COLORS = ['primary', 'secondary', 'tertiary', 'disabled', 'accent', 'danger', 'success', 'warning', 'caution', 'info', 'discovery'] as const;

export function Overview() {
  return (
    <View style={{ gap: 4 }}>
      <Text variant="largeTitle" weight="bold">
        Trips
      </Text>
      <Text variant="headline">Lisbon in May</Text>
      <Text>Five days by the river, with a day trip to Sintra and the coast.</Text>
      <Text variant="footnote" color="secondary">
        Updated 2 hours ago
      </Text>
    </View>
  );
}

export function Variants() {
  return (
    <View style={{ gap: 2 }}>
      {VARIANTS.map((variant) => (
        <Text key={variant} variant={variant} numberOfLines={1}>
          {variant}
        </Text>
      ))}
    </View>
  );
}

export function Sizes() {
  return (
    <View style={{ gap: 4 }}>
      {SIZES.map((size) => (
        <Text key={size} size={size}>
          Text {size}
        </Text>
      ))}
    </View>
  );
}

export function Headings() {
  return (
    <View style={{ gap: 4 }}>
      {HEADINGS.map((size) => (
        <Heading key={size} size={size} numberOfLines={1}>
          Size {size}
        </Heading>
      ))}
    </View>
  );
}

export function Weights() {
  return (
    <View style={{ gap: 4 }}>
      <Text weight="regular">Regular</Text>
      <Text weight="medium">Medium</Text>
      <Text weight="semibold">Semibold</Text>
      <Text weight="bold">Bold</Text>
    </View>
  );
}

export function Colors() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
      {COLORS.map((color) => (
        <Text key={color} color={color}>
          {color}
        </Text>
      ))}
    </View>
  );
}

export function Figures() {
  return (
    <View style={{ gap: 4 }}>
      <Text mono>const answer = 42</Text>
      <Text tabularNums>1,111.11 / 8,888.88</Text>
      <Text>1,111.11 / 8,888.88</Text>
    </View>
  );
}
