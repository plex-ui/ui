import { Alert, Button, CopyTooltip, Popover, Separator, Text, TextLink, Tip, Tooltip, usePopoverController, useTheme } from "@plexui/react-native"
import { ArrowTopRightSm, Bell, Copy, Filter, Lightbulb } from "@plexui/react-native/icons"
import { Fragment, useState } from "react"
import { StyleSheet, View, type GestureResponderEvent } from "react-native"
import { Row, Section } from "../demo"

const DETAILS = [
  ["Version", "0.9.0"],
  ["Published", "2 days ago"],
  ["Bundle", "48 kB"],
  ["License", "MIT"],
] as const

// The screen's links go nowhere
const stay = (event: GestureResponderEvent) => event.preventDefault()

/** Alerts, tips in the screen and over a control, a popover, tooltips, separators and links in text. */
export function MessagesScreen() {
  const theme = useTheme()
  const [alertShown, setAlertShown] = useState(true)
  const [tipShown, setTipShown] = useState(true)
  const [tipOpen, setTipOpen] = useState(false)
  const [last, setLast] = useState("None")
  return (
    <>
      <Section title="Alert" note="Colors and variants; a title, a description or both; actions, a close button and a banner">
        <Alert title="Scheduled maintenance" description="We'll be offline 2 - 4 AM UTC on July 14 while we upgrade our database." />
        <Alert color="success" variant="soft" title="Payment sent" />
        <Alert color="danger" variant="solid" description="Your card was declined. Try another card." testID="alert-danger" />
        {alertShown ? (
          <Alert
            color="warning"
            title="Storage almost full"
            description="You've used 95% of your storage."
            actions={
              <>
                <Button color="primary" variant="soft" pill onPress={() => setLast("Manage")}>
                  Manage
                </Button>
                <Button color="primary" variant="solid" pill onPress={() => setLast("Upgrade")} testID="alert-upgrade">
                  Upgrade
                </Button>
              </>
            }
            onDismiss={() => setAlertShown(false)}
            testID="alert-storage"
          />
        ) : (
          <Button color="secondary" variant="soft" onPress={() => setAlertShown(true)} testID="alert-again">
            Show the alert again
          </Button>
        )}
        <Alert
          color="discovery"
          indicator={<Lightbulb />}
          title="Shared albums"
          description="Invite people to add their photos to an album."
          actions={
            <Button color="secondary" variant="soft" size="sm" pill>
              Learn more
            </Button>
          }
          mobileActions="own"
        />
        <Alert color="info" variant="soft" indicator={false} banner description="You're viewing a shared workspace." />
      </Section>
      <Section title="Tip" note="On a grouped background: a symbol and Close, actions as rows or as buttons, an arrow toward a control">
        <View style={[styles.grouped, { backgroundColor: theme.colors.groupedBackground }]}>
          {tipShown ? (
            <Tip
              icon={<Bell />}
              title="Turn on notifications"
              description="Get a message when someone replies to your post or mentions you."
              onClose={() => setTipShown(false)}
              testID="tip-inline"
            />
          ) : (
            <Button color="secondary" variant="soft" onPress={() => setTipShown(true)} testID="tip-again">
              Show the tip again
            </Button>
          )}
          <Tip
            title="Save your searches"
            description="Tap the star to find a search again later."
            actions={
              <>
                <Button color="primary" variant="soft" size="sm" pill onPress={() => setLast("Not now")}>
                  Not now
                </Button>
                <Button color="primary" size="sm" pill onPress={() => setLast("Turn on")} testID="tip-turn-on">
                  Turn on
                </Button>
              </>
            }
          />
          <Tip
            icon={<Bell />}
            title="Allow notifications"
            description="We'll only send what you ask for."
            mobileActions="buttons"
            actions={
              <Button color="primary" pill onPress={() => setLast("Allow")}>
                Allow
              </Button>
            }
          />
          <View style={styles.anchored}>
            <Button color="secondary" variant="soft" uniform pill accessibilityLabel="Notifications" style={styles.control}>
              <Bell />
            </Button>
            <Tip arrowEdge="top" title="Your notifications" description="Replies and mentions show here." />
          </View>
        </View>
      </Section>
      <Section title="Popover" note="A tip over its control; a panel at its trigger, closed or shaken from inside">
        <Row gap={12}>
          <Tip.Popover
            open={tipOpen}
            onOpenChange={setTipOpen}
            title="Filter the list"
            description="Show only the items from the last week, month or year."
            testID="tip-popover"
          >
            <Button color="secondary" variant="soft" onPress={() => setTipOpen(!tipOpen)} testID="open-tip-popover">
              <Filter />
              Filter
            </Button>
          </Tip.Popover>
          <Popover>
            <Popover.Trigger>
              <Button color="primary" pill={false} testID="open-popover">
                Generate
              </Button>
            </Popover.Trigger>
            <Popover.Content aria-label="Generate" testID="popover">
              <PopoverBody onDone={setLast} />
            </Popover.Content>
          </Popover>
        </Row>
      </Section>
      <Section title="Tooltip" note="Shown on a long press: text, an icon button, a disabled button; a tap copies">
        <Row gap={16}>
          <Tooltip content="Shown on a long press, for a second and a half" testID="tooltip-text">
            <Tooltip.TriggerDecorator testID="tooltip-trigger">Text with a tooltip</Tooltip.TriggerDecorator>
          </Tooltip>
          <Tooltip content="Copy to clipboard" compact testID="tooltip-icon">
            <Button color="secondary" variant="ghost" uniform accessibilityLabel="Copy to clipboard" testID="tooltip-button">
              <Copy />
            </Button>
          </Tooltip>
          <Tooltip content="This action is disabled for reasons" testID="tooltip-disabled">
            <Button color="primary" disabled testID="tooltip-disabled-button">
              Disabled
            </Button>
          </Tooltip>
        </Row>
        <CopyTooltip copyValue="sess_12345abcdefg" onCopy={(copied) => setLast(copied ? "Copied" : "Not copied")} testID="copy-tooltip">
          <Button color="secondary" variant="ghost" size="xl" accessibilityLabel="Copy session ID" testID="copy-session">
            sess_12345abcdefg
          </Button>
        </CopyTooltip>
      </Section>
      <Section title="Separator" note="Across between rows; standing between inline items">
        <View style={styles.rows}>
          {DETAILS.map(([term, value], index) => (
            <Fragment key={term}>
              {index > 0 && <Separator decorative={index !== 2} testID={index === 2 ? "separator-semantic" : undefined} />}
              <View style={styles.detail}>
                <Text size="sm">{term}</Text>
                <Text size="sm" color="tertiary">
                  {value}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
        <View style={styles.strip}>
          {DETAILS.map(([term, value], index) => (
            <Fragment key={term}>
              {index > 0 && <Separator orientation="vertical" />}
              <View style={styles.item}>
                <Text size="sm" weight="medium">
                  {term}
                </Text>
                <Text size="sm" color="tertiary">
                  {value}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      </Section>
      <Section title="Text link" note="The text's color and an underline; primary; secondary text; an external link">
        <Text size="md">
          You can use the{" "}
          <TextLink href="#" onPress={stay} testID="link-endpoint">
            responses endpoint
          </TextLink>{" "}
          to generate text, or one of the{" "}
          <TextLink href="#" onPress={stay} primary>
            official SDKs
          </TextLink>{" "}
          for your preferred language.
        </Text>
        <Text size="md" color="secondary">
          Read the{" "}
          <TextLink href="https://example.com" weight="medium" testID="link-external">
            guide <ArrowTopRightSm size={16} />
          </TextLink>{" "}
          or{" "}
          <TextLink onPress={() => setLast("Contact")} underline={false} weight="semibold" testID="link-button">
            contact us
          </TextLink>
          .
        </Text>
        <Text variant="footnote" color="tertiary" testID="messages-last">
          {`Last: ${last}`}
        </Text>
      </Section>
    </>
  )
}

/** The popover's content: a line and two actions that shake or close it from inside. */
function PopoverBody({ onDone }: { onDone: (action: string) => void }) {
  const { close, shake } = usePopoverController()
  return (
    <View style={styles.popover}>
      <Text size="sm" color="secondary">
        Use with any floating UI.
      </Text>
      <Row>
        <Button color="secondary" variant="soft" size="sm" onPress={shake} testID="popover-shake">
          Shake
        </Button>
        <Button
          color="primary"
          size="sm"
          onPress={() => {
            onDone("Generated")
            close()
          }}
          testID="popover-done"
        >
          Done
        </Button>
      </Row>
    </View>
  )
}

const styles = StyleSheet.create({
  grouped: { gap: 12, padding: 16, borderRadius: 16, borderCurve: "continuous" },
  anchored: { gap: 4 },
  // A button keeps to the start of its column: the tip's arrow points at its center
  control: { alignSelf: "center" },
  rows: { gap: 8 },
  detail: { flexDirection: "row", justifyContent: "space-between" },
  strip: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 16 },
  item: { gap: 2 },
  popover: { padding: 16, gap: 12 },
})
