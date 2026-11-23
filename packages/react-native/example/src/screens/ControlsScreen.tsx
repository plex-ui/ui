import { Checkbox, RadioGroup, Switch, Text, ThemeProvider, useTheme } from "@plexui/react-native"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Section } from "../demo"

export function ControlsScreen() {
  const theme = useTheme()
  const [wifi, setWifi] = useState(true)
  const [newsletter, setNewsletter] = useState<boolean | "indeterminate">(false)
  const [plan, setPlan] = useState("monthly")
  return (
    <>
      <Section title="Switch" note={theme.isAndroid ? "Android: a 31x14 track, the knob the card's color" : "iOS 26: 63x28, a 37x24 thumb"}>
        <View style={styles.stack}>
          <Switch label="Wi-Fi" checked={wifi} onCheckedChange={setWifi} labelPosition="start" testID="switch-wifi" />
          <Switch label="Bluetooth" defaultChecked={false} labelPosition="start" />
          <Switch label="Low Power Mode" color="accent" defaultChecked labelPosition="start" />
          <Switch label="Notifications" description="Sounds and badges" defaultChecked labelPosition="start" />
          <Switch label="VPN" description="Managed by your organization" disabled defaultChecked labelPosition="start" />
          <Switch label="Personal Hotspot" description="Not included in your plan" disabled labelPosition="start" />
          <Switch label="Share my location" defaultChecked />
        </View>
        <Text variant="footnote" color="secondary" testID="switch-value">
          Wi-Fi: {wifi ? "on" : "off"}
        </Text>
      </Section>
      <Section title="Checkbox" note={theme.isAndroid ? "Android: an 18dp square box, 4dp corners" : "iOS: a 22pt circle, filled when checked"}>
        <View style={styles.stack}>
          <Checkbox label="Subscribe to the newsletter" checked={newsletter} onCheckedChange={setNewsletter} testID="checkbox-newsletter" />
          <Checkbox label="Remember me" defaultChecked />
          <Checkbox label="Select all" checked="indeterminate" />
          <Checkbox label="Back up photos" description="Over Wi-Fi only" defaultChecked />
          <Checkbox label="Accept the terms" invalid />
          <Checkbox label="Use Face ID" description="Not set up on this device" disabled />
          <Checkbox label="Strictly necessary cookies" disabled defaultChecked />
          {theme.isIOS ? <Checkbox label="Show previews" variant="ghost" defaultChecked /> : null}
        </View>
        <Text variant="footnote" color="secondary" testID="checkbox-value">
          Newsletter: {String(newsletter)}
        </Text>
      </Section>
      <Section title="Radio group" note={theme.isAndroid ? "Android: a 20dp ring, a 10dp dot" : "iOS: the chosen row's checkmark"}>
        <RadioGroup aria-label="Plan" value={plan} onChange={setPlan} testID="radio-plan">
          <RadioGroup.Item value="monthly" description="$4.99 a month" testID="radio-monthly">
            Monthly
          </RadioGroup.Item>
          <RadioGroup.Item value="yearly" description="$49.99 a year, two months free" testID="radio-yearly">
            Yearly
          </RadioGroup.Item>
          <RadioGroup.Item value="lifetime" description="Not available in your region" disabled>
            Lifetime
          </RadioGroup.Item>
        </RadioGroup>
        <Text variant="footnote" color="secondary" testID="radio-value">
          Plan: {plan}
        </Text>
      </Section>
      {/* The on color an app sets once on its ThemeProvider; without it the controls take the Plex primary */}
      <ThemeProvider selectionColor="accent">
        <Section title="Accent selection" note={'selectionColor="accent" on ThemeProvider'}>
          <View style={styles.stack}>
            <Switch label="Auto-lock" defaultChecked labelPosition="start" />
            <Checkbox label="Send read receipts" defaultChecked />
          </View>
          <RadioGroup aria-label="Theme" defaultValue="dark">
            <RadioGroup.Item value="light">Light</RadioGroup.Item>
            <RadioGroup.Item value="dark">Dark</RadioGroup.Item>
          </RadioGroup>
        </Section>
      </ThemeProvider>
    </>
  )
}

const styles = StyleSheet.create({
  stack: { alignSelf: "stretch" },
})
