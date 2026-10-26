import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState, type ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { Fragment, defineComponent, h, reactive, renderSlot, type PropType, type VNode } from "vue"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Menu as ReactMenu } from "../../packages/ui/src/components/Menu"
import { PlexUIProvider as ReactPlexUIProvider } from "../../packages/ui/src/components/PlexUIProvider"
import { Tooltip as ReactTooltip } from "../../packages/ui/src/components/Tooltip"
import { Button as VueButton } from "../../packages/vue/src/components/Button"
import { Trash as ReactTrash } from "../../packages/ui/src/components/Icon"
import { Trash as VueTrash } from "../../packages/vue/src/components/Icon"
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuItemAction,
  MenuItemActions,
  MenuLabel,
  MenuLink,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "../../packages/vue/src/components/Menu"
import { PlexUIProvider as VuePlexUIProvider } from "../../packages/vue/src/components/PlexUIProvider"
import { Tooltip as VueTooltip } from "../../packages/vue/src/components/Tooltip"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact } from "./pair"

// Reka positions content through `--reka-popper-*` custom properties on its
// wrapper, Radix through `--radix-popper-*` (same values). The content's own
// properties keep Radix's names (the shared CSS reads them) and point at
// Reka's. Only that prefix is renamed here; everything else must match.
const snapshotDom = () => serializeDom().replaceAll("--reka-popper-", "--radix-popper-")

const describeElement = (element: Element | null) => {
  if (!element || element === document.body) return "body"
  const role = element.getAttribute("role")
  const text = (element.textContent ?? "").trim().slice(0, 30)
  return `${element.tagName.toLowerCase()}${role ? `[role=${role}]` : ""} "${text}"`
}

/** Lets Vue, floating-ui and Reka's deferred work (focus scope, teleports) settle */
const settle = async (ms = 0) => {
  await interact(() => new Promise((resolve) => setTimeout(resolve, ms)))
  await flushVue()
}

const vueDom = async (render: () => VNode) => {
  const { unmount } = mountVue(render)
  await flushVue()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await flushVue()
  const dom = snapshotDom()
  unmount()
  return dom
}

const reactDom = async (element: ReactNode) => {
  await act(async () => {
    render(<>{element}</>)
  })
  const dom = snapshotDom()
  cleanup()
  return dom
}

// ---------------------------------------------------------------------------
// Markup

type ItemSpec = { label: string; description?: string; className?: string; disabled?: boolean; selectable?: boolean }

const reactItems = (items: ItemSpec[]) =>
  items.map(({ label, selectable = true, ...item }) => (
    <ReactMenu.Item key={label} {...item} onSelect={selectable ? () => {} : undefined}>
      {label}
    </ReactMenu.Item>
  ))

const vueItems = (items: ItemSpec[]) =>
  items.map(({ label, selectable = true, className, ...item }) =>
    h(MenuItem, { ...item, class: className, onSelect: selectable ? () => {} : undefined }, { default: () => label }),
  )

type ContentSpec = {
  width?: number | "auto"
  minWidth?: number | "auto"
  maxHeight?: number
  layout?: "vertical" | "horizontal"
  size?: "sm" | "md" | "lg"
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  align?: "start" | "center" | "end"
  alignOffset?: number
}

type DomCase = [string, { open?: boolean; modal?: boolean; content?: ContentSpec; disabled?: boolean; full?: boolean }]

// Every part in one menu, open through forceOpen
const ReactFull = () => (
  <>
    <ReactMenu.Item description="sam.smith@gmail.com">Sam Smith</ReactMenu.Item>
    <ReactMenu.Item className="text-tertiary">Read-only</ReactMenu.Item>
    <ReactMenu.Separator className="sep" />
    <ReactMenu.Link href="/settings">Your profile</ReactMenu.Link>
    <ReactMenu.Link href="https://plexui.com" className="ext" aria-label="External">
      External
    </ReactMenu.Link>
    <ReactMenu.Link disabled>No path</ReactMenu.Link>
    <ReactMenu.Item disabled onSelect={() => {}}>
      Feature flags
    </ReactMenu.Item>
    <ReactMenu.Item onSelect={() => {}} description="Signs you out" className="logout">
      Logout
    </ReactMenu.Item>
    <ReactMenu.Group className="group">
      <ReactMenu.Label className="label">Settings</ReactMenu.Label>
      <ReactMenu.CheckboxItem checked>Grid</ReactMenu.CheckboxItem>
      <ReactMenu.CheckboxItem checked={false} indicatorPosition="start">
        Labels
      </ReactMenu.CheckboxItem>
      <ReactMenu.CheckboxItem checked indicatorVariant="ghost" className="ghost">
        Shadows
      </ReactMenu.CheckboxItem>
      <ReactMenu.CheckboxItem checked="indeterminate" disabled>
        Mixed
      </ReactMenu.CheckboxItem>
    </ReactMenu.Group>
    <ReactMenu.RadioGroup value="b" onChange={() => {}}>
      <ReactMenu.RadioItem value="a">Any time</ReactMenu.RadioItem>
      <ReactMenu.RadioItem value="b" className="radio">
        Today
      </ReactMenu.RadioItem>
      <ReactMenu.RadioItem value="c" disabled>
        Last week
      </ReactMenu.RadioItem>
    </ReactMenu.RadioGroup>
    <ReactMenu.RadioGroup value="x" onChange={() => {}} indicatorPosition="start">
      <ReactMenu.RadioItem value="x">Start</ReactMenu.RadioItem>
    </ReactMenu.RadioGroup>
    <ReactMenu.Item onSelect={() => {}}>
      <span className="flex-1 truncate">Thread</span>
      <ReactMenu.ItemActions className="actions">
        <ReactMenu.ItemAction onClick={() => {}}>
          <ReactTrash />
        </ReactMenu.ItemAction>
      </ReactMenu.ItemActions>
    </ReactMenu.Item>
    <ReactMenu.Sub>
      <ReactMenu.SubTrigger>Closed sub</ReactMenu.SubTrigger>
      <ReactMenu.SubContent>
        <ReactMenu.Item onSelect={() => {}}>Hidden</ReactMenu.Item>
      </ReactMenu.SubContent>
    </ReactMenu.Sub>
    <ReactMenu.Sub forceOpen>
      <ReactMenu.SubTrigger className="sub" disabled>
        Open sub
      </ReactMenu.SubTrigger>
      <ReactMenu.SubContent width={180} minWidth={160} maxHeight={300} sideOffset={8} alignOffset={0}>
        <ReactMenu.Item onSelect={() => {}}>Inner</ReactMenu.Item>
      </ReactMenu.SubContent>
    </ReactMenu.Sub>
  </>
)

