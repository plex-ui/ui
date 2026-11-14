import { readFileSync } from "node:fs"
import { createElement, type ComponentType } from "react"
import postcss from "postcss"
import { describe, expect, test } from "vitest"
import { h } from "vue"
import { FloatingLabelInput as RFloatingLabelInput } from "../../packages/ui/src/components/FloatingLabelInput"
import { Input as RInput } from "../../packages/ui/src/components/Input"
import { Tabs as RTabs } from "../../packages/ui/src/components/Tabs"
import { FloatingLabelInput } from "../../packages/vue/src/components/FloatingLabelInput"
import { Input } from "../../packages/vue/src/components/Input"
import { Tabs, TabsTab } from "../../packages/vue/src/components/Tabs"
import { calendarCollisionPadding as rCalendarCollisionPadding } from "../../packages/ui/src/components/DatePicker/useCalendarCollisionPadding"
import { calendarCollisionPadding } from "../../packages/vue/src/components/DatePicker/useCalendarCollisionPadding"
import { renderPair } from "./pair"

// Plan 163: the phone rules taken from the iOS 27 kit (text field clear, empty state, slider label row, sheet title).
// jsdom does not evaluate media queries; the contract is read from the source rules a phone applies.

type Props = Record<string, unknown>
const read = (path: string) => readFileSync(path, "utf8")
const touch = read("packages/styles/src/styles/touch.css")
const noop = () => {}

/** The rules a phone applies (either spelling of the phone query), by selector as written (a nested query keeps its parent's relative selectors). */
const phoneRules = (path: string) => {
  const rules = new Map<string, postcss.Rule>()
  postcss.parse(read(path)).walkAtRules("media", (media) => {
    if (["(max-width: 767px)", "(max-width: 767.98px)", "(width <= 767px)"].includes(media.params)) media.walkRules((rule) => { rules.set(rule.selector, rule) })
  })
  return rules
}
/** The rules outside any media query, by selector. */
const baseRules = (path: string) => {
  const rules = new Map<string, postcss.Rule>()
  postcss.parse(read(path)).walkRules((rule) => {
    let parent = rule.parent
    while (parent && parent.type !== "root") { if (parent.type === "atrule") return; parent = parent.parent }
    rules.set(rule.selector, rule)
  })
  return rules
}
const decls = (rule: postcss.Rule | undefined) =>
  Object.fromEntries((rule?.nodes ?? []).filter((n): n is postcss.Declaration => n.type === "decl").map((d) => [d.prop, d.value]))

