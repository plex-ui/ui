import { type Meta } from "@storybook/react"
import { StatsCard, type StatsCardProps } from "./"

const meta: Meta<StatsCardProps> = {
  title: "Components/StatsCard",
  component: StatsCard,
  args: {
    label: "Total Revenue",
    value: "$45,231",
    trend: { value: 12.5, label: "vs last month" },
    description: "Monthly recurring revenue",
    size: "default",
    variant: "default",
    trendPosition: "value",
    trendVariant: "text",
  },
  argTypes: {
    icon: { control: false },
    sparkline: { control: false },
    size: { control: "select", options: ["default", "sm"] },
    variant: { control: "select", options: ["default", "accent"] },
    trendPosition: { control: "select", options: ["value", "header"] },
    trendVariant: { control: "select", options: ["text", "badge"] },
    accentColor: {
      control: "select",
      options: ["primary", "info", "success", "warning", "danger", "discovery"],
    },
  },
} satisfies Meta<typeof StatsCard>

export default meta

export const Base = (args: StatsCardProps) => <StatsCard {...args} />

Base.args = {
  label: "Total Revenue",
  value: "$45,231",
  trend: { value: 12.5, label: "vs last month" },
  description: "Monthly recurring revenue",
  tooltip: "Total revenue across all channels",
}

export const Sizes = () => (
  <div className="flex flex-col gap-6" style={{ maxWidth: 720 }}>
    <div>
      <div className="text-tertiary text-sm mb-2">size=&quot;default&quot;</div>
      <div className="grid grid-cols-3 gap-4">
        <StatsCard label="Total Revenue" value="$45,231" trend={{ value: 12.5 }} />
        <StatsCard label="Active Users" value="2,847" trend={{ value: 8.2 }} />
        <StatsCard label="Conversion Rate" value="3.24%" trend={{ value: -1.8 }} />
      </div>
    </div>
    <div>
      <div className="text-tertiary text-sm mb-2">size=&quot;sm&quot;</div>
      <div className="grid grid-cols-3 gap-3">
        <StatsCard
          size="sm"
          label="Total Inquiries"
          value="3,544"
          trend={{ value: -2.6 }}
          tooltip="Total inquiries in the selected period"
        />
        <StatsCard
          size="sm"
          label="Avg Completion Rate"
          value="89.2%"
          trend={{ value: 0.5 }}
          tooltip="Average across all templates"
        />
        <StatsCard
          size="sm"
          label="Avg Approval Rate"
          value="84.6%"
          trend={{ value: 1.8 }}
          tooltip="Average across all templates"
        />
      </div>
    </div>
  </div>
)

Sizes.parameters = { controls: { disable: true } }

export const TrendPositions = () => (
  <div className="grid grid-cols-2 gap-6" style={{ maxWidth: 600 }}>
    <div>
      <div className="text-tertiary text-sm mb-2">trendPosition=&quot;value&quot;</div>
      <StatsCard
        label="Total Revenue"
        value="$45,231"
        trend={{ value: 12.5, label: "vs last month" }}
      />
    </div>
    <div>
      <div className="text-tertiary text-sm mb-2">trendPosition=&quot;header&quot;</div>
      <StatsCard
        label="Total Revenue"
        value="$45,231"
        trend={{ value: 12.5, label: "vs last month" }}
        trendPosition="header"
      />
    </div>
  </div>
)

TrendPositions.parameters = { controls: { disable: true } }

export const TrendVariants = () => (
  <div className="grid grid-cols-2 gap-6" style={{ maxWidth: 600 }}>
    <div>
      <div className="text-tertiary text-sm mb-2">trendVariant=&quot;text&quot;</div>
      <StatsCard label="Active Users" value="2,847" trend={{ value: 8.2 }} />
    </div>
    <div>
      <div className="text-tertiary text-sm mb-2">trendVariant=&quot;badge&quot;</div>
      <StatsCard label="Active Users" value="2,847" trend={{ value: 8.2 }} trendVariant="badge" />
    </div>
    <div>
      <div className="text-tertiary text-sm mb-2">badge + header position</div>
      <StatsCard
        label="Error Rate"
        value="0.12%"
        trend={{ value: -0.5 }}
        invertTrend
        trendVariant="badge"
        trendPosition="header"
      />
    </div>
    <div>
      <div className="text-tertiary text-sm mb-2">badge + negative</div>
      <StatsCard label="Churn Rate" value="2.4%" trend={{ value: 0.3 }} invertTrend trendVariant="badge" />
    </div>
  </div>
)

TrendVariants.parameters = { controls: { disable: true } }

