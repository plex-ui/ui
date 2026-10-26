import { fireEvent, render } from "@testing-library/react"
import { createElement, Fragment as ReactFragment, type ComponentType, type ReactNode } from "react"
import { compile } from "@vue/compiler-dom"
import { describe, expect, test, vi } from "vitest"
import * as Vue from "vue"
import { Fragment, createCommentVNode, defineComponent, h, type Component, type VNodeArrayChildren } from "vue"
import { Avatar as RAvatar, AvatarGroup as RAvatarGroup } from "../../packages/ui/src/components/Avatar"
import RRobot from "../../packages/ui/src/components/Icon/svg/Robot"
import * as RTable from "../../packages/ui/src/components/Table"
import { Avatar, AvatarGroup } from "../../packages/vue/src/components/Avatar"
import Robot from "../../packages/vue/src/components/Icon/svg/Robot"
import * as VTable from "../../packages/vue/src/components/Table"
import { mountVue } from "./harness"
import { interact, renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

const noop = () => {}
const IMAGE = "https://example.com/tyler.png"
const OTHER_IMAGE = "https://example.com/will.png"
// validateImageUrl drops this gravatar fallback, which shows two initials
const AUTH0_GRAVATAR = "https://s.gravatar.com/avatar/1?d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fty.png"

// React prop names map to Vue ones. `Icon: true` stands for the Robot icon of each framework.
const reactProps = ({ Icon, ...props }: Props) => (Icon ? { ...props, Icon: RRobot } : props)
const vueProps = ({ className, colSpan, onPointerDown, Icon, ...props }: Props) => ({
  ...props,
  ...(className ? { class: className } : {}),
  ...(colSpan !== undefined ? { colspan: colSpan } : {}),
  ...(onPointerDown ? { onPointerdown: onPointerDown } : {}),
  ...(Icon ? { Icon: Robot } : {}),
})

const reactAvatar = (props: Props) => createElement(RAvatar as ComponentType<Props>, reactProps(props))
const vueAvatar = (props: Props) => h(Avatar as never, vueProps(props))

const COLORS = ["primary", "secondary", "success", "info", "discovery", "danger"]
const VARIANTS = ["soft", "solid"]

const avatarCases: [string, Props][] = [
  ["empty", {}],
  ["name initial is upper-cased", { name: "david" }],
  ["size", { name: "Will", size: 48 }],
  ["size zero", { name: "Will", size: 0 }],
  ...COLORS.flatMap((color) =>
    VARIANTS.map((variant): [string, Props] => [`${color} ${variant}`, { name: "Ann", color, variant }]),
  ),
  ["image keeps the initial behind it", { name: "Tyler", imageUrl: IMAGE, size: 48 }],
  ["empty image url", { name: "Tyler", imageUrl: "" }],
  ["gravatar auth0 fallback is dropped", { name: "Tyler", imageUrl: AUTH0_GRAVATAR }],
  ["gravatar without auth0 is kept", { name: "Tyler", imageUrl: "https://gravatar.com/avatar/9531b2" }],
  ["icon", { Icon: true, size: 48 }],
  ["icon wins over name", { name: "Tech support", Icon: true, color: "primary", variant: "solid" }],
  ["icon behind an image", { Icon: true, imageUrl: IMAGE }],
  ["overflow count", { overflowCount: 9 }],
  ["overflow count 999", { overflowCount: 999 }],
  ["overflow count thousands", { overflowCount: 1234 }],
  ["overflow count millions", { overflowCount: 2_500_000 }],
  ["overflow count zero falls back to the initial", { overflowCount: 0, name: "Zed" }],
  ["overflow count wins over icon and name", { overflowCount: 5, Icon: true, name: "Will" }],
  ["overflow count behind an image", { overflowCount: 5, imageUrl: IMAGE }],
  ["class and attributes", { name: "Acme", className: "rounded-lg", id: "acme", "aria-label": "Acme" }],
  ["caller style replaces the size variable", { name: "Will", size: 40, style: { opacity: 0.5 } }],
  ["caller role and data attributes win", { name: "Will", role: "img", "data-color": "custom" }],
  ["click handler renders a button", { name: "Will", onClick: noop }],
  ["pointerdown handler renders a button", { name: "Will", onPointerDown: noop }],
  ["interactive with image and icon", { Icon: true, imageUrl: IMAGE, color: "info", onClick: noop }],
  ["caller type wins on a button", { name: "Will", onClick: noop, type: "submit" }],
]

describe("Avatar parity", () => {
  test.each(avatarCases)("%s", async (_name, props) => {
    const { react, vue } = await renderPair(reactAvatar(props), () => vueAvatar(props))
    expect(vue).toBe(react)
  })

  test("image loads, fails, and resets when the url changes", async () => {
    const remounted: boolean[] = []
    const { react, vue } = await walkPairWithState(
      { imageUrl: IMAGE as string | undefined },
      (state) => reactAvatar({ name: "Tyler", size: 48, imageUrl: state.imageUrl }),
      (state) => vueAvatar({ name: "Tyler", size: 48, imageUrl: state.imageUrl }),
      async ({ set, snapshot }) => {
        snapshot()
        await interact(() => fireEvent.load(document.querySelector("img")!))
        snapshot()
        const root = document.querySelector("[data-color]")
        await set({ imageUrl: OTHER_IMAGE })
        remounted.push(document.querySelector("[data-color]") !== root)
        snapshot()
        await interact(() => fireEvent.error(document.querySelector("img")!))
        snapshot()
        await set({ imageUrl: IMAGE })
        snapshot()
        await set({ imageUrl: AUTH0_GRAVATAR })
        snapshot()
        await set({ imageUrl: undefined })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain("data-loaded")
    expect(react[2]).not.toContain("data-loaded")
    expect(react[3]).not.toContain("<img")
    expect(react[4]).toContain("<img")
    expect(react[4]).not.toContain("data-loaded")
    expect(remounted).toEqual([true, true])
  })

  test("adding and removing a click handler switches span and button", async () => {
    const { react, vue } = await walkPairWithState(
      { interactive: false },
      (state) => reactAvatar({ name: "Will", onClick: state.interactive ? noop : undefined }),
      (state) => vueAvatar({ name: "Will", onClick: state.interactive ? noop : undefined }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ interactive: true })
        snapshot()
        await set({ interactive: false })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain("<button")
  })

  test("click and pointerdown reach the handlers with the event", async () => {
    const reactClick = vi.fn()
    const vueClick = vi.fn()
    const reactDown = vi.fn()
    const vueDown = vi.fn()
    render(<RAvatar name="Will" onClick={reactClick} />)
    render(<RAvatar name="Ann" onPointerDown={reactDown} />)
    mountVue(() => vueAvatar({ name: "Will", onClick: vueClick }))
    mountVue(() => vueAvatar({ name: "Ann", onPointerDown: vueDown }))
    const [reactWill, reactAnn, vueWill, vueAnn] = Array.from(document.querySelectorAll("button"))
    await interact(() => {
      fireEvent.click(reactWill!)
      fireEvent.click(vueWill!)
      fireEvent.pointerDown(reactAnn!)
      fireEvent.pointerDown(vueAnn!)
    })
    expect(reactClick).toHaveBeenCalledTimes(1)
    expect(vueClick).toHaveBeenCalledTimes(1)
    expect(vueClick.mock.calls[0]![0]).toBeInstanceOf(MouseEvent)
    expect(reactDown).toHaveBeenCalledTimes(1)
    expect(vueDown).toHaveBeenCalledTimes(1)
  })
})

// Group children are described once and built for each framework:
// a props object is an Avatar, `list` is a React array / Vue v-for fragment,
// `group` is a React <></> / Vue <template> fragment, null is a v-if that is off.
type GroupChild = Props | string | null | { list: Props[] } | { group: Props[] }

const reactChildren = (children: GroupChild[]): ReactNode[] =>
  children.map((child, index) => {
    if (child === null || typeof child === "string") return child
    if ("list" in child) return child.list.map((props) => createElement(RAvatar as ComponentType<Props>, { ...reactProps(props), key: String(props.name) }))
    if ("group" in child) return createElement(ReactFragment, { key: index }, ...child.group.map(reactAvatar))
    return createElement(RAvatar as ComponentType<Props>, { ...reactProps(child), key: index })
  })

// The compiler marks a v-for fragment KEYED_FRAGMENT (128), a <template> STABLE_FRAGMENT (64)
const vueChildren = (children: GroupChild[]): VNodeArrayChildren =>
  children.map((child) => {
    if (child === null) return createCommentVNode("v-if", true)
    if (typeof child === "string") return child
    if ("list" in child) {
      const list = h(Fragment, null, child.list.map((props) => h(Avatar as never, { ...vueProps(props), key: String(props.name) })))
      list.patchFlag = 128
      return list
    }
    if ("group" in child) {
      const group = h(Fragment, null, child.group.map(vueAvatar))
      group.patchFlag = 64
      return group
    }
    return vueAvatar(child)
  })

const reactGroup = (props: Props, children: GroupChild[]) =>
  createElement(RAvatarGroup as ComponentType<Props>, props, ...reactChildren(children))
const vueGroup = (props: Props, children: GroupChild[]) =>
  h(AvatarGroup as Component, vueProps(props), { default: () => vueChildren(children) })

// Compiles a template the way the docs previews do, so v-for, <template> and
// v-if produce the vnodes (and fragment flags) real templates produce
const fromTemplate = (template: string, components: Record<string, Component>) => {
  const { code } = compile(template, { hoistStatic: true })
  const render = new Function("Vue", code)(Vue) as Vue.RenderFunction & { _rc?: boolean }
  render._rc = true
  return () => h(defineComponent({ components, render }))
}

const members: GroupChild[] = [
  { name: "Tyler", imageUrl: IMAGE },
  { name: "Jane", color: "primary", variant: "solid" },
  { name: "Tech support", Icon: true, variant: "solid" },
  { overflowCount: 5 },
]

const groupCases: [string, Props, GroupChild[]][] = [
  ["stack start reverses the children", {}, members],
  ["stack end", { stack: "end" }, members],
  ["size", { size: 42 }, members],
  ["class applied, other attributes dropped", { className: "gap-1", id: "team", style: { color: "red" }, "aria-label": "Team" }, members],
  ["empty", {}, []],
  ["a list is flattened, a group stays together", {}, [{ name: "Ann" }, { list: [{ name: "Bo" }, { name: "Cy" }] }, { group: [{ name: "Di" }, { name: "Ed" }] }]],
  ["empty children are dropped, text is kept", { stack: "end" }, [{ name: "Ann" }, null, "and", { overflowCount: 3 }]],
]

describe("AvatarGroup parity", () => {
  test.each(groupCases)("%s", async (_name, props, children) => {
    const { react, vue } = await renderPair(reactGroup(props, children), () => vueGroup(props, children))
    expect(vue).toBe(react)
  })

  test("template children: v-for flattens, <template> stays together, v-if off is dropped", async () => {
    const template = `<AvatarGroup :size="32">
  <Avatar name="Ann" />
  <Avatar v-for="name in ['Bo', 'Cy']" :key="name" :name="name" />
  <template v-if="true"><Avatar name="Di" /><Avatar name="Ed" /></template>
  <Avatar v-if="false" name="Xi" />
  <template v-for="name in ['Fy', 'Gu']" :key="name"><Avatar :name="name" color="info" /><Avatar :name="name" /></template>
</AvatarGroup>`
    const react = (
      <RAvatarGroup size={32}>
        <RAvatar name="Ann" />
        {["Bo", "Cy"].map((name) => <RAvatar key={name} name={name} />)}
        {true && (
          <>
            <RAvatar name="Di" />
            <RAvatar name="Ed" />
          </>
        )}
        {false && <RAvatar name="Xi" />}
        {["Fy", "Gu"].map((name) => (
          <ReactFragment key={name}>
            <RAvatar name={name} color="info" />
            <RAvatar name={name} />
          </ReactFragment>
        ))}
      </RAvatarGroup>
    )
    const pair = await renderPair(react, fromTemplate(template, { Avatar, AvatarGroup }))
    expect(pair.vue).toBe(pair.react)
  })

  test("changing the stack moves avatars, keeping a loaded image", async () => {
    const kept: boolean[] = []
    const { react, vue } = await walkPairWithState(
      { stack: "start", size: 42 as number | undefined },
      (state) => reactGroup({ stack: state.stack, size: state.size }, members),
      (state) => vueGroup({ stack: state.stack, size: state.size }, members),
      async ({ set, snapshot }) => {
        await interact(() => fireEvent.load(document.querySelector("img")!))
        snapshot()
        const image = document.querySelector("img")
        await set({ stack: "end" })
        kept.push(document.querySelector("img") === image)
        snapshot()
        await set({ stack: "start", size: undefined })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain("data-loaded")
    expect(react[0]).not.toBe(react[1])
    expect(kept).toEqual([true, true])
  })
})

// Table trees are described once: [part, props, children]
type TablePart = keyof typeof RTable
type TableNode = [TablePart, Props, (TableNode | string)[]?]

const reactTable = ([part, props, children = []]: TableNode, key?: number): ReactNode =>
  createElement(
    RTable[part] as ComponentType<Props>,
    { ...props, key },
    ...children.map((child, index) => (typeof child === "string" ? child : reactTable(child, index))),
  )

const vueTable = ([part, props, children = []]: TableNode): ReturnType<typeof h> =>
  h(VTable[part] as Component, vueProps(props), {
    default: () => children.map((child) => (typeof child === "string" ? child : vueTable(child))),
  })

const invoices = [
  ["INV001", "Paid", "Credit Card", "$250.00"],
  ["INV002", "Pending", "PayPal", "$150.00"],
]

const invoiceTable = (tableProps: Props = {}, partProps: Props = {}): TableNode => [
  "Table",
  tableProps,
  [
    ["TableCaption", partProps, ["A list of your recent invoices."]],
    [
      "TableHeader",
      partProps,
      [["TableRow", partProps, ["Invoice", "Status", "Method", "Amount"].map((label): TableNode => ["TableHead", partProps, [label]])]],
    ],
    [
      "TableBody",
      partProps,
      invoices.map((row): TableNode => ["TableRow", {}, row.map((cell, index): TableNode => ["TableCell", index === 0 ? { className: "font-medium" } : {}, [cell]])]),
    ],
    [
      "TableFooter",
      partProps,
      [["TableRow", {}, [["TableCell", { colSpan: 3 }, ["Total"]], ["TableCell", { className: "text-right" }, ["$400.00"]]]]],
    ],
  ],
]

const tableCases: [string, TableNode][] = [
  ["empty table", ["Table", {}]],
  ["invoices with caption, header, body and footer", invoiceTable()],
  ["attributes go to the <table>, not the wrapper", invoiceTable({ className: "min-w-full", id: "invoices", style: { color: "red" }, "aria-label": "Invoices" })],
  ["every part merges class and forwards attributes", invoiceTable({}, { className: "x", "data-part": "", title: "t", style: { opacity: 0.5 } })],
  ["header cell attributes", ["Table", {}, [["TableHeader", {}, [["TableRow", {}, [["TableHead", { scope: "col", colSpan: 2, className: "text-right" }, ["Amount"]]]]]]]]],
]

describe("Table parity", () => {
  test.each(tableCases)("%s", async (_name, tree) => {
    const { react, vue } = await renderPair(reactTable(tree) as never, () => vueTable(tree))
    expect(vue).toBe(react)
  })

  test("row and cell listeners fall through", async () => {
    const reactClick = vi.fn()
    const vueClick = vi.fn()
    const tree = (onClick: () => void): TableNode => ["Table", {}, [["TableBody", {}, [["TableRow", { onClick }, [["TableCell", {}, ["Row"]]]]]]]]
    render(reactTable(tree(reactClick)) as never)
    mountVue(() => vueTable(tree(vueClick)))
    const [reactCell, vueCell] = Array.from(document.querySelectorAll("td"))
    await interact(() => {
      fireEvent.click(reactCell!)
      fireEvent.click(vueCell!)
    })
    expect(reactClick).toHaveBeenCalledTimes(1)
    expect(vueClick).toHaveBeenCalledTimes(1)
  })
})