describe("the clear button of a phone text field (kit iOS 27 Text Fields 5433:15635)", () => {
  test("Input and FloatingLabelInput render the desktop cross and the phone circle, the same in React and Vue", async () => {
    const pairs: [string, ReturnType<typeof createElement>, () => ReturnType<typeof h>][] = [
      ["Input", createElement(RInput as ComponentType<Props>, { value: "plex", onChange: noop, onClear: noop }), () => h(Input as never, { value: "plex", onClear: noop })],
      ["FloatingLabelInput", createElement(RFloatingLabelInput, { label: "Search", defaultValue: "plex", onClear: noop }), () => h(FloatingLabelInput as never, { label: "Search", defaultValue: "plex", onClear: noop })],
    ]
    for (const [name, react, vue] of pairs) {
      const out = await renderPair(react, vue)
      expect(out.vue, name).toBe(out.react)
      const clear = out.react.slice(out.react.indexOf('aria-label="Clear input"'))
      expect(clear, name).toMatch(/class="ClearIcon"[\s\S]*class="ClearPhoneIcon"/)
    }
  })

  // `:last-child` does not see a text adornment ("kg"), so only an end adornment marks the field, in both frameworks
  test("Input marks an end adornment apart from the clear button, a text one too", async () => {
    const withUnit = await renderPair(
      createElement(RInput as ComponentType<Props>, { value: "12", onChange: noop, onClear: noop, endAdornment: "kg" }),
      () => h(Input as never, { value: "12", onClear: noop }, { endAdornment: () => "kg" }),
    )
    expect(withUnit.vue).toBe(withUnit.react)
    expect(withUnit.react).toContain('data-end-adornment=""')
    const clearOnly = await renderPair(
      createElement(RInput as ComponentType<Props>, { value: "12", onChange: noop, onClear: noop }),
      () => h(Input as never, { value: "12", onClear: noop }),
    )
    expect(clearOnly.react).toContain('data-has-end-adornment=""')
    expect(clearOnly.react).not.toContain("data-end-adornment")
    expect(clearOnly.vue).not.toContain("data-end-adornment")
  })

  test("Input: the circle replaces the cross and the soft face on a phone, concentric with the field's end", () => {
    expect(decls(baseRules("packages/styles/src/components/Input/Input.module.css").get("> .ClearPhoneIcon"))).toEqual({ display: "none" })
    const rules = phoneRules("packages/styles/src/components/Input/Input.module.css")
    expect(decls(rules.get(".Clear::before,\n  .Clear > .ClearIcon"))).toEqual({ display: "none" })
    expect(decls(rules.get(".Clear > .ClearPhoneIcon"))).toEqual({
      display: "block",
      width: "calc(var(--input-clear-glyph-size, 17px) * 1.2)",
      height: "calc(var(--input-clear-glyph-size, 17px) * 1.2)",
      color: "var(--input-clear-glyph-color, var(--mobile-label-tertiary, var(--color-text-tertiary)))",
    })
    expect(decls(rules.get(".Container:not([data-end-adornment]) > .Clear"))).toEqual({
      "margin-right": "calc(var(--input-size) / 2 - var(--input-clear-target-size, var(--input-clear-size)) / 2 - var(--input-gutter))",
    })
    // In a row its 44px target does not grow the row, before an end adornment too (a password eye)
    expect(decls(rules.get(":where([data-row]) .Container > .Clear"))).toEqual({
      "margin-block": "calc((var(--input-size) - var(--input-clear-target-size, var(--input-clear-size))) / 2)",
    })
    // A row centres it 15px inside the row's 20px inset, 35px from the row's edge, and ends the value 6px before
    // it, as a UITextField in an inset grouped cell of iOS 27.2 and Settings' Wi-Fi Password (IMG_5514) do (plan 178
    // block 9), with the label beside, above or hidden (plan 169c: a placeholder cell is a vertical row). Its target
    // starts at the value's end, so a tap there still places the caret. Logical sides: a right-to-left row mirrors it.
    expect(decls(rules.get(":where([data-row]) .Container:not([data-end-adornment]) > .Clear.Clear"))).toEqual({
      "justify-content": "flex-start",
      "padding-inline-start": "calc(6px - var(--input-clear-glyph-size, 17px) * 0.1)",
      "margin-inline-start": "calc(var(--input-gap) * -1)",
      "margin-inline-end": "calc(15px + var(--input-clear-glyph-size, 17px) / 2 + 6px - var(--input-clear-target-size, var(--input-clear-size)))",
    })
    // A row field is a pill: the row rule has the pill rule's weight and wins only by coming after it (and the plain one)
    const order = [...rules.keys()]
    const rowRule = order.indexOf(":where([data-row]) .Container:not([data-end-adornment]) > .Clear.Clear")
    const pillRule = order.indexOf(".Container[data-pill]:not([data-end-adornment]) > .Clear")
    const plainRule = order.indexOf(".Container:not([data-end-adornment]) > .Clear")
    expect(Math.min(pillRule, plainRule)).toBeGreaterThan(-1)
    expect(rowRule).toBeGreaterThan(pillRule)
    expect(rowRule).toBeGreaterThan(plainRule)
    expect(touch).toContain("--input-clear-target-size: 44px;")
  })

  test("FloatingLabelInput: the circle centred half the field height from its end", () => {
    const rules = phoneRules("packages/styles/src/components/FloatingLabelInput/FloatingLabelInput.module.css")
    expect(decls(rules.get(".ClearIcon"))).toEqual({ display: "none" })
    expect(decls(baseRules("packages/styles/src/components/FloatingLabelInput/FloatingLabelInput.module.css").get(".ClearPhoneIcon"))).toEqual({ display: "none" })
    expect(decls(rules.get(".ClearPhoneIcon"))).toEqual({
      display: "block",
      width: "calc(var(--floating-input-clear-glyph-size, 17px) * 1.2)",
      height: "calc(var(--floating-input-clear-glyph-size, 17px) * 1.2)",
      color: "var(--floating-input-clear-glyph-color, var(--mobile-label-tertiary, var(--color-text-tertiary)))",
    })
    expect(decls(rules.get(".ClearButton:last-child"))).toEqual({
      "margin-inline-end": "calc(var(--floating-input-height) / 2 - var(--floating-input-clear-size, 1em) / 2 - var(--floating-input-gutter) - 1px)",
    })
  })

  test("a filled field shows its caret, not a ring, while it is edited", () => {
    expect(touch).toContain("--input-soft-border-color-focus: transparent;")
  })
})

