import { RadioGroup, Text } from '@plexui/react-native';
import { useState } from 'react';
import { View } from 'react-native';

export function Overview() {
  const [plan, setPlan] = useState('monthly');
  return (
    <View style={{ alignSelf: 'stretch', gap: 4 }}>
      <RadioGroup aria-label="Plan" value={plan} onChange={setPlan}>
        <RadioGroup.Item value="monthly">Monthly</RadioGroup.Item>
        <RadioGroup.Item value="yearly">Yearly</RadioGroup.Item>
        <RadioGroup.Item value="lifetime">Lifetime</RadioGroup.Item>
      </RadioGroup>
      <Text variant="footnote" color="secondary">
        Plan: {plan}
      </Text>
    </View>
  );
}

export function Descriptions() {
  return (
    <RadioGroup aria-label="Delivery" defaultValue="standard">
      <RadioGroup.Item value="standard" description="3 to 5 working days, free">
        Standard
      </RadioGroup.Item>
      <RadioGroup.Item value="express" description="Next working day">
        Express
      </RadioGroup.Item>
      <RadioGroup.Item value="pickup" description="Not available in your area" disabled>
        Pick up in store
      </RadioGroup.Item>
    </RadioGroup>
  );
}

export function Row() {
  return (
    <RadioGroup aria-label="Size" defaultValue="m" direction="row">
      <RadioGroup.Item value="s">Small</RadioGroup.Item>
      <RadioGroup.Item value="m">Medium</RadioGroup.Item>
      <RadioGroup.Item value="l">Large</RadioGroup.Item>
    </RadioGroup>
  );
}

export function MarkAtEnd() {
  return (
    <RadioGroup aria-label="Sort by" defaultValue="recent">
      <RadioGroup.Item value="recent" orientation="right">
        Most recent
      </RadioGroup.Item>
      <RadioGroup.Item value="popular" orientation="right">
        Most popular
      </RadioGroup.Item>
    </RadioGroup>
  );
}

export function Disabled() {
  return (
    <RadioGroup aria-label="Theme" defaultValue="system" disabled>
      <RadioGroup.Item value="light">Light</RadioGroup.Item>
      <RadioGroup.Item value="dark">Dark</RadioGroup.Item>
      <RadioGroup.Item value="system">System</RadioGroup.Item>
    </RadioGroup>
  );
}
