import { Input, OTPInput, Select, Text, TextField, useTheme } from "@plexui/react-native"
import { Search } from "@plexui/react-native/icons"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Section } from "../demo"

const COUNTRIES = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom", description: "Prices in pounds" },
  { value: "de", label: "Germany" },
  { value: "jp", label: "Japan", description: "Coming soon", disabled: true },
]

export function FieldsScreen() {
  const theme = useTheme()
  const [query, setQuery] = useState("Coffee")
  const [email, setEmail] = useState("hello@")
  const [country, setCountry] = useState<string | null>("gb")
  const [code, setCode] = useState("4880")
  return (
    <>
      <Section title="Input" note={theme.isAndroid ? "Android's outlined field: 50dp, 8dp corners, the accent on focus; search its 40dp pill" : "iOS 26: 44pt fields in 17pt type"}>
        <View style={styles.stack}>
          <Input placeholder="Full name" />
          <Input variant="soft" placeholder="Promo code" />
          <Input
            variant="soft"
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery("")}
            startAdornment={<Search />}
            placeholder="Search"
            testID="input-search"
            accessibilityLabel="Search"
          />
          <Input pill placeholder="Message" />
          <Input placeholder="Phone number" defaultValue="+1 415 55" invalid />
          <Input placeholder="Company ID" disabled />
        </View>
      </Section>
      <Section title="Text field" note={theme.isAndroid ? "A floating label and supporting text" : "The label over the field, help under it"}>
        <View style={styles.stack}>
          <TextField label="Name" placeholder="Jane Appleseed" description="As on your card" />
          <TextField label="Email" value={email} onChangeText={setEmail} errorMessage={email.includes(".") ? undefined : "Enter a full address"} required testID="field-email" />
          <TextField label="Display name" variant="soft" defaultValue="Anna Kim" />
          <TextField label="Employee ID" disabled defaultValue="48291" description="Managed by your organization" />
        </View>
      </Section>
      <Section title="OTP input" note={theme.isAndroid ? "Outlined code boxes: 4dp corners, the accent on focus" : "The web's phone cells: 44 by 52pt capsules"}>
        <View style={styles.stack}>
          <OTPInput value={code} onChange={setCode} testID="otp-code" />
          <OTPInput value="488030" grouping={[3, 3]} invalid errorMessage="Invalid verification code." />
        </View>
      </Section>
      <Section title="Select" note={theme.isAndroid ? "Android's single-choice dialog: radio rows, one Cancel" : "A pop-up field and its menu"}>
        <View style={styles.stack}>
          <Select aria-label="Country or region" options={COUNTRIES} value={country} onChange={(option) => setCountry(option.value)} testID="select-country" />
          <Select aria-label="Shipping country" options={COUNTRIES} value={null} onChange={() => {}} placeholder="Choose a country" variant="soft" />
          <Select aria-label="Account region" options={COUNTRIES} value="us" onChange={() => {}} disabled />
        </View>
        <Text variant="footnote" color="secondary" testID="select-value">
          Country or region: {COUNTRIES.find((option) => option.value === country)?.label ?? "none"}
        </Text>
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  stack: { alignSelf: "stretch", gap: 12 },
})