describe("a search field in the content and the large title above it (iOS 27.2 Files, Settings, a search tab, UIKit stacked)", () => {
  // The phone rule reads the field's own input, a direct child of the container, in both frameworks
  test("Input passes type=\"search\" to its input, a child of the container, the same in React and Vue", async () => {
    const out = await renderPair(
      createElement(RInput as ComponentType<Props>, { type: "search", variant: "soft", pill: true, placeholder: "Search", startAdornment: createElement("span", null, "Q") }),
      () => h(Input as never, { type: "search", variant: "soft", pill: true, placeholder: "Search" }, { startAdornment: () => h("span", null, "Q") }),
    )
    expect(out.vue).toBe(out.react)
    // The pair's tree indents each child two spaces under its parent
    const lines = out.react.split("\n")
    const indent = (line: string) => line.length - line.trimStart().length
    const container = lines.findIndex((line) => line.includes('data-slot="input"'))
    const input = lines.findIndex((line) => line.includes("<input") && line.includes('type="search"'))
    expect(container).toBeGreaterThan(-1)
    expect(input).toBeGreaterThan(container)
    expect(indent(lines[input])).toBe(indent(lines[container]) + 2)
  })

  test("on a phone it takes the magnifier, gaps, weight, placeholder and glass of the bar's search field (owner 13.11)", () => {
    const root = postcss.parse(read("packages/styles/src/components/Input/Input.module.css"))
    let rule: postcss.Rule | undefined
    root.walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px)") media.walkRules('.Container:has(> .Input[type="search"]):not(:where([data-row] *))', (found) => { rule = found })
    })
    expect(decls(rule)).toEqual({
      "--input-gutter": "var(--toolbar-search-gutter)",
      "--input-gap": "var(--toolbar-search-icon-gap)",
      "--input-adornment-offset": "0px",
      "--control-gutter-pill-scaling": "1",
      "--input-placeholder-text-color": "var(--toolbar-search-placeholder-color)",
      "font-weight": "var(--toolbar-search-font-weight)",
    })
    const svg = rule?.nodes?.find((node): node is postcss.Rule => node.type === "rule" && node.selector === "& > svg")
    expect(decls(svg)).toEqual({ flex: "none", width: "var(--toolbar-search-icon-size)", height: "var(--toolbar-search-icon-size)" })
    // One look wherever it stands: with touch.css a soft one takes the glass of the bar's field, as the bar gives its
    // own, outside the kit's layer (over the focus outline); an invalid one keeps its red outline (Codex #13)
    const touch = postcss.parse(read("packages/styles/src/styles/touch.css"))
    let soft: postcss.Rule | undefined
    touch.walkRules('html [data-slot="input"][data-variant="soft"]:has(> input[type="search"]):not(:where([data-row] *))', (found) => { soft = found })
    expect(soft?.parent?.type === "atrule" && (soft.parent as postcss.AtRule).name).toBe("media")
    const valid = soft?.nodes?.find((node): node is postcss.Rule => node.type === "rule" && node.selector === "&:not([data-invalid])")
    const glass = { ...decls(soft), ...decls(valid) }
    expect(glass).toEqual({
      "--input-soft-background-color": "var(--mobile-glass-background)",
      "background-image": "var(--mobile-glass-sheen)",
      "-webkit-backdrop-filter": "var(--mobile-glass-backdrop-filter)",
      "backdrop-filter": "var(--mobile-glass-backdrop-filter)",
      "box-shadow": "var(--mobile-glass-shadow)",
    })
    const bar = read("packages/styles/src/components/Toolbar/Toolbar.module.css")
    for (const [name, value] of Object.entries(glass)) expect(bar).toContain(`${name}: ${value};`)
    // Without touch.css nothing changes: the Input's own rule keeps the soft fill
    expect(read("packages/styles/src/components/Input/Input.module.css")).not.toContain("--mobile-glass")
  })

  test("a row keeps its value column for a search Input, and a drawer's search field keeps the kit's 11px inset", () => {
    expect(read("packages/styles/src/components/Input/Input.module.css")).not.toMatch(/\.Container:has\(> \.Input\[type="search"\]\) \{/)
    const sidebar = read("packages/styles/src/components/Sidebar/Sidebar.module.css")
    expect(sidebar).toMatch(/\.MobileSidebar \.Input > \[data-slot="input"\]\[data-variant\] \{\s*--input-size: 44px;\s*--input-gutter: 11px;/)
  })

  test("no browser decoration; the browser's cancel button gives way only to the Input's own clear button", () => {
    const css = read("packages/styles/src/components/Input/Input.module.css")
    expect(css).toMatch(/&\[type="search"\]::-webkit-search-decoration \{\s*appearance: none;\s*\}/)
    expect(css).toMatch(/:where\(\.Container:has\(> \.Clear\)\) > &\[type="search"\]::-webkit-search-cancel-button \{\s*appearance: none;\s*\}/)
    expect(css).not.toMatch(/-webkit-search-decoration,/)
  })

  test("the large title: capitals 22pt under the row, the same with a subtitle (owner 13.11), the content 16pt under the last baseline", () => {
    const tokens = read("packages/styles/src/styles/variables-components.css")
    for (const token of ["--toolbar-large-title-gap: 13.3px;", "--toolbar-large-title-descent: 8.3px;", "--toolbar-large-subtitle-descent: 4.6px;"]) expect(tokens).toContain(token)
    const toolbar = read("packages/styles/src/components/Toolbar/Toolbar.module.css")
    // A subtitle coming or going never moves the title (owner 13.11 «позиция не должна прыгать»).
    expect(toolbar).toMatch(/\.Toolbar\[data-title-style="large"\] \{[^}]*row-gap: var\(--toolbar-large-title-gap\);/)
    expect(toolbar).not.toContain("--toolbar-large-title-row-gap")
    expect(toolbar).not.toContain("+ 3px")
    // The row of controls keeps its height with none in it (Settings has no bar buttons).
    expect(toolbar).toContain("grid-template-rows: minmax(var(--toolbar-item-size), auto) auto;")
  })
})

