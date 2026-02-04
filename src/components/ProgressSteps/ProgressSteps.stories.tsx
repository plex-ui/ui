import type { Meta } from "@storybook/react"
import { useState } from "react"
import { Button } from "../Button"
import { Bolt, Email, Globe, Users } from "../Icon"
import { ProgressSteps, type ProgressStepsProps } from "./"

const meta = {
  title: "Components/Progress Steps",
  component: ProgressSteps,
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

export const Base = (args: ProgressStepsProps) => (
  <div className="py-6">
    <ProgressSteps {...args}>
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
)

export const Sizes = (args: ProgressStepsProps) => (
  <div className="py-6">
    <ProgressSteps {...args}>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Step 1</ProgressSteps.Title>
      </ProgressSteps.Step>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Step 2</ProgressSteps.Title>
      </ProgressSteps.Step>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Step 3</ProgressSteps.Title>
      </ProgressSteps.Step>
    </ProgressSteps>
  </div>
)
Sizes.args = {
  current: 2,
  size: "md",
}

export const Vertical = () => (
  <div className="flex gap-12">
    <div>
      <h4 className="text-sm font-medium mb-4">Default</h4>
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
      <h4 className="text-sm font-medium mb-4">With dashed connector</h4>
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
  <ProgressSteps current={3}>
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
)

export const Interactive = () => {
  const [step, setStep] = useState(1)
  const totalSteps = 4

  const steps = [
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
        <p className="text-secondary mt-1">{steps[Math.min(step - 1, totalSteps - 1)].title}</p>
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

export const AllStates = () => (
  <div className="flex flex-col gap-12">
    <div>
      <h4 className="text-sm font-medium mb-4">Step 1 of 4</h4>
      <ProgressSteps current={1}>
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
      <h4 className="text-sm font-medium mb-4">Step 2 of 4</h4>
      <ProgressSteps current={2}>
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
      <h4 className="text-sm font-medium mb-4">Step 3 of 4</h4>
      <ProgressSteps current={3}>
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
      <h4 className="text-sm font-medium mb-4">Completed</h4>
      <ProgressSteps current={5}>
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

export const DashedConnector = (args: ProgressStepsProps) => (
  <div className="py-6">
    <ProgressSteps {...args}>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Your details</ProgressSteps.Title>
        <ProgressSteps.Description>Please provide your info</ProgressSteps.Description>
      </ProgressSteps.Step>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Company details</ProgressSteps.Title>
        <ProgressSteps.Description>About your company</ProgressSteps.Description>
      </ProgressSteps.Step>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Invite your team</ProgressSteps.Title>
        <ProgressSteps.Description>Start collaborating</ProgressSteps.Description>
      </ProgressSteps.Step>
      <ProgressSteps.Step>
        <ProgressSteps.Title>Add your socials</ProgressSteps.Title>
        <ProgressSteps.Description>Automatic sharing</ProgressSteps.Description>
      </ProgressSteps.Step>
    </ProgressSteps>
  </div>
)
DashedConnector.args = {
  current: 2,
  connectorStyle: "dashed",
}

export const Minimal = () => (
  <div className="flex items-center justify-between w-full max-w-xl p-4">
    <div className="w-8 h-8 bg-surface-elevated rounded-full" />
    <ProgressSteps variant="minimal" current={3} total={4} />
    <div className="w-8 h-8 bg-surface-elevated rounded-full" />
  </div>
)

export const SuccessColor = () => (
  <div className="flex flex-col gap-12">
    <div>
      <h4 className="text-sm font-medium mb-4">Default</h4>
      <ProgressSteps current={3}>
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
      <h4 className="text-sm font-medium mb-4">Success</h4>
      <ProgressSteps current={3} color="success">
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
