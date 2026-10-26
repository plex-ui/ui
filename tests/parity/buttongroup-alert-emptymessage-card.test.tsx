import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, type ComponentType, type ReactNode } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { createCommentVNode, createTextVNode, defineComponent, Fragment, h, type VNode } from "vue"
import { Alert as RAlert } from "../../packages/ui/src/components/Alert"
import { Button as RButton } from "../../packages/ui/src/components/Button"
import { ButtonGroup as RButtonGroup } from "../../packages/ui/src/components/ButtonGroup"
import { Card as RCard } from "../../packages/ui/src/components/Card"
import { EmptyMessage as REmptyMessage } from "../../packages/ui/src/components/EmptyMessage"
import RLightbulb from "../../packages/ui/src/components/Icon/svg/Lightbulb"
import { PlexUIProvider as RPlexUIProvider } from "../../packages/ui/src/components/PlexUIProvider"
import { Alert } from "../../packages/vue/src/components/Alert"
import { Button } from "../../packages/vue/src/components/Button"
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "../../packages/vue/src/components/ButtonGroup"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../packages/vue/src/components/Card"
import {
  EmptyMessage,
  EmptyMessageActionRow,
  EmptyMessageDescription,
  EmptyMessageIcon,
  EmptyMessageTitle,
} from "../../packages/vue/src/components/EmptyMessage"
import Lightbulb from "../../packages/vue/src/components/Icon/svg/Lightbulb"
import { PlexUIProvider } from "../../packages/vue/src/components/PlexUIProvider"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

// Test CSS modules are unscoped, so ButtonGroup's `.Separator` and the base
// Separator's `.Separator` would both be "Separator", and Vue's mergeProps
// skips a fallthrough class identical to the root's. Real builds hash each
// module separately; give the ButtonGroup one its own name here too.
vi.mock("@plexui/styles/components/ButtonGroup/ButtonGroup.module.css", async (importOriginal) => {
  const actual = await importOriginal<{ default: Record<string, string> }>()
  return { default: { ...actual.default, Separator: "ButtonGroupSeparator" } }
})

type AnyComponent = ComponentType<Props>

const noop = () => {}

// React className → Vue class
const vueProps = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

// React compound parts (`ButtonGroup.Separator`, ...) by name
const part = (root: unknown, name: string) => (root as Record<string, AnyComponent>)[name]!

/* ------------------------------------------------------------------ */
/*  ButtonGroup                                                        */
/* ------------------------------------------------------------------ */

const RSeparator = part(RButtonGroup, "Separator")
const RText = part(RButtonGroup, "Text")

const reactButtons = (labels: string[]) => labels.map((label) => <RButton key={label} variant="outline" color="secondary">{label}</RButton>)
const vueButtons = (labels: string[]) => labels.map((label) => h(Button, { variant: "outline", color: "secondary" }, () => label))