describe("EmptyMessage on a phone (iOS ContentUnavailableView on the iOS 27.2 simulator; owner 14.11 «по 5973»)", () => {
  test("a bare 48px symbol 19px above, 20/25 bold title, 1px, 17/25 regular description, 32px insets", () => {
    for (const token of [
      "--empty-message-icon-badge-size: 48px;", "--empty-message-icon-size: 48px;", "--empty-message-icon-gap: 19px;",
      "--empty-message-icon-background: transparent;",
      "--empty-message-icon-secondary-color: var(--mobile-label-secondary, var(--color-text-secondary));",
      "--empty-message-title-size: 20px;", "--empty-message-title-leading: 25px;", "--empty-message-title-gap: 1px;",
      "--empty-message-title-weight: var(--font-weight-bold);", "--empty-message-description-size: 17px;",
      "--empty-message-description-leading: 25px;", "--empty-message-description-weight: var(--font-weight-normal);",
      "--empty-message-padding-inline: 32px;", "--empty-message-text-inset: 0px;", "--empty-message-padding-bottom: 0px;",
    ]) expect(touch).toContain(token)
    const css = readFileSync(`${process.cwd()}/packages/styles/src/components/EmptyMessage/EmptyMessage.module.css`, "utf8")
    expect(css).toContain("background: var(--empty-message-icon-background, var(--badge-background-color));")
  })

  test("actions under the text at their own width, a 28px capsule with a 15px label, 14px apart, never across the bottom", () => {
    for (const token of [
      "--empty-message-fill-content-margin: 0px;", "--empty-message-fill-action-margin: var(--empty-message-action-spacing);",
      "--empty-message-fill-action-inset: 0px;", "--empty-message-fill-action-width: auto;",
      "--empty-message-fill-action-align: center;", "--empty-message-action-spacing: 28px;",
      "--empty-message-multi-action-width: auto;", "--empty-message-multi-align: center;",
      "--empty-message-multi-direction: column;", "--empty-message-action-gap: 14px;",
      "--empty-message-action-size: 28px;", "--empty-message-action-font-size: 15px;",
      "--empty-message-action-line-height: 20px;", "--empty-message-action-font-weight: var(--font-weight-normal);",
      "--empty-message-action-gutter: 12px;",
    ]) expect(touch).toContain(token)
    expect(touch).toContain("--empty-message-multi-items: center;")
    expect(touch).not.toContain("--empty-message-fill-action-width: 100%;")
    const em = readFileSync(`${process.cwd()}/packages/styles/src/components/EmptyMessage/EmptyMessage.module.css`, "utf8")
    // A column of actions keeps each button at its own width; 2xl and 3xl buttons take the same metrics
    expect(em).toContain("align-items: var(--empty-message-multi-items, normal);")
    expect(em).toContain("--button-size-2xl: var(--empty-message-action-size, var(--control-size-2xl));")
    expect(em).toContain("--button-size-3xl: var(--empty-message-action-size, var(--control-size-3xl));")
    // A compact badge stays tinted on a phone
    expect(em).toMatch(/:where\(\.EmptyMessage\[data-size="sm"\]\) & \{[^}]*background: var\(--badge-background-color\);/)
    // None of the phone rules apply from 768px up, where a caller's spacing and button widths stand
    expect(baseRules("packages/styles/src/components/EmptyMessage/EmptyMessage.module.css").has("&:has(> .ActionRow > [data-variant])")).toBe(false)
  })
})

describe("the Slider label row on a phone", () => {
  test("reads as an iOS list row: 17/22 label, the value in the secondary label, no border", () => {
    for (const token of [
      "--slider-label-font-size: 17px;", "--slider-value-font-size: 17px;",
      "--slider-value-color: var(--mobile-label-secondary, var(--color-text-secondary));",
      "--slider-value-color-focus: var(--color-text);",
      "--slider-thumb-background: var(--white);",
    ]) expect(touch).toContain(token)
    // The reset is a Button sized by the Button (the kit's 28px circle), no longer a glyph the slider sizes
    expect(touch).not.toMatch(/--slider-reset-(size|icon-size|color):/)
    const rules = phoneRules("packages/styles/src/components/Slider/Slider.module.css")
    expect(decls(rules.get(".SliderValue"))).toEqual({ height: "auto", "min-height": "44px", padding: "0", border: "0", "margin-inline-end": "0" })
    // The value is as wide as its digits and the reset stands 8px before them
    expect(decls(rules.get(".ValueInput"))).toEqual({ height: "44px" })
    expect(decls(rules.get(".SliderLabel"))).toEqual({ gap: "8px" })
    expect(rules.has('.SliderWrap .SliderLabel .Reset[data-variant="ghost"]')).toBe(false)
  })
})

describe("a phone sheet whose header has a description (kit iOS 27 Toolbar Title 2 Line)", () => {
  test("shows the two as a toolbar's two-line title", () => {
    // The header of a phone Sheet is its Toolbar (plan 170): a visible description takes the Toolbar's Subtitle,
    // and the Toolbar sets the title above it in the compact size
    const rules = phoneRules("packages/styles/src/components/Toolbar/Toolbar.module.css")
    const heading = rules.get(".Heading:has(> .Subtitle)")
    expect(decls(heading?.nodes.find((n): n is postcss.Rule => n.type === "rule" && n.selector === "& .Title"))).toEqual({
      "font-size": "var(--toolbar-title-compact-font-size)",
      "line-height": "var(--toolbar-title-compact-line-height)",
    })
    expect(decls(rules.get(".Subtitle"))).toMatchObject({
      color: "var(--mobile-label-secondary, var(--color-text-secondary))",
      "font-size": "var(--toolbar-subtitle-font-size)",
      "font-weight": "var(--toolbar-subtitle-font-weight)",
    })
    for (const source of [read("packages/ui/src/components/Dialog/Dialog.tsx"), read("packages/vue/src/components/Dialog/Dialog.ts")]) expect(source).toContain("t.Subtitle")
  })
})

