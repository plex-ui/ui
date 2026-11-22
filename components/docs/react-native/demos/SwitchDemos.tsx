import { List, ListItem, Switch } from '@plexui/react-native';
import { useState } from 'react';
import { View } from 'react-native';

export function Overview() {
  const [on, setOn] = useState(true);
  return (
    <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
      <Switch checked={on} onCheckedChange={setOn} accessibilityLabel="Notifications" />
      <Switch accessibilityLabel="Weekly summary" />
      <Switch defaultChecked disabled accessibilityLabel="Locked on" />
      <Switch disabled accessibilityLabel="Locked off" />
    </View>
  );
}

export function Settings() {
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  return (
    <View style={{ alignSelf: 'stretch' }}>
      <List>
        <ListItem label="Wi-Fi" trailing={<Switch checked={wifi} onCheckedChange={setWifi} accessibilityLabel="Wi-Fi" />} />
        <ListItem label="Bluetooth" description="Find nearby devices" trailing={<Switch checked={bluetooth} onCheckedChange={setBluetooth} accessibilityLabel="Bluetooth" />} />
      </List>
    </View>
  );
}
