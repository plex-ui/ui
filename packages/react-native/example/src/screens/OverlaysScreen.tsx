import { ActionSheet, Avatar, BottomSheet, Button, Dialog, Input, Menu, Text, toast, useTheme } from "@plexui/react-native"
import { Copy, Download, Email, Link, Pencil, RemoveTrash, Share } from "@plexui/react-native/icons"
import { useContext, useEffect, useRef, useState, type ComponentRef } from "react"
import { StyleSheet, View } from "react-native"
import { Labeled, Row, Section } from "../demo"
import { LinkContext, type Settings } from "../settings"

/** Recent contacts of the share sheet. */
const CONTACTS = [
  { name: "Anna Kim", color: "info" },
  { name: "Liam Chen", color: "success" },
  { name: "Sofia Martinez", color: "discovery" },
  { name: "Noah Williams", color: "primary" },
] as const

export function OverlaysScreen() {
  const theme = useTheme()
  const [dialog, setDialog] = useState<"two" | "three" | "field" | "message" | null>(null)
  const [sheet, setSheet] = useState(false)
  const [actions, setActions] = useState(false)
  // An action sheet from its button: on iOS 26 a glass panel at the button, no Cancel
  const [sourced, setSourced] = useState(false)
  const deleteButton = useRef<ComponentRef<typeof View>>(null)
  const [last, setLast] = useState("nothing yet")
  const [menu, setMenu] = useState(false)
  // A share target runs and closes the sheet
  const share = (target: string) => () => {
    setLast(target)
    setSheet(false)
  }
  // A link opens an overlay by name (`open=dialog`), so a device can be checked without a finger
  const link = useContext(LinkContext)
  const [seen, setSeen] = useState<Settings | null>(null)
  if (link !== seen) {
    setSeen(link)
    const open = link?.open
    if (open) {
      setDialog(open === "dialog" ? "two" : open === "dialog-three" ? "three" : open === "dialog-field" ? "field" : open === "dialog-message" ? "message" : null)
      setSheet(open === "sheet")
      setActions(open === "actions")
      setMenu(open === "menu")
    }
  }
  useEffect(() => {
    if (link?.open === "toast") toast("Saved to Photos")
    if (link?.open === "toast-success") toast.success("Payment sent", { description: "$24.00 to Jane" })
    if (link?.open === "toast-action") toast("Message deleted", { action: { label: "Undo", onClick: () => setLast("Undo") } })
    if (link?.open === "toast-close") toast("Connection lost", { action: { label: "Retry", onClick: () => setLast("Retry") }, closeButton: true, duration: Infinity })
  }, [link])
  return (
    <>
      <Section title="Dialog" note={theme.isAndroid ? "Android alert: 21dp corners, text buttons in the accent" : "iOS 26 alert: glass, 320 wide, capsule actions"}>
        <Row>
          <Button color="secondary" variant="soft" onPress={() => setDialog("two")} testID="open-dialog">
            Two actions
          </Button>
          <Button color="secondary" variant="soft" onPress={() => setDialog("three")} testID="open-dialog-three">
            Three actions
          </Button>
          <Button color="secondary" variant="soft" onPress={() => setDialog("field")} testID="open-dialog-field">
            With a field
          </Button>
          <Button color="secondary" variant="soft" onPress={() => setDialog("message")} testID="open-dialog-message">
            Message only
          </Button>
        </Row>
      </Section>
      <Section title="Sheets" note={theme.isAndroid ? "Android sheets: 35dp corners, close 12 in" : "iOS 26 sheet and action sheet"}>
        <Row>
          <Button color="secondary" variant="soft" onPress={() => setSheet(true)} testID="open-sheet">
            Bottom sheet
          </Button>
          <Button color="secondary" variant="soft" onPress={() => setActions(true)} testID="open-actions">
            Action sheet
          </Button>
        </Row>
        <Row>
          <Button ref={deleteButton} color="danger" variant="soft" onPress={() => setSourced(true)} testID="open-sourced">
            Delete draft
          </Button>
        </Row>
      </Section>
      <Section title="Menu" note={theme.isAndroid ? "Android: a popup over its trigger, unrolling row by row" : "iOS 26 glass menu, 250 wide"}>
        <Menu open={menu} onOpenChange={setMenu}>
          <Menu.Trigger>
            <Button color="secondary" variant="soft" testID="open-menu">
              Actions
            </Button>
          </Menu.Trigger>
          <Menu.Content aria-label="Actions" testID="menu">
            <Menu.Label>Document</Menu.Label>
            <Menu.Item icon={<Pencil />} onSelect={() => setLast("Rename")} testID="menu-rename">
              Rename
            </Menu.Item>
            <Menu.Item icon={<Copy />} description="A copy in the same folder" onSelect={() => setLast("Duplicate")}>
              Duplicate
            </Menu.Item>
            <Menu.Item icon={<Share />} description="Only the owner can share" disabled>
              Share
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item icon={<RemoveTrash />} danger onSelect={() => setLast("Delete")}>
              Delete
            </Menu.Item>
          </Menu.Content>
        </Menu>
        <Text variant="footnote" color="secondary" testID="overlay-last">
          Last: {last}
        </Text>
      </Section>
      <Section title="Toast" note={theme.isAndroid ? "Android toast: dark, 16dp corners, swiped away sideways" : "iOS 26 glass banners from the top"}>
        <Row>
          <Button color="secondary" variant="soft" onPress={() => toast("Saved to Photos")} testID="toast-plain">
            Plain
          </Button>
          <Button color="secondary" variant="soft" onPress={() => toast.success("Payment sent", { description: "$24.00 to Jane" })} testID="toast-success">
            Success
          </Button>
          <Button
            color="secondary"
            variant="soft"
            onPress={() => toast("Message deleted", { action: { label: "Undo", onClick: () => setLast("Undo") } })}
            testID="toast-action"
          >
            With action
          </Button>
          <Button
            color="secondary"
            variant="soft"
            onPress={() => toast("Connection lost", { action: { label: "Retry", onClick: () => setLast("Retry") }, closeButton: true, duration: Infinity })}
            testID="toast-close"
          >
            With close
          </Button>
        </Row>
      </Section>

      <Dialog
        open={dialog === "two"}
        onOpenChange={() => setDialog(null)}
        title="Delete this photo?"
        description="It will be removed from all your devices."
        actions={[
          { label: "Cancel", variant: "cancel", testID: "dialog-cancel" },
          { label: "Delete", variant: "destructive", onPress: () => setLast("Deleted"), testID: "dialog-delete" },
        ]}
        testID="dialog"
      />
      <Dialog
        open={dialog === "three"}
        onOpenChange={() => setDialog(null)}
        title="Unsaved changes"
        description="Save the changes to this document before closing?"
        actions={[
          { label: "Save", preferred: true, onPress: () => setLast("Save") },
          { label: "Don't Save", variant: "destructive", onPress: () => setLast("Don't Save") },
          { label: "Cancel", variant: "cancel" },
        ]}
        testID="dialog-three"
      />
      <Dialog
        open={dialog === "field"}
        onOpenChange={() => setDialog(null)}
        title="New folder"
        description="Enter a name for this folder."
        actions={[
          { label: "Cancel", variant: "cancel" },
          { label: "Save", preferred: true },
        ]}
        testID="dialog-field"
      >
        <Input variant="soft" size="3xl" pill={theme.isIOS} defaultValue="Untitled folder" accessibilityLabel="Name" />
      </Dialog>
      <Dialog
        open={dialog === "message"}
        onOpenChange={() => setDialog(null)}
        description="If you turn this off now, you won't be able to turn it on again."
        actions={[
          { label: "Upgrade", preferred: true, onPress: () => setLast("Upgrade") },
          { label: "Turn off", variant: "destructive", onPress: () => setLast("Turn off") },
          { label: "Cancel", variant: "cancel" },
        ]}
        testID="dialog-message"
      />
      <BottomSheet open={sheet} onOpenChange={setSheet} title="Share" testID="sheet">
        <View style={styles.sheet}>
          <Row gap={20}>
            {CONTACTS.map(({ name, color }) => (
              <Labeled key={name} label={name.split(" ")[0]}>
                <Avatar name={name} color={color} size={56} onPress={share(`Shared with ${name}`)} />
              </Labeled>
            ))}
          </Row>
          <Row>
            <Button color="secondary" variant="soft" onPress={share("Copy link")}>
              <Link />
              Copy link
            </Button>
            <Button color="secondary" variant="soft" onPress={share("Mail")}>
              <Email />
              Mail
            </Button>
            <Button color="secondary" variant="soft" onPress={share("Save to Files")}>
              <Download />
              Save to Files
            </Button>
          </Row>
          <Button block color="secondary" variant="soft" onPress={() => setSheet(false)} testID="sheet-done">
            Cancel
          </Button>
        </View>
      </BottomSheet>
      <ActionSheet
        open={actions}
        onOpenChange={setActions}
        title="Photo"
        message="What would you like to do with it?"
        actions={[
          { label: "Share", icon: <Share />, onPress: () => setLast("Share"), testID: "action-share" },
          { label: "Duplicate", icon: <Copy />, onPress: () => setLast("Duplicate") },
          { label: "Delete", icon: <RemoveTrash />, destructive: true, onPress: () => setLast("Delete") },
        ]}
        testID="actions"
      />
      <ActionSheet
        open={sourced}
        onOpenChange={setSourced}
        source={deleteButton}
        message="This draft will be deleted. You can't undo this action."
        actions={[{ label: "Delete draft", destructive: true, onPress: () => setLast("Delete draft"), testID: "sourced-delete" }]}
        testID="sourced"
      />
    </>
  )
}

const styles = StyleSheet.create({
  sheet: { gap: 16 },
})
