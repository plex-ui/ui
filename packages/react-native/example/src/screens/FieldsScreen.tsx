import { Input, Select, Text, TextField, useTheme } from "@plexui/react-native"
import { Search } from "@plexui/react-native/icons"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Section } from "../demo"

const FRUITS = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana", description: "Ripe this week" },
  { value: "cherry", label: "Cherry" },
  { value: "durian", label: "Durian", disabled: true },
]

export function FieldsScreen() {
  const theme = useTheme()
  const [query, setQuery] = useState("Coffee")
  const [email, setEmail] = useState("hello@")
  const [fruit, setFruit] = useState<string | null>("banana")
  return (
    <>
      <Section title="Input" note={theme.isAndroid ? "Material 3 text fields: outlined and filled, 56dp" : "iOS 26: 44pt fields in 17pt type"}>
        <View style={styles.stack}>
          <Input placeholder="Outline" />
          <Input variant="soft" placeholder="Soft" />
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
          <Input pill placeholder="Pill" />
          <Input placeholder="Invalid" invalid />
          <Input placeholder="Disabled" disabled />
        </View>
      </Section>
      <Section title="Text field" note={theme.isAndroid ? "A floating label and supporting text" : "The label over the field, help under it"}>
        <View style={styles.stack}>
          <TextField label="Name" placeholder="Jane Appleseed" description="As on your card" />
          <TextField label="Email" value={email} onChangeText={setEmail} errorMessage={email.includes(".") ? undefined : "Enter a full address"} required testID="field-email" />
          <TextField label="Notes" variant="soft" defaultValue="Filled" />
          <TextField label="Disabled" disabled defaultValue="Read only" />
        </View>
      </Section>
      <Section title="Select" note={theme.isAndroid ? "An exposed dropdown menu" : "A pop-up field and its menu"}>
        <View style={styles.stack}>
          <Select aria-label="Fruit" options={FRUITS} value={fruit} onChange={(option) => setFruit(option.value)} testID="select-fruit" />
          <Select aria-label="Empty" options={FRUITS} value={null} onChange={() => {}} placeholder="Choose a fruit" variant="soft" />
          <Select aria-label="Disabled" options={FRUITS} value="apple" onChange={() => {}} disabled />
        </View>
        <Text variant="footnote" color="secondary" testID="select-value">
          Fruit: {fruit ?? "none"}
        </Text>
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  stack: { alignSelf: "stretch", gap: 12 },
})
