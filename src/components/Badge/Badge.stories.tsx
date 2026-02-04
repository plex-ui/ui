import { type Meta } from "@storybook/react/"
import { Fragment } from "react"
import { Flask } from "../Icon"
import { LoadingIndicator } from "../Indicator"
import { Badge, type BadgeProps } from "./"

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: {
    children: "New",
    color: "success",
    size: "md",
    pill: false,
  },
  argTypes: {
    children: { control: "text" },
    className: { control: false },
    color: {
      control: "select",
      options: ["secondary", "success", "danger", "warning", "info", "discovery", "caution"],
    },
  },
} satisfies Meta<typeof Badge>

export default meta

export const Base = (args: BadgeProps) => <Badge {...args} />

const SIZES = ["sm", "md", "lg"] as const

export const Sizing = (args: BadgeProps) => (
  <div className="flex">
    {SIZES.map((size) => (
      <div className="flex flex-col w-[76px] justify-end items-center gap-3">
        <Badge key={size} {...args} size={size} />
        <span className="text-tertiary text-sm">{size}</span>
      </div>
    ))}
  </div>
)

Sizing.args = {
  color: "info",
  pill: false,
}

Sizing.parameters = {
  controls: { include: ["pill"] },
}
Sizing.argTypes = {
  size: { control: "select", options: ["sm", "md", "lg"] },
}

export const Icon = (args: BadgeProps) => (
  <Badge {...args}>
    <Flask /> Beta
  </Badge>
)

Icon.args = {
  size: "lg",
  color: "warning",
}

Icon.parameters = {
  docs: {
    source: {
      code: `<Badge color="warning" size="lg">
  <Flask /> Beta
</Badge>`,
    },
  },
}

export const Loading = (args: BadgeProps) => (
  <Badge {...args} className="gap-1.5">
    <LoadingIndicator />
    In progress
  </Badge>
)

Loading.args = {
  size: "lg",
  color: "secondary",
}

Loading.argTypes = {
  icon: { table: { disable: true } },
}

const VARIANTS = ["soft", "solid", "outline"] as const
const COLORS = [
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
  "discovery",
  "caution",
] as const

export const Colors = (args: BadgeProps) => (
  <div className="pt-1 pb-6 px-8 w-fit min-w-full">
    <Matrix
      rowLabels={VARIANTS}
      columnLabels={COLORS}
      renderCell={(row, col) => (
        <Badge {...args} size={args.size} color={COLORS[col]} variant={VARIANTS[row]} />
      )}
    />
  </div>
)

Colors.args = {
  children: "Sample",
}

Colors.parameters = {
  layout: "padded",
}

const Matrix = ({
  rowLabels,
  columnLabels,
  renderCell,
}: {
  rowLabels: Readonly<string[]>
  columnLabels: Readonly<string[]>
  renderCell: (rowIndex: number, colIndex: number) => React.ReactNode
}) => {
  const template = `auto repeat(${columnLabels.length}, min-content)`

  return (
    <div
      className="grid gap-6 items-center justify-center"
      style={{ gridTemplateColumns: template }}
    >
      {/* top‐left corner spacer */}
      <div />
      {columnLabels.map((col, i) => (
        <div key={i} className="text-center text-tertiary text-sm mb-1">
          {col}
        </div>
      ))}

      {rowLabels.map((row, ri) => (
        <Fragment key={ri}>
          <div className="text-right text-tertiary text-sm mr-3">{row}</div>
          {columnLabels.map((_, ci) => (
            <div key={ci} className="text-center">
              {renderCell(ri, ci)}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  )
}
