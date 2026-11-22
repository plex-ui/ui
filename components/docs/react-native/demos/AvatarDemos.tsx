import { Avatar, AvatarGroup, Text } from '@plexui/react-native';
import { User } from '@plexui/react-native/icons';
import { useState } from 'react';
import { View } from 'react-native';

const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'center' } as const;
const PHOTO = 'https://gravatar.com/avatar/9531b260b9693f3394bea8646c6ea141ce58fe5a138b7db7729d60a4c5dde552';
const COLORS = ['secondary', 'primary', 'success', 'info', 'discovery', 'danger'] as const;

export function Overview() {
  return (
    <View style={row}>
      <Avatar name="Ada Lovelace" color="info" size={40} />
      <Avatar name="Tyler" imageUrl={PHOTO} size={40} />
      <Avatar Icon={User} color="discovery" size={40} accessibilityLabel="Guest" />
      <Avatar overflowCount={12} size={40} />
    </View>
  );
}

export function Colors() {
  return (
    <View style={{ gap: 10 }}>
      {(['soft', 'solid'] as const).map((variant) => (
        <View key={variant} style={row}>
          {COLORS.map((color) => (
            <Avatar key={color} name={color} color={color} variant={variant} size={40} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function Sizes() {
  return (
    <View style={row}>
      <Avatar name="Grace" color="primary" size={24} />
      <Avatar name="Grace" color="primary" />
      <Avatar name="Grace" color="primary" size={40} />
      <Avatar name="Grace" color="primary" size={56} />
      <Avatar name="Grace" color="primary" size={72} />
    </View>
  );
}

export function AsButton() {
  const [count, setCount] = useState(0);
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Avatar name="Grace Hopper" color="primary" size={56} onPress={() => setCount((n) => n + 1)} />
      <Text variant="footnote" color="secondary">
        Presses: {count}
      </Text>
    </View>
  );
}

export function Group() {
  return (
    <View style={{ gap: 16 }}>
      <AvatarGroup size={36}>
        <Avatar name="Ada" color="info" />
        <Avatar name="Grace" color="success" />
        <Avatar name="Linus" color="discovery" />
        <Avatar overflowCount={4} />
      </AvatarGroup>
      <AvatarGroup>
        <Avatar name="Tyler" imageUrl={PHOTO} />
        <Avatar name="Margaret" color="primary" variant="solid" />
        <Avatar overflowCount={128} />
      </AvatarGroup>
    </View>
  );
}