describe("Liquid Glass text buttons on a phone (kit iOS 27 Button - Liquid Glass - Text 5473:21667)", () => {
  test("a Page bar's text button and a sheet header's action take a Toolbar item's 17px Medium label", () => {
    const page = phoneRules("packages/styles/src/components/Page/Page.module.css")
    expect(decls(page.get(".Leading > :is(button, a),\n  .Actions > :is(button, a)"))).toMatchObject({
      "--button-font-size": "var(--toolbar-label-font-size)",
      "--button-line-height": "var(--toolbar-label-line-height)",
      "--button-font-weight": "var(--toolbar-label-font-weight)",
    })
    // A sheet header's action is a Toolbar item on a phone (Dialog.HeaderAction becomes Toolbar.Trailing, plan 170)
    const toolbar = phoneRules("packages/styles/src/components/Toolbar/Toolbar.module.css")
    expect(decls(toolbar.get(".Toolbar :is(.Leading, .Trailing, .Content, .Group) > :where(button, a)"))).toMatchObject({ "--button-font-weight": "var(--toolbar-label-font-weight)", "--button-font-size": "var(--toolbar-label-font-size)" })
    expect(read("packages/ui/src/components/Dialog/Dialog.tsx")).toContain("<Toolbar.Trailing className={className}>")
  })

  test("a glass Button's label is Medium, and 17px at md and lg, with touch.css only", () => {
    const button = phoneRules("packages/styles/src/components/Button/Button.module.css")
    const glass = '.Button[data-mobile-material="glass"]:where([data-color="primary"], [data-color="secondary"]):where([data-variant="soft"], [data-variant="ghost"])'
    expect(decls(button.get(glass))).toEqual({ "font-weight": "var(--button-glass-font-weight, var(--button-font-weight))" })
    expect(decls(button.get('&:where([data-size="md"], [data-size="lg"])'))).toEqual({
      "font-size": "var(--button-glass-font-size, var(--button-font-size))",
      "line-height": "var(--button-glass-line-height, var(--button-line-height, 1))",
    })
    for (const token of ["--button-glass-font-weight: var(--toolbar-label-font-weight);", "--button-glass-font-size: 17px;", "--button-glass-line-height: 22px;"]) expect(touch).toContain(token)
  })
})

describe("other kit iOS 27 values on a phone", () => {
  test("menus have 34px corners, other page dots the tertiary label, and Progress keeps its 4px rounded track", () => {
    for (const token of ["--menu-radius: 34px;", "--menu-radius-pill: 34px;", "--page-control-dot-color: var(--mobile-label-tertiary);"]) expect(touch).toContain(token)
    expect(touch).not.toMatch(/--progress-(height|radius):/)
    const tokens = read("packages/styles/src/styles/variables-components.css")
    expect(tokens).toContain("--progress-height: 4px;")
    expect(tokens).toContain("--progress-radius: var(--radius-full);")
  })
})

describe("content-area buttons on a phone (kit iOS 27 Button - Content Area 40:58696)", () => {
  // Plan 178 block 3 (owner 10.11: «между иконкой и текстом внутри кнопки явно не хватает отступа»): iOS 27.2 leaves 8pt
  // between a button's symbol and its label at every size, not the kit's 3 and 4px.
  test("every button leaves 8px between icon and label with touch.css only; desktop keeps 3, 4 and 6px", () => {
    const button = baseRules("packages/styles/src/components/Button/Button.module.css")
    const gap = (size: string) => decls(button.get(`&:where([data-size="${size}"])`))["--button-gap"]
    expect(gap("3xs")).toBe("var(--button-touch-gap-sm, var(--button-gap-sm))")
    for (const size of ["2xs", "xs", "sm"]) expect(gap(size)).toBe("var(--button-touch-gap-sm, var(--button-gap-md))")
    for (const size of ["md", "lg", "xl", "2xl", "3xl"]) expect(gap(size)).toBe("var(--button-touch-gap, var(--button-gap-lg))")
    // The phone root block of touch.css sets both button gaps; its --button-gap-lg spaces segmented Tabs only.
    const roots: Record<string, string>[] = []
    postcss.parse(touch).walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px)") media.walkRules("html:root", (rule) => { roots.push(decls(rule)) })
    })
    expect(roots.find((d) => "--button-gap-lg" in d)).toMatchObject({ "--button-gap-lg": "4px", "--button-touch-gap-sm": "8px", "--button-touch-gap": "8px" })
    // The shared tier tokens stay as they are: segmented Tabs space their content with --button-gap-sm and --button-gap-md.
    expect(touch).not.toMatch(/--button-gap-(sm|md):/)
    const tokens = read("packages/styles/src/styles/variables-components.css")
    expect(tokens).toContain("--button-gap-sm: 3px;")
    expect(tokens).toContain("--button-gap-md: 4px;")
  })
})

describe("lists on a phone (kit iOS 27 Lists 507:24675)", () => {
  test("a Sortable row's handle ends the row in the tertiary label color, with touch.css only", () => {
    const sortable = baseRules("packages/styles/src/components/Sortable/Sortable.module.css")
    expect(decls(sortable.get(".Sortable > :has(> .Handle) > .Handle"))).toEqual({
      order: "var(--sortable-handle-order, 0)",
      "margin-inline-start": "var(--sortable-handle-margin-start, var(--sortable-handle-inset))",
      "margin-inline-end": "var(--sortable-handle-margin-end, calc(var(--sortable-handle-inset) * -1))",
    })
    // Only beside a Field row does the handle reach into the row's padding; other content keeps it clear.
    expect(decls(sortable.get('.Sortable[data-handles="true"] > :has(> .Handle) > .Handle:has(+ [data-slot="field"][data-row])'))).toEqual({
      "margin-inline-start": "var(--sortable-handle-field-margin-start, var(--sortable-handle-margin-start, var(--sortable-handle-inset)))",
    })
    const roots: Record<string, string>[] = []
    postcss.parse(touch).walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px)") media.walkRules("html:root", (rule) => { roots.push(decls(rule)) })
    })
    expect(roots.find((d) => "--sortable-handle-inset" in d)).toMatchObject({
      "--sortable-handle-order": "1",
      "--sortable-handle-margin-end": "calc(var(--list-row-inset) - 9.83px)",
      "--sortable-handle-margin-start": "0px",
      "--sortable-handle-field-margin-start": "calc(1px - var(--list-row-inset))",
      "--sortable-handle-color": "var(--mobile-label-tertiary)",
      "--sortable-handle-color-hover": "var(--mobile-label-tertiary)",
      // iOS 27.2 line.3.horizontal: 21 wide, 11 tall, flatter than the Hamburger icon draws at its own proportions.
      "--sortable-phone-grip-ink-width": "21px",
      "--sortable-phone-grip-ink-height": "11px",
    })
    expect(decls(sortable.get(".Handle > .PhoneGrip"))).toMatchObject({
      width: "calc(var(--sortable-phone-grip-ink-width, 17px) * 24 / 18)",
      height: "calc(var(--sortable-phone-grip-ink-height, calc(var(--sortable-phone-grip-ink-width, 17px) * 14 / 18)) * 24 / 14)",
    })
    // Desktop keeps the leading grip: no order or margin tokens outside touch.css.
    expect(read("packages/styles/src/styles/variables-components.css")).not.toMatch(/--sortable-handle-(order|margin-start|margin-end|field-margin-start):/)
  })

  // Plan 169a: kit Grouped Table Footer 35:55757 is Tight Leading Footnote 13/16, as native Settings sets it; 13/18 was a mistake
  test("a FieldGroup footer is Tight Leading Footnote, 13/16 (Grouped Table Footer)", () => {
    expect(touch).toContain("--field-group-footer-font-size: 13px;")
    expect(touch).toContain("--field-group-footer-line-height: 16px;")
  })
})

