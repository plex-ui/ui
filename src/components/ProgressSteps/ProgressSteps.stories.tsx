import type { Meta } from "@storybook/react"
import { useState } from "react"
import { Button } from "../Button"
import { Bolt, Email, Globe, Users } from "../Icon"
import { ProgressSteps, type ProgressStepsProps } from "./"

const meta = {
  title: "Components/Progress Steps",
  component: ProgressSteps,
  parameters: {
    layout: "padded",
  },
  args: {
    current: 2,
    orientation: "horizontal",
    size: "md",
    color: "default",
    connectorStyle: "solid",
  },
  argTypes: {
    current: { control: { type: "range", min: 1, max: 4, step: 1 } },
    orientation: { control: "select", options: ["vertical", "horizontal"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    color: { control: "select", options: ["default", "success"] },
    connectorStyle: { control: "select", options: ["solid", "dashed"] },
    className: { table: { disable: true } },
  },
} satisfies Meta<typeof ProgressSteps>

export default meta

type BaseStoryProps = ProgressStepsProps & {
  showTitle?: boolean
  showDescription?: boolean
}

const steps = [
  { title: "Your details", description: "Please provide your name and email" },
  { title: "Company details", description: "A few details about your company" },
  { title: "Invite your team", description: "Start collaborating with your team" },
  { title: "Add your socials", description: "Share posts to your social accounts" },
]

export const Base = ({ showTitle = true, showDescription = true, ...args }: BaseStoryProps) => (
  <div className="py-6 px-4 w-full">
    <ProgressSteps {...args} className={`w-full ${args.className ?? ""}`}>
      {steps.map((step) => (
        <ProgressSteps.Step key={step.title}>
          {showTitle && <ProgressSteps.Title>{step.title}</ProgressSteps.Title>}
          {showDescription && (
            <ProgressSteps.Description>{step.description}</ProgressSteps.Description>
          )}
        </ProgressSteps.Step>
      ))}
    </ProgressSteps>
  </div>
)
Base.args = {
  showTitle: true,
  showDescription: true,
}
Base.argTypes = {
  showTitle: { control: "boolean", name: "showTitle" },
  showDescription: { control: "boolean", name: "showDescription" },
}

export const Sizes = (args: ProgressStepsProps) => (
  <div className="py-6 px-4 w-full">
    <ProgressSteps {...args} className={`w-full ${args.className ?? ""}`}>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Step 1</ProgressSteps.Title>
      </ProgressSteps.Step>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Step 2</ProgressSteps.Title>
      </ProgressSteps.Step>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Step 3</ProgressSteps.Title>
      </ProgressSteps.Step>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Step 4</ProgressSteps.Title>
      </ProgressSteps.Step>
    </ProgressSteps>
  </div>
)
Sizes.args = {
  current: 2,
  size: "md",
}

export const Vertical = () => (
  <div className="flex gap-24 py-6 px-4 w-full">
    <div>
      <div className="text-tertiary text-sm mb-4">Default</div>
      <ProgressSteps current={2} orientation="vertical">
        <ProgressSteps.Step>
          <ProgressSteps.Title>Your details</ProgressSteps.Title>
          <ProgressSteps.Description>Please provide your name and email</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Company details</ProgressSteps.Title>
          <ProgressSteps.Description>A few details about your company</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Invite your team</ProgressSteps.Title>
          <ProgressSteps.Description>Start collaborating with your team</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Add your socials</ProgressSteps.Title>
          <ProgressSteps.Description>Share posts to your social accounts</ProgressSteps.Description>
        </ProgressSteps.Step>
      </ProgressSteps>
    </div>
    <div>
      <div className="text-tertiary text-sm mb-4">With dashed connector</div>
      <ProgressSteps current={3} orientation="vertical" connectorStyle="dashed">
        <ProgressSteps.Step>
          <ProgressSteps.Title>Your details</ProgressSteps.Title>
          <ProgressSteps.Description>Please provide your name and email</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Company details</ProgressSteps.Title>
          <ProgressSteps.Description>A few details about your company</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Invite your team</ProgressSteps.Title>
          <ProgressSteps.Description>Start collaborating with your team</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Add your socials</ProgressSteps.Title>
          <ProgressSteps.Description>Share posts to your social accounts</ProgressSteps.Description>
        </ProgressSteps.Step>
      </ProgressSteps>
    </div>
  </div>
)

export const WithIcons = () => (
  <div className="py-6 px-4 w-full">
    <ProgressSteps current={3} className="w-full">
      <ProgressSteps.Step icon={<Email />}>
        <ProgressSteps.Title>Your details</ProgressSteps.Title>
        <ProgressSteps.Description>Please provide your name and email</ProgressSteps.Description>
      </ProgressSteps.Step>
      <ProgressSteps.Step icon={<Globe />}>
        <ProgressSteps.Title>Company details</ProgressSteps.Title>
        <ProgressSteps.Description>Website and location</ProgressSteps.Description>
      </ProgressSteps.Step>
      <ProgressSteps.Step icon={<Users />}>
        <ProgressSteps.Title>Invite your team</ProgressSteps.Title>
        <ProgressSteps.Description>Start collaborating</ProgressSteps.Description>
      </ProgressSteps.Step>
      <ProgressSteps.Step icon={<Bolt />}>
        <ProgressSteps.Title>Get started</ProgressSteps.Title>
        <ProgressSteps.Description>Ready to go</ProgressSteps.Description>
      </ProgressSteps.Step>
    </ProgressSteps>
  </div>
)

export const WithNavigation = () => {
  const [step, setStep] = useState(1)
  const totalSteps = 4

  const navigationSteps = [
    { title: "Your details", description: "Please provide your name and email" },
    { title: "Company details", description: "A few details about your company" },
    { title: "Invite your team", description: "Start collaborating with your team" },
    { title: "Add your socials", description: "Share posts to your social accounts" },
  ]

  return (
    <div className="flex flex-col items-center gap-6">
      <ProgressSteps variant="minimal" current={step} total={totalSteps} />

      <div className="text-center">
        <h3 className="text-lg font-semibold">
          Step {step} of {totalSteps}
        </h3>
        <p className="text-secondary mt-1">
          {navigationSteps[Math.min(step - 1, totalSteps - 1)].title}
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          color="secondary"
          variant="outline"
          className="w-28"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          Previous
        </Button>
        <Button
          color="primary"
          className="w-28"
          onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
          disabled={step === totalSteps}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
WithNavigation.parameters = {
  layout: "centered",
}

export const Minimal = (args: ProgressStepsProps) => (
  <div className="flex items-center justify-between w-full max-w-xl p-4">
    <div className="w-8 h-8 bg-surface-elevated rounded-full" />
    <ProgressSteps variant="minimal" current={args.current} total={4} color={args.color} />
    <div className="w-8 h-8 bg-surface-elevated rounded-full" />
  </div>
)
Minimal.args = {
  current: 3,
  color: "default",
}
Minimal.parameters = {
  layout: "centered",
}

export const IconsOnly = () => (
  <div className="py-6 px-4 w-full">
    <ProgressSteps current={2} className="w-full">
      <ProgressSteps.Step />
      <ProgressSteps.Step />
      <ProgressSteps.Step />
      <ProgressSteps.Step />
    </ProgressSteps>
  </div>
)

export const SuccessColor = () => (
  <div className="flex flex-col gap-12 py-6 px-4 w-full">
    <div>
      <div className="text-tertiary text-sm mb-4">Default</div>
      <ProgressSteps current={3} className="w-full">
        <ProgressSteps.Step>
          <ProgressSteps.Title>Step 1</ProgressSteps.Title>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Step 2</ProgressSteps.Title>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Step 3</ProgressSteps.Title>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Step 4</ProgressSteps.Title>
        </ProgressSteps.Step>
      </ProgressSteps>
    </div>
    <div>
      <div className="text-tertiary text-sm mb-4">Success</div>
      <ProgressSteps current={3} color="success" className="w-full">
        <ProgressSteps.Step>
          <ProgressSteps.Title>Step 1</ProgressSteps.Title>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Step 2</ProgressSteps.Title>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Step 3</ProgressSteps.Title>
        </ProgressSteps.Step>
        <ProgressSteps.Step>
          <ProgressSteps.Title>Step 4</ProgressSteps.Title>
        </ProgressSteps.Step>
      </ProgressSteps>
    </div>
  </div>
)