describe("ButtonGroup parity", () => {
  const groupCases: Array<[string, Props]> = [
    ["default", {}],
    ["vertical", { orientation: "vertical", "aria-label": "Zoom controls" }],
    ["class and attributes", { className: "w-full", id: "pager", style: { maxWidth: "280px" } }],
    ["caller role and data attributes win", { role: "toolbar", "data-slot": "custom", "data-orientation": "x" }],
  ]

  test.each(groupCases)("root: %s", async (_name, props) => {
    const { react, vue } = await renderPair(
      createElement(RButtonGroup as AnyComponent, props, reactButtons(["Pin", "Tag"])),
      () => h(ButtonGroup as never, vueProps(props), () => vueButtons(["Pin", "Tag"])),
    )
    expect(vue).toBe(react)
  })

  test("nested groups", async () => {
    const { react, vue } = await renderPair(
      <RButtonGroup aria-label="Pager">
        <RButtonGroup>{reactButtons(["1", "2", "3"])}</RButtonGroup>
        <RButtonGroup>{reactButtons(["Prev", "Next"])}</RButtonGroup>
      </RButtonGroup>,
      () =>
        h(ButtonGroup, { "aria-label": "Pager" }, () => [
          h(ButtonGroup, null, () => vueButtons(["1", "2", "3"])),
          h(ButtonGroup, null, () => vueButtons(["Prev", "Next"])),
        ]),
    )
    expect(vue).toBe(react)
  })

  const separatorCases: Array<[string, Props]> = [
    ["default is vertical", {}],
    ["explicit horizontal", { orientation: "horizontal" }],
    ["not decorative", { decorative: false }],
    ["class and attributes", { className: "mx-1", id: "sep" }],
  ]

  test.each(separatorCases)("separator: %s", async (_name, props) => {
    const { react, vue } = await renderPair(
      <RButtonGroup>
        <RButton>Undo</RButton>
        {createElement(RSeparator, props)}
        <RButton>Redo</RButton>
      </RButtonGroup>,
      () =>
        h(ButtonGroup, null, () => [
          h(Button, null, () => "Undo"),
          h(ButtonGroupSeparator as never, vueProps(props)),
          h(Button, null, () => "Redo"),
        ]),
    )
    expect(vue).toBe(react)
    expect(react).toMatch(/class="Separator ButtonGroupSeparator/)
  })

  const textCases: Array<[string, Props]> = [
    ["default", {}],
    ["class and attributes", { className: "font-mono", id: "prefix", "aria-hidden": true }],
    ["caller data-slot wins", { "data-slot": "custom" }],
  ]

  test.each(textCases)("text: %s", async (_name, props) => {
    const { react, vue } = await renderPair(
      createElement(RText, props, "https://"),
      () => h(ButtonGroupText as never, vueProps(props), () => "https://"),
    )
    expect(vue).toBe(react)
  })

  test("text asChild merges onto the child, child props win", async () => {
    const { react, vue } = await renderPair(
      <RText asChild className="outer" id="slot-id" data-slot="slot">
        <label htmlFor="url" className="inner" id="child-id">
          https://
        </label>
      </RText>,
      () =>
        h(ButtonGroupText, { asChild: true, class: "outer", id: "slot-id", "data-slot": "slot" }, () => [
          h("label", { for: "url", class: "inner", id: "child-id" }, "https://"),
        ]),
    )
    expect(vue).toBe(react)
    expect(react).toContain('class="Text outer inner"')
  })

  test("orientation and asChild follow state", async () => {
    const { react, vue } = await walkPairWithState(
      { orientation: "horizontal", asChild: false },
      (state) => (
        <RButtonGroup orientation={state.orientation as never}>
          <RText asChild={state.asChild}>
            <span>@</span>
          </RText>
          <RSeparator />
          <RButton>Go</RButton>
        </RButtonGroup>
      ),
      (state) =>
        h(ButtonGroup, { orientation: state.orientation as never }, () => [
          h(ButtonGroupText, { asChild: state.asChild }, () => [h("span", "@")]),
          h(ButtonGroupSeparator),
          h(Button, null, () => "Go"),
        ]),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ orientation: "vertical", asChild: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('data-orientation="vertical"')
    expect(react[1]).toContain('<span class="Text" data-slot="button-group-text">')
  })

  test("clicks reach buttons and a slotted child", async () => {
    const react = { button: vi.fn(), text: vi.fn() }
    const vue = { button: vi.fn(), text: vi.fn() }
    render(
      <RButtonGroup>
        <RButton onClick={react.button}>Go</RButton>
        <RText asChild onClick={react.text}>
          <span>@</span>
        </RText>
      </RButtonGroup>,
    )
    await interact(() => fireEvent.click(document.querySelector("button")!))
    await interact(() => fireEvent.click(document.querySelector("span[data-slot]")!))
    cleanup()
    mountVue(() =>
      h(ButtonGroup, null, () => [
        h(Button, { onClick: vue.button }, () => "Go"),
        h(ButtonGroupText, { asChild: true, onClick: vue.text }, () => [h("span", "@")]),
      ]),
    )
    await flushVue()
    await interact(() => fireEvent.click(document.querySelector("button")!))
    await interact(() => fireEvent.click(document.querySelector("span[data-slot]")!))
    expect([react.button.mock.calls.length, react.text.mock.calls.length]).toEqual([1, 1])
    expect([vue.button.mock.calls.length, vue.text.mock.calls.length]).toEqual([1, 1])
  })

  // Radix's Slot runs the child's handler first, then the slot's
  test("text asChild runs the child's handler before the group text's", async () => {
    const calls: Record<"react" | "vue", string[]> = { react: [], vue: [] }
    render(
      <RText asChild onClick={() => calls.react.push("text")}>
        <span onClick={() => calls.react.push("child")}>@</span>
      </RText>,
    )
    await interact(() => fireEvent.click(document.querySelector("span")!))
    cleanup()
    mountVue(() =>
      h(ButtonGroupText, { asChild: true, onClick: () => calls.vue.push("text") }, () => [
        h("span", { onClick: () => calls.vue.push("child") }, "@"),
      ]),
    )
    await flushVue()
    await interact(() => fireEvent.click(document.querySelector("span")!))
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react).toEqual(["child", "text"])
  })
})

/* ------------------------------------------------------------------ */
/*  Alert                                                              */
/* ------------------------------------------------------------------ */

// `actions` and `indicator` are described by name so each framework renders its own nodes
const reactAlertNode = (kind: unknown): ReactNode => {
  if (kind === "one") return <RButton color="primary" variant="soft" pill>Update</RButton>
  if (kind === "two")
    return (
      <>
        <RButton variant="soft" pill>Set reminder</RButton>
        <RButton pill>Review terms</RButton>
      </>
    )
  if (kind === "bulb") return <RLightbulb />
  if (kind === "rich") return <>Track updates on <a href="#">status page</a></>
  return kind as ReactNode
}
const vueAlertNode = (kind: unknown): VNode[] => {
  if (kind === "one") return [h(Button, { color: "primary", variant: "soft", pill: true }, () => "Update")]
  if (kind === "two")
    return [h(Button, { variant: "soft", pill: true }, () => "Set reminder"), h(Button, { pill: true }, () => "Review terms")]
  if (kind === "bulb") return [h(Lightbulb)]
  if (kind === "rich") return ["Track updates on " as never, h("a", { href: "#" }, "status page")]
  return [kind as never]
}

// Rich title/description/actions/indicator become slots in Vue; strings stay props
const toReactAlert = ({ actions, indicator, title, description, ...props }: Props) => ({
  ...props,
  ...(title !== undefined ? { title: reactAlertNode(title) } : {}),
  ...(description !== undefined ? { description: reactAlertNode(description) } : {}),
  ...(actions ? { actions: reactAlertNode(actions) } : {}),
  ...(indicator === false ? { indicator: false } : indicator ? { indicator: reactAlertNode(indicator) } : {}),
})
const toVueAlert = ({ actions, indicator, title, description, ...props }: Props) => {
  const slots: Record<string, () => VNode[]> = {}
  const rest: Props = vueProps(props)
  if (title === "rich") slots.title = () => vueAlertNode(title)
  else if (title !== undefined) rest.title = title
  if (description === "rich") slots.description = () => vueAlertNode(description)
  else if (description !== undefined) rest.description = description
  if (actions) slots.actions = () => vueAlertNode(actions)
  if (indicator === false) rest.indicator = false
  else if (indicator) slots.indicator = () => vueAlertNode(indicator)
  return { props: rest, slots }
}
const reactAlert = (props: Props) => createElement(RAlert as AnyComponent, toReactAlert(props))
const vueAlert = (props: Props) => {
  const { props: p, slots } = toVueAlert(props)
  return h(Alert as never, p, slots)
}

const ALERT_COLORS = ["primary", "danger", "success", "info", "discovery", "caution", "warning"]
const ALERT_VARIANTS = ["solid", "soft", "outline"]

const alertCases: Array<[string, Props]> = [
  ["empty", {}],
  ["title", { title: "Scheduled maintenance" }],
  ["description", { description: "We'll be offline 2 - 4 AM UTC." }],
  ["title and description", { title: "Heads up", description: "Something changed." }],
  ["empty title and description render nothing", { title: "", description: "" }],
  ["rich title and description", { title: "rich", description: "rich" }],
  ...ALERT_COLORS.flatMap((color) =>
    ALERT_VARIANTS.map((variant): [string, Props] => [`${color} ${variant}`, { color, variant, title: "Hi" }]),
  ),
  ["actions", { title: "Password expires", actions: "one" }],
  ["two actions", { title: "Terms updated", actions: "two" }],
  ["dismiss only", { title: "Thanks", onDismiss: noop }],
  ["actions and dismiss with a color", { color: "warning", variant: "soft", actions: "one", onDismiss: noop }],
  ["actionsPlacement bottom", { title: "Terms", actions: "two", actionsPlacement: "bottom" }],
  ["actionsPlacement end", { title: "Terms", actions: "two", actionsPlacement: "end" }],
  ["actionsClassName", { actions: "one", actionsClassName: "gap-1" }],
  ["custom indicator", { indicator: "bulb", description: "rich" }],
  ["no indicator", { indicator: false, description: "Version 2.18.5" }],
  ["class and attributes", { className: "items-start", id: "notice", "aria-live": "polite" }],
  ["caller role wins", { color: "danger", role: "status" }],
]

describe("Alert parity", () => {
  test.each(alertCases)("%s", async (_name, props) => {
    const { react, vue } = await renderPair(reactAlert(props), () => vueAlert(props))
    expect(vue).toBe(react)
  })

  // Vue turns a slot's "" into an empty Text vnode; React's "" is falsy
  test.each([
    ["an empty string", () => ""],
    ["an empty text vnode in a fragment", () => [h(Fragment, null, [createTextVNode("")])]],
  ])("title, description and actions slots rendering %s render nothing, like React's \"\"", async (_name, slot) => {
    const { react, vue } = await renderPair(<RAlert title="" description="" actions="" />, () =>
      h(Alert, {}, { title: slot, description: slot, actions: slot }),
    )
    expect(vue).toBe(react)
    expect(react).not.toContain("Title")
    expect(react).not.toContain("Actions")
  })

  test("v-if'd actions slot renders no actions container", async () => {
    mountVue(() => h(Alert, { title: "Hi" }, { actions: () => [createCommentVNode("v-if", true)] }))
    await flushVue()
    expect(document.querySelector(".Actions")).toBeNull()
  })

  test("Dismiss button calls onDismiss", async () => {
    const reactDismiss = vi.fn()
    const vueDismiss = vi.fn()
    render(reactAlert({ title: "Thanks", onDismiss: reactDismiss }))
    await interact(() => fireEvent.click(document.querySelector("button")!))
    cleanup()
    mountVue(() => vueAlert({ title: "Thanks", onDismiss: vueDismiss }))
    await flushVue()
    await interact(() => fireEvent.click(document.querySelector("button")!))
    expect(reactDismiss).toHaveBeenCalledTimes(1)
    expect(vueDismiss).toHaveBeenCalledTimes(1)
  })

  test("color, actions and dismiss follow state", async () => {
    const { react, vue } = await walkPairWithState(
      { color: "primary", dismiss: false },
      (state) => reactAlert({ color: state.color, title: "Hi", ...(state.dismiss ? { onDismiss: noop } : {}) }),
      (state) => vueAlert({ color: state.color, title: "Hi", ...(state.dismiss ? { onDismiss: noop } : {}) }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ color: "danger", dismiss: true })
        snapshot()
        await set({ color: "success", dismiss: false })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('role="alert"')
    expect(react[1]).toContain("Dismiss")
  })

  describe("actions auto placement", () => {
    // jsdom has no ResizeObserver and no layout: stub both
    let observers: Array<(entries: unknown[]) => void> = []
    const actionsWidth = { value: 0 }
    const stub = () => {
      observers = []
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(callback: (entries: unknown[]) => void) {
            observers.push(callback)
          }
          observe() {}
          disconnect() {}
        },
      )
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("Actions") ? actionsWidth.value : 0
      })
    }
    const resize = async (inlineSize: number, blockSize = 40) => {
      await interact(() => {
        for (const callback of observers) callback([{ contentBoxSize: [{ inlineSize, blockSize }], contentRect: {} }])
      })
    }
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    test("wraps actions wider than a third of the container", async () => {
      const runs: string[][] = []
      for (const framework of ["react", "vue"] as const) {
        stub()
        if (framework === "react") {
          await act(async () => {
            render(reactAlert({ title: "Terms", actions: "two" }))
          })
        } else {
          mountVue(() => vueAlert({ title: "Terms", actions: "two" }))
          await flushVue()
        }
        const placement = () => document.querySelector("[data-actions-placement]")!.getAttribute("data-actions-placement")!
        const seen: string[] = [placement()]
        actionsWidth.value = 200
        await resize(500)
        seen.push(placement())
        // A height-only change does not re-measure (React's effect depends on the width)
        actionsWidth.value = 100
        await resize(500, 80)
        seen.push(placement())
        await resize(900)
        seen.push(placement())
        actionsWidth.value = 0
        await resize(300)
        seen.push(placement())
        runs.push(seen)
        if (framework === "react") cleanup()
      }
      expect(runs[1]).toEqual(runs[0])
      expect(runs[0]).toEqual(["end", "bottom", "bottom", "end", "end"])
    })

    test("an explicit actionsPlacement wins", async () => {
      stub()
      mountVue(() => vueAlert({ title: "Terms", actions: "two", actionsPlacement: "end" }))
      await flushVue()
      actionsWidth.value = 400
      await resize(500)
      expect(document.querySelector("[data-actions-placement]")!.getAttribute("data-actions-placement")).toBe("end")
    })
  })
})