// Plan 173 block B: the states of the kit's Toggles (29:56814) and Sliders (7:53847), Pressed and Disabled.
describe("phone Switch and Slider states (kit iOS 27 Toggles 29:56814, Sliders 7:53847)", () => {
  const materials = read("packages/styles/src/styles/mobile-materials.css")

  test("a knob held down is a clear lens of glass 58 x 38 on the knob's centre; without touch.css it stays", () => {
    expect(materials).toContain("--mobile-knob-lens-scale: calc(58 / 38) calc(38 / 24);")
    expect(materials).toContain("--mobile-knob-lens-background: rgb(255 255 255 / 9%);")
    expect(materials).toMatch(/--mobile-knob-lens-shadow: 0 4\.5px 8px rgb\(0 0 0 \/ 12%\), 0 0 0 0\.33px rgb\(0 0 0 \/ 20%\), inset 0 0\.5px 0 rgb\(255 255 255 \/ 16%\), inset 0 -0\.5px 0 rgb\(255 255 255 \/ 16%\);/)
    // A switch's knob is the native 37 wide (touch.css), so its lens keeps 58 x 38 by its own scale.
    expect(materials).toContain("--mobile-switch-knob-lens-scale: calc(58 / 37) calc(38 / 24);")
    const sw = phoneRules("packages/styles/src/components/Switch/Switch.module.css")
    expect(decls(sw.get(".Track:active:not([data-disabled]) > .Thumb"))).toEqual({
      scale: "var(--mobile-switch-knob-lens-scale, none)",
      "background-color": "var(--mobile-knob-lens-background, var(--switch-thumb-color))",
      "box-shadow": "var(--mobile-knob-lens-shadow, var(--switch-thumb-shadow))",
    })
    // The checked knob moves by translate, so the lens's scale does not stretch the move (it did with transform).
    const base = baseRules("packages/styles/src/components/Switch/Switch.module.css")
    expect(decls(base.get(".Thumb"))).toMatchObject({ transition: "translate 200ms var(--cubic-enter)" })
    expect(decls(base.get(".Thumb")?.nodes.find((n): n is postcss.Rule => n.type === "rule" && n.selector === '[data-state="checked"] &'))).toEqual({
      translate: "calc(var(--switch-track-width) - var(--switch-thumb-width) - var(--switch-thumb-offset) * 2) 0",
    })
    expect(decls(sw.get(".Thumb")).transition).toMatch(/^translate 200ms var\(--cubic-enter\),\s*scale 200ms/)
    const slider = phoneRules("packages/styles/src/components/Slider/Slider.module.css")
    const lens = {
      scale: "var(--mobile-knob-lens-scale, none)",
      "background-color": "var(--mobile-knob-lens-background, var(--slider-thumb-background, var(--gray-0)))",
      "box-shadow": "var(--mobile-knob-lens-shadow, var(--slider-thumb-shadow, inset 0 0 0 2px var(--slider-range-color)))",
    }
    expect(decls(slider.get('.Slider[data-orientation="horizontal"][data-pressed]:not([data-range], [data-disabled]) .Thumb,\n  .Slider[data-orientation="horizontal"][data-pressed][data-range]:not([data-disabled]) .Thumb:focus'))).toEqual(lens)
    // Radix moves the knob's wrapper at once (a `left` on the knob itself never moved it), and a phone moves the
    // knob on from there to the iOS place at once too: the knob's own transitions are the lens's. A vertical
    // slider keeps its own knob.
    const knob = decls(slider.get('.Slider[data-orientation="horizontal"] .Thumb'))
    expect(knob.transition.replace(/\s+/g, " ")).toBe("scale 200ms var(--cubic-enter), background-color 200ms var(--cubic-enter), box-shadow 200ms var(--cubic-enter)")
    // The iOS place (IMG_5770–5774): on the value, half the knob from each end; the track's width from the container
    expect(knob["inset-inline-start"].replace(/\s+/g, " ")).toContain("clamp(var(--slider-thumb-half), var(--slider-thumb-at), 100cqw - var(--slider-thumb-half))")
    expect(decls(slider.get('.SliderWrap[data-orientation="horizontal"] .SliderContainer'))).toEqual({ "container-type": "inline-size" })
  })

  test("disabled, both keep their colors at half opacity; the switch knob casts no shadow (IMG_5442)", () => {
    const sw = phoneRules("packages/styles/src/components/Switch/Switch.module.css")
    const track = sw.get(".Track[data-disabled]")
    expect(decls(track)).toEqual({ background: "var(--switch-track-color)", opacity: "0.5" })
    expect(decls(track?.nodes.find((n): n is postcss.Rule => n.type === "rule" && n.selector === '&[data-state="checked"]'))).toEqual({ background: "var(--switch-track-color-checked)" })
    expect(decls(sw.get(".Thumb[data-disabled]"))).toEqual({ background: "var(--switch-thumb-color)" })
    expect(touch).toContain("--switch-thumb-shadow: none;")
    // The native 63 x 28 track and 37 x 24 knob of iOS 27.2 (simulator, Calendar IMG_5526, Reminders IMG_5442),
    // and an off track in the tertiary label role.
    expect(touch).toContain("--switch-track-width: 63px;")
    expect(touch).toContain("--switch-track-height: 28px;")
    expect(touch).toContain("--switch-thumb-width: 37px;")
    expect(touch).toContain("--switch-thumb-offset: 2px;")
    expect(touch).toContain("--switch-track-color: var(--mobile-label-tertiary, var(--alpha-25));")
    expect(decls(phoneRules("packages/styles/src/components/Slider/Slider.module.css").get(".Slider[data-disabled]"))).toEqual({ opacity: "0.5" })
    // The phone rules use the query of touch.css, where the lens tokens live; desktop keeps its own look.
    expect(read("packages/styles/src/components/Switch/Switch.module.css")).not.toContain("767.98px")
    expect(baseRules("packages/styles/src/components/Switch/Switch.module.css").has(".Track:active:not([data-disabled]) > .Thumb")).toBe(false)
  })
})

