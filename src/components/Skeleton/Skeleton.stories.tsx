import { type Meta } from "@storybook/react"
import { Skeleton, type SkeletonProps } from "./"

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Skeleton>

export default meta

export const Base = (args: SkeletonProps) => <Skeleton {...args} className="h-4 w-[200px]" />

export const Avatar = () => (
  <div className="flex items-center gap-4">
    <Skeleton circle className="size-12" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[150px]" />
    </div>
  </div>
)

Avatar.parameters = {
  docs: {
    description: {
      story: "Avatar skeleton with circle and text lines.",
    },
  },
}

export const Card = () => (
  <div className="flex flex-col gap-3 w-[300px] p-4 border border-default rounded-xl">
    <Skeleton className="h-[150px] w-full rounded-lg" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
)

Card.parameters = {
  docs: {
    description: {
      story: "Card skeleton with image placeholder and text lines.",
    },
  },
}

export const Text = () => (
  <div className="flex flex-col gap-2 w-[300px]">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
)

Text.parameters = {
  docs: {
    description: {
      story: "Multiple text lines with varying widths for paragraph placeholders.",
    },
  },
}

export const Form = () => (
  <div className="flex flex-col gap-4 w-[300px]">
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-[80px]" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <Skeleton className="h-10 w-[120px] rounded-lg" />
  </div>
)

Form.parameters = {
  docs: {
    description: {
      story: "Form skeleton using Plex UI control size (32px height for inputs and buttons).",
    },
  },
}

export const Table = () => (
  <div className="flex flex-col gap-2 w-[400px]">
    <div className="flex gap-4 pb-2 border-b border-default">
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-4 w-[80px]" />
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex gap-4 py-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-4 w-[80px]" />
      </div>
    ))}
  </div>
)

Table.parameters = {
  docs: {
    description: {
      story: "Table skeleton with header and multiple rows.",
    },
  },
}