export const WithInfoTooltip = () => (
  <div className="grid grid-cols-3 gap-4" style={{ maxWidth: 720 }}>
    <StatsCard
      label="Total Revenue"
      value="$45,231"
      trend={{ value: 12.5 }}
      tooltip="Sum of all revenue streams including subscriptions and one-time purchases"
    />
    <StatsCard
      label="Active Users"
      value="2,847"
      trend={{ value: 8.2 }}
      tooltip="Users with at least one session in the last 30 days"
    />
    <StatsCard
      label="Avg Response Time"
      value="234ms"
      trend={{ value: 15.3 }}
      invertTrend
      tooltip="P50 response time across all API endpoints"
    />
  </div>
)

WithInfoTooltip.parameters = { controls: { disable: true } }

export const WithProgress = (args: StatsCardProps) => <StatsCard {...args} />

WithProgress.args = {
  label: "Storage Used",
  value: "7.2 GB",
  progress: 72,
  progressLabel: "72%",
  description: "of 10 GB",
  trend: undefined,
}

export const WithIcon = (args: StatsCardProps) => <StatsCard {...args} />

WithIcon.args = {
  label: "Total Orders",
  value: "1,234",
  trend: { value: -3.1, label: "vs last week" },
  icon: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 6.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm-6.25-.75a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5ZM2 17.5h16a.75.75 0 0 0 0-1.5H2a.75.75 0 0 0 0 1.5Z" />
    </svg>
  ),
}

const ACCENT_COLORS = ["primary", "info", "success", "warning", "danger", "discovery"] as const

export const AccentColors = () => (
  <div className="grid grid-cols-3 gap-4" style={{ maxWidth: 720 }}>
    {ACCENT_COLORS.map((color) => (
      <StatsCard
        key={color}
        label={color}
        value="1,234"
        variant="accent"
        accentColor={color}
        trend={{ value: 5.2 }}
      />
    ))}
  </div>
)

AccentColors.parameters = { controls: { disable: true } }

export const Grid = () => (
  <div className="grid grid-cols-4 gap-4" style={{ maxWidth: 960 }}>
    <StatsCard
      label="Total Revenue"
      value="$45,231"
      trend={{ value: 12.5, label: "vs last month" }}
      tooltip="Sum of all revenue streams"
    />
    <StatsCard
      label="Active Users"
      value="2,847"
      trend={{ value: 8.2 }}
      trendVariant="badge"
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
        </svg>
      }
    />
    <StatsCard
      label="Conversion Rate"
      value="3.24%"
      trend={{ value: -1.8 }}
      variant="accent"
      accentColor="warning"
      trendPosition="header"
    />
    <StatsCard
      label="Storage Used"
      value="7.2 GB"
      progress={72}
      progressLabel="72%"
      description="of 10 GB"
    />
  </div>
)

Grid.parameters = { controls: { disable: true } }

export const AnalyticsDashboard = () => (
  <div className="flex flex-col gap-4" style={{ maxWidth: 960 }}>
    <div className="text-tertiary text-sm">
      Compact analytics row (size=&quot;sm&quot; + tooltip)
    </div>
    <div className="grid grid-cols-3 gap-3">
      <StatsCard
        size="sm"
        label="Total Inquiries"
        value="3,544"
        trend={{ value: -2.6 }}
        tooltip="Total inquiries created in the selected period"
      />
      <StatsCard
        size="sm"
        label="Avg Completion Rate"
        value="89.2%"
        trend={{ value: 0.5 }}
        tooltip="Percentage of inquiries reaching final state"
      />
      <StatsCard
        size="sm"
        label="Avg Approval Rate"
        value="84.6%"
        trend={{ value: 1.8 }}
        tooltip="Percentage of completed inquiries that were approved"
      />
    </div>
    <div className="text-tertiary text-sm mt-4">
      Full dashboard mix
    </div>
    <div className="grid grid-cols-4 gap-4">
      <StatsCard
        label="Revenue"
        value="$142K"
        trend={{ value: 12.5, label: "vs last month" }}
        tooltip="Monthly recurring revenue"
        trendVariant="badge"
      />
      <StatsCard
        label="Customers"
        value="1,847"
        trend={{ value: 4.2 }}
        trendPosition="header"
      />
      <StatsCard
        label="Error Rate"
        value="0.12%"
        trend={{ value: -0.5 }}
        invertTrend
        variant="accent"
        accentColor="danger"
        trendVariant="badge"
        trendPosition="header"
      />
      <StatsCard
        label="Uptime"
        value="99.98%"
        trend={{ value: 0.01 }}
        description="30-day average"
        variant="accent"
        accentColor="success"
      />
    </div>
  </div>
)

AnalyticsDashboard.parameters = { controls: { disable: true } }
