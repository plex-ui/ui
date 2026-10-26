import { fireEvent } from "@testing-library/react"
import { createElement, type ComponentType, type ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { defineComponent, h, type VNodeArrayChildren } from "vue"
import { ButtonLink as ReactButtonLink } from "../../packages/ui/src/components/Button"
import { PlexUIProvider as ReactPlexUIProvider } from "../../packages/ui/src/components/PlexUIProvider"
import { TextLink as ReactTextLink } from "../../packages/ui/src/components/TextLink"
import { ButtonLink as VueButtonLink } from "../../packages/vue/src/components/Button"
import { PlexUIProvider as VuePlexUIProvider } from "../../packages/vue/src/components/PlexUIProvider"
import { TextLink as VueTextLink } from "../../packages/vue/src/components/TextLink"
import { mountVue } from "./harness"
import { interact, renderPair } from "./pair"

type Props = Record<string, unknown>

// A stand-in router link with the same DOM in both frameworks
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

const icon = { viewBox: "0 0 20 20", width: "20", height: "20", "aria-hidden": "true" }
const reactChildren = (withIcon: boolean): ReactNode =>
  withIcon ? ["Docs ", <svg key="i" {...icon} />] : "Docs"
const vueChildren = (withIcon: boolean): VNodeArrayChildren => (withIcon ? ["Docs ", h("svg", icon)] : ["Docs"])

// React prop names map to Vue ones: className becomes class
const vueProps = ({ className, ...props }: Props) => (className ? { ...props, class: className } : props)

type Case = [string, Props, { icon?: boolean; provider?: boolean; as?: boolean }?]

const pair = (React: ComponentType<Props>, Vue: object, [, props, opts = {}]: Case) => {
  const reactAs = opts.as ? { as: ReactRouterLink } : {}
  const vueAs = opts.as ? { as: VueRouterLink } : {}
  const reactEl = createElement(React, { ...props, ...reactAs }, reactChildren(!!opts.icon))
  const vueRender = () => h(Vue as never, { ...vueProps(props), ...vueAs }, { default: () => vueChildren(!!opts.icon) })
  return opts.provider
    ? renderPair(
        <ReactPlexUIProvider linkComponent={ReactRouterLink}>{reactEl}</ReactPlexUIProvider>,
        () => h(VuePlexUIProvider, { linkComponent: VueRouterLink }, { default: vueRender }),
      )
    : renderPair(reactEl, vueRender)
}

const textLinkCases: Case[] = [
  ["no href renders a span[role=button]", {}],
  ["internal href", { href: "/docs" }],
  ["primary", { href: "#", primary: true }],
  ["primary with underline", { href: "#", primary: true, underline: true }],
  ["underline off", { href: "#", underline: false }],
  ["external href", { href: "https://plexui.com" }],
  ["forceExternal on a relative href", { href: "/docs", forceExternal: true }],
  ["forceExternal off on an absolute href", { href: "https://plexui.com", forceExternal: false }],
  ["explicit target is kept on an internal link", { href: "/docs", target: "_self" }],
  ["explicit target wins on an external link", { href: "https://plexui.com", target: "_self" }],
  ["explicit target reaches the provider link component", { to: "/docs", target: "_blank" }, { provider: true }],
  ["no href drops the target", { target: "_blank" }],
  ["no href with a click handler is focusable", { onClick: () => {} }],
  ["to without a provider", { to: "/docs" }],
  ["className and attributes", { href: "#", className: "font-semibold", "aria-label": "Docs", id: "docs-link" }],
  ["icon child", { href: "#" }, { icon: true }],
  ["provider link component", { to: "/docs" }, { provider: true }],
  ["provider skipped for external", { href: "https://plexui.com" }, { provider: true }],
  ["as override", { href: "/docs" }, { as: true }],
]

const buttonLinkCases: Case[] = [
  ["default", { href: "#" }],
  ["secondary soft", { href: "#", color: "secondary", variant: "soft" }],
  ["danger outline lg pill", { href: "#", color: "danger", variant: "outline", size: "lg", pill: true }],
  ["block, gutter and icon size", { href: "#", block: true, gutterSize: "xs", iconSize: "lg" }],
  ["opticallyAlign end", { href: "#", variant: "ghost", opticallyAlign: "end" }],
  ["external", { href: "https://plexui.com" }],
  ["external forced", { href: "/docs", external: true }],
  ["to without a provider", { to: "/docs" }],
  ["className and attributes", { href: "#", className: "whitespace-nowrap", "aria-label": "API keys", id: "keys" }],
  ["icon and text", { href: "#" }, { icon: true }],
  ["disabled renders span[role=link] and drops attributes", { href: "#", disabled: true, "aria-label": "x", id: "y", style: { color: "red" } }],
  ["disabled relaxed", { href: "#", disabled: true, disabledTone: "relaxed" }],
  ["disabled false", { href: "#", disabled: false }],
  ["provider link component", { href: "/docs" }, { provider: true }],
  ["as override", { href: "/docs" }, { as: true }],
]

describe("a router link that requires `to` (vue-router's RouterLink) gets the href", () => {
  // React link components take `href`; Vue's RouterLink requires `to` and
  // resolves the href itself (base path, hash history)
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

  test.each([
    ["TextLink", ReactTextLink, VueTextLink],
    ["ButtonLink", ReactButtonLink, VueButtonLink],
  ] as const)("%s, from the provider and as an `as` override", async (_name, RLink, VLink) => {
    for (const via of ["provider", "as"] as const) {
      const reactEl = createElement(RLink as never, { href: "/settings", ...(via === "as" ? { as: ReactStrictLink } : {}) }, "Settings")
      const vueRender = () =>
        h(VLink as never, { href: "/settings", ...(via === "as" ? { as: VueStrictLink } : {}) }, { default: () => "Settings" })
      const { react, vue } =
        via === "provider"
          ? await renderPair(
              <ReactPlexUIProvider linkComponent={ReactStrictLink}>{reactEl}</ReactPlexUIProvider>,
              () => h(VuePlexUIProvider, { linkComponent: VueStrictLink }, { default: vueRender }),
            )
          : await renderPair(reactEl, vueRender)
      expect(vue).toBe(react)
      expect(react).toContain('href="#resolved/settings"')
    }
  })
})

describe("TextLink parity", () => {
  test.each(textLinkCases)("%s", async (...testCase) => {
    const { react, vue } = await pair(ReactTextLink as never, VueTextLink, testCase)
    expect(vue).toBe(react)
  })
})

describe("TextLink keyboard parity", () => {
  // Both spans side by side: [React, Vue]
  const spans = () => Array.from(document.querySelectorAll('[role="button"]')) as HTMLElement[]

  test("no href with a click handler: Enter and Space click it, other keys do not", async () => {
    const reactClick = vi.fn()
    const vueClick = vi.fn()
    const { render } = await import("@testing-library/react")
    render(<ReactTextLink onClick={reactClick}>Docs</ReactTextLink>)
    mountVue(() => h(VueTextLink, { onClick: vueClick }, { default: () => "Docs" }))
    const results: Array<[boolean, boolean]> = []
    await interact(() => {
      for (const key of ["Enter", " ", "a"]) {
        const [reactSpan, vueSpan] = spans()
        results.push([fireEvent.keyDown(reactSpan!, { key }), fireEvent.keyDown(vueSpan!, { key })])
      }
    })
    expect(spans().map((span) => span.getAttribute("tabindex"))).toEqual(["0", "0"])
    expect(reactClick).toHaveBeenCalledTimes(2)
    expect(vueClick).toHaveBeenCalledTimes(2)
    // fireEvent returns false when the default was prevented
    expect(results).toEqual([[false, false], [false, false], [true, true]])
  })

  test("the caller's keydown runs first and can prevent the click; tabindex wins", async () => {
    const reactClick = vi.fn()
    const vueClick = vi.fn()
    const keys: string[] = []
    const { render } = await import("@testing-library/react")
    render(
      <ReactTextLink tabIndex={-1} onClick={reactClick} onKeyDown={(evt) => (keys.push(`react ${evt.key}`), evt.key === "Enter" && evt.preventDefault())}>
        Docs
      </ReactTextLink>,
    )
    mountVue(() =>
      h(
        VueTextLink,
        { tabindex: -1, onClick: vueClick, onKeydown: (evt: KeyboardEvent) => (keys.push(`vue ${evt.key}`), evt.key === "Enter" && evt.preventDefault()) },
        { default: () => "Docs" },
      ),
    )
    await interact(() => {
      for (const key of ["Enter", " "]) for (const span of spans()) fireEvent.keyDown(span, { key })
    })
    expect(spans().map((span) => span.getAttribute("tabindex"))).toEqual(["-1", "-1"])
    expect(keys).toEqual(["react Enter", "vue Enter", "react  ", "vue  "])
    expect(reactClick).toHaveBeenCalledTimes(1)
    expect(vueClick).toHaveBeenCalledTimes(1)
  })

  test("no href without a click handler is not focusable and ignores Enter", async () => {
    const { render } = await import("@testing-library/react")
    render(<ReactTextLink>Docs</ReactTextLink>)
    mountVue(() => h(VueTextLink, null, { default: () => "Docs" }))
    const results: boolean[] = []
    await interact(() => {
      for (const span of spans()) results.push(fireEvent.keyDown(span, { key: "Enter" }))
    })
    expect(spans().map((span) => span.getAttribute("tabindex"))).toEqual([null, null])
    expect(results).toEqual([true, true])
  })
})

describe("ButtonLink parity", () => {
  test.each(buttonLinkCases)("%s", async (...testCase) => {
    const { react, vue } = await pair(ReactButtonLink as never, VueButtonLink, testCase)
    expect(vue).toBe(react)
  })

  test("click fires unless disabled; pointerenter keeps the caller's handler", async () => {
    const calls: string[] = []
    const reactClick = vi.fn()
    const vueClick = vi.fn()
    const react = <ReactButtonLink href="#" color="primary" onClick={reactClick} onPointerEnter={() => calls.push("react")}>Go</ReactButtonLink>
    const vueEnabled = () => h(VueButtonLink, { href: "#", onClick: vueClick, onPointerenter: () => calls.push("vue") }, { default: () => "Go" })

    const { render } = await import("@testing-library/react")
    render(react)
    mountVue(vueEnabled)
    const [reactLink, vueLink] = Array.from(document.querySelectorAll("a"))
    await interact(() => {
      fireEvent.click(reactLink!)
      fireEvent.click(vueLink!)
      fireEvent.pointerEnter(reactLink!)
      fireEvent.pointerEnter(vueLink!)
    })
    expect(reactClick).toHaveBeenCalledTimes(1)
    expect(vueClick).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(["react", "vue"])
    expect(vueLink!.style.getPropertyValue("--scale")).toBe(reactLink!.style.getPropertyValue("--scale"))
  })

  test("disabled does not fire click", async () => {
    const reactClick = vi.fn()
    const vueClick = vi.fn()
    const { render } = await import("@testing-library/react")
    render(<ReactButtonLink href="#" color="primary" disabled onClick={reactClick}>Go</ReactButtonLink>)
    mountVue(() => h(VueButtonLink, { href: "#", disabled: true, onClick: vueClick }, { default: () => "Go" }))
    await interact(() => {
      for (const link of document.querySelectorAll('[role="link"]')) fireEvent.click(link)
    })
    expect(document.querySelectorAll('[role="link"]')).toHaveLength(2)
    expect(reactClick).not.toHaveBeenCalled()
    expect(vueClick).not.toHaveBeenCalled()
  })
})
