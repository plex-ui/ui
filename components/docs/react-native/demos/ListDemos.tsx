import { Badge, List, ListItem, Switch, useTheme } from '@plexui/react-native';
import { Bell, Globe, LockKeyHole, Moon } from '@plexui/react-native/icons';
import { useState } from 'react';

export function Overview() {
  const [opened, setOpened] = useState('nothing');
  const [airplane, setAirplane] = useState(false);
  return (
    <List footer={`Last opened: ${opened}`}>
      <ListItem label="Wi-Fi" value="Home" onPress={() => setOpened('Wi-Fi')} />
      <ListItem label="Bluetooth" value="On" onPress={() => setOpened('Bluetooth')} />
      <ListItem label="Airplane mode" trailing={<Switch checked={airplane} onCheckedChange={setAirplane} accessibilityLabel="Airplane mode" />} />
    </List>
  );
}

export function HeaderFooter() {
  return (
    <List header="Account" footer="Your name and photo show on everything you share.">
      <ListItem label="Name" value="Ada Lovelace" />
      <ListItem label="Email" value="ada@example.com" />
    </List>
  );
}

export function Leading() {
  const theme = useTheme();
  const [dark, setDark] = useState(false);
  return (
    <List header="General">
      <ListItem label="Notifications" leading={<Bell />} leadingColor={theme.color('--color-background-danger-solid')} value="On" onPress={() => {}} />
      <ListItem label="Language" leading={<Globe />} leadingColor={theme.color('--color-background-info-solid')} value="English" onPress={() => {}} />
      <ListItem
        label="Dark mode"
        leading={<Moon />}
        leadingColor={theme.color('--color-background-discovery-solid')}
        trailing={<Switch checked={dark} onCheckedChange={setDark} accessibilityLabel="Dark mode" />}
      />
      <ListItem label="Privacy" leading={<LockKeyHole />} leadingColor={theme.color('--color-background-success-solid')} onPress={() => {}} />
    </List>
  );
}

export function Descriptions() {
  const [backup, setBackup] = useState(true);
  return (
    <List>
      <ListItem
        label="Back up photos"
        description="Over Wi-Fi only, while charging"
        trailing={<Switch checked={backup} onCheckedChange={setBackup} accessibilityLabel="Back up photos" />}
      />
      <ListItem label="Privacy" description="Who can see your profile" onPress={() => {}} />
      <ListItem label="Beta features" trailing={<Badge color="info">New</Badge>} onPress={() => {}} />
    </List>
  );
}

export function States() {
  return (
    <>
      <List>
        <ListItem label="Storage" value="12 GB free" onPress={() => {}} />
        <ListItem label="Transfer to a new phone" value="Unavailable" disabled onPress={() => {}} />
      </List>
      <List>
        <ListItem label="Sign out" destructive disclosure={false} onPress={() => {}} />
      </List>
    </>
  );
}

export function Plain() {
  return (
    <List surface="plain" header="Recent">
      <ListItem label="Budget 2026" value="Today" onPress={() => {}} />
      <ListItem label="Trip to Lisbon" value="Yesterday" onPress={() => {}} />
    </List>
  );
}
