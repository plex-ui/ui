import { Checkbox, RadioGroup, Switch, Text, useTheme } from "@plexui/react-native"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Section } from "../demo"

export function ControlsScreen() {
  const theme = useTheme()
  const [wifi, setWifi] = useState(true)
  const [terms, setTerms] = useState<boolean | "indeterminate">(false)
  const [plan, setPlan] = useState("monthly")
  return (
    <>
      <Section title="Switch" note={theme.isAndroid ? "Material 3: 52x32, the thumb 16 off, 24 on, 28 held" : "iOS 26: 63x28, a 37x24 thumb"}>
        <View style={styles.stack}>
          <Switch label="Wi-Fi" checked={wifi} onCheckedChange={setWifi} labelPosition="start" testID="switch-wifi" />
          <Switch label="Off" defaultChecked={false} labelPosition="start" />
          <Switch label="Accent" color="accent" defaultChecked labelPosition="start" />
          <Switch label="Notifications" description="Sounds and badges" defaultChecked labelPosition="start" />
          <Switch label="Disabled on" disabled defaultChecked labelPosition="start" />
          <Switch label="Disabled off" disabled labelPosition="start" />
          <Switch label="Label at the end" defaultChecked />
        </View>
        <Text variant="footnote" color="secondary" testID="switch-value">
          Wi-Fi: {wifi ? "on" : "off"}
        </Text>
      </Section>
      <Section title="Checkbox" note={theme.isAndroid ? "Material 3: an 18dp box in a 48dp target" : "iOS: a 22pt circle, filled when checked"}>
        <View style={styles.stack}>
          <Checkbox label="Accept the terms" checked={terms} onCheckedChange={setTerms} testID="checkbox-terms" />
          <Checkbox label="Checked" defaultChecked />
          <Checkbox label="Indeterminate" checked="indeterminate" />
          <Checkbox label="With a description" description="Shown under the label" defaultChecked />
          <Checkbox label="Invalid" invalid />
          <Checkbox label="Disabled" disabled />
          <Checkbox label="Disabled checked" disabled defaultChecked />
          {theme.isIOS ? <Checkbox label="Ghost (a list row's checkmark)" variant="ghost" defaultChecked /> : null}
        </View>
        <Text variant="footnote" color="secondary" testID="checkbox-value">
          Terms: {String(terms)}
        </Text>
      </Section>
      <Section title="Radio group" note={theme.isAndroid ? "Material 3: a 20dp ring, a 10dp dot" : "iOS: the chosen row's checkmark"}>
        <RadioGroup aria-label="Plan" value={plan} onChange={setPlan} testID="radio-plan">
          <RadioGroup.Item value="monthly" description="Billed every month" testID="radio-monthly">
            Monthly
          </RadioGroup.Item>
          <RadioGroup.Item value="yearly" description="Two months free" testID="radio-yearly">
            Yearly
          </RadioGroup.Item>
          <RadioGroup.Item value="lifetime" disabled>
            Lifetime
          </RadioGroup.Item>
        </RadioGroup>
        <Text variant="footnote" color="secondary" testID="radio-value">
          Plan: {plan}
        </Text>
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  stack: { alignSelf: "stretch" },
})