const vueFull = () => [
  h(MenuItem, { description: "sam.smith@gmail.com" }, { default: () => "Sam Smith" }),
  h(MenuItem, { class: "text-tertiary" }, { default: () => "Read-only" }),
  h(MenuSeparator, { class: "sep" }),
  h(MenuLink, { href: "/settings" }, { default: () => "Your profile" }),
  h(MenuLink, { "href": "https://plexui.com", "class": "ext", "aria-label": "External" }, { default: () => "External" }),
  h(MenuLink, { disabled: true }, { default: () => "No path" }),
  h(MenuItem, { disabled: true, onSelect: () => {} }, { default: () => "Feature flags" }),
  h(MenuItem, { onSelect: () => {}, class: "logout" }, { default: () => "Logout", description: () => "Signs you out" }),
  h(MenuGroup, { class: "group" }, {
    default: () => [
      h(MenuLabel, { class: "label" }, { default: () => "Settings" }),
      h(MenuCheckboxItem, { checked: true }, { default: () => "Grid" }),
      h(MenuCheckboxItem, { checked: false, indicatorPosition: "start" }, { default: () => "Labels" }),
      h(MenuCheckboxItem, { checked: true, indicatorVariant: "ghost", class: "ghost" }, { default: () => "Shadows" }),
      h(MenuCheckboxItem, { checked: "indeterminate", disabled: true }, { default: () => "Mixed" }),
    ],
  }),
  h(MenuRadioGroup, { value: "b" }, {
    default: () => [
      h(MenuRadioItem, { value: "a" }, { default: () => "Any time" }),
      h(MenuRadioItem, { value: "b", class: "radio" }, { default: () => "Today" }),
      h(MenuRadioItem, { value: "c", disabled: true }, { default: () => "Last week" }),
    ],
  }),
  h(MenuRadioGroup, { value: "x", indicatorPosition: "start" }, {
    default: () => [h(MenuRadioItem, { value: "x" }, { default: () => "Start" })],
  }),
  h(MenuItem, { onSelect: () => {} }, {
    default: () => [
      h("span", { class: "flex-1 truncate" }, "Thread"),
      h(MenuItemActions, { class: "actions" }, {
        default: () => [h(MenuItemAction, { onClick: () => {} }, { default: () => [h(VueTrash)] })],
      }),
    ],
  }),
  h(MenuSub, null, {
    default: () => [
      h(MenuSubTrigger, null, { default: () => "Closed sub" }),
      h(MenuSubContent, null, { default: () => [h(MenuItem, { onSelect: () => {} }, { default: () => "Hidden" })] }),
    ],
  }),
  h(MenuSub, { forceOpen: true }, {
    default: () => [
      h(MenuSubTrigger, { class: "sub", disabled: true }, { default: () => "Open sub" }),
      h(MenuSubContent, { width: 180, minWidth: 160, maxHeight: 300, sideOffset: 8, alignOffset: 0 }, {
        default: () => [h(MenuItem, { onSelect: () => {} }, { default: () => "Inner" })],
      }),
    ],
  }),
]

const basicItems: ItemSpec[] = [{ label: "Edit" }, { label: "Duplicate" }]

const reactDomCase = ({ open, modal, content = {}, disabled, full }: DomCase[1]) => (
  <>
    <p>Before</p>
    <ReactMenu forceOpen={open} modal={modal}>
      <ReactMenu.Trigger disabled={disabled}>
        <ReactButton color="secondary" variant="ghost">
          Options
        </ReactButton>
      </ReactMenu.Trigger>
      <ReactMenu.Content {...content}>{full ? <ReactFull /> : reactItems(basicItems)}</ReactMenu.Content>
    </ReactMenu>
  </>
)

const vueDomCase = ({ open, modal, content = {}, disabled, full }: DomCase[1]) => () =>
  h(Fragment, null, [
    h("p", null, "Before"),
    h(Menu, { forceOpen: open, modal }, {
      default: () => [
        h(MenuTrigger, { disabled }, {
          default: () => h(VueButton, { color: "secondary", variant: "ghost" }, { default: () => "Options" }),
        }),
        h(MenuContent, content, { default: () => (full ? vueFull() : vueItems(basicItems)) }),
      ],
    }),
  ])

const domCases: DomCase[] = [
  ["closed", {}],
  ["closed, disabled trigger", { disabled: true }],
  ["open", { open: true }],
  ["open, every part", { open: true, full: true }],
  ["open, modal", { open: true, modal: true }],
  ["open, modal, every part", { open: true, modal: true, full: true }],
  ["open, fixed width", { open: true, content: { width: 210, minWidth: 210 } }],
  ["open, natural width", { open: true, content: { minWidth: "auto", maxHeight: 240 } }],
  ["open, horizontal", { open: true, content: { layout: "horizontal", size: "lg", minWidth: 300 } }],
  ["open, horizontal without size", { open: true, content: { layout: "horizontal" } }],
  ["open, size without horizontal", { open: true, content: { size: "sm" } }],
  ["open, align start", { open: true, content: { align: "start", side: "top", sideOffset: 10 } }],
  ["open, align center", { open: true, content: { align: "center" } }],
  ["open, align end with offset", { open: true, content: { align: "end", alignOffset: 4 } }],
]

describe("Menu parity", () => {
  for (const disabled of [true, false]) {
    describe(disabled ? "animations off" : "animations on", () => {
      test.each(domCases)("%s", async (_name, props) => {
        animation.disabled = disabled
        const react = await reactDom(reactDomCase(props))
        const vue = await vueDom(vueDomCase(props))
        expect(vue).toBe(react)
      })
    })
  }

  test("the open menu is labelled by its trigger, which controls it", async () => {
    for (const dom of [await reactDom(reactDomCase({ open: true })), await vueDom(vueDomCase({ open: true }))]) {
      const triggerId = dom.match(/<button aria-controls="(gen-\d+)"[^>]* id="(gen-\d+)"/)
      expect(triggerId).not.toBeNull()
      expect(dom).toContain(`aria-labelledby="${triggerId![2]}"`)
      expect(dom).toContain(`id="${triggerId![1]}" role="menu"`)
      expect(dom).not.toContain("[missing]")
    }
  })

  test("a closed submenu's trigger has no aria-controls, as in Radix (radix-ui 1.8)", async () => {
    for (const dom of [
      await reactDom(reactDomCase({ open: true, full: true })),
      await vueDom(vueDomCase({ open: true, full: true })),
    ]) {
      expect(dom).toMatch(/<div aria-expanded="false" aria-haspopup="menu" class="MenuItem SubMenuItem"/)
      expect(dom).not.toContain("[missing]")
    }
  })

  test("modal hides the rest of the page from assistive technology", async () => {
    const dom = await vueDom(vueDomCase({ open: true, modal: true }))
    expect(dom).toContain('aria-hidden="true"')
  })
})

// ---------------------------------------------------------------------------
// Links through the provider

const ReactRouterLink = ({ to, href, children, ...rest }: { to?: string; href?: string; children?: ReactNode }) => (
  <a data-router="" href={to ?? href} {...rest}>
    {children}
  </a>
)
const VueRouterLink = defineComponent({
  props: { to: String, href: String },
  setup(props, { slots }) {
    return () => h("a", { "data-router": "", "href": props.to ?? props.href }, slots.default?.())
  },
})

