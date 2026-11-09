import { readFileSync } from "node:fs"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { h } from "vue"
import { Button as RButton, ButtonLink as RButtonLink } from "../../packages/ui/src/components/Button"
import { ButtonGroup as RButtonGroup } from "../../packages/ui/src/components/ButtonGroup"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import { Toolbar as RToolbar } from "../../packages/ui/src/components/Toolbar"
import { Button, ButtonLink } from "../../packages/vue/src/components/Button"
import { ButtonGroup, ButtonGroupSeparator } from "../../packages/vue/src/components/ButtonGroup"
import { Input } from "../../packages/vue/src/components/Input"
import { Toolbar, ToolbarLeading, ToolbarTrailing } from "../../packages/vue/src/components/Toolbar"
import { flushVue, mountVue } from "./harness"

// A glass ButtonGroup on a phone is the Button Group of the iOS 27 kit (Toolbars 507:25993, _Buttons - 44pt and
// 48pt, Type=Button Group): one capsule of bar buttons, as Notes holds its symbols (IMG_5734, 5736). A group in a
// Toolbar is one by itself; `mobileMaterial="glass"` asks for it elsewhere; "flat" keeps the joined look; a group
// in the content, or of a field and buttons, stays joined.

const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")
const css = read("components/ButtonGroup/ButtonGroup.module.css")
const phone = css.slice(css.indexOf("@media (max-width: 767.98px)"))

/** The selector of the first rule in the phone block whose body starts with `marker`. */
const selectorBefore = (marker: string) => {
  const at = phone.indexOf(marker)
  expect(at).toBeGreaterThan(-1)
  const open = phone.lastIndexOf("{", at)
  const start = Math.max(phone.lastIndexOf("}", open), phone.lastIndexOf("*/", open) + 1)
  return phone.slice(start + 1, open).trim()
}

const CONTEXT = selectorBefore("--button-group-joined-radius: var(--radius-full);")
const CAPSULE = selectorBefore("gap: var(--button-group-glass-gap);")

afterEach(() => cleanup())

