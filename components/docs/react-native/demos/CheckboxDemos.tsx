import { Checkbox } from '@plexui/react-native';
import { useState } from 'react';
import { View } from 'react-native';

const stack = { alignSelf: 'stretch' } as const;

export function Overview() {
  const [accepted, setAccepted] = useState(false);
  return (
    <View style={stack}>
      <Checkbox label="Accept the terms" checked={accepted} onCheckedChange={setAccepted} />
      <Checkbox label="Checked" defaultChecked />
      <Checkbox label="Indeterminate" checked="indeterminate" />
      <Checkbox label="Disabled" disabled />
      <Checkbox label="Disabled checked" disabled defaultChecked />
    </View>
  );
}

const TOPICS = ['Product news', 'Tips and tricks', 'Events'];

export function SelectAll() {
  const [chosen, setChosen] = useState<string[]>(['Tips and tricks']);
  const all = chosen.length === TOPICS.length ? true : chosen.length > 0 ? 'indeterminate' : false;
  const toggle = (topic: string) => (next: boolean) => setChosen((list) => (next ? [...list, topic] : list.filter((item) => item !== topic)));
  return (
    <View style={stack}>
      <Checkbox label="All topics" checked={all} onCheckedChange={(next: boolean) => setChosen(next ? TOPICS : [])} />
      <View style={{ paddingStart: 32 }}>
        {TOPICS.map((topic) => (
          <Checkbox key={topic} label={topic} checked={chosen.includes(topic)} onCheckedChange={toggle(topic)} />
        ))}
      </View>
    </View>
  );
}

export function Descriptions() {
  return (
    <View style={stack}>
      <Checkbox label="Email updates" description="Product news, once a month" defaultChecked />
      <Checkbox label="Usage data" description="Helps improve the app. Nothing personal is shared." />
    </View>
  );
}

export function Invalid() {
  const [agreed, setAgreed] = useState(false);
  return (
    <View style={stack}>
      <Checkbox label="I agree to the terms" invalid={!agreed} checked={agreed} onCheckedChange={setAgreed} />
      <Checkbox label="Invalid and checked" invalid defaultChecked />
    </View>
  );
}

export function Placement() {
  return (
    <View style={stack}>
      <Checkbox label="Box at the end" orientation="right" defaultChecked />
      <Checkbox label="Ghost" variant="ghost" defaultChecked />
      <Checkbox label="Ghost, unchecked" variant="ghost" />
    </View>
  );
}