describe("Menu.Link parity", () => {
  const linkCases: Array<[string, Record<string, unknown>, { provider?: boolean; as?: boolean }?]> = [
    ["internal href without a provider", { href: "/docs" }],
    ["to without a provider", { to: "/docs" }],
    ["provider link component", { to: "/docs" }, { provider: true }],
    ["provider skipped for external", { href: "https://plexui.com" }, { provider: true }],
    ["as override", { href: "/docs" }, { as: true }],
    ["attributes override the item's", { href: "/docs", target: "_self", tabIndex: 0, id: "docs" }],
  ]

  test.each(linkCases)("%s", async (_name, props, opts = {}) => {
    const { tabIndex, ...rest } = props
    const reactLink = (
      <ReactMenu forceOpen>
        <ReactMenu.Trigger>
          <button type="button">Open</button>
        </ReactMenu.Trigger>
        <ReactMenu.Content>
          <ReactMenu.Link {...rest} tabIndex={tabIndex as number} {...(opts.as ? { as: ReactRouterLink } : {})}>
            Docs
          </ReactMenu.Link>
        </ReactMenu.Content>
      </ReactMenu>
    )
    const vueLink = () =>
      h(Menu, { forceOpen: true }, {
        default: () => [
          h(MenuTrigger, null, { default: () => h("button", { type: "button" }, "Open") }),
          h(MenuContent, null, {
            default: () => [
              h(
                MenuLink,
                { ...rest, tabindex: tabIndex, ...(opts.as ? { as: VueRouterLink } : {}) },
                { default: () => "Docs" },
              ),
            ],
          }),
        ],
      })
    const react = await reactDom(
      opts.provider ? <ReactPlexUIProvider linkComponent={ReactRouterLink}>{reactLink}</ReactPlexUIProvider> : reactLink,
    )
    const vue = await vueDom(
      opts.provider ? () => h(VuePlexUIProvider, { linkComponent: VueRouterLink }, { default: vueLink }) : vueLink,
    )
    expect(vue).toBe(react)
  })
})

// ---------------------------------------------------------------------------
// Behaviour

type ExampleOptions = {
  controlled?: boolean
  modal?: boolean
  forceOpen?: boolean
  /** preventDefault() in the trigger child's pointerdown */
  preventTrigger?: boolean
  /** preventDefault() in Content's onCloseAutoFocus */
  preventCloseAutoFocus?: boolean
  withProvider?: boolean
}
type Log = (entry: string) => void

const ReactExample = ({ log, controlled = true, ...options }: ExampleOptions & { log: Log }) => {
  const [checked, setChecked] = useState(false)
  const [value, setValue] = useState("a")
  const menu = (
    <ReactMenu
      forceOpen={options.forceOpen}
      modal={options.modal}
      onOpen={() => log("open")}
      onClose={() => log("close")}
    >
      <ReactMenu.Trigger>
        <ReactButton
          color="secondary"
          onPointerDown={(event) => {
            if (options.preventTrigger) event.preventDefault()
          }}
        >
          Options
        </ReactButton>
      </ReactMenu.Trigger>
      <ReactMenu.Content
        minWidth={200}
        onCloseAutoFocus={(event) => {
          log("closeAutoFocus")
          if (options.preventCloseAutoFocus) event.preventDefault()
        }}
      >
        <ReactMenu.Item onSelect={(event) => log(`select:Edit:${event.type}`)} onClick={() => log("click:Edit")}>
          Edit
        </ReactMenu.Item>
        <ReactMenu.Item disabled onSelect={() => log("select:Disabled")}>
          Disabled
        </ReactMenu.Item>
        <ReactMenu.Item
          onSelect={(event) => {
            event.preventDefault()
            log("select:Keep")
          }}
        >
          Keep open
        </ReactMenu.Item>
        <ReactMenu.Separator />
        <ReactMenu.CheckboxItem
          checked={controlled ? checked : undefined}
          onCheckedChange={(next) => {
            log(`checked:${next}`)
            setChecked(next)
          }}
          onSelect={(event) => {
            log("select:Show grid")
            event.preventDefault()
          }}
        >
          Show grid
        </ReactMenu.CheckboxItem>
        <ReactMenu.RadioGroup
          value={(controlled ? value : undefined) as string}
          onChange={(next) => {
            log(`radio:${next}`)
            setValue(next)
          }}
        >
          <ReactMenu.RadioItem value="a">Alpha</ReactMenu.RadioItem>
          <ReactMenu.RadioItem value="b" onSelect={() => log("select:Beta")}>
            Beta
          </ReactMenu.RadioItem>
          <ReactMenu.RadioItem value="c" disabled>
            Gamma
          </ReactMenu.RadioItem>
        </ReactMenu.RadioGroup>
        <ReactMenu.Sub onOpen={() => log("sub:open")} onClose={() => log("sub:close")}>
          <ReactMenu.SubTrigger>More</ReactMenu.SubTrigger>
          <ReactMenu.SubContent>
            <ReactMenu.Item onSelect={() => log("select:Move")}>Move</ReactMenu.Item>
            <ReactMenu.Item onSelect={() => log("select:Copy")}>Copy</ReactMenu.Item>
          </ReactMenu.SubContent>
        </ReactMenu.Sub>
        <ReactMenu.Link href="/settings" onClick={(event) => { event.preventDefault(); log("link") }}>
          Settings
        </ReactMenu.Link>
        <ReactMenu.Item onSelect={() => log("select:Share")}>
          <span>Share</span>
          <ReactMenu.ItemActions>
            <ReactMenu.ItemAction onClick={() => log("action")}>
              <ReactTrash />
            </ReactMenu.ItemAction>
          </ReactMenu.ItemActions>
        </ReactMenu.Item>
      </ReactMenu.Content>
    </ReactMenu>
  )
  return (
    <>
      <button type="button" data-outside="">
        Outside
      </button>
      {options.withProvider ? <ReactPlexUIProvider linkComponent={ReactRouterLink}>{menu}</ReactPlexUIProvider> : menu}
    </>
  )
}