// Plan 175.6: a disabled slider on a desktop looked as an enabled one
describe("a disabled Slider on a desktop (macOS 27 kit, Slider, State=Disabled 8536:112)", () => {
  const css = "packages/styles/src/components/Slider/Slider.module.css"
  const nested = (rule: postcss.Rule | undefined) =>
    Object.fromEntries((rule?.nodes ?? []).filter((n): n is postcss.Rule => n.type === "rule").map((r) => [r.selector, decls(r)]))

  test("the fill takes the track's color, both at 60% of the track (6% of 10% in the kit), and the knob's ring follows", () => {
    const disabled = baseRules(css).get(".Slider[data-disabled]")
    expect(decls(disabled)).toEqual({ "--slider-disabled-color": "color-mix(in srgb, var(--slider-track-color) 60%, transparent)" })
    expect(nested(disabled)).toEqual({
      "& :is(.Track, .Range)": { background: "var(--slider-disabled-color)" },
      "& .Thumb": { "box-shadow": "var(--slider-thumb-shadow, inset 0 0 0 2px var(--slider-disabled-color))" },
    })
  })

  test("a phone keeps the iOS kit's half opacity in the slider's own colors", () => {
    const phone = phoneRules(css).get(".Slider[data-disabled]")
    expect(decls(phone)).toEqual({ opacity: "0.5" })
    expect(nested(phone)).toEqual({
      "& .Track": { background: "var(--slider-track-color)" },
      "& .Range": { background: "var(--slider-range-color)" },
      "& .Thumb": { "box-shadow": "var(--slider-thumb-shadow, inset 0 0 0 2px var(--slider-range-color))" },
    })
  })
})

describe("a disabled Button and pop-up on a phone (kit iOS 27 Button - Content Area 40:58696, Pop-up Button 410:50387)", () => {
  test("label in the tertiary label, where the desktop gray-400 read 143 on white", () => {
    expect(decls(phoneRules("packages/styles/src/components/Button/Button.module.css").get(".Button[data-disabled][data-variant]"))).toEqual({
      // iOS 27.2 keeps the gray of an enabled gray button under a disabled one (plan 178 block 3)
      "--button-background-color": "var(--button-mobile-disabled-background, var(--color-background-disabled))",
      "--button-text-color": "var(--mobile-label-tertiary, var(--color-text-disabled))",
    })
    const select = phoneRules("packages/styles/src/components/SelectControl/SelectControl.module.css").get(".SelectControl[data-disabled][data-variant]")
    expect(decls(select)).toEqual({ color: "var(--mobile-label-tertiary, var(--color-text-disabled))" })
    // The chevrons rest at 75%; the tertiary label is dimmed already, so they show at full opacity.
    expect(decls(select?.nodes.find((n): n is postcss.Rule => n.type === "rule" && n.selector === ".DropdownIcon"))).toEqual({ color: "var(--mobile-label-tertiary, var(--color-text-disabled))", opacity: "1" })
  })
})

describe("a disabled segmented control on a phone (kit iOS 27 Segmented Controls 10460:145)", () => {
  test("a Tabs group disabled as a whole marks its root, the same in React and Vue, and shows at half opacity", async () => {
    const out = await renderPair(
      createElement(RTabs as unknown as ComponentType<Props>, { value: "a", onChange: noop, disabled: true, "aria-label": "Views" },
        createElement(RTabs.Tab as unknown as ComponentType<Props>, { value: "a" }, "Day"),
        createElement(RTabs.Tab as unknown as ComponentType<Props>, { value: "b" }, "Week")),
      () => h(Tabs as never, { value: "a", disabled: true, "aria-label": "Views" }, () => [h(TabsTab as never, { value: "a" }, () => "Day"), h(TabsTab as never, { value: "b" }, () => "Week")]),
    )
    expect(out.vue).toBe(out.react)
    expect(out.react).toMatch(/class="Tabs"[^>]*data-disabled=""/)
    const rule = phoneRules("packages/styles/src/components/Tabs/Tabs.module.css").get('.Tabs[data-disabled][data-orientation="horizontal"]')
    expect(decls(rule)).toEqual({ opacity: "0.5" })
    // Its segments are not dimmed a second time.
    expect(decls(rule?.nodes.find((n): n is postcss.Rule => n.type === "rule" && n.selector === "& > .Tab[data-disabled]"))).toEqual({ opacity: "1" })
  })
})

