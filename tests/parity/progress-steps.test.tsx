import { createElement, type ComponentType, type ReactNode } from "react"
import { render } from "@testing-library/react"
import { compile } from "@vue/compiler-dom"
import { describe, expect, test, vi } from "vitest"
import * as Vue from "vue"
import { createCommentVNode, defineComponent, h, type Component, type VNodeArrayChildren } from "vue"
import { ProgressSteps as RProgressSteps } from "../../packages/ui/src/components/ProgressSteps"
import REmail from "../../packages/ui/src/components/Icon/svg/Email"
import RGlobe from "../../packages/ui/src/components/Icon/svg/Globe"
import {
  ProgressSteps,
  ProgressStepsDescription,
  ProgressStepsStep,
  ProgressStepsTitle,
} from "../../packages/vue/src/components/ProgressSteps"
import Email from "../../packages/vue/src/components/Icon/svg/Email"
import Globe from "../../packages/vue/src/components/Icon/svg/Globe"
import { mountVue } from "./harness"
import { renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

// A step as data: title / description text, an icon ("email" / "globe" as a
// prop, "slot:email" through the Vue `icon` slot), or null for React's
// `{false && <Step />}` (a `v-if` placeholder in Vue), or a text child
type StepSpec = { title?: string; description?: string; icon?: string; titleClass?: string; descriptionClass?: string } | null | string

const RIcons: Record<string, ComponentType> = { email: REmail, globe: RGlobe }
const VIcons: Record<string, Component> = { email: Email, globe: Globe }

const reactStep = (spec: Exclude<StepSpec, null | string>, key: number) =>
  createElement(
    RProgressSteps.Step,
    { key, icon: spec.icon === "text" ? "★" : spec.icon ? createElement(RIcons[spec.icon.replace("slot:", "")]!) : undefined },
    spec.title !== undefined ? createElement(RProgressSteps.Title, { className: spec.titleClass }, spec.title) : null,
    spec.description !== undefined
      ? createElement(RProgressSteps.Description, { className: spec.descriptionClass }, spec.description)
      : null,
  )

const vueStep = (spec: Exclude<StepSpec, null | string>) => {
  const slotIcon = spec.icon?.startsWith("slot:") ? VIcons[spec.icon.slice(5)] : undefined
  const propIcon = spec.icon === "text" ? "★" : spec.icon && !slotIcon ? VIcons[spec.icon] : undefined
  return h(ProgressStepsStep, { icon: propIcon }, {
    default: () => [
      spec.title !== undefined ? h(ProgressStepsTitle, { class: spec.titleClass }, { default: () => spec.title }) : null,
      spec.description !== undefined
        ? h(ProgressStepsDescription, { class: spec.descriptionClass }, { default: () => spec.description })
        : null,
    ],
    ...(slotIcon ? { icon: () => h(slotIcon) } : {}),
  })
}

const reactSteps = (props: Props, steps: StepSpec[]) =>
  createElement(
    RProgressSteps as ComponentType<Props>,
    props,
    ...steps.map((spec, index): ReactNode => (spec === null ? false : typeof spec === "string" ? spec : reactStep(spec, index))),
  )

const vueSteps = (props: Props, steps: StepSpec[]) =>
  h(ProgressSteps as Component, vueProps(props), {
    default: (): VNodeArrayChildren =>
      steps.map((spec) => (spec === null ? createCommentVNode("v-if", true) : typeof spec === "string" ? spec : vueStep(spec))),
  })

const vueProps = ({ className, ...props }: Props) => ({ ...props, ...(className ? { class: className } : {}) })

const FOUR: StepSpec[] = [
  { title: "Your details", description: "Please provide your name and email" },
  { title: "Company details", description: "A few details about your company" },
  { title: "Invite your team", description: "Start collaborating with your team" },
  { title: "Add your socials", description: "Share posts to your social accounts" },
]
const EMPTY_FOUR: StepSpec[] = [{}, {}, {}, {}]

const cases: [string, Props, StepSpec[]][] = [
  ...[0, 1, 2, 3, 4, 5].map((current): [string, Props, StepSpec[]] => [`current ${current}`, { current }, FOUR]),
  ["vertical", { current: 2, orientation: "vertical" }, FOUR],
  ["dashed connector", { current: 3, orientation: "vertical", connectorStyle: "dashed" }, FOUR],
  ["size sm", { current: 2, size: "sm" }, FOUR],
  ["size lg", { current: 2, size: "lg" }, FOUR],
  ["color success", { current: 3, color: "success" }, FOUR],
  ["class applied, other attributes dropped", { current: 2, className: "w-full", id: "steps", "aria-label": "Nope" }, FOUR],
  ["icons only", { current: 2 }, EMPTY_FOUR],
  ["title only", { current: 2 }, [{ title: "Step 1" }, { title: "Step 2" }, { title: "Step 3" }]],
  ["title and description classes", { current: 1 }, [{ title: "A", titleClass: "t", description: "B", descriptionClass: "d" }, { title: "C" }]],
  ["icon prop (completed steps still show the check)", { current: 3 }, [{ icon: "email", title: "A" }, { icon: "globe" }, { icon: "email" }, { icon: "globe" }]],
  ["icon slot", { current: 1 }, [{ icon: "slot:email" }, { icon: "slot:globe" }]],
  ["text icon", { current: 1 }, [{ icon: "text" }, { icon: "text" }]],
  ["single step is last", { current: 1 }, [{ title: "Only" }]],
  ["no steps", { current: 1 }, []],
  ["an empty child still counts and shifts the indices (React's Children.count)", { current: 2 }, [{ title: "A" }, null, { title: "B" }]],
  ["text children count and render as they are", { current: 1 }, [{ title: "A" }, "between", { title: "B" }]],
  ["minimal ignores children", { variant: "minimal", current: 2, total: 3 }, FOUR],
]

describe("ProgressSteps parity", () => {
  test.each(cases)("%s", async (_name, props, steps) => {
    const pair = await renderPair(reactSteps(props, steps), () => vueSteps(props, steps))
    expect(pair.vue).toBe(pair.react)
  })

  test.each([
    ["minimal", { variant: "minimal", current: 3, total: 4 }],
    ["minimal current 0", { variant: "minimal", current: 0, total: 4 }],
    ["minimal current past the end", { variant: "minimal", current: 6, total: 4 }],
    ["minimal success, size, class", { variant: "minimal", current: 2, total: 5, color: "success", size: "lg", className: "mx-auto" }],
    ["minimal fractional total", { variant: "minimal", current: 1, total: 2.5 }],
  ])("%s", async (_name, props) => {
    const pair = await renderPair(reactSteps(props, []), () => vueSteps(props, []))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('role="progressbar"')
  })

  test("a production v-if placeholder (empty comment) counts too; other comments do not", async () => {
    const steps: StepSpec[] = [{ title: "A" }, null, { title: "B" }]
    const pair = await renderPair(reactSteps({ current: 1 }, steps), () =>
      h(ProgressSteps, { current: 1 }, {
        default: () => [vueStep({ title: "A" }), createCommentVNode("", true), createCommentVNode(" note "), vueStep({ title: "B" })],
      }),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('"3"')
  })

  test("minimal without a positive total warns once (dev) and renders no segments", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const props = { variant: "minimal", current: 1 }
    const pair = await renderPair(reactSteps(props, []), () => vueSteps(props, []))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('aria-valuemax="0"')
    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages.filter((m) => m.startsWith("[ProgressSteps]"))).toHaveLength(2)
    expect(warn.mock.calls.every((call) => call[1] === undefined)).toBe(true)
  })

  test("Step outside ProgressSteps throws in both", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(createElement(RProgressSteps.Step))).toThrow("ProgressSteps components must be wrapped in <ProgressSteps />")
    const errors: unknown[] = []
    const App = defineComponent({
      errorCaptured(error) {
        errors.push(error)
        return false
      },
      render: () => h(ProgressStepsStep),
    })
    // Vue also warns that the step, whose setup threw, has no render function
    vi.spyOn(console, "warn").mockImplementation(() => {})
    mountVue(() => h(App))
    expect(String(errors[0])).toContain("ProgressSteps components must be wrapped in <ProgressSteps />")
  })
})

