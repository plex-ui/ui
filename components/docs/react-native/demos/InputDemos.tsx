import { IconButton, Input, Text, TextField } from '@plexui/react-native';
import { Eye, EyeOff, Search } from '@plexui/react-native/icons';
import { useState } from 'react';
import { View } from 'react-native';

const stack = { alignSelf: 'stretch', gap: 12 } as const;

export function Overview() {
  return (
    <View style={stack}>
      <Input placeholder="Outline" accessibilityLabel="Outline" />
      <Input variant="soft" placeholder="Soft" accessibilityLabel="Soft" />
      <Input variant="ghost" placeholder="Ghost" accessibilityLabel="Ghost" />
    </View>
  );
}

export function Adornments() {
  const [query, setQuery] = useState('Coffee');
  return (
    <View style={stack}>
      <Input
        variant="soft"
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
        startAdornment={<Search />}
        placeholder="Search"
        accessibilityLabel="Search"
      />
      <Input placeholder="0.00" keyboardType="decimal-pad" endAdornment={<Text color="secondary">USD</Text>} accessibilityLabel="Amount" />
    </View>
  );
}

export function Pill() {
  return (
    <View style={stack}>
      <Input pill placeholder="Outline pill" accessibilityLabel="Outline pill" />
      <Input pill variant="soft" startAdornment={<Search />} placeholder="Search" accessibilityLabel="Search" />
    </View>
  );
}

export function States() {
  return (
    <View style={stack}>
      <Input defaultValue="hello@" invalid accessibilityLabel="Invalid" />
      <Input defaultValue="Can't be edited" disabled accessibilityLabel="Disabled" />
    </View>
  );
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function Field() {
  const [email, setEmail] = useState('hello@');
  return (
    <View style={stack}>
      <TextField label="Name" placeholder="Jane Appleseed" description="As on your card" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        errorMessage={EMAIL.test(email) ? undefined : 'Enter a full address'}
        required
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </View>
  );
}

export function FieldVariants() {
  return (
    <View style={stack}>
      <TextField label="Notes" variant="soft" defaultValue="Leave at the door" />
      <TextField label="Account" disabled defaultValue="jane@example.com" />
    </View>
  );
}

export function Password() {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label="Password"
      secureTextEntry={!visible}
      autoCapitalize="none"
      description="At least 8 characters"
      endAdornment={
        <IconButton
          icon={visible ? <EyeOff /> : <Eye />}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((value) => !value)}
        />
      }
    />
  );
}