/* ------------------------------------------------------------------ */
/*  EmptyMessage                                                       */
/* ------------------------------------------------------------------ */

const RIcon = part(REmptyMessage, "Icon")
const RTitle = part(REmptyMessage, "Title")
const RDescription = part(REmptyMessage, "Description")
const RActionRow = part(REmptyMessage, "ActionRow")

describe("EmptyMessage parity", () => {
  type EmptyCase = [string, { root?: Props; icon?: Props | false; title?: Props | false; description?: Props | false; row?: Props | false }]
  const emptyCases: EmptyCase[] = [
    ["composition", {}],
    ["fill absolute", { root: { fill: "absolute" } }],
    ["fill none, icon and description only", { root: { fill: "none" }, icon: { size: "sm" }, title: false, row: false }],
    ["danger icon and title", { icon: { color: "danger" }, title: { color: "danger" }, description: false, row: false }],
    ["warning icon, sm", { icon: { color: "warning", size: "sm" } }],
    ["classes on every part", { root: { className: "a" }, icon: { className: "b" }, title: { className: "c" }, description: { className: "d" }, row: { className: "text-sm" } }],
    // React spreads nothing else on these parts, so other attributes are dropped in both
    ["other attributes are dropped", { root: { id: "x", style: { color: "red" } }, icon: { id: "i" }, title: { "data-x": "1" }, description: { role: "note" }, row: { id: "r" } }],
  ]

  test.each(emptyCases)("%s", async (_name, parts) => {
    const { root = {}, icon = {}, title = {}, description = {}, row = {} } = parts
    const { react, vue } = await renderPair(
      createElement(
        REmptyMessage as AnyComponent,
        root,
        icon && createElement(RIcon, { ...icon, key: "i" }, <svg />),
        title && createElement(RTitle, { ...title, key: "t" }, "No projects yet"),
        description && createElement(RDescription, { ...description, key: "d" }, "Create your first project"),
        row && createElement(RActionRow, { ...row, key: "r" }, <RButton>New project</RButton>),
      ),
      () =>
        h(EmptyMessage as never, vueProps(root), () => [
          icon && h(EmptyMessageIcon as never, vueProps(icon), () => [h("svg")]),
          title && h(EmptyMessageTitle as never, vueProps(title), () => "No projects yet"),
          description && h(EmptyMessageDescription as never, vueProps(description), () => "Create your first project"),
          row && h(EmptyMessageActionRow as never, vueProps(row), () => [h(Button, null, () => "New project")]),
        ]),
    )
    expect(vue).toBe(react)
  })

  test("fill, color and size follow state", async () => {
    const { react, vue } = await walkPairWithState(
      { fill: "static", color: "secondary", size: "md" },
      (state) => (
        <REmptyMessage fill={state.fill as never}>
          <RIcon color={state.color} size={state.size}>
            <svg />
          </RIcon>
          <RTitle color={state.color}>Title</RTitle>
        </REmptyMessage>
      ),
      (state) =>
        h(EmptyMessage, { fill: state.fill as never }, () => [
          h(EmptyMessageIcon, { color: state.color as never, size: state.size as never }, () => [h("svg")]),
          h(EmptyMessageTitle, { color: state.color as never }, () => "Title"),
        ]),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ fill: "absolute", color: "danger", size: "sm" })
        snapshot()
        await set({ fill: "none", color: "warning" })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('data-fill="absolute"')
  })
})

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