// Compiles a template the way the docs previews do, so v-for and v-if produce real vnodes
const fromTemplate = (template: string) => {
  const { code } = compile(template, { hoistStatic: true })
  const renderFn = new Function("Vue", code)(Vue) as Vue.RenderFunction & { _rc?: boolean }
  renderFn._rc = true
  return () =>
    h(defineComponent({ components: { ProgressSteps, ProgressStepsStep, ProgressStepsTitle, ProgressStepsDescription }, render: renderFn }))
}

describe("ProgressSteps template children", () => {
  test("v-for flattens, v-if off still counts, as in React", async () => {
    const template = `<ProgressSteps :current="2" class="w-full">
  <ProgressStepsStep>
    <ProgressStepsTitle>First</ProgressStepsTitle>
  </ProgressStepsStep>
  <!-- a template comment is not a step -->
  <ProgressStepsStep v-for="title in ['Second', 'Third']" :key="title">
    <ProgressStepsTitle>{{ title }}</ProgressStepsTitle>
  </ProgressStepsStep>
  <ProgressStepsStep v-if="false"><ProgressStepsTitle>Hidden</ProgressStepsTitle></ProgressStepsStep>
  <ProgressStepsStep><ProgressStepsTitle>Last</ProgressStepsTitle></ProgressStepsStep>
</ProgressSteps>`
    const react = (
      <RProgressSteps current={2} className="w-full">
        <RProgressSteps.Step>
          <RProgressSteps.Title>First</RProgressSteps.Title>
        </RProgressSteps.Step>
        {/* a template comment is not a step */}
        {["Second", "Third"].map((title) => (
          <RProgressSteps.Step key={title}>
            <RProgressSteps.Title>{title}</RProgressSteps.Title>
          </RProgressSteps.Step>
        ))}
        {false && (
          <RProgressSteps.Step>
            <RProgressSteps.Title>Hidden</RProgressSteps.Title>
          </RProgressSteps.Step>
        )}
        <RProgressSteps.Step>
          <RProgressSteps.Title>Last</RProgressSteps.Title>
        </RProgressSteps.Step>
      </RProgressSteps>
    )
    const pair = await renderPair(react, fromTemplate(template))
    expect(pair.vue).toBe(pair.react)
    // 5 children: the hidden step still counts, so "Last" (index 4) is last and shows "5"
    expect(pair.react).toContain('"5"')
  })

  // A wrapper component passes its children on (React) or forwards its slot
  // (Vue): the steps it forwards are counted and indexed one by one
  test.each([["template <slot />"], ["render function renderSlot()"]])("a wrapper forwarding its slot: %s", async (kind) => {
    const compileRender = (template: string) => {
      const { code } = compile(template, { hoistStatic: true })
      const renderFn = new Function("Vue", code)(Vue) as Vue.RenderFunction & { _rc?: boolean }
      renderFn._rc = true
      return renderFn
    }
    const Wrapper =
      kind === "template <slot />"
        ? defineComponent({ components: { ProgressSteps }, render: compileRender(`<ProgressSteps :current="2"><slot /></ProgressSteps>`) })
        : defineComponent({
            setup: (_, { slots }) => () => h(ProgressSteps, { current: 2 }, { default: () => [Vue.renderSlot(slots, "default")] }),
          })
    const App = defineComponent({
      components: { Wrapper, ProgressStepsStep, ProgressStepsTitle },
      render: compileRender(`<Wrapper>
  <ProgressStepsStep><ProgressStepsTitle>One</ProgressStepsTitle></ProgressStepsStep>
  <ProgressStepsStep><ProgressStepsTitle>Two</ProgressStepsTitle></ProgressStepsStep>
  <ProgressStepsStep><ProgressStepsTitle>Three</ProgressStepsTitle></ProgressStepsStep>
</Wrapper>`),
    })
    const RWrapper = ({ children }: { children?: ReactNode }) => <RProgressSteps current={2}>{children}</RProgressSteps>
    const react = (
      <RWrapper>
        <RProgressSteps.Step>
          <RProgressSteps.Title>One</RProgressSteps.Title>
        </RProgressSteps.Step>
        <RProgressSteps.Step>
          <RProgressSteps.Title>Two</RProgressSteps.Title>
        </RProgressSteps.Step>
        <RProgressSteps.Step>
          <RProgressSteps.Title>Three</RProgressSteps.Title>
        </RProgressSteps.Step>
      </RWrapper>
    )
    const pair = await renderPair(react, () => h(App))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('"3"')
  })
})

