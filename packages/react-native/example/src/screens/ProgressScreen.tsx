import {
  Button,
  CircularProgress,
  List,
  ListItem,
  LoadingDots,
  LoadingIndicator,
  Progress,
  ProgressSteps,
  RollingNumber,
  ShimmerText,
  Stepper,
  Text,
  useTheme,
} from "@plexui/react-native"
import { Email, Globe, Users } from "@plexui/react-native/icons"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Labeled, Row, Section } from "../demo"

const STEPS = [
  { title: "Your details", description: "Name and email" },
  { title: "Company details", description: "About your company" },
  { title: "Invite your team", description: "Start collaborating" },
]

/** Progress bars, steps, steppers, the loading indicators, shimmering text and a rolling number. */
export function ProgressScreen() {
  const theme = useTheme()
  const [upload, setUpload] = useState(66)
  const [copies, setCopies] = useState(1)
  const [nights, setNights] = useState(3)
  const [bag, setBag] = useState(2)
  const [total, setTotal] = useState(1284)
  const [step, setStep] = useState(2)
  const tertiary = theme.color("--color-text-tertiary")
  return (
    <>
      <Section title="Progress" note="A value, its sizes and colors, parts of one bar, and a sweep while the length is unknown">
        <View style={styles.bar}>
          <View style={styles.labelRow}>
            <Text nativeID="upload-label">Uploading plex-ui.zip</Text>
            <Text color={tertiary} style={styles.readout}>{`${upload}%`}</Text>
          </View>
          <Progress value={upload} aria-labelledby="upload-label" testID="progress-upload" />
        </View>
        <Progress value={40} size="md" color="success" aria-label="Storage" />
        <Progress value={80} size="lg" color="danger" aria-label="Battery" />
        <Progress
          aria-label="Bill of $200"
          max={200}
          size="lg"
          segments={[
            { value: 120, color: "success", label: "Paid" },
            { value: 45, color: "warning", label: "Pending" },
          ]}
        />
        <Progress value={null} aria-label="Syncing" />
        <Row>
          <Button size="sm" color="secondary" variant="soft" onPress={() => setUpload((value) => Math.max(0, value - 10))} testID="progress-less">
            -10
          </Button>
          <Button size="sm" color="secondary" variant="soft" onPress={() => setUpload((value) => Math.min(100, value + 10))} testID="progress-more">
            +10
          </Button>
        </Row>
      </Section>
      <Section title="Progress steps" note="The steps of a flow, a check once completed; a minimal bar of segments">
        <ProgressSteps current={step} orientation="vertical">
          {STEPS.map((item) => (
            <ProgressSteps.Step key={item.title}>
              <ProgressSteps.Title>{item.title}</ProgressSteps.Title>
              <ProgressSteps.Description>{item.description}</ProgressSteps.Description>
            </ProgressSteps.Step>
          ))}
        </ProgressSteps>
        <ProgressSteps current={step} size="sm" color="success" connectorStyle="dashed">
          {[Email, Globe, Users].map((Icon, index) => (
            <ProgressSteps.Step key={index} icon={<Icon />}>
              <ProgressSteps.Title visuallyHidden>{STEPS[index].title}</ProgressSteps.Title>
            </ProgressSteps.Step>
          ))}
        </ProgressSteps>
        <Row gap={16} style={styles.center}>
          <ProgressSteps variant="minimal" current={step} total={4} />
          <ProgressSteps variant="minimal" current={step} total={4} size="lg" color="success" />
        </Row>
        <Row style={styles.center}>
          <Button size="sm" color="secondary" variant="outline" disabled={step === 1} onPress={() => setStep((value) => value - 1)} testID="steps-back">
            Previous
          </Button>
          <Button size="sm" disabled={step === 4} onPress={() => setStep((value) => value + 1)} testID="steps-next">
            Next
          </Button>
        </Row>
      </Section>
      <Section title="Stepper" note="Two segments, the minus tertiary at the lowest value; the value between them, a trash can at one">
        <List>
          <ListItem
            label={copies === 1 ? "1 copy" : `${copies} copies`}
            trailing={<Stepper aria-label="Copies" value={copies} onChange={setCopies} min={1} max={20} testID="stepper-copies" />}
          />
          <ListItem
            label={nights === 1 ? "1 night" : `${nights} nights`}
            trailing={<Stepper aria-label="Nights" value={nights} onChange={setNights} min={1} max={14} disabled />}
          />
          <ListItem
            label="Flat White"
            trailing={<Stepper aria-label="Flat White" value={bag} onChange={setBag} min={1} max={9} showValue onRemove={() => setBag(1)} removeLabel="Remove Flat White" testID="stepper-bag" />}
          />
          <ListItem label="Croissant" trailing={<Stepper aria-label="Croissant" defaultValue={1} min={1} max={9} showValue onRemove={() => {}} />} />
        </List>
      </Section>
      <Section title="Indicators" note="A spinner in three sizes, a progress ring and pulsing dots">
        <Row gap={24} style={styles.middle}>
          <Labeled label="14">
            <LoadingIndicator size={14} />
          </Labeled>
          <Labeled label="20">
            <LoadingIndicator aria-label="Loading" />
          </Labeled>
          <Labeled label="35">
            <LoadingIndicator size={35} color="secondary" />
          </Labeled>
          <Labeled label="Ring">
            <CircularProgress progress={60} />
          </Labeled>
          <Labeled label="Dots">
            <LoadingDots />
          </Labeled>
        </Row>
      </Section>
      <Section title="Shimmer text" note="A light band sweeping across the text; plain with reduced motion">
        <ShimmerText size="lg" weight="semibold">
          Generating response...
        </ShimmerText>
      </Section>
      <Section title="Rolling number" note="Each changed digit rolls to the new value">
        <View style={styles.middle}>
          <RollingNumber value={total} format={{ style: "currency", currency: "USD" }} weight="semibold" style={styles.total} testID="rolling-total" />
        </View>
        <Row style={styles.center}>
          {[-100, -1, 1, 25, 1000].map((amount) => (
            <Button key={amount} size="sm" color="secondary" variant="soft" onPress={() => setTotal((value) => Math.max(0, value + amount))} testID={`rolling-${amount}`}>
              {amount > 0 ? `+${amount}` : String(amount)}
            </Button>
          ))}
        </Row>
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  bar: { gap: 8 },
  labelRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 16 },
  readout: { fontSize: 14, lineHeight: 21 },
  center: { justifyContent: "center" },
  middle: { alignItems: "center", justifyContent: "center" },
  total: { fontSize: 36, lineHeight: 40 },
})
