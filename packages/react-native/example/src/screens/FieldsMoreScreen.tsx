import { Button, Field, FieldError, FloatingLabelInput, Input, InputGroup, List, Select, Switch, TagInput, Text, Textarea, useTheme, type Tag } from "@plexui/react-native"
import { ArrowTopRightSm, Copy } from "@plexui/react-native/icons"
import { useState } from "react"
import { Section } from "../demo"

const ROLES = [
  { label: "Admin", value: "admin" },
  { label: "Editor", value: "editor" },
  { label: "Viewer", value: "viewer" },
]

/** Field rows, a List's header action and columns, action rows, Textarea, FloatingLabelInput, InputGroup and TagInput. */
export function FieldsMoreScreen() {
  const theme = useTheme()
  const [role, setRole] = useState("editor")
  const [tags, setTags] = useState<Tag[]>([
    { value: "React", valid: true },
    { value: "TypeScript", valid: true },
  ])
  const [pressed, setPressed] = useState("none")
  return (
    <>
      <Section title="Field" note={theme.isAndroid ? "Plex Android rows: the label 13sp over the bare value, 20 in" : "Form cells: the label 15/20 above the value, 13 above and below"}>
        <List footer="We'll never share your email with anyone else." testID="field-rows">
          <Field row label="Name" orientation="vertical">
            <Input placeholder="Required" />
          </Field>
          <Field row label="Email" orientation="vertical" errorMessage="Enter a valid email address.">
            <Input defaultValue="jane@example" inputMode="email" autoCapitalize="none" />
          </Field>
          <Field row hideLabel label="Note">
            <Input placeholder="Note" />
          </Field>
        </List>
        <List
          header="Billing address"
          action={
            <Button color="primary" variant="ghost" size="sm" onPress={() => setPressed("clear")}>
              Clear
            </Button>
          }
          columns
          testID="field-columns"
        >
          <Field row label="Street">
            <Input placeholder="Required" defaultValue="12 Market Street" />
          </Field>
          <Field row label="Role">
            <Select value={role} options={ROLES} onChange={(option) => setRole(option.value)} />
          </Field>
          <Field row label="Alerts">
            <Switch defaultChecked />
          </Field>
        </List>
        <List header="Prominent header" headerProminence="increased">
          <Button block color="info" variant="ghost" onPress={() => setPressed("privacy")} testID="action-row">
            Privacy Policy
            <ArrowTopRightSm />
          </Button>
          <Button block color="danger" variant="ghost" onPress={() => setPressed("delete")}>
            Delete Account
          </Button>
        </List>
        <Text variant="footnote" color="secondary" testID="fields-more-value">
          Pressed: {pressed}
        </Text>
        <Field label="Email" required description="We'll never share your email with anyone else.">
          <Input inputMode="email" autoCapitalize="none" />
        </Field>
        <FieldError>Enter a valid email address.</FieldError>
      </Section>
      <Section title="Textarea" note={theme.isAndroid ? "The outlined field of several lines" : "A 44pt field's frame, lines 11 from the border"}>
        <Textarea placeholder="Add a note" rows={3} />
        <List>
          <Field row label="Notes" orientation="vertical">
            <Textarea variant="ghost" placeholder="Anything the team should know" rows={3} autoResize />
          </Field>
        </List>
      </Section>
      <Section title="Floating label input" note={theme.isAndroid ? "The outlined field, the label floating onto the line" : "A cell named by its placeholder"}>
        <FloatingLabelInput label="Email address" type="email" description="We'll never share your email with anyone else." testID="floating-email" />
        <FloatingLabelInput label="Password" type="password" defaultValue="secret" />
      </Section>
      <Section title="Input group" note="A prefix right before the value, a unit right after it">
        <List columns>
          <Field row label="Website">
            <InputGroup>
              <InputGroup.Input placeholder="acme.com" autoCapitalize="none" />
              <InputGroup.Addon>
                <InputGroup.Text>https://</InputGroup.Text>
              </InputGroup.Addon>
            </InputGroup>
          </Field>
        </List>
        <List>
          <Field row label="Distance">
            <InputGroup>
              <InputGroup.Input defaultValue="5" inputMode="decimal" />
              <InputGroup.Addon align="inline-end">
                <InputGroup.Text>km</InputGroup.Text>
              </InputGroup.Addon>
            </InputGroup>
          </Field>
          <Field row label="Link">
            <InputGroup>
              <InputGroup.Input defaultValue="plexui.com/r/input-group" readOnly />
              <InputGroup.Addon align="inline-end">
                <InputGroup.Button uniform accessibilityLabel="Copy link">
                  <Copy />
                </InputGroup.Button>
              </InputGroup.Addon>
            </InputGroup>
          </Field>
        </List>
        <InputGroup>
          <InputGroup.Input placeholder="0.00" inputMode="decimal" />
          <InputGroup.Addon>
            <InputGroup.Text>$</InputGroup.Text>
          </InputGroup.Addon>
          <InputGroup.Addon align="inline-end">
            <InputGroup.Text>USD</InputGroup.Text>
          </InputGroup.Addon>
        </InputGroup>
      </Section>
      <Section title="Tag input" note={theme.isAndroid ? "32dp chips, 16 round, the text color at 5%" : "32pt gray pills in 44pt lines, 17pt words"}>
        <List>
          <Field row label="Skills" orientation="vertical">
            <TagInput variant="ghost" value={tags} onChange={setTags} placeholder="Add a skill..." accessibilityLabel="Skills" />
          </Field>
        </List>
        <TagInput placeholder="Add a tag..." defaultValue={[{ value: "design", valid: true }]} />
      </Section>
    </>
  )
}
