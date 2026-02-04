import { type Meta } from "@storybook/react"
import React, { useState } from "react"
import { FloatingLabelInput, type FloatingLabelInputProps } from "./"

const meta = {
  title: "Components/Floating Label Input",
  component: FloatingLabelInput,
  parameters: {
    layout: "padded",
  },
  args: {
    label: "Email address",
    disabled: false,
    invalid: false,
  },
  argTypes: {
    label: { control: "text" },
    errorMessage: { control: "text" },
    disabled: { control: "boolean" },
    invalid: { control: "boolean" },
    readOnly: { control: "boolean" },
    className: { table: { disable: true } },
  },
} satisfies Meta<typeof FloatingLabelInput>

export default meta

export const Base = (args: FloatingLabelInputProps) => (
  <div className="w-[360px]">
    <FloatingLabelInput {...args} />
  </div>
)

export const Filled = (args: FloatingLabelInputProps) => (
  <div className="w-[360px]">
    <FloatingLabelInput {...args} defaultValue="jane.doe@example.com" />
  </div>
)

Filled.args = {
  label: "Email address",
}

export const WithError = (args: FloatingLabelInputProps) => (
  <div className="w-[360px]">
    <FloatingLabelInput {...args} />
  </div>
)

WithError.args = {
  label: "Email address",
  defaultValue: "jane.doe@example",
  invalid: true,
  errorMessage: "Email is not valid.",
}

export const WithClearButton = (args: FloatingLabelInputProps) => {
  const [value, setValue] = useState("clearable@example.com")

  return (
    <div className="w-[360px]">
      <FloatingLabelInput
        {...args}
        value={value}
        onChange={(evt) => setValue(evt.target.value)}
        onClear={() => setValue("")}
      />
    </div>
  )
}

WithClearButton.args = {
  label: "Email address",
}

WithClearButton.parameters = {
  docs: {
    source: {
      code: `const [value, setValue] = useState("clearable@example.com")

<FloatingLabelInput
  label="Email address"
  value={value}
  onChange={(evt) => setValue(evt.target.value)}
  onClear={() => setValue("")}
/>`,
    },
  },
}

export const Disabled = (args: FloatingLabelInputProps) => (
  <div className="w-[360px]">
    <FloatingLabelInput {...args} />
  </div>
)

Disabled.args = {
  label: "Email address",
  defaultValue: "jane.doe@example.com",
  disabled: true,
}

Disabled.parameters = {
  controls: { include: ["disabled"] },
}

export const ReadOnly = (args: FloatingLabelInputProps) => (
  <div className="w-[360px]">
    <FloatingLabelInput {...args} />
  </div>
)

ReadOnly.args = {
  label: "Email address",
  defaultValue: "jane.doe@example.com",
  readOnly: true,
}

ReadOnly.parameters = {
  controls: { include: ["readOnly"] },
}

const STATE_LABELS = ["Empty", "Filled", "Invalid", "Disabled", "Read only"] as const

export const States = () => (
  <div className="pt-1 pb-6 px-8 w-fit min-w-full max-w-[500px] mx-auto">
    <RowMatrix
      rowLabels={STATE_LABELS}
      renderRow={(index) => {
        switch (index) {
          case 0:
            return <FloatingLabelInput label="Email address" className="w-[320px]" />
          case 1:
            return (
              <FloatingLabelInput
                label="Email address"
                defaultValue="jane.doe@example.com"
                className="w-[320px]"
              />
            )
          case 2:
            return (
              <FloatingLabelInput
                label="Email address"
                defaultValue="jane.doe@example"
                invalid
                errorMessage="Email is not valid."
                className="w-[320px]"
              />
            )
          case 3:
            return (
              <FloatingLabelInput
                label="Email address"
                defaultValue="disabled@example.com"
                disabled
                className="w-[320px]"
              />
            )
          case 4:
            return (
              <FloatingLabelInput
                label="Email address"
                defaultValue="readonly@example.com"
                readOnly
                className="w-[320px]"
              />
            )
          default:
            return null
        }
      }}
    />
  </div>
)

States.parameters = {
  controls: { disable: true },
}

export const PasswordInput = (args: FloatingLabelInputProps) => (
  <div className="w-[360px]">
    <FloatingLabelInput {...args} type="password" />
  </div>
)

PasswordInput.args = {
  label: "Password",
}

const RowMatrix = ({
  rowLabels,
  renderRow,
}: {
  rowLabels: Readonly<string[]>
  renderRow: (rowIndex: number) => React.ReactNode
}) => (
  <div className="flex flex-col gap-8">
    {rowLabels.map((label, index) => (
      <div key={index} className="flex items-center">
        <div className="text-right text-tertiary text-sm mr-8 min-w-[5rem]">{label}</div>
        <div className="flex-1">{renderRow(index)}</div>
      </div>
    ))}
  </div>
)