describe("ButtonGroup glass on a phone", () => {
  test("the joined edges read variables, unset on every group, with the desktop values as fallbacks", () => {
    const base = css.slice(0, css.indexOf("@media"))
    expect(base).toMatch(/--button-group-joined-radius: initial;/)
    expect(base).toMatch(/--button-group-joined-overlap: initial;/)
    expect(base).toMatch(/--button-group-joined-clip: initial;/)
    expect(base).not.toMatch(/radius: 0;/)
    expect(base.match(/radius: var\(--button-group-joined-radius, 0\);/g)).toHaveLength(16)
    expect(base).toMatch(/margin-inline-start: var\(--button-group-joined-overlap, -1px\);/)
    expect(base).toMatch(/margin-block-start: var\(--button-group-joined-overlap, -1px\);/)
    expect(base).toMatch(/clip-path: var\(--button-group-joined-clip, inset\(0 0 0 1px\)\);/)
    expect(base).toMatch(/clip-path: var\(--button-group-joined-clip, inset\(1px 0 0 0\)\);/)
  })

  test("the capsule takes the kit's sizes and clears its buttons", () => {
    expect(phone).toMatch(/padding: 0 var\(--button-group-glass-padding\);/)
    expect(phone).toMatch(/background-color: var\(--mobile-glass-background\);/)
    expect(phone).toMatch(/backdrop-filter: var\(--mobile-glass-backdrop-filter\);/)
    expect(phone).toMatch(/& > \[data-slot="button-group-separator"\] \{\s*display: none;/)
    expect(phone).toMatch(/--button-size: var\(--button-group-glass-item-size\);/)
    // Every item rule takes a disabled ButtonLink, a span with the link role, too
    expect(phone.match(/& > :where\(button, a, \[role="link"\]\)/g)).toHaveLength(5)
    expect(phone).not.toMatch(/:where\(button, a\)/)
    expect(phone).toMatch(/--button-mobile-material-background: transparent;/)
    expect(phone).toMatch(/--button-border-color: transparent;/)
    expect(phone).toMatch(/--button-text-color: var\(--color-text\);/)
    expect(phone).toMatch(/\[data-toolbar\] \.Root \{\s*--button-group-glass-item-size: var\(--toolbar-item-size\);\s*--button-group-glass-gap: var\(--toolbar-group-gap\);\s*--button-group-glass-padding: var\(--toolbar-group-padding\);\s*--button-group-glass-nested-gap: var\(--toolbar-item-gap\);/)
    expect(phone).toMatch(/\[data-toolbar\]\[data-placement="bottom"\] \.Root \{\s*--button-group-glass-label-gutter: var\(--toolbar-bottom-label-gutter\);/)
  })

  test("the tokens are the kit's capsules: 160 x 44 on top, 164 x 48 at the bottom and as a column", () => {
    const tokens = read("styles/variables-components.css")
    expect(tokens).toMatch(/--button-group-glass-item-size: var\(--toolbar-top-item-size\);/)
    expect(tokens).toMatch(/--button-group-glass-gap: var\(--toolbar-group-gap\);/)
    expect(tokens).toMatch(/--button-group-glass-padding: var\(--toolbar-group-padding\);/)
    expect(tokens).toMatch(/--button-group-glass-vertical-item-size: var\(--toolbar-bottom-item-size\);/)
    expect(tokens).toMatch(/--button-group-glass-vertical-gap: var\(--toolbar-bottom-group-gap\);/)
    expect(tokens).toMatch(/--button-group-glass-vertical-padding: var\(--toolbar-bottom-group-padding\);/)
    // 2 + 3 x 44 + 2 x 12 + 2 = 160, 4 + 3 x 48 + 2 x 6 + 4 = 164
    expect(tokens).toMatch(/--toolbar-top-item-size: 44px;/)
    expect(tokens).toMatch(/--toolbar-group-gap: 12px;\s*--toolbar-group-padding: 2px;\s*--toolbar-bottom-group-gap: 6px;\s*--toolbar-bottom-group-padding: 4px;/)
    // The bottom bar sets its group sizes on the bar, so a ButtonGroup in it inherits them as a Toolbar.Group does
    const toolbar = read("components/Toolbar/Toolbar.module.css")
    expect(toolbar).toMatch(/\.Toolbar\[data-placement="bottom"\] \{\s*--toolbar-group-gap: var\(--toolbar-bottom-group-gap\);/)
    expect(toolbar).not.toMatch(/\.Toolbar\[data-placement="bottom"\] \.Group \{/)
  })

  const expectations = (root: ParentNode) => {
    const group = (label: string) => root.querySelector<HTMLElement>(`[aria-label="${label}"]`)!
    // In a bar: a capsule; a row of groups is a glass context but not a capsule
    expect(group("Note actions").matches(CAPSULE)).toBe(true)
    expect(group("Row").matches(CONTEXT)).toBe(true)
    expect(group("Row").matches(CAPSULE)).toBe(false)
    expect(group("Back").matches(CAPSULE)).toBe(true)
    // Flat keeps the joined group in a bar; a field keeps it joined anywhere
    expect(group("Flat").matches(CONTEXT)).toBe(false)
    expect(group("Search").matches(CONTEXT)).toBe(false)
    // In the content only on request
    expect(group("Content").matches(CONTEXT)).toBe(false)
    expect(group("Zoom").matches(CAPSULE)).toBe(true)
    // A disabled link in a capsule is one of its buttons
    const link = group("Links").querySelector<HTMLElement>('[role="link"]')!
    expect(link.tagName).toBe("SPAN")
    expect(link.matches(`${CAPSULE} > :where(button, a, [role="link"])`)).toBe(true)
  }

  test("React: which groups are capsules", () => {
    const { container } = render(
      <div>
        <RToolbar>
          <RToolbar.Leading>
            <RButtonGroup aria-label="Row">
              <RButtonGroup aria-label="Back"><RButton uniform aria-label="Back">B</RButton></RButtonGroup>
              <RButtonGroup aria-label="Note actions">
                <RButton uniform aria-label="Pin">P</RButton>
                <RButtonGroup.Separator />
                <RButton uniform aria-label="Tag">T</RButton>
              </RButtonGroup>
            </RButtonGroup>
          </RToolbar.Leading>
          <RToolbar.Trailing>
            <RButtonGroup aria-label="Flat" mobileMaterial="flat"><RButton>A</RButton><RButton>B</RButton></RButtonGroup>
            <RButtonGroup aria-label="Search"><RInput aria-label="Query" /><RButton>Go</RButton></RButtonGroup>
          </RToolbar.Trailing>
        </RToolbar>
        <RButtonGroup aria-label="Content"><RButton>1</RButton><RButton>2</RButton></RButtonGroup>
        <RButtonGroup aria-label="Zoom" orientation="vertical" mobileMaterial="glass"><RButton>+</RButton><RButton>-</RButton></RButtonGroup>
        <RButtonGroup aria-label="Links" mobileMaterial="glass">
          <RButtonLink href="/a" variant="soft" color="secondary">Open</RButtonLink>
          <RButtonLink href="/b" variant="soft" color="secondary" disabled>Share</RButtonLink>
        </RButtonGroup>
      </div>,
    )
    expect(container.querySelector('[aria-label="Zoom"]')!.getAttribute("data-mobile-material")).toBe("glass")
    expectations(container)
  })

  test("Vue: which groups are capsules", async () => {
    const mounted = mountVue(() =>
        h("div", [
          h(Toolbar, null, () => [
            h(ToolbarLeading, null, () =>
              h(ButtonGroup, { "aria-label": "Row" }, () => [
                h(ButtonGroup, { "aria-label": "Back" }, () => h(Button, { uniform: true, "aria-label": "Back" }, () => "B")),
                h(ButtonGroup, { "aria-label": "Note actions" }, () => [
                  h(Button, { uniform: true, "aria-label": "Pin" }, () => "P"),
                  h(ButtonGroupSeparator),
                  h(Button, { uniform: true, "aria-label": "Tag" }, () => "T"),
                ]),
              ]),
            ),
            h(ToolbarTrailing, null, () => [
              h(ButtonGroup, { "aria-label": "Flat", mobileMaterial: "flat" }, () => [h(Button, null, () => "A"), h(Button, null, () => "B")]),
              h(ButtonGroup, { "aria-label": "Search" }, () => [h(Input, { "aria-label": "Query" }), h(Button, null, () => "Go")]),
            ]),
          ]),
          h(ButtonGroup, { "aria-label": "Content" }, () => [h(Button, null, () => "1"), h(Button, null, () => "2")]),
          h(ButtonGroup, { "aria-label": "Zoom", orientation: "vertical", mobileMaterial: "glass" }, () => [h(Button, null, () => "+"), h(Button, null, () => "-")]),
          h(ButtonGroup, { "aria-label": "Links", mobileMaterial: "glass" }, () => [
            h(ButtonLink, { href: "/a", variant: "soft", color: "secondary" }, () => "Open"),
            h(ButtonLink, { href: "/b", variant: "soft", color: "secondary", disabled: true }, () => "Share"),
          ]),
        ]),
    )
    await flushVue()
    expect(mounted.container.querySelector('[aria-label="Zoom"]')!.getAttribute("data-mobile-material")).toBe("glass")
    expectations(mounted.container)
    mounted.unmount()
  })
})
