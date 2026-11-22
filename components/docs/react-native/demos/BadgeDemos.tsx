import { Badge, Button } from '@plexui/react-native';
import { CheckCircle, Sparkles, Star } from '@plexui/react-native/icons';
import { useState } from 'react';
import { View } from 'react-native';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'center' } as const;
const COLORS = ['secondary', 'success', 'warning', 'danger', 'info', 'discovery', 'caution'] as const;
const TAGS = ['Design', 'Mobile', 'Plex'];

export function Overview() {
  return (
    <View style={row}>
      <Badge>Draft</Badge>
      <Badge color="success">Paid</Badge>
      <Badge color="warning">Pending</Badge>
      <Badge color="danger">Overdue</Badge>
      <Badge color="info" variant="solid">
        New
      </Badge>
    </View>
  );
}

export function Variants() {
  return (
    <View style={{ gap: 14 }}>
      {(['soft', 'solid', 'outline'] as const).map((variant) => (
        <View key={variant} style={row}>
          {COLORS.map((color) => (
            <Badge key={color} color={color} variant={variant}>
              {color}
            </Badge>
          ))}
        </View>
      ))}
    </View>
  );
}

export function Sizes() {
  return (
    <View style={{ gap: 8 }}>
      <View style={row}>
        <Badge size="sm">Small</Badge>
        <Badge size="md">Medium</Badge>
        <Badge size="lg">Large</Badge>
        <Badge size="xl">Extra large</Badge>
      </View>
      <View style={row}>
        <Badge size="sm" pill color="info">
          Small
        </Badge>
        <Badge size="md" pill color="info">
          Medium
        </Badge>
        <Badge size="lg" pill color="info">
          Large
        </Badge>
        <Badge size="xl" pill color="info">
          Extra large
        </Badge>
      </View>
    </View>
  );
}

export function Icons() {
  return (
    <View style={row}>
      <Badge color="success">
        <CheckCircle />
        Verified
      </Badge>
      <Badge color="discovery" pill>
        <Sparkles />
        New feature
      </Badge>
      <Badge color="caution" variant="solid" size="md">
        <Star />
        4.9
      </Badge>
    </View>
  );
}

export function Removable() {
  const [tags, setTags] = useState(TAGS);
  return (
    <View style={row}>
      {tags.map((tag) => (
        <Badge key={tag} size="lg" pill onRemove={() => setTags((list) => list.filter((item) => item !== tag))} removeLabel={`Remove ${tag}`}>
          {tag}
        </Badge>
      ))}
      {tags.length === 0 ? (
        <Button size="sm" variant="soft" onPress={() => setTags(TAGS)}>
          Reset
        </Button>
      ) : null}
    </View>
  );
}
