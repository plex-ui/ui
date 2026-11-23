import { SegmentedControl, Text, useTheme, type ControlSize } from "@plexui/react-native"
import { Grid, List, Moon, Sun } from "@plexui/react-native/icons"
import { useState } from "react"
import { Backdrop, Section } from "../demo"

function Week({ size, material, block, width, disabled, value = "week", testID }: { size?: ControlSize; material?: "glass" | "flat"; block?: boolean; width?: "equal" | "content"; disabled?: boolean | "month"; value?: string; testID?: string }) {
  const [selected, setSelected] = useState(value)
  return (
    <SegmentedControl
      aria-label="Period"
      value={selected}
      onChange={setSelected}
      size={size}
      mobileMaterial={material}
      block={block}
      mobileSegmentWidth={width}
      disabled={disabled === true}
      testID={testID}
    >
      <SegmentedControl.Tab value="day" testID={testID ? `${testID}-day` : undefined}>
        Day
      </SegmentedControl.Tab>
      <SegmentedControl.Tab value="week" testID={testID ? `${testID}-week` : undefined}>
        Week
      </SegmentedControl.Tab>
      <SegmentedControl.Tab value="month" disabled={disabled === "month"} testID={testID ? `${testID}-month` : undefined}>
        Month
      </SegmentedControl.Tab>
      <SegmentedControl.Tab value="year" testID={testID ? `${testID}-year` : undefined}>
        Year
      </SegmentedControl.Tab>
    </SegmentedControl>
  )
}

export function SegmentedScreen() {
  const theme = useTheme()
  const [view, setView] = useState("grid")
  const [scheme, setScheme] = useState("light")
  const [mailbox, setMailbox] = useState("all")
  return (
    <>
      <Section title="Interactive" note={theme.isAndroid ? "Android segmented capsule: the accent pill slides to the selection" : "The thumb slides to the selection"}>
        <Week testID="segmented" />
      </Section>
      {theme.isAndroid ? (
        <Section title="Sizes" note="32, 36, 40 and 44dp by size">
          <Week size="sm" />
          <Week size="lg" />
        </Section>
      ) : (
        <>
          <Section title="Small" note="sm and smaller: the 32pt plain capsule of SwiftUI's segmented Picker">
            <Week size="sm" />
            <Backdrop>
              <Week size="sm" material="glass" />
            </Backdrop>
          </Section>
          <Section title="Large" note="md and larger: the 48pt glass capsule of iOS 26 apps; flat, 49pt plain">
            <Backdrop>
              <Week />
            </Backdrop>
            <Week material="flat" />
          </Section>
        </>
      )}
      <Section title="Widths" note="Equal segments, as UISegmentedControl, or each its own label's width; block fills the row">
        <Week width="content" />
        <Week block />
      </Section>
      <Section title="Disabled" note="One segment (no data for Month yet), then the whole control">
        <Week disabled="month" />
        <Week disabled />
      </Section>
      <Section title="Symbols">
        <SegmentedControl aria-label="View" value={view} onChange={setView} size="sm">
          <SegmentedControl.Tab value="grid" aria-label="Grid" icon={<Grid />} />
          <SegmentedControl.Tab value="list" aria-label="List" icon={<List />} />
        </SegmentedControl>
        <SegmentedControl aria-label="Appearance" value={scheme} onChange={setScheme}>
          <SegmentedControl.Tab value="light" aria-label="Light" icon={<Sun />} />
          <SegmentedControl.Tab value="dark" aria-label="Dark" icon={<Moon />} />
        </SegmentedControl>
      </Section>
      <Section title="Badge">
        <SegmentedControl aria-label="Mailbox" value={mailbox} onChange={setMailbox} testID="segmented-mailbox">
          <SegmentedControl.Tab value="all">All</SegmentedControl.Tab>
          <SegmentedControl.Tab value="unread" badge={2}>
            Unread
          </SegmentedControl.Tab>
          <SegmentedControl.Tab value="flagged">Flagged</SegmentedControl.Tab>
        </SegmentedControl>
        <Text variant="footnote" color="tertiary">
          A badge is read with the segment&apos;s name, not drawn (Unread, 2)
        </Text>
      </Section>
    </>
  )
}