const VueExample = defineComponent({
  props: {
    log: { type: Function as PropType<Log>, required: true },
    options: { type: Object as PropType<ExampleOptions>, required: true },
  },
  setup(props) {
    const state = reactive({ checked: false, value: "a" })
    const { log, options } = props
    const controlled = options.controlled ?? true

    const menu = () =>
      h(Menu, { forceOpen: options.forceOpen, modal: options.modal, onOpen: () => log("open"), onClose: () => log("close") }, {
        default: () => [
          h(MenuTrigger, null, {
            default: () =>
              h(
                VueButton,
                {
                  color: "secondary",
                  onPointerdown: (event: PointerEvent) => {
                    if (options.preventTrigger) event.preventDefault()
                  },
                },
                { default: () => "Options" },
              ),
          }),
          h(
            MenuContent,
            {
              minWidth: 200,
              onCloseAutoFocus: (event: Event) => {
                log("closeAutoFocus")
                if (options.preventCloseAutoFocus) event.preventDefault()
              },
            },
            {
              default: () => [
                h(
                  MenuItem,
                  { onSelect: (event: Event) => log(`select:Edit:${event.type}`), onClick: () => log("click:Edit") },
                  { default: () => "Edit" },
                ),
                h(MenuItem, { disabled: true, onSelect: () => log("select:Disabled") }, { default: () => "Disabled" }),
                h(
                  MenuItem,
                  {
                    onSelect: (event: Event) => {
                      event.preventDefault()
                      log("select:Keep")
                    },
                  },
                  { default: () => "Keep open" },
                ),
                h(MenuSeparator),
                h(
                  MenuCheckboxItem,
                  {
                    "checked": controlled ? state.checked : undefined,
                    "onUpdate:checked": (next: boolean) => {
                      state.checked = next
                    },
                    "onCheckedChange": (next: boolean) => log(`checked:${next}`),
                    "onSelect": (event: Event) => {
                      log("select:Show grid")
                      event.preventDefault()
                    },
                  },
                  { default: () => "Show grid" },
                ),
                h(
                  MenuRadioGroup,
                  {
                    "value": controlled ? state.value : undefined,
                    "onUpdate:value": (next: string) => {
                      state.value = next
                    },
                    "onChange": (next: string) => log(`radio:${next}`),
                  },
                  {
                    default: () => [
                      h(MenuRadioItem, { value: "a" }, { default: () => "Alpha" }),
                      h(MenuRadioItem, { value: "b", onSelect: () => log("select:Beta") }, { default: () => "Beta" }),
                      h(MenuRadioItem, { value: "c", disabled: true }, { default: () => "Gamma" }),
                    ],
                  },
                ),
                h(MenuSub, { onOpen: () => log("sub:open"), onClose: () => log("sub:close") }, {
                  default: () => [
                    h(MenuSubTrigger, null, { default: () => "More" }),
                    h(MenuSubContent, null, {
                      default: () => [
                        h(MenuItem, { onSelect: () => log("select:Move") }, { default: () => "Move" }),
                        h(MenuItem, { onSelect: () => log("select:Copy") }, { default: () => "Copy" }),
                      ],
                    }),
                  ],
                }),
                h(
                  MenuLink,
                  {
                    href: "/settings",
                    onClick: (event: MouseEvent) => {
                      event.preventDefault()
                      log("link")
                    },
                  },
                  { default: () => "Settings" },
                ),
                h(MenuItem, { onSelect: () => log("select:Share") }, {
                  default: () => [
                    h("span", null, "Share"),
                    h(MenuItemActions, null, {
                      default: () => [h(MenuItemAction, { onClick: () => log("action") }, { default: () => [h(VueTrash)] })],
                    }),
                  ],
                }),
              ],
            },
          ),
        ],
      })

    return () =>
      h(Fragment, null, [
        h("button", { "type": "button", "data-outside": "" }, "Outside"),
        options.withProvider ? h(VuePlexUIProvider, { linkComponent: VueRouterLink }, { default: menu }) : menu(),
      ])
  },
})

type Snapshot = { dom: string; active: string; log: string[] }

/**
 * Runs the same script against React and Vue. Each snapshot records the
 * DOM, the focused element and the callbacks logged since the last one.
 */
const walk = async (options: ExampleOptions, script: (snap: () => void) => Promise<void>) => {
  const run = async (mount: (log: Log) => Promise<void>) => {
    const snaps: Snapshot[] = []
    let log: string[] = []
    await mount((entry) => log.push(entry))
    await settle()
    await script(() => {
      snaps.push({ dom: snapshotDom(), active: describeElement(document.activeElement), log })
      log = []
    })
    return snaps
  }

  const react = await run(async (log) => {
    await act(async () => {
      render(<ReactExample log={log} {...options} />)
    })
  })
  cleanup()
  await settle()
  document.body.innerHTML = ""

  let unmount = () => {}
  let vue: Snapshot[] = []
  try {
    vue = await run(async (log) => {
      ;({ unmount } = mountVue(() => h(VueExample, { log, options })))
      await flushVue()
    })
  } finally {
    unmount()
    await settle()
    document.body.innerHTML = ""
  }

  return { react, vue }
}

const expectSame = ({ react, vue }: { react: Snapshot[]; vue: Snapshot[] }) => {
  expect(vue.map((s) => s.log)).toEqual(react.map((s) => s.log))
  expect(vue.map((s) => s.active)).toEqual(react.map((s) => s.active))
  expect(vue.map((s) => s.dom)).toEqual(react.map((s) => s.dom))
}

// Interactions (shared by both runs)

const trigger = () => document.querySelector<HTMLElement>('button[aria-haspopup="menu"]')!
const item = (text: string) => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find(
    (element) => (element.textContent ?? "").trim() === text,
  )
  if (!found) throw new Error(`No menu item "${text}"`)
  return found
}
const MENU = 'div[role=menu] "EditDisabledKeep openShow grid"'

const pointerDown = async (element: Element, init: PointerEventInit & { ctrlKey?: boolean } = {}) => {
  await interact(() => {
    fireEvent.pointerDown(element, { button: 0, pointerType: "mouse", ...init })
  })
  await settle()
}
const click = async (element: Element) => {
  await interact(() => {
    fireEvent.click(element)
  })
  await settle()
}
const press = async (key: string, target: Element = document.activeElement ?? document.body, init: KeyboardEventInit = {}) => {
  await interact(() => {
    fireEvent.keyDown(target, { key, ...init })
  })
  await settle()
}
const hover = async (element: Element, clientX = 10) => {
  await interact(() => {
    fireEvent.pointerMove(element, { pointerType: "mouse", clientX, clientY: 10 })
  })
  await settle()
}
const leave = async (element: Element) => {
  await interact(() => {
    fireEvent.pointerLeave(element, { pointerType: "mouse", clientX: 10, clientY: 10 })
  })
  await settle()
}

