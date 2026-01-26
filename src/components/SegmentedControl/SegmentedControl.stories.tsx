import type { Meta } from "@storybook/react"
import { useState } from "react"
import { DarkMode, LightMode, SystemMode } from "../Icon"
import { SegmentedControl, type SegmentedControlProps, type SizeVariant } from "./"

const meta = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>

export default meta

export const Base = (args: SegmentedControlProps<string>) => {
  const [view, setView] = useState("all")

  return (
    <SegmentedControl
      {...args}
      value={view}
      onChange={(nextView) => setView(nextView)}
      aria-label="Select view"
    >
      <SegmentedControl.Option value="all">All</SegmentedControl.Option>
      <SegmentedControl.Option value="failed">Failed</SegmentedControl.Option>
      <SegmentedControl.Option value="successful">Successful</SegmentedControl.Option>
    </SegmentedControl>
  )
}

export const Sizing = (args: SegmentedControlProps<string>) => <Base {...args} />

Sizing.args = {
  size: "xl",
  pill: false,
}

Sizing.parameters = {
  controls: { include: ["size", "gutterSize", "pill"] },
}

Sizing.argTypes = {
  size: { control: "select" },
  gutterSize: { control: "select" },
}

export const Block = (args: SegmentedControlProps<string>) => (
  <div className="w-[420px] text-center p-2 border border-dashed border-alpha/20 rounded-md">
    <Base {...args} />
  </div>
)

Block.args = {
  block: true,
}

Block.parameters = {
  controls: { include: ["block"] },
  docs: {
    source: {
      code: `<SegmentedControl block>
  <SegmentedControl.Option />
  <SegmentedControl.Option />
  <SegmentedControl.Option />
</SegmentedControl>`,
    },
  },
}

export const Disabled = (args: SegmentedControlProps<string>) => <Base {...args} />

Disabled.args = {
  disabled: true,
}

Disabled.parameters = {
  controls: { include: ["disabled"] },
  docs: {
    source: {
      code: `<SegmentedControl disabled>
  <SegmentedControl.Option />
  <SegmentedControl.Option />
  <SegmentedControl.Option />
</SegmentedControl>`,
    },
  },
}

export const DisabledOption = ({ disabled, ...restProps }: SegmentedControlProps<string>) => {
  const [view, setView] = useState("all")

  return (
    <SegmentedControl
      {...restProps}
      value={view}
      onChange={(nextView) => setView(nextView)}
      aria-label="Select view"
    >
      <SegmentedControl.Option value="all">All</SegmentedControl.Option>
      <SegmentedControl.Option value="failed">Failed</SegmentedControl.Option>
      <SegmentedControl.Option value="successful" disabled={disabled}>
        Successful
      </SegmentedControl.Option>
    </SegmentedControl>
  )
}

DisabledOption.args = {
  disabled: true,
}

DisabledOption.parameters = {
  controls: { include: ["disabled"] },
  docs: {
    source: {
      code: `<SegmentedControl>
  <SegmentedControl.Option />
  <SegmentedControl.Option />
  <SegmentedControl.Option disabled />
</SegmentedControl>`,
    },
  },
}

export const Scrollable = ({ size }: { size: SizeVariant }) => {
  const [long, setLong] = useState("1")

  return (
    <div className="max-w-[400px]">
      <div className="flex">
        <SegmentedControl
          value={long}
          onChange={(v) => setLong(v)}
          aria-label="Horrible control"
          size={size}
        >
          <SegmentedControl.Option value="1">Weird</SegmentedControl.Option>
          <SegmentedControl.Option value="2">use</SegmentedControl.Option>
          <SegmentedControl.Option value="3">of this</SegmentedControl.Option>
          <SegmentedControl.Option value="4">component</SegmentedControl.Option>
          <SegmentedControl.Option value="5">but showing</SegmentedControl.Option>
          <SegmentedControl.Option value="6">it can</SegmentedControl.Option>
          <SegmentedControl.Option value="7">become</SegmentedControl.Option>
          <SegmentedControl.Option value="8">scrollable</SegmentedControl.Option>
        </SegmentedControl>
      </div>
    </div>
  )
}

export const NarrowPill = (args: SegmentedControlProps<string>) => {
  const [view, setView] = useState("1")
  const [mode, setMode] = useState("light")

  return (
    <div className="flex flex-col items-center gap-8">
      <SegmentedControl
        {...args}
        block={false}
        value={view}
        onChange={(nextView) => setView(nextView)}
        aria-label="Select number"
        pill
      >
        <SegmentedControl.Option value="1">1</SegmentedControl.Option>
        <SegmentedControl.Option value="2">2</SegmentedControl.Option>
        <SegmentedControl.Option value="3">3</SegmentedControl.Option>
      </SegmentedControl>

      <SegmentedControl
        {...args}
        block={false}
        value={mode}
        onChange={(nextMode) => setMode(nextMode)}
        aria-label="Select mode"
        pill
      >
        <SegmentedControl.Option value="light" aria-label="Light mode">
          <LightMode />
        </SegmentedControl.Option>
        <SegmentedControl.Option value="dark" aria-label="Dark mode">
          <DarkMode />
        </SegmentedControl.Option>
        <SegmentedControl.Option value="system" aria-label="System mode">
          <SystemMode />
        </SegmentedControl.Option>
      </SegmentedControl>
    </div>
  )
}

NarrowPill.args = {
  size: "3xl",
  gutterSize: "2xs",
}

NarrowPill.parameters = {
  controls: { include: ["size", "gutterSize"] },
}
