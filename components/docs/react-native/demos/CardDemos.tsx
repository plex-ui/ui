import { Button, Card, IconButton, Text } from '@plexui/react-native';
import { DotsHorizontal } from '@plexui/react-native/icons';
import { useState } from 'react';

const HILLS = { uri: 'https://picsum.photos/id/1018/800/600' };
const FJORD = { uri: 'https://picsum.photos/id/1015/800/400' };

export function Overview() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Weekly summary</Card.Title>
        <Card.Description>12 new places this week.</Card.Description>
        <Card.Action>
          <IconButton icon={<DotsHorizontal />} size="sm" accessibilityLabel="More" />
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <Text variant="subheadline">You saved 4 of them and visited 2. Your favorite was the market on the river.</Text>
      </Card.Content>
      <Card.Footer>
        <Button size="sm">Open</Button>
        <Button size="sm" variant="soft">
          Later
        </Button>
      </Card.Footer>
    </Card>
  );
}

export function Variants() {
  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title>Outline</Card.Title>
          <Card.Description>The default: a grouped section on iOS, an outlined card on Android.</Card.Description>
        </Card.Header>
      </Card>
      <Card variant="solid">
        <Card.Header>
          <Card.Title>Solid</Card.Title>
          <Card.Description>A gray fill that stands apart from list sections.</Card.Description>
        </Card.Header>
      </Card>
      <Card variant="ghost">
        <Card.Header>
          <Card.Title>Ghost</Card.Title>
          <Card.Description>No fill: only the padding and the layout.</Card.Description>
        </Card.Header>
      </Card>
    </>
  );
}

export function Sizes() {
  return (
    <>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Card key={size} size={size}>
          <Card.Header>
            <Card.Title>Size {size}</Card.Title>
            <Card.Description>The padding grows with the size.</Card.Description>
          </Card.Header>
        </Card>
      ))}
    </>
  );
}

export function Media() {
  return (
    <>
      <Card>
        <Card.Media source={HILLS} aspectRatio={4 / 3} accessibilityLabel="A road winding through green hills" title="A road through the hills" description="A caption over the picture" />
      </Card>
      <Card>
        <Card.Media source={FJORD} aspectRatio={2} />
        <Card.Header>
          <Card.Title>Picture on top</Card.Title>
          <Card.Description>The picture reaches the card&apos;s edges.</Card.Description>
        </Card.Header>
      </Card>
    </>
  );
}

export function AsButton() {
  const [count, setCount] = useState(0);
  return (
    <Card onPress={() => setCount((n) => n + 1)} accessibilityLabel="Storage">
      <Card.Header>
        <Card.Title>Storage</Card.Title>
        <Card.Description>The whole card is one button. Presses: {count}</Card.Description>
      </Card.Header>
    </Card>
  );
}