describe("Menu behaviour parity", () => {
  test.each([true, false])("pointerdown on the trigger opens; again closes (animations off: %s)", async (disabled) => {
    animation.disabled = disabled
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      snap()
      await pointerDown(trigger())
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual(["open"])
    expect(result.react[0]!.active).toBe(MENU)
    // The trigger and the outside-pointerdown dismissal both report a close
    // before the next render, as in React (a browser renders in between and
    // drops the second one, in both frameworks)
    expect(result.react[1]!.log).toEqual(["close", "close", "closeAutoFocus"])
    expect(result.react[1]!.dom).not.toContain('role="menu"')
  })

  test("only a primary, unmodified pointerdown opens", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger(), { button: 2 })
      await pointerDown(trigger(), { ctrlKey: true })
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual([])
  })

  test("preventDefault in the trigger child's pointerdown keeps it closed", async () => {
    const result = await walk({ preventTrigger: true }, async (snap) => {
      await pointerDown(trigger())
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual([])
    expect(result.react[0]!.dom).not.toContain('role="menu"')
  })

  test.each(["Enter", " ", "ArrowDown"])("%j on the trigger opens and focuses the first item", async (key) => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press(key, trigger())
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual(["open"])
    expect(result.react[0]!.active).toBe('div[role=menuitem] "Edit"')
    expect(result.react[0]!.dom).toContain('class="MenuItem" data-highlighted="" data-orientation="vertical" role="menuitem" tabindex="0"')
  })

  test("Escape closes and focus returns to the trigger", async () => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      await press("Escape")
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual(["open", "close", "closeAutoFocus"])
    expect(result.react[0]!.active).toBe('button "Options"')
  })

  test("a pointerdown outside closes without moving focus to the trigger", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await settle(5)
      await pointerDown(document.querySelector("[data-outside]")!)
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toContain("close")
    expect(result.react[0]!.active).not.toBe('button "Options"')
  })

  test("focus moving outside closes a non-modal menu, not a modal one", async () => {
    for (const modal of [false, true]) {
      const result = await walk({ modal }, async (snap) => {
        await pointerDown(trigger())
        document.querySelector<HTMLElement>("[data-outside]")!.focus()
        await settle(5)
        await settle(5)
        snap()
      })
      expectSame(result)
      expect(result.react[0]!.log).toEqual(modal ? ["open"] : ["open", "close", "closeAutoFocus"])
    }
  })

  test("focusing the trigger closes the menu like any outside focus", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      trigger().focus()
      await settle(5)
      await settle(5)
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual(["open", "close", "closeAutoFocus"])
  })

  test("modal: a pointerdown outside closes and focus returns to the trigger", async () => {
    const result = await walk({ modal: true }, async (snap) => {
      await pointerDown(trigger())
      await settle(5)
      await pointerDown(document.body)
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toContain("close")
  })

  test("clicking an item selects it with the menu's select event and closes", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await hover(item("Edit"))
      snap()
      await click(item("Edit"))
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.active).toBe('div[role=menuitem] "Edit"')
    expect(result.react[0]!.dom).toContain('class="MenuItem" data-highlighted="" data-orientation="vertical" role="menuitem" tabindex="0"')
    expect(result.react[1]!.log).toEqual(["click:Edit", "select:Edit:menu.itemSelect", "close", "closeAutoFocus"])
    expect(result.react[1]!.active).toBe('button "Options"')
  })

  test("preventDefault in onSelect keeps the menu open", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await click(item("Keep open"))
      snap()
      item("Keep open").focus()
      await press("Enter")
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([["open", "select:Keep"], ["select:Keep"]])
    expect(result.react[1]!.dom).toContain('role="menu"')
  })

  test("pointerup on an item selects it when the pointer went down elsewhere", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await interact(() => {
        fireEvent.pointerUp(item("Edit"), { pointerType: "mouse" })
      })
      await settle()
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toContain("select:Edit:menu.itemSelect")
  })

  test("arrow keys, Home and End move between enabled items without looping", async () => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("ArrowDown", trigger())
      for (const key of ["ArrowDown", "ArrowDown", "ArrowUp", "End", "ArrowDown", "Home", "ArrowUp", "PageDown", "PageUp"]) {
        await press(key)
        snap()
      }
    })
    expectSame(result)
    expect(result.react.map((s) => s.active)).toEqual([
      'div[role=menuitem] "Keep open"',
      'div[role=menuitemcheckbox] "Show grid"',
      'div[role=menuitem] "Keep open"',
      'div[role=menuitem] "Share"',
      'div[role=menuitem] "Share"',
      'div[role=menuitem] "Edit"',
      'div[role=menuitem] "Edit"',
      'div[role=menuitem] "Share"',
      'div[role=menuitem] "Edit"',
    ])
  })

  test("Enter and Space select the focused item; focus returns to the trigger", async () => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      await press("Enter")
      snap()
      trigger().focus()
      await press(" ", trigger())
      await press(" ")
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toContain("select:Edit:menu.itemSelect")
    expect(result.react[0]!.active).toBe('button "Options"')
  })

  test("Tab does not leave the menu", async () => {
    const prevented: boolean[] = []
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      await interact(() => {
        prevented.push(!fireEvent.keyDown(document.activeElement!, { key: "Tab" }))
      })
      await settle()
      snap()
    })
    expectSame(result)
    expect(prevented).toEqual([true, true])
  })

  test("a disabled item cannot be selected; hovering it focuses the menu", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await hover(item("Edit"))
      await hover(item("Disabled"))
      snap()
      await click(item("Disabled"))
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.active).toBe(MENU)
    expect(result.react[1]!.log).toEqual([])
  })

  test("leaving an item focuses the menu and clears the current tab stop", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await hover(item("Edit"))
      snap()
      await leave(item("Edit"))
      snap()
    })
    expectSame(result)
    expect(result.react[1]!.active).toBe(MENU)
    expect(result.react[1]!.dom).not.toContain('tabindex="0"')
  })

  test("typeahead focuses matching items, cycling on a repeated key", async () => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      for (const key of ["s", "s", "k"]) {
        await press(key)
        snap()
      }
      await settle(1100)
      await press("m")
      snap()
      await press("d")
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.active)).toEqual([
      'div[role=menuitemcheckbox] "Show grid"',
      'a[role=menuitem] "Settings"',
      'a[role=menuitem] "Settings"',
      'div[role=menuitem] "More"',
      'div[role=menuitem] "More"',
    ])
  })

  test("Space during a typeahead search searches instead of selecting", async () => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      await press("k")
      snap()
      await press(" ")
      await press("o")
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([["open"], []])
    expect(result.react[1]!.active).toBe('div[role=menuitem] "Keep open"')
  })

  test("submenu pointer grace area: moving towards the submenu keeps it open", async () => {
    // jsdom has no layout: give menus a box so the grace polygon has an area
    // (anchors keep a zero size: floating-ui would watch them with an IntersectionObserver)
    const menuRect = { left: 100, right: 200, top: 0, bottom: 100, x: 100, y: 0, width: 100, height: 100 }
    const noRect = { left: 0, right: 0, top: 0, bottom: 0, x: 0, y: 0, width: 0, height: 0 }
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      return { ...(this.getAttribute("role") === "menu" ? menuRect : noRect), toJSON: () => ({}) } as DOMRect
    })
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await hover(item("More"), 10)
      await settle(150)
      await leave(item("More"))
      await hover(item("Settings"), 95)
      snap()
      await settle(350)
      await hover(item("Settings"), 96)
      await settle(20)
      snap()
    })
    spy.mockRestore()
    expect(result.vue.map((s) => s.log)).toEqual(result.react.map((s) => s.log))
    expect(result.vue.map((s) => s.active)).toEqual(result.react.map((s) => s.active))
    expect(result.react.map((s) => s.log)).toEqual([["open", "sub:open"], ["sub:close"]])
    expect(result.react.map((s) => s.active)).toEqual(['div[role=menuitem] "More"', 'a[role=menuitem] "Settings"'])
  })

  test("controlled checkbox item toggles and stays open after preventDefault", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await click(item("Show grid"))
      snap()
      await press("Enter", item("Show grid"))
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([
      ["open", "select:Show grid", "checked:true"],
      ["select:Show grid", "checked:false"],
    ])
    expect(result.react[0]!.dom).toContain('aria-checked="true"')
  })

  test("uncontrolled checkbox and radio items report changes but keep their state", async () => {
    const result = await walk({ controlled: false }, async (snap) => {
      await pointerDown(trigger())
      await click(item("Show grid"))
      snap()
      await click(item("Beta"))
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([
      ["open", "select:Show grid", "checked:true"],
      ["select:Beta", "radio:b", "close", "closeAutoFocus"],
    ])
    expect(result.react[0]!.dom).not.toContain('aria-checked="true"')
  })

  test("controlled radio items select and close the menu", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await click(item("Beta"))
      snap()
      await pointerDown(trigger())
      snap()
      await click(item("Gamma"))
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([["open", "select:Beta", "radio:b", "close", "closeAutoFocus"], ["open"], []])
    expect(result.react[1]!.dom).toMatch(/aria-checked="true" class="MenuItem RadioItem"[^>]*>\n.*\n.*\n.*\n\s*"Beta"/)
  })

  test("submenu: ArrowRight opens and focuses its first item, ArrowLeft returns", async () => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      item("More").focus()
      await settle()
      await press("ArrowRight")
      snap()
      await press("ArrowDown")
      snap()
      await press("ArrowLeft")
      snap()
      await press("Enter")
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([["open", "sub:open"], [], ["sub:close"], ["sub:open"]])
    expect(result.react.map((s) => s.active)).toEqual([
      'div[role=menuitem] "Move"',
      'div[role=menuitem] "Copy"',
      'div[role=menuitem] "More"',
      'div[role=menuitem] "Move"',
    ])
    expect(result.react[3]!.dom.match(/role="menu"/g)).toHaveLength(2)
  })

  test("submenu: Escape closes only the submenu, then the menu", async () => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      item("More").focus()
      await settle()
      await press("ArrowRight")
      await press("Escape")
      snap()
      await press("Escape")
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([["open", "sub:open", "sub:close"], ["close", "closeAutoFocus"]])
    expect(result.react[0]!.active).toBe('div[role=menuitem] "More"')
    expect(result.react[1]!.active).toBe('button "Options"')
  })

  test("submenu: selecting an item closes the whole menu", async () => {
    const result = await walk({}, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      item("More").focus()
      await settle()
      await press("Enter")
      await press("Enter")
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual(["open", "sub:open", "select:Move", "close", "sub:close", "closeAutoFocus"])
    expect(result.react[0]!.active).toBe('button "Options"')
  })

  test("submenu: hovering the trigger opens it after a delay; hovering a sibling closes it", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await hover(item("More"))
      snap()
      await settle(150)
      snap()
      await hover(item("Settings"), 10)
      await settle(20)
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([["open"], ["sub:open"], ["sub:close"]])
    expect(result.react.map((s) => s.active)).toEqual([
      'div[role=menuitem] "More"',
      'div[role=menuitem] "More"',
      'a[role=menuitem] "Settings"',
    ])
  })

  test("submenu: clicking the trigger opens it; an outside pointerdown closes everything", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await click(item("More"))
      snap()
      await settle(5)
      await pointerDown(document.querySelector("[data-outside]")!)
      snap()
    })
    expectSame(result)
    expect(result.react.map((s) => s.log)).toEqual([["open", "sub:open"], ["close", "sub:close", "closeAutoFocus"]])
    expect(result.react[1]!.active).toBe("body")
  })

  test("item actions close the menu without selecting the item", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await click(document.querySelector('[role="menu"] [class~="ItemActions"] button')!)
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual(["open", "close", "action", "closeAutoFocus"])
  })

  test("a link item's own click handler runs first; its preventDefault() skips the selection", async () => {
    const result = await walk({}, async (snap) => {
      await pointerDown(trigger())
      await click(item("Settings"))
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual(["open", "link"])
    expect(result.react[0]!.dom).toContain('role="menu"')
  })

  test("link items render the provider's link component and select with Enter", async () => {
    const result = await walk({ withProvider: true }, async (snap) => {
      trigger().focus()
      await press("End", trigger())
      await press("ArrowDown", trigger())
      await press("End")
      await press("ArrowUp")
      snap()
      await press("Enter")
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.active).toBe('a[role=menuitem] "Settings"')
    expect(result.react[0]!.dom).toContain('data-router=""')
    expect(result.react[1]!.log).toEqual(["link"])
  })

  test("preventDefault in onCloseAutoFocus keeps focus off the trigger", async () => {
    const result = await walk({ preventCloseAutoFocus: true }, async (snap) => {
      trigger().focus()
      await press("Enter", trigger())
      await press("Escape")
      snap()
    })
    expectSame(result)
    expect(result.react[0]!.log).toEqual(["open", "close", "closeAutoFocus"])
    expect(result.react[0]!.active).toBe("body")
  })

  test("forceOpen: the trigger reports a close but the menu stays open", async () => {
    const result = await walk({ forceOpen: true }, async (snap) => {
      snap()
      await pointerDown(trigger())
      snap()
      await press("Escape", trigger())
      snap()
    })
    expectSame(result)
    // The trigger reports a close, and so does the dismissal of the content
    // that stays open
    expect(result.react.map((s) => s.log)).toEqual([[], ["close", "close"], []])
    expect(result.react[1]!.dom).toContain('role="menu"')
  })
})

describe("Menu trigger element resolution", () => {
  // A multi-root child (e.g. a collapsed SidebarMenuButton with its tooltip)
  // exposes the fragment's opening text node as $el; the trigger must use the
  // element that follows it, as Reka does
  const MultiRootButton = defineComponent({
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () => [h("button", { type: "button", ...attrs }, "Options"), h("span", { hidden: true }, "tip")]
    },
  })

  test("focus returns to a multi-root trigger child after Escape", async () => {
    animation.disabled = true
    mountVue(() =>
      h(Menu, null, () => [
        h(MenuTrigger, null, () => h(MultiRootButton)),
        h(MenuContent, null, () => h(MenuItem, { onSelect: () => {} }, () => "Edit")),
      ]),
    )
    await flushVue()
    const button = document.querySelector<HTMLButtonElement>("button")!
    button.focus()
    await interact(() => fireEvent.keyDown(button, { key: "Enter" }))
    await interact(() => fireEvent.keyDown(document.activeElement!, { key: "Escape" }))
    await new Promise((resolve) => setTimeout(resolve, 20))
    await flushVue()
    expect(document.activeElement).toBe(button)
  })

  // The Tooltip's own portal (Reka's `dir`, teleport order) is covered by the
  // Tooltip tests, so after Escape only focus and the trigger state are compared
  test("a Tooltip-wrapped trigger child positions the menu and gets focus back after Escape", async () => {
    animation.disabled = true
    const script = async () => {
      const button = document.querySelector<HTMLButtonElement>("button")!
      button.focus()
      await press("Enter", button)
      const opened = { dom: snapshotDom(), active: describeElement(document.activeElement) }
      await press("Escape")
      await settle(20)
      return [opened, { active: describeElement(document.activeElement), expanded: button.getAttribute("aria-expanded") }]
    }

    await act(async () => {
      render(
        <ReactMenu>
          <ReactMenu.Trigger>
            <ReactTooltip content="Actions">
              <button type="button">Menu</button>
            </ReactTooltip>
          </ReactMenu.Trigger>
          <ReactMenu.Content>
            <ReactMenu.Item onSelect={() => {}}>Edit</ReactMenu.Item>
          </ReactMenu.Content>
        </ReactMenu>,
      )
    })
    await settle()
    const react = await script()
    cleanup()
    await settle()
    document.body.innerHTML = ""

    mountVue(() =>
      h(Menu, null, () => [
        h(MenuTrigger, null, () => h(VueTooltip, { content: "Actions" }, () => h("button", { type: "button" }, "Menu"))),
        h(MenuContent, null, () => h(MenuItem, { onSelect: () => {} }, () => "Edit")),
      ]),
    )
    await settle()
    const vue = await script()

    expect(vue).toEqual(react)
    expect(react[0]!.dom).toContain("--radix-popper-anchor-width")
    expect(react[1]!.active).toBe('button "Menu"')
  })
})

