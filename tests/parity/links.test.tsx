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
  ["target is ignored", { href: "/docs", target: "_self" }],
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

describe("TextLink parity", () => {
  test.each(textLinkCases)("%s", async (...testCase) => {
    const { react, vue } = await pair(ReactTextLink as never, VueTextLink, testCase)
    expect(vue).toBe(react)
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
