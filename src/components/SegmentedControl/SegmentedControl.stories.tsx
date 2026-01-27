import type { Meta } from "@storybook/react"
import { useState } from "react"
import { Bell, DarkMode, Grid, Home, LightMode, Menu, SettingsCog, SystemMode } from "../Icon"
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
  pill: true,
}

NarrowPill.parameters = {
  controls: { include: ["size", "gutterSize", "pill"] },
  docs: {
    source: {
      code: `<SegmentedControl pill size="3xl" gutterSize="2xs">
  <SegmentedControl.Option value="1">1</SegmentedControl.Option>
  <SegmentedControl.Option value="2">2</SegmentedControl.Option>
  <SegmentedControl.Option value="3">3</SegmentedControl.Option>
</SegmentedControl>`,
    },
  },
}

export const IconOnly = (args: SegmentedControlProps<string>) => {
  const [view, setView] = useState("grid")

  return (
    <SegmentedControl
      {...args}
      value={view}
      onChange={(nextView) => setView(nextView)}
      aria-label="Select view mode"
    >
      <SegmentedControl.Option value="grid" icon={<Grid />} aria-label="Grid view" />
      <SegmentedControl.Option value="list" icon={<Menu />} aria-label="List view" />
    </SegmentedControl>
  )
}

IconOnly.args = {
  size: "md",
}

IconOnly.parameters = {
  controls: { include: ["size", "pill"] },
  docs: {
    source: {
      code: `<SegmentedControl>
  <SegmentedControl.Option value="grid" icon={<Grid />} aria-label="Grid view" />
  <SegmentedControl.Option value="list" icon={<List />} aria-label="List view" />
</SegmentedControl>`,
    },
  },
}

export const IconAndText = (args: SegmentedControlProps<string>) => {
  const [tab, setTab] = useState("home")

  return (
    <SegmentedControl
      {...args}
      value={tab}
      onChange={(nextTab) => setTab(nextTab)}
      aria-label="Select section"
    >
      <SegmentedControl.Option value="home" icon={<Home />}>
        Home
      </SegmentedControl.Option>
      <SegmentedControl.Option value="settings" icon={<SettingsCog />}>
        Settings
      </SegmentedControl.Option>
      <SegmentedControl.Option value="notifications" icon={<Bell />}>
        Notifications
      </SegmentedControl.Option>
    </SegmentedControl>
  )
}

IconAndText.args = {
  size: "lg",
}

IconAndText.parameters = {
  controls: { include: ["size", "pill"] },
  docs: {
    source: {
      code: `<SegmentedControl>
  <SegmentedControl.Option value="home" icon={<Home />}>Home</SegmentedControl.Option>
  <SegmentedControl.Option value="settings" icon={<SettingsCog />}>Settings</SegmentedControl.Option>
  <SegmentedControl.Option value="notifications" icon={<Bell />}>Notifications</SegmentedControl.Option>
</SegmentedControl>`,
    },
  },
}

export const WithBadge = (args: SegmentedControlProps<string>) => {
  const [tab, setTab] = useState("all")

  return (
    <SegmentedControl
      {...args}
      value={tab}
      onChange={(nextTab) => setTab(nextTab)}
      aria-label="Select filter"
    >
      <SegmentedControl.Option value="all" badge={128}>
        All
      </SegmentedControl.Option>
      <SegmentedControl.Option value="unread" badge={{ content: 12, color: "info" }}>
        Unread
      </SegmentedControl.Option>
      <SegmentedControl.Option value="flagged" badge={{ content: 3, color: "danger" }}>
        Flagged
      </SegmentedControl.Option>
    </SegmentedControl>
  )
}

WithBadge.args = {
  size: "lg",
}

WithBadge.parameters = {
  controls: { include: ["size", "pill"] },
  docs: {
    source: {
      code: `<SegmentedControl>
  <SegmentedControl.Option value="all" badge={128}>All</SegmentedControl.Option>
  <SegmentedControl.Option value="unread" badge={{ content: 12, color: "info" }}>Unread</SegmentedControl.Option>
  <SegmentedControl.Option value="flagged" badge={{ content: 3, color: "danger" }}>Flagged</SegmentedControl.Option>
</SegmentedControl>`,
    },
  },
}

export const IconTextBadge = (args: SegmentedControlProps<string>) => {
  const [tab, setTab] = useState("inbox")

  return (
    <SegmentedControl
      {...args}
      value={tab}
      onChange={(nextTab) => setTab(nextTab)}
      aria-label="Select mailbox"
    >
      <SegmentedControl.Option value="inbox" icon={<Home />} badge={24}>
        Inbox
      </SegmentedControl.Option>
      <SegmentedControl.Option
        value="notifications"
        icon={<Bell />}
        badge={{ content: 5, color: "danger" }}
      >
        Alerts
      </SegmentedControl.Option>
      <SegmentedControl.Option value="settings" icon={<SettingsCog />}>
        Settings
      </SegmentedControl.Option>
    </SegmentedControl>
  )
}

IconTextBadge.args = {
  size: "xl",
}

IconTextBadge.parameters = {
  controls: { include: ["size", "pill"] },
  docs: {
    source: {
      code: `<SegmentedControl>
  <SegmentedControl.Option value="inbox" icon={<Home />} badge={24}>Inbox</SegmentedControl.Option>
  <SegmentedControl.Option value="notifications" icon={<Bell />} badge={{ content: 5, color: "danger" }}>Alerts</SegmentedControl.Option>
  <SegmentedControl.Option value="settings" icon={<SettingsCog />}>Settings</SegmentedControl.Option>
</SegmentedControl>`,
    },
  },
}

const BADGE_COLORS = ["secondary", "success", "danger", "info"] as const
const BADGE_VARIANTS = ["soft", "solid"] as const

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

export const BadgeVariants = (args: SegmentedControlProps<string> & { badgePill?: boolean }) => {
  const [softSelected, setSoftSelected] = useState("secondary")
  const [solidSelected, setSolidSelected] = useState("danger")

  const states = {
    soft: [softSelected, setSoftSelected],
    solid: [solidSelected, setSolidSelected],
  } as const

  return (
    <div className="flex flex-col justify-center gap-6 min-h-[320px]">
      {BADGE_VARIANTS.map((variant) => {
        const [selected, setSelected] = states[variant]
        return (
          <div key={variant} className="flex flex-col items-start gap-2">
            <span className="text-sm text-tertiary">{capitalize(variant)}</span>
            <SegmentedControl
              {...args}
              value={selected}
              onChange={setSelected}
              aria-label={`Badge ${variant} variants`}
            >
              {BADGE_COLORS.map((color) => (
                <SegmentedControl.Option
                  key={color}
                  value={color}
                  badge={{ content: 5, color, variant, pill: args.badgePill }}
                >
                  {capitalize(color)}
                </SegmentedControl.Option>
              ))}
            </SegmentedControl>
          </div>
        )
      })}
    </div>
  )
}

BadgeVariants.args = {
  size: "md",
  pill: true,
  badgePill: true,
}

BadgeVariants.parameters = {
  controls: { include: ["size", "pill", "badgePill"] },
  docs: {
    source: {
      code: `<SegmentedControl>
  <SegmentedControl.Option value="inbox" badge={{ content: 5, color: "success" }}>
    Inbox
  </SegmentedControl.Option>
  <SegmentedControl.Option value="alerts" badge={{ content: 3, color: "danger", variant: "solid" }}>
    Alerts
  </SegmentedControl.Option>
</SegmentedControl>`,
    },
  },
}