describe("Menu selection after a canceled click", () => {
  // React's router links run the listeners given to them, then their own
  // navigation handler (which prevents the default); vue-router's RouterLink
  // runs its own handler first. Both still select.
  const ReactNavigatingLink = ({ onClick, ...rest }: { onClick?: (event: React.MouseEvent) => void; children?: ReactNode }) => (
    <a
      data-router=""
      {...rest}
      onClick={(event) => {
        onClick?.(event)
        event.preventDefault()
      }}
    />
  )
  const VueNavigatingLink = defineComponent({
    props: { to: String, href: String },
    setup(props, { slots }) {
      return () =>
        h("a", { "data-router": "", "href": props.to ?? props.href, "onClick": (event: Event) => event.preventDefault() }, slots.default?.())
    },
  })

  const prevent = (event: Event) => event.preventDefault()

  // A click canceled before the item's own listener (a capture-phase
  // preventDefault on the link or on an element around the item) is not
  // selected, as Radix checks `event.defaultPrevented`
  test.each([
    ["link", "own"],
    ["router link", "own"],
    ["item", "wrapper"],
    ["router link", "wrapper"],
    ["link", "none"],
    ["router link", "none"],
  ] as const)("%s, capture-phase preventDefault: %s", async (kind, canceledBy) => {
    animation.disabled = true
    const run = async (mount: (log: Log) => Promise<void>) => {
      const log: string[] = []
      await mount((entry) => log.push(entry))
      await settle()
      await pointerDown(trigger())
      await click(document.querySelector('[role="menuitem"]')!)
      return { log, open: !!document.querySelector('[role="menu"]') }
    }
    const capture = canceledBy === "own" ? { onClickCapture: prevent } : {}
    const wrapper = canceledBy === "wrapper" ? { onClickCapture: prevent } : {}

    const react = await run(async (log) => {
      await act(async () => {
        render(
          <ReactMenu onOpen={() => log("open")} onClose={() => log("close")}>
            <ReactMenu.Trigger>
              <button type="button">Options</button>
            </ReactMenu.Trigger>
            <ReactMenu.Content>
              <div {...wrapper}>
                {kind === "item" ? (
                  <ReactMenu.Item onSelect={() => log("select")}>Edit</ReactMenu.Item>
                ) : (
                  <ReactMenu.Link href="/docs" {...(kind === "router link" ? { as: ReactNavigatingLink } : {})} {...capture}>
                    Docs
                  </ReactMenu.Link>
                )}
              </div>
            </ReactMenu.Content>
          </ReactMenu>,
        )
      })
    })
    cleanup()
    await settle()
    document.body.innerHTML = ""

    const vue = await run(async (log) => {
      mountVue(() =>
        h(Menu, { onOpen: () => log("open"), onClose: () => log("close") }, () => [
          h(MenuTrigger, null, () => h("button", { type: "button" }, "Options")),
          h(MenuContent, null, () =>
            h("div", wrapper, [
              kind === "item"
                ? h(MenuItem, { onSelect: () => log("select") }, () => "Edit")
                : h(MenuLink, { href: "/docs", ...(kind === "router link" ? { as: VueNavigatingLink } : {}), ...capture }, () => "Docs"),
            ]),
          ),
        ]),
      )
      await flushVue()
    })

    expect(vue).toEqual(react)
    expect(react.open).toBe(canceledBy !== "none")
  })
})


