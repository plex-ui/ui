import { type Meta } from "@storybook/react"
import { ArrowRight } from "../Icon"
import { Button } from "../Button"
import { Card, type CardProps } from "./Card"

const meta = {
  title: "Components/Card",
  component: Card,
} satisfies Meta<typeof Card>

export default meta

export const Base = (args: CardProps) => (
  <Card {...args} style={{ maxWidth: 360 }}>
    <Card.Header>
      <Card.Title>Project activity</Card.Title>
      <Card.Description>
        Summary of events across your workspace over the last 7 days.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      Your team opened 12 issues and closed 8 pull requests this week.
    </Card.Content>
    <Card.Footer>
      <Button color="primary" size="sm">View report</Button>
      <Button color="secondary" variant="outline" size="sm">Dismiss</Button>
    </Card.Footer>
  </Card>
)

Base.args = {
  variant: "outline",
  size: "md",
}

export const AllVariants = () => (
  <div style={{ display: "flex", gap: 16 }}>
    {(["outline", "solid", "ghost"] as const).map((v) => (
      <Card key={v} variant={v} style={{ width: 240 }}>
        <Card.Header>
          <Card.Title style={{ textTransform: "capitalize" }}>{v}</Card.Title>
          <Card.Description>variant=&quot;{v}&quot;</Card.Description>
        </Card.Header>
        <Card.Content>Body content.</Card.Content>
      </Card>
    ))}
  </div>
)

export const AllSizes = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 360 }}>
    {(["sm", "md", "lg"] as const).map((s) => (
      <Card key={s} size={s}>
        <Card.Header>
          <Card.Title style={{ textTransform: "uppercase" }}>{s}</Card.Title>
          <Card.Description>size=&quot;{s}&quot;</Card.Description>
        </Card.Header>
      </Card>
    ))}
  </div>
)

export const WithAction = () => (
  <Card style={{ maxWidth: 360 }}>
    <Card.Header>
      <Card.Title>Team members</Card.Title>
      <Card.Description>Invite your team to collaborate.</Card.Description>
      <Card.Action>
        <Button color="secondary" variant="outline" size="sm">Invite</Button>
      </Card.Action>
    </Card.Header>
    <Card.Content>3 members</Card.Content>
  </Card>
)

export const AsLink = () => (
  <Card href="/components/button" interactive style={{ maxWidth: 320 }}>
    <Card.Header>
      <Card.Title>Button</Card.Title>
      <Card.Description>Triggers actions, submits forms, opens dialogs.</Card.Description>
      <Card.Action>
        <ArrowRight style={{ width: 18, height: 18, opacity: 0.6 }} />
      </Card.Action>
    </Card.Header>
  </Card>
)