// A stand-in router link with the same DOM in both frameworks
const ReactRouterLink = ({ href, children, ...rest }: { href?: string; children?: ReactNode }) => (
  <a data-router="" href={href} {...rest}>
    {children}
  </a>
)
const VueRouterLink = defineComponent({
  props: { href: String },
  setup(props, { slots }) {
    return () => h("a", { "data-router": "", "href": props.href }, slots.default?.())
  },
})

const RCardParts = ["Header", "Title", "Description", "Content", "Footer", "Action"].map((name) => part(RCard, name))
const VCardParts = [CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction]

describe("Card parity", () => {
  type CardCase = [string, Props, { provider?: boolean; as?: boolean }?]
  const cardCases: CardCase[] = [
    ["default", {}],
    ["solid sm", { variant: "solid", size: "sm" }],
    ["ghost lg", { variant: "ghost", size: "lg" }],
    ["interactive", { interactive: true }],
    ["class and attributes", { className: "max-w-sm", id: "plan", style: { maxWidth: "380px" }, role: "region" }],
    ["caller data attributes win", { "data-variant": "custom" }],
    ["internal href renders a link", { href: "/docs" }],
    ["empty href is still a link", { href: "" }],
    ["external href", { href: "https://plexui.com" }],
    ["external forced on a relative href", { href: "/docs", external: true }],
    ["external off on an absolute href", { href: "https://plexui.com", external: false }],
    ["caller target wins on a link", { href: "https://plexui.com", target: "_self", className: "block" }],
    ["link variant and attributes", { href: "/docs", variant: "solid", size: "sm", "aria-label": "Docs" }],
    ["provider link component", { href: "/docs" }, { provider: true }],
    ["provider skipped for external", { href: "https://plexui.com" }, { provider: true }],
    ["as override", { href: "/docs" }, { as: true }],
  ]

  test.each(cardCases)("root: %s", async (_name, props, opts = {}) => {
    const reactEl = createElement(RCard as AnyComponent, { ...props, ...(opts.as ? { as: ReactRouterLink } : {}) }, "Body")
    const vueRender = () => h(Card as never, { ...vueProps(props), ...(opts.as ? { as: VueRouterLink } : {}) }, () => "Body")
    const { react, vue } = opts.provider
      ? await renderPair(
          <RPlexUIProvider linkComponent={ReactRouterLink as never}>{reactEl}</RPlexUIProvider>,
          () => h(PlexUIProvider, { linkComponent: VueRouterLink }, { default: vueRender }),
        )
      : await renderPair(reactEl, vueRender)
    expect(vue).toBe(react)
  })

  test("a router link that requires `to` (vue-router's RouterLink) gets the href", async () => {
    // React link components take `href`; Vue's RouterLink requires `to`
    const ReactStrictLink = ({ href, children, ...rest }: { href?: string; children?: ReactNode }) => (
      <a data-router="" {...rest} href={`#resolved${href}`}>
        {children}
      </a>
    )
    const VueStrictLink = defineComponent({
      props: { to: { type: String, required: true } },
      setup(props, { slots }) {
        return () => h("a", { "data-router": "", "href": `#resolved${props.to}` }, slots.default?.())
      },
    })
    const { react, vue } = await renderPair(
      <RPlexUIProvider linkComponent={ReactStrictLink as never}>
        <RCard href="/settings">Body</RCard>
        <RCard href="/billing" as={ReactStrictLink as never}>
          Body
        </RCard>
      </RPlexUIProvider>,
      () =>
        h(PlexUIProvider, { linkComponent: VueStrictLink }, {
          default: () => [
            h(Card, { href: "/settings" }, () => "Body"),
            h(Card, { href: "/billing", as: VueStrictLink }, () => "Body"),
          ],
        }),
    )
    expect(vue).toBe(react)
    expect(react).toContain('href="#resolved/settings"')
    expect(react).toContain('href="#resolved/billing"')
  })

  test("full anatomy with classes and attributes", async () => {
    const { react, vue } = await renderPair(
      <RCard>
        {RCardParts.map((Part, index) => (
          <Part key={index} className={`part-${index}`} data-index={index}>
            {`Part ${index}`}
          </Part>
        ))}
      </RCard>,
      () =>
        h(Card, null, () =>
          VCardParts.map((Part, index) => h(Part as never, { "class": `part-${index}`, "data-index": index }, () => `Part ${index}`)),
        ),
    )
    expect(vue).toBe(react)
    expect(react).toContain("<h3")
    expect(react).toContain("<p")
  })

  test("href switches between div and link, link clicks reach listeners", async () => {
    const { react, vue } = await walkPairWithState(
      { href: undefined as string | undefined, interactive: false },
      (state) => <RCard href={state.href as string} interactive={state.interactive}>Body</RCard>,
      (state) => h(Card, { href: state.href, interactive: state.interactive }, () => "Body"),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ interactive: true })
        snapshot()
        await set({ href: "https://plexui.com", interactive: false })
        snapshot()
        await set({ href: undefined })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[2]).toContain('target="_blank"')

    const reactClick = vi.fn((event: MouseEvent) => event.preventDefault())
    const vueClick = vi.fn((event: MouseEvent) => event.preventDefault())
    render(<RCard href="/docs" onClick={reactClick as never}>Body</RCard>)
    await interact(() => fireEvent.click(document.querySelector("a")!))
    cleanup()
    mountVue(() => h(Card, { href: "/docs", onClick: vueClick }, () => "Body"))
    await flushVue()
    await interact(() => fireEvent.click(document.querySelector("a")!))
    expect(reactClick).toHaveBeenCalledTimes(1)
    expect(vueClick).toHaveBeenCalledTimes(1)
  })

  test("keyboard: a linked card is focusable and Enter reaches listeners", async () => {
    const reactKeys: string[] = []
    const vueKeys: string[] = []
    render(<RCard href="/docs" onKeyDown={(evt: { key: string }) => reactKeys.push(evt.key)}>Body</RCard>)
    document.querySelector("a")!.focus()
    expect(document.activeElement?.tagName).toBe("A")
    await interact(() => fireEvent.keyDown(document.activeElement!, { key: "Enter" }))
    cleanup()
    mountVue(() => h(Card, { href: "/docs", onKeydown: (evt: KeyboardEvent) => vueKeys.push(evt.key) }, () => "Body"))
    await flushVue()
    document.querySelector("a")!.focus()
    expect(document.activeElement?.tagName).toBe("A")
    await interact(() => fireEvent.keyDown(document.activeElement!, { key: "Enter" }))
    expect(vueKeys).toEqual(reactKeys)
    expect(reactKeys).toEqual(["Enter"])
  })
})

// Keeps serializeDom imported for ad-hoc debugging of a failing case
void serializeDom