describe("the compact date of iOS 27.2 in a row and its calendar (plan 178 block 11)", () => {
  test("both calendars are 328px of 44px days with no gap between the weeks", () => {
    for (const path of ["packages/styles/src/components/DatePicker/Calendar.module.css", "packages/styles/src/components/DateRangePicker/Calendar.module.css"]) {
      const css = read(path)
      expect(css).toContain("width: min(328px, calc(100vw - 2 * var(--calendar-gutter)), var(--radix-popover-content-available-width, 328px));")
      expect(css).toContain("--calendar-width: min(308px, calc(100vw - 2 * var(--calendar-gutter) - 2 * var(--calendar-inner-padding)), calc(var(--radix-popover-content-available-width, 328px) - 2 * var(--calendar-inner-padding)));")
      expect(css.match(/--cell-vertical-gutter: 0px;/g)).toHaveLength(2)
      expect(css).not.toContain("--cell-vertical-gutter: 7px;")
    }
  })

  test("the calendar's sides keep 32px from the screen's edges where it fits, its top and bottom the gutter, React and Vue alike", () => {
    for (const [width, side, gutter] of [[402, 32, 16], [440, 32, 16], [375, 23.5, 16], [360, 16, 13], [340, 8, 8], [320, 3, 3]] as const) {
      const padding = { top: gutter, right: side, bottom: gutter, left: side }
      expect(rCalendarCollisionPadding(width)).toEqual(padding)
      expect(calendarCollisionPadding(width)).toEqual(padding)
    }
  })
})

describe("an Accordion on a phone is a DisclosureGroup of an iOS 27.2 inset grouped List (plan 178 block 20)", () => {
  const css = "packages/styles/src/components/Accordion/Accordion.module.css"
  const tokens = read("packages/styles/src/styles/variables-components.css")

  test("its chevron draws 12.33 x 7.33 at 21px and ends 1px past the title's margin, in the label color", () => {
    for (const token of [
      "--accordion-icon-color: var(--color-text);",
      "--accordion-icon-size: 21px;",
      "--accordion-icon-margin-inline-end: -5.33px;",
      "--accordion-chevron-closed-angle: -90deg;",
      "--accordion-chevron-open-angle: 0deg;",
    ]) expect(touch).toContain(token)
    expect(decls(baseRules(css).get(".Chevron"))["margin-inline-end"]).toBe("var(--accordion-icon-margin-inline-end, 0px)")
  })

  test("its content is a row: 17/22 in the label color, 20px in, a separator above, 14.33 and 13 from the separators", () => {
    for (const token of [
      "--accordion-content-font-size: 17px;",
      "--accordion-content-line-height: 22px;",
      "--accordion-content-color: var(--color-text);",
      "--accordion-content-padding-top: 14.33px;",
      "--accordion-content-padding-bottom: 13px;",
      "--accordion-content-padding-inline-start: 20px;",
      "--accordion-content-divider-width: 1px;",
    ]) expect(touch).toContain(token)
    expect(decls(baseRules(css).get(".ContentInner"))).toMatchObject({
      "padding-top": "var(--accordion-content-padding-top, 0px)",
      "padding-inline-start": "var(--accordion-content-padding-inline-start, 0px)",
      "border-top": "var(--accordion-content-divider-width, 0px) solid var(--accordion-item-divider-color)",
    })
  })

  test("under an open item the separator starts where the content does, from the end in right to left", () => {
    const rules = phoneRules(css)
    expect(decls(rules.get('.Item:not(:last-child):has(> .Content:not([hidden]))'))).toEqual({
      "border-bottom-color": "transparent",
      background: "linear-gradient(var(--accordion-item-divider-color) 0 0) border-box no-repeat 100% 100% /\n      calc(100% - var(--accordion-content-padding-inline-start, 0px)) var(--accordion-item-divider-width)",
    })
    expect(decls(rules.get('.Item:not(:last-child):has(> .Content:not([hidden])):dir(rtl)'))).toEqual({ "background-position": "0 100%" })
  })

  test("a nested Accordion's rows stand right under the separator, and its open chevron is not clipped", () => {
    const rules = phoneRules(css)
    expect(decls(rules.get(".ContentInner:has(> .Root:only-child)"))).toEqual({ "padding-block": "0" })
    expect(decls(rules.get(".Content"))).toEqual({ "margin-inline-end": "-2px", "padding-inline-end": "2px" })
    expect(decls(baseRules(css).get(".Content")).overflow).toBe("hidden")
  })

  test("a desktop Accordion keeps its chevron and content: the new tokens default to nothing", () => {
    for (const token of [
      "--accordion-icon-size: 16px;",
      "--accordion-icon-margin-inline-end: 0px;",
      "--accordion-content-padding-top: 0px;",
      "--accordion-content-padding-inline-start: 0px;",
      "--accordion-content-divider-width: 0px;",
    ]) expect(tokens).toContain(token)
  })
})
