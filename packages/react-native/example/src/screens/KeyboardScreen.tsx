import { Input, SystemKeyboard, Text, useTheme } from "@plexui/react-native"
import { StyleSheet, View } from "react-native"
import { Section } from "../demo"

/**
 * The system keyboard drawn on the web: a field of each kind brings up its keyboard (iOS 26 or Gboard), the return key
 * follows the field's `returnKeyType`, and the keyboard goes when the field loses focus
 */
export function KeyboardScreen() {
  const theme = useTheme()
  return (
    <>
      <Section title="Fields" note={theme.isAndroid ? "Gboard for each kind of field" : "The iOS 26 keyboard for each kind of field"}>
        <View style={styles.stack}>
          <Input placeholder="Name" accessibilityLabel="Name" testID="keyboard-field-text" />
          <Input placeholder="Email" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" accessibilityLabel="Email" testID="keyboard-field-email" />
          <Input placeholder="Website" keyboardType="url" autoCapitalize="none" returnKeyType="go" accessibilityLabel="Website" testID="keyboard-field-url" />
          <Input placeholder="Search" keyboardType="web-search" returnKeyType="search" accessibilityLabel="Search" testID="keyboard-field-search" />
          <Input placeholder="Password" secureTextEntry returnKeyType="done" accessibilityLabel="Password" testID="keyboard-field-password" />
          <Input placeholder="Code" keyboardType="number-pad" accessibilityLabel="Code" testID="keyboard-field-number" />
          <Input placeholder="Amount" keyboardType="decimal-pad" accessibilityLabel="Amount" testID="keyboard-field-decimal" />
          <Input placeholder="Phone" keyboardType="phone-pad" accessibilityLabel="Phone" testID="keyboard-field-phone" />
          <Input placeholder="Message" returnKeyType="send" accessibilityLabel="Message" testID="keyboard-field-send" />
          <Input placeholder="Not typed" showSoftInputOnFocus={false} accessibilityLabel="No keyboard" testID="keyboard-field-none" />
          <Text variant="footnote" color="secondary">
            The keys do not type: type with your own keyboard.
          </Text>
        </View>
      </Section>
      <View style={styles.room} />
      <SystemKeyboard />
    </>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  // Room under the fields, for the keyboard to stand over
  room: { height: 360 },
})
