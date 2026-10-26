import { createElement, type ComponentType, type ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { Fragment, h, type Component, type VNodeArrayChildren } from "vue"
import { Badge as RBadge } from "../../packages/ui/src/components/Badge"
import { FieldError as RFieldError } from "../../packages/ui/src/components/FieldError"
import { Flask as RFlask } from "../../packages/ui/src/components/Icon"
import { LoadingIndicator as RLoadingIndicator } from "../../packages/ui/src/components/Indicator"
import { Progress as RProgress } from "../../packages/ui/src/components/Progress"
import { Badge } from "../../packages/vue/src/components/Badge"
import { FieldError } from "../../packages/vue/src/components/FieldError"
import { Flask } from "../../packages/vue/src/components/Icon"
import { LoadingIndicator } from "../../packages/vue/src/components/Indicator"
import { Progress } from "../../packages/vue/src/components/Progress"
import { renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

// React prop names map to Vue ones
const toVue = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

// Children shapes, built once per framework
type Children = "none" | "text" | "icon" | "loading" | "texts" | "fragment" | "nested"

const reactChildren = (kind: Children): ReactNode => {
  switch (kind) {
    case "none":
      return undefined
    case "text":
      return "Successful"
    case "icon":
      return [<RFlask key="i" />, " Beta"]
    case "loading":
      return [<RLoadingIndicator key="l" />, " In progress"]
    case "texts":
      return ["Step ", 2, " of ", 3]
    case "fragment":
      return [["Draft", " "], <RFlask key="i" />, " ", <b key="b">v2</b>]
    case "nested":
      return <span>Label <RFlask /></span>
  }
}

const vueChildren = (kind: Children): VNodeArrayChildren | undefined => {
  switch (kind) {
    case "none":
      return undefined
    case "text":
      return ["Successful"]
    case "icon":
      return [h(Flask), " Beta"]
    case "loading":
      return [h(LoadingIndicator), " In progress"]
    case "texts":
      return ["Step ", 2, " of ", 3]
    case "fragment":
      return [h(Fragment, ["Draft", " "]), h(Flask), " ", h("b", "v2")]
    case "nested":
      return [h("span", ["Label ", h(Flask)])]
  }
}

const parity = async (React: ComponentType<Props>, Vue: Component, props: Props, kind: Children = "none") => {
  const vueSlot = vueChildren(kind)
  return renderPair(createElement(React, props, reactChildren(kind)), () =>
    h(Vue as never, toVue(props), vueSlot ? { default: () => vueSlot } : undefined),
  )
}

type Case = [string, Props, Children?]

const badgeCases: Case[] = [
  ["default", {}, "text"],
  ["empty", {}],
  ["success lg", { color: "success", size: "lg" }, "text"],
  ["danger solid md", { color: "danger", variant: "solid", size: "md" }, "text"],
  ["warning outline pill", { color: "warning", variant: "outline", pill: true }, "text"],
  ["pill false", { pill: false }, "text"],
  ["info, discovery, caution", { color: "info" }, "text"],
  ["discovery soft", { color: "discovery", variant: "soft" }, "text"],
  ["caution solid", { color: "caution", variant: "solid" }, "text"],
  ["icon before text wraps the text", { color: "warning", size: "lg", pill: true }, "icon"],
  ["loading indicator with gap class", { size: "lg", className: "gap-1.5" }, "loading"],
  ["adjacent text and numbers merge into one node", {}, "texts"],
  ["fragment children flatten like arrays", {}, "fragment"],
  ["nested element children are wrapped too", {}, "nested"],
  ["className, style and attributes", { className: "x", style: { marginTop: "4px" }, id: "b", title: "Status", "aria-label": "Status" }, "text"],
  ["caller data attributes win, as {...rest} comes last", { color: "success", "data-color": "danger", "data-size": "xl", "data-pill": "yes" }, "text"],
]

const fieldErrorCases: Case[] = [
  ["default", {}, "text"],
  ["empty", {}],
  ["id and className", { id: "email-error", className: "mt-1" }, "text"],
  ["other attributes are dropped", { "aria-live": "polite", "data-x": "1", title: "t", style: { color: "red" } }, "text"],
  ["element children are not wrapped", {}, "icon"],
]

const progressCases: Case[] = [
  ["indeterminate by default", {}],
  ["explicit null", { value: null }],
  ["zero", { value: 0 }],
  ["value", { value: 40 }],
  ["fractional value", { value: 33.3 }],
  ["complete", { value: 100 }],
  ["custom max", { value: 50, max: 200 }],
  ["complete at custom max", { value: 8, max: 8 }],
  ["value above max is clamped", { value: 150 }],
  ["negative value is clamped", { value: -10 }],
  ["NaN value is indeterminate for Radix", { value: Number.NaN }],
  ["invalid max falls back to 100", { value: 30, max: 0 }],
  ["custom getValueLabel", { value: 3, max: 5, getValueLabel: (value: number, max: number) => `${value} of ${max} files` }],
  ["className, id and style", { value: 67, className: "my-2", id: "progress-upload", style: { width: "200px" } }],
  ["caller aria attributes win", { value: 20, "aria-label": "Upload", "aria-valuetext": "Almost there", "data-state": "custom" }],
  ["aria-labelledby", { value: 10, "aria-labelledby": "label-id" }],
]

describe("Badge parity", () => {
  test.each(badgeCases)("%s", async (_name, props, kind) => {
    const { react, vue } = await parity(RBadge as never, Badge, props, kind)
    expect(vue).toBe(react)
  })
})

describe("FieldError parity", () => {
  test.each(fieldErrorCases)("%s", async (_name, props, kind) => {
    const { react, vue } = await parity(RFieldError as never, FieldError, props, kind)
    expect(vue).toBe(react)
  })
})

describe("Progress parity", () => {
  test.each(progressCases)("%s", async (_name, props, kind) => {
    const { react, vue } = await parity(RProgress as never, Progress, props, kind)
    expect(vue).toBe(react)
  })

  test("value changes update the root and the indicator", async () => {
    const { react, vue } = await walkPairWithState(
      { value: 13 as number | null, max: 100 },
      (state) => <RProgress value={state.value} max={state.max} />,
      (state) => h(Progress, { value: state.value, max: state.max }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ value: 66 })
        snapshot()
        await set({ value: null })
        snapshot()
        await set({ value: 100 })
        snapshot()
        await set({ max: 400 })
        snapshot()
        await set({ value: 0 })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(new Set(react).size).toBe(6)
    expect(react[2]).toContain("data-indeterminate")
    expect(react[3]).toContain('data-state="complete"')
  })
})

describe("Badge and FieldError updates", () => {
  test("re-render on prop and slot changes", async () => {
    const { react, vue } = await walkPairWithState(
      { color: "secondary", pill: false, message: "Required" },
      (state) => (
        <>
          <RBadge color={state.color as never} pill={state.pill}>
            New
          </RBadge>
          <RFieldError>{state.message}</RFieldError>
        </>
      ),
      (state) =>
        h(Fragment, [
          h(Badge, { color: state.color as never, pill: state.pill }, { default: () => "New" }),
          h(FieldError, null, { default: () => state.message }),
        ]),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ color: "danger", pill: true })
        snapshot()
        await set({ pill: false, message: "Enter a valid email" })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(new Set(react).size).toBe(3)
  })
})