describe("ProgressSteps state walk", () => {
  test("template with stable slots: adding and removing steps moves the connector", async () => {
    type State = { current: number; titles: string[] }
    const template = `<ProgressSteps :current="current">
  <ProgressStepsStep v-for="title in titles" :key="title">
    <ProgressStepsTitle>{{ title }}</ProgressStepsTitle>
  </ProgressStepsStep>
</ProgressSteps>`
    const { code } = compile(template, { hoistStatic: true })
    const renderFn = new Function("Vue", code)(Vue) as Vue.RenderFunction & { _rc?: boolean }
    renderFn._rc = true
    let vueState: State | undefined
    const App = defineComponent({
      components: { ProgressSteps, ProgressStepsStep, ProgressStepsTitle },
      setup: () => vueState!,
      render: renderFn,
    })
    const { react, vue } = await walkPairWithState<State>(
      { current: 1, titles: ["One", "Two"] },
      (state) => (
        <RProgressSteps current={state.current}>
          {state.titles.map((title) => (
            <RProgressSteps.Step key={title}>
              <RProgressSteps.Title>{title}</RProgressSteps.Title>
            </RProgressSteps.Step>
          ))}
        </RProgressSteps>
      ),
      (state) => {
        vueState = state
        return h(App)
      },
      async ({ set, snapshot }) => {
        snapshot()
        await set({ titles: ["One", "Two", "Three"] }) // "Two" gains a connector
        snapshot()
        await set({ current: 3 })
        snapshot()
        await set({ titles: ["One", "Two"] }) // "Two" is last again
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).not.toBe(react[0])
  })

  test("current, size, variant and the step count change", async () => {
    type State = { current: number; count: number; variant: string; size: string; total: number }
    const titles = ["One", "Two", "Three", "Four", "Five"]
    const stepsOf = (count: number): StepSpec[] => titles.slice(0, count).map((title) => ({ title }))
    const { react, vue } = await walkPairWithState<State>(
      { current: 1, count: 3, variant: "default", size: "md", total: 3 },
      (state) => reactSteps({ current: state.current, variant: state.variant, size: state.size, total: state.total }, stepsOf(state.count)),
      (state) => vueSteps({ current: state.current, variant: state.variant, size: state.size, total: state.total }, stepsOf(state.count)),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ current: 2 })
        snapshot()
        await set({ count: 5 }) // "Three" is no longer last: it gains a connector
        snapshot()
        await set({ count: 2 })
        snapshot()
        await set({ size: "lg", current: 3 })
        snapshot()
        await set({ variant: "minimal", total: 4 })
        snapshot()
        await set({ total: 6, current: 5 })
        snapshot()
        await set({ variant: "default", count: 4 })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[2]).not.toBe(react[1])
  })
})