// ---------------------------------------------------------------------------
// Review fixes and QA round 2 (G6a)

describe("Menu review fixes", () => {
  // Mounts the React tree, runs the script, then the Vue tree and the same
  // script; returns each run's result
  const both = async <T,>(
    reactTree: (log: Log) => ReactNode,
    vueTree: (log: Log) => VNode,
    script: (log: string[]) => Promise<T>,
  ) => {
    animation.disabled = true
    const reactLog: string[] = []
    await act(async () => {
      render(<>{reactTree((entry) => reactLog.push(entry))}</>)
    })
    await settle()
    const react = await script(reactLog)
    cleanup()
    await settle()
    document.body.innerHTML = ""

    const vueLog: string[] = []
    mountVue(() => vueTree((entry) => vueLog.push(entry)))
    await flushVue()
    await settle()
    const vue = await script(vueLog)
    return { react, vue }
  }

  test("Menu.Trigger forwards its attributes and listeners to the child, merged as Radix's Slot does", async () => {
    const result = await both(
      (log) => (
        <ReactMenu>
          <ReactMenu.Trigger
            {...({
              "aria-label": "More actions",
              "data-source": "trigger",
              "className": "outer",
              "onPointerDown": () => log("trigger pointerdown"),
            } as object)}
          >
            <button type="button" className="inner" data-source="child" onPointerDown={() => log("child pointerdown")}>
              More
            </button>
          </ReactMenu.Trigger>
          <ReactMenu.Content>
            <ReactMenu.Item onSelect={() => {}}>Edit</ReactMenu.Item>
          </ReactMenu.Content>
        </ReactMenu>
      ),
      (log) =>
        h(Menu, null, () => [
          h(
            MenuTrigger,
            { "aria-label": "More actions", "data-source": "trigger", "class": "outer", "onPointerdown": () => log("trigger pointerdown") },
            () => h("button", { type: "button", class: "inner", "data-source": "child", onPointerdown: () => log("child pointerdown") }, "More"),
          ),
          h(MenuContent, null, () => h(MenuItem, { onSelect: () => {} }, () => "Edit")),
        ]),
      async (log) => {
        const closed = snapshotDom()
        await pointerDown(trigger())
        return { closed, open: !!document.querySelector('[role="menu"]'), log: [...log] }
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.closed).toContain('aria-label="More actions"')
    expect(result.react.closed).toContain('class="outer inner"')
    expect(result.react.closed).toContain('data-source="child"')
    expect(result.react.log).toEqual(["child pointerdown", "trigger pointerdown"])
    expect(result.react.open).toBe(true)
  })

  test("Menu.Trigger: the caller's preventDefault() on pointerdown keeps it closed", async () => {
    const prevent = (event: { preventDefault(): void }) => event.preventDefault()
    const result = await both(
      () => (
        <ReactMenu>
          <ReactMenu.Trigger {...({ onPointerDown: prevent } as object)}>
            <button type="button">More</button>
          </ReactMenu.Trigger>
          <ReactMenu.Content>
            <ReactMenu.Item onSelect={() => {}}>Edit</ReactMenu.Item>
          </ReactMenu.Content>
        </ReactMenu>
      ),
      () =>
        h(Menu, null, () => [
          h(MenuTrigger, { onPointerdown: prevent }, () => h("button", { type: "button" }, "More")),
          h(MenuContent, null, () => h(MenuItem, { onSelect: () => {} }, () => "Edit")),
        ]),
      async () => {
        await pointerDown(trigger())
        return !!document.querySelector('[role="menu"]')
      },
    )
    expect(result).toEqual({ react: false, vue: false })
  })

  test("an item with only an onClick handler is interactive: clicking runs it and closes the menu", async () => {
    const result = await both(
      (log) => (
        <ReactMenu>
          <ReactMenu.Trigger>
            <button type="button">More</button>
          </ReactMenu.Trigger>
          <ReactMenu.Content>
            <ReactMenu.Item onClick={() => log("click")}>Save</ReactMenu.Item>
          </ReactMenu.Content>
        </ReactMenu>
      ),
      (log) =>
        h(Menu, null, () => [
          h(MenuTrigger, null, () => h("button", { type: "button" }, "More")),
          h(MenuContent, null, () => h(MenuItem, { onClick: () => log("click") }, () => "Save")),
        ]),
      async (log) => {
        await pointerDown(trigger())
        const dom = snapshotDom()
        await click(item("Save"))
        return { dom, log: [...log], open: !!document.querySelector('[role="menu"]') }
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.dom).toMatch(/<div class="MenuItem" data-orientation="vertical" role="menuitem" tabindex="-1">/)
    expect(result.react.log).toEqual(["click"])
    expect(result.react.open).toBe(false)
  })

  // Next's Link runs the listeners it is given first, vue-router's RouterLink
  // its own handler first; both skip navigating a canceled click
  const ReactGuardedLink = ({ onClick, log, ...rest }: { onClick?: (event: React.MouseEvent) => void; log: Log; children?: ReactNode }) => (
    <a
      data-router=""
      {...rest}
      onClick={(event) => {
        onClick?.(event)
        log(event.defaultPrevented ? "no navigation" : "navigate")
        event.preventDefault()
      }}
    />
  )
  const VueGuardedLink = defineComponent({
    props: { to: String, href: String, log: { type: Function as PropType<Log>, required: true } },
    setup(props, { slots }) {
      return () =>
        h(
          "a",
          {
            "data-router": "",
            "href": props.to ?? props.href,
            "onClick": (event: Event) => {
              props.log(event.defaultPrevented ? "no navigation" : "navigate")
              event.preventDefault()
            },
          },
          slots.default?.(),
        )
    },
  })

  test.each([
    ["anchor, disabled", { disabled: true }],
    ["router link, disabled", { disabled: true, router: true }],
    ["router link, enabled", { router: true }],
    ["router link, the caller cancels the click", { router: true, cancel: true }],
  ] as const)("Menu.Link: %s", async (_name, options: { disabled?: boolean; router?: boolean; cancel?: boolean }) => {
    const cancel = options.cancel ? { onClick: (event: { preventDefault(): void }) => event.preventDefault() } : {}
    const result = await both(
      (log) => (
        <ReactMenu onClose={() => log("close")}>
          <ReactMenu.Trigger>
            <button type="button">More</button>
          </ReactMenu.Trigger>
          <ReactMenu.Content>
            <ReactMenu.Link
              href="/target"
              disabled={options.disabled}
              {...(options.router ? { as: ReactGuardedLink, log } : {})}
              {...cancel}
            >
              Target
            </ReactMenu.Link>
          </ReactMenu.Content>
        </ReactMenu>
      ),
      (log) =>
        h(Menu, { onClose: () => log("close") }, () => [
          h(MenuTrigger, null, () => h("button", { type: "button" }, "More")),
          h(MenuContent, null, () =>
            h(
              MenuLink,
              { href: "/target", disabled: options.disabled, ...(options.router ? { as: VueGuardedLink, log } : {}), ...cancel },
              () => "Target",
            ),
          ),
        ]),
      async (log) => {
        await pointerDown(trigger())
        let canceled = false
        await interact(() => {
          canceled = !fireEvent.click(document.querySelector("a")!)
        })
        await settle()
        return { canceled, closed: log.includes("close"), open: !!document.querySelector('[role="menu"]'), navigation: log.filter((entry) => entry !== "close") }
      },
    )
    // A caller's cancel comes after vue-router's own handler, too late to stop
    // its navigation (React's router links run it first); the menu still
    // treats it as canceled
    const { navigation: reactNavigation, ...react } = result.react
    const { navigation: vueNavigation, ...vue } = result.vue
    expect(vue).toEqual(react)
    if (!options.cancel) expect(vueNavigation).toEqual(reactNavigation)
    if (options.disabled) {
      expect(react).toEqual({ canceled: true, closed: false, open: true })
      if (options.router) expect(reactNavigation).toEqual(["no navigation"])
    } else if (options.cancel) {
      expect(react).toEqual({ canceled: true, closed: false, open: true })
    } else {
      expect(react).toEqual({ canceled: true, closed: true, open: false })
      expect(reactNavigation).toEqual(["navigate"])
    }
  })

  test("Menu.Label uses the xs text tokens the theme defines", () => {
    const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")
    const label = read("packages/styles/src/components/Menu/Menu.module.css").match(/\n\.MenuLabel \{([^}]*)/)?.[1] ?? ""
    const tokens = read("packages/styles/src/styles/variables-semantic.css")
    const used = [...label.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1]!)
    expect(used).toContain("--font-text-xs-size")
    expect(used).toContain("--font-text-xs-line-height")
    for (const token of ["--font-text-xs-size", "--font-text-xs-line-height"]) expect(tokens).toContain(`${token}:`)
  })
})

describe("Menu trigger through a forwarded slot", () => {
  test("a child forwarded with <slot /> still becomes the trigger", async () => {
    const ReactOpen = ({ children }: { children: ReactNode }) => <ReactMenu.Trigger>{children}</ReactMenu.Trigger>
    // `<MenuTrigger><slot /></MenuTrigger>` in a template
    const VueOpen = defineComponent((_props, { slots }) => () => h(MenuTrigger, null, { default: () => [renderSlot(slots, "default")] }))

    const run = async () => {
      const dom = [snapshotDom()]
      await pointerDown(trigger())
      dom.push(snapshotDom())
      return dom
    }
    await act(async () => {
      render(
        <ReactMenu>
          <ReactOpen>
            <ReactButton color="secondary">Open</ReactButton>
          </ReactOpen>
          <ReactMenu.Content>
            <ReactMenu.Item onSelect={() => {}}>Edit</ReactMenu.Item>
          </ReactMenu.Content>
        </ReactMenu>,
      )
    })
    const react = await run()
    cleanup()
    const { unmount } = mountVue(() =>
      h(Menu, null, {
        default: () => [
          h(VueOpen, null, { default: () => h(VueButton, { color: "secondary" }, () => "Open") }),
          h(MenuContent, null, { default: () => h(MenuItem, { onSelect: () => {} }, () => "Edit") }),
        ],
      }),
    )
    await flushVue()
    const vue = await run()
    unmount()

    expect(vue).toEqual(react)
    expect(react[1]).toContain('role="menu"')
  })
})
