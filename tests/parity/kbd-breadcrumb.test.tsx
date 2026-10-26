import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Breadcrumb as RBreadcrumb } from "../../packages/ui/src/components/Breadcrumb"
import { Kbd as RKbd } from "../../packages/ui/src/components/Kbd"
import { Breadcrumb, BreadcrumbItem } from "../../packages/vue/src/components/Breadcrumb"
import { Kbd, KbdGroup } from "../../packages/vue/src/components/Kbd"
import { flushVue, mountVue } from "./harness"
import { renderPair } from "./pair"

describe("Kbd parity", () => {
  test.each([
    ["defaults", {}],
    ["xs outline", { size: "xs", variant: "outline" }],
    ["md", { size: "md" }],
    ["with attributes", { "title": "Command", "aria-label": "Command key" }],
  ])("%s", async (_name, props) => {
    const pair = await renderPair(<RKbd {...(props as object)}>⌘</RKbd>, () => h(Kbd, props, () => "⌘"))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain("<kbd")
  })

  test("a group of keys", async () => {
    const pair = await renderPair(
      <RKbd.Group>
        <RKbd>⌘</RKbd>
        <RKbd>K</RKbd>
      </RKbd.Group>,
      () => h(KbdGroup, null, () => [h(Kbd, null, () => "⌘"), h(Kbd, null, () => "K")]),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('class="Group"')
  })
})

describe("Breadcrumb parity", () => {
  const reactTrail = (props: Record<string, unknown> = {}) => (
    <RBreadcrumb {...props}>
      <RBreadcrumb.Item href="/">Home</RBreadcrumb.Item>
      <RBreadcrumb.Item href="/settings">Settings</RBreadcrumb.Item>
      <RBreadcrumb.Item>Archived</RBreadcrumb.Item>
      <RBreadcrumb.Item current>Members</RBreadcrumb.Item>
    </RBreadcrumb>
  )
  const vueTrail = (props: Record<string, unknown> = {}, separator?: () => unknown) => () =>
    h(Breadcrumb, props, {
      default: () => [
        h(BreadcrumbItem, { href: "/" }, () => "Home"),
        h(BreadcrumbItem, { href: "/settings" }, () => "Settings"),
        h(BreadcrumbItem, null, () => "Archived"),
        h(BreadcrumbItem, { current: true }, () => "Members"),
      ],
      ...(separator ? { separator } : {}),
    })

  test.each([
    ["defaults", {}],
    ["sm", { size: "sm" }],
    ["custom name and class", { "aria-label": "Path", "className": "trail" }],
  ])("%s", async (_name, props) => {
    const { className, ...rest } = props as { className?: string }
    const pair = await renderPair(reactTrail(props), vueTrail(className ? { ...rest, class: className } : rest))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).toContain('aria-current="page"')
  })

  test("a custom separator", async () => {
    const pair = await renderPair(reactTrail({ separator: "/" }), vueTrail({}, () => "/"))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("<svg")
  })

  test("the landmark, the links and the current page", async () => {
    for (const mount of [
      async () => {
        await act(async () => {
          render(reactTrail())
        })
      },
      async () => {
        mountVue(vueTrail())
        await flushVue()
      },
    ]) {
      await mount()
      expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy()
      expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings")
      expect(screen.getByText("Members").getAttribute("aria-current")).toBe("page")
      expect(screen.queryByRole("link", { name: "Members" })).toBeNull()
      cleanup()
      document.body.innerHTML = ""
    }
  })

  test("an item with a click handler acts as a button", async () => {
    const onReact = vi.fn()
    await act(async () => {
      render(
        <RBreadcrumb>
          <RBreadcrumb.Item onClick={onReact}>Back</RBreadcrumb.Item>
          <RBreadcrumb.Item current>Detail</RBreadcrumb.Item>
        </RBreadcrumb>,
      )
    })
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    const react = document.body.innerHTML
    cleanup()

    const onVue = vi.fn()
    mountVue(() =>
      h(Breadcrumb, null, () => [h(BreadcrumbItem, { onClick: onVue }, () => "Back"), h(BreadcrumbItem, { current: true }, () => "Detail")]),
    )
    await flushVue()
    fireEvent.click(screen.getByRole("button", { name: "Back" }))

    expect(onReact).toHaveBeenCalledTimes(1)
    expect(onVue).toHaveBeenCalledTimes(1)
    expect(react).toContain('role="button"')
  })
})
