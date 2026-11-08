import { readdirSync, readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, test } from "vitest"

// Plan 160, block C: bars, navigation and messages on a phone. Examples of a pointer or a desktop layout are
// desktop only, a control a phone does not use is desktop only, page examples draw an iOS list, a trail gets the
// targets and text of iOS, an inline alert the shape of an iOS tip (TipKit), and a toast the notification banner
// (kit iOS 27, Notifications, Notification - Collapsed Stack=1 0:11292: corners 24, padding 14, 15/17 and 15/18 text).

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")

/** Each `### Section` of a docs page with the opening tag of its first preview. */
const sections = (page: string) => read(page).split(/\n### /).slice(1).map((part) => ({
  title: part.slice(0, part.indexOf("\n")),
  preview: part.match(/<ComponentPreview\b[^\n]*/)?.[0] ?? "",
}))
const desktopOnly = (page: string) => sections(page).filter(({ preview }) => preview.includes('phonePresentation="none"')).map(({ title }) => title)
const both = (page: string) => [`content/components/${page}.mdx`, `content/vue/components/${page}.mdx`]

/** The declarations of the rules for `selector` inside the phone media query of a stylesheet. */
const phoneRule = (path: string, selector: string) => {
  const decls: Record<string, string> = {}
  postcss.parse(read(path)).walkAtRules("media", (media) => {
    if (media.params !== "(max-width: 767px)") return
    media.walkRules((rule) => {
      if (rule.selector !== selector) return
      rule.each((node) => { if (node.type === "decl") decls[node.prop] = node.important ? `${node.value} !important` : node.value })
    })
  })
  return decls
}

describe.each([
  ["popover", ["Open on hover"]],
  ["progress-steps", ["Vertical"]],
  ["breadcrumb", ["Sizes"]],
  ["page", ["Widths"]],
  ["alert", ["Action placement"]],
])("%s on a phone", (page, desktop) => {
  test("leaves out the examples a phone cannot show, in React and Vue, and says why", () => {
    for (const path of both(page)) {
      expect(desktopOnly(path), path).toEqual(desktop)
      const section = read(path).split(`### ${desktop[0]}\n`)[1]
      expect(section.slice(0, section.indexOf("</>}")), path).toMatch(/so this example is desktop only\./)
    }
  })
})

test("Copy Tooltip: the hover delay is a desktop control, a tap copies at once", () => {
  expect(read("components/docs/CopyTooltipDemo.tsx")).toContain('<DemoControlRow name="openDelay" desktopOnly>')
  expect(read("content/vue/components/copy-tooltip.mdx")).toContain('{ name: "openDelay", desktopOnly: true, type: "range"')
  for (const path of both("copy-tooltip")) expect(read(path), path).toContain("On a phone a tap copies and shows Copied! at once")
})

describe("Page examples on a phone", () => {
  test("draw their orders as the rows of a FieldGroup, as the Toolbar examples do", () => {
    const react = read("components/docs/PageDemos.tsx")
    expect(react).toContain("import { BarBackgroundControl, Rows } from './ToolbarDemos';")
    expect(react).not.toMatch(/function Rows\(/)
    expect(read("components/docs/ToolbarDemos.tsx")).toMatch(/export function Rows\(\) \{\n {2}return \(\n {4}<FieldGroup>/)
    const vue = read("content/vue/components/page.mdx")
    expect(vue).toMatch(/export const list = `<FieldGroup>\n\s+<div v-for="row in rows" :key="row" data-row class="\$\{toolbarStyles\.Row\}">/)
  })

  test("each title matches the orders under it", () => {
    for (const path of ["components/docs/PageDemos.tsx", "content/vue/components/page.mdx"]) {
      const titles = [...read(path).matchAll(/<(?:Page\.Title|PageTitle)>([^<]+)</g)].map((match) => match[1])
      expect(titles.length, path).toBeGreaterThan(4)
      expect(new Set(titles), path).toEqual(new Set(["Orders", "Menu"]))
    }
  })
})

describe("Breadcrumb on a phone", () => {
  const css = "packages/styles/src/components/Breadcrumb/Breadcrumb.module.css"

  test("takes the 15/20 text of iOS at either size", () => {
    expect(phoneRule(css, '.Breadcrumb,\n  .Breadcrumb[data-size="sm"]')).toEqual({
      "--breadcrumb-font-size": "15px",
      "--breadcrumb-line-height": "20px",
      "--breadcrumb-gap": "6px",
    })
  })

  test("gives each link a 44px target, at least 44px wide around a short word", () => {
    expect(phoneRule(css, ".Item")).toEqual({ "min-height": "44px" })
    expect(phoneRule(css, ".Item > .Link")).toMatchObject({ display: "inline-flex", "min-height": "44px", position: "relative" })
    expect(phoneRule(css, "&::after")).toMatchObject({ "inset-block": "0", "inset-inline": "min(0px, (100% - 44px) / 2)" })
  })
})

describe("an inline Alert on a phone takes the shape and text of an iOS tip (TipKit, iOS Mini Tip Style=Hint 41:4207)", () => {
  const css = "packages/styles/src/components/Alert/Alert.module.css"

  test("the description at 15/20 and the title at 17/22, 4 apart", () => {
    const touch = read("packages/styles/src/styles/touch.css")
    const phone = touch.slice(touch.indexOf("@media (max-width: 767px)"), touch.indexOf("@media (min-width: 414px)"))
    expect(phone).toMatch(/--alert-font-size: 15px;\n\s+--alert-line-height: 20px;/)
    expect(phone).toMatch(/--button-font-size-xl: 17px;\n\s+--button-line-height-xl: 22px;/)
    expect(phoneRule(css, ".Title")).toEqual({ "font-size": "17px", "line-height": "22px" })
    expect(phoneRule(css, ".Title ~ .Description")).toEqual({ "margin-top": "4px" })
  })

  test("26px corners, 22 above and 16 around, the icon and the text 22 from the edge", () => {
    expect(phoneRule(css, ".Alert")).toMatchObject({ "border-radius": "26px", padding: "22px 16px", "column-gap": "12px", "row-gap": "22px", "--alert-indicator-size": "28px" })
    expect(phoneRule(css, "&:has(> .Content > .Actions > :not(.DismissButton))")).toEqual({ "padding-bottom": "16px" })
    expect(phoneRule(css, ".Alert[data-banner]")).toEqual({ "border-radius": "0" })
    expect(phoneRule(css, ".Content")).toEqual({ display: "contents" })
    expect(phoneRule(css, ".Indicator")).toEqual({ "padding-inline-start": "6px" })
    expect(phoneRule(css, ".Message")).toEqual({ "padding-inline-start": "6px" })
  })

  test("the actions on a line of their own as 50px capsules, Dismiss as a close button in the corner", () => {
    expect(phoneRule(css, ".Actions")).toMatchObject({ flex: "1 0 100%", gap: "10px 12px", margin: "0" })
    expect(phoneRule(css, '.Alert .Actions > :where(button, a, [role="link"])')).toMatchObject({
      "--button-size": "var(--button-size-xl, 50px)",
      "--button-gutter": "var(--button-gutter-xl, 20px)",
      "--button-font-weight": "var(--font-weight-semibold)",
      "--button-radius": "var(--radius-full)",
      "min-width": "calc(50% - 6px)",
    })
    expect(phoneRule(css, ".Alert .Actions > .DismissButton")).toEqual({ display: "none" })
    // A 44px target whose background and focus ring draw the 30px circle 19 from the edges
    expect(phoneRule(css, ".Alert > .CloseButton")).toMatchObject({ "--button-uniform-size": "44px", position: "absolute", top: "12px", "inset-inline-end": "12px", display: "inline-flex" })
    expect(phoneRule(css, "&::before,\n    &::after")).toEqual({ inset: "7px" })
    for (const path of ["packages/ui/src/components/Alert/Alert.tsx", "packages/vue/src/components/Alert/Alert.ts"]) {
      const source = read(path)
      expect(source, path).toMatch(/aria-label"?[:=] ?"Dismiss"/)
      expect(source, path).toContain("CloseButton")
      expect(source, path).toContain("DismissButton")
    }
  })
})

test("the Alert Indicator example does not repeat the Description message", () => {
  for (const path of both("alert")) {
    const source = read(path)
    expect(source, path).toContain("centralizing SCIM")
    // React shows it in the Description section; Vue keeps each example's template in an export
    const indicator = path.includes("/vue/") ? source.slice(source.indexOf("export const indicator"), source.indexOf("export const dismissible")) : source.split("### Indicator\n")[1].split("\n### ")[0]
    expect(indicator, path).not.toContain("centralizing SCIM")
    expect(indicator, path).toContain("Tip: pin the projects you open most")
  }
  expect(read("components/docs/AlertDemos.tsx")).not.toContain("centralizing SCIM")
})

describe("a toast on a phone", () => {
  const css = "packages/styles/src/components/Toast/Toast.module.css"

  test("takes the corners, padding and text of the kit's notification banner", () => {
    expect(phoneRule(css, '.Toast[data-styled="true"]')).toEqual({
      gap: "10px !important",
      padding: "14px !important",
      "border-radius": "24px !important",
      "letter-spacing": "normal",
    })
    expect(phoneRule(css, "& .Title,\n    & .Description")).toEqual({ "font-size": "15px", "line-height": "18px !important" })
    expect(phoneRule(css, "& .Title")).toEqual({ "line-height": "17px !important" })
  })

  test("keeps its own line heights and description color over Sonner's unlayered stylesheet", () => {
    const decls = (selector: string) => {
      const out: Record<string, string> = {}
      postcss.parse(read(css)).walkRules((rule) => { if (rule.selector === selector && rule.parent?.type === "root") rule.each((node) => { if (node.type === "decl") out[node.prop] = node.important ? `${node.value} !important` : node.value }) })
      return out
    }
    expect(decls(".Title")["line-height"]).toBe("var(--font-text-sm-line-height) !important")
    expect(decls(".Description")["line-height"]).toBe("var(--font-text-sm-line-height) !important")
    // A toast with rich colors keeps Sonner's inherited color
    expect(decls('.Toast:not([data-rich-colors="true"]) .Description')).toEqual({ color: "var(--color-text-secondary) !important" })
  })

  test("draws its buttons as a medium phone Button, a 34px capsule in a 44px target", () => {
    const touch = read("packages/styles/src/styles/touch.css")
    for (const token of ["--button-size-md: 34px;", "--button-gutter-md: 14px;", "--button-font-size-md: 15px;", "--button-line-height-md: 20px;", "--button-font-weight: var(--font-weight-normal);"]) expect(touch).toContain(token)
    expect(phoneRule(css, "& > :is(.ActionButton, .CancelButton)")).toEqual({
      position: "relative",
      "min-height": "34px",
      "margin-block": "5px !important",
      padding: "7px 14px !important",
      "border-radius": "var(--radius-full) !important",
      "font-size": "15px !important",
      "font-weight": "var(--font-weight-normal) !important",
      "line-height": "20px",
    })
    // 34 + 5 + 5: the target of the coarse-pointer block above
    expect(phoneRule(css, "&::after")).toEqual({ position: "absolute", inset: "-5px 0", content: '""' })
  })

  test("a toast with a close button keeps the close button's room before the message", () => {
    // The coarse-pointer rule (0,3,0) must keep beating the phone padding (0,2,0)
    const coarse: string[] = []
    postcss.parse(read(css)).walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px), (pointer: coarse)") media.walkRules((rule) => { if (rule.selector.includes(":has([data-close-button])")) rule.walkDecls((decl) => { coarse.push(`${rule.selector} ${decl.prop}: ${decl.value}${decl.important ? " !important" : ""}`) }) })
    })
    expect(coarse).toEqual(["&:has([data-close-button]) padding-inline-start: 56px !important"])
  })
})

describe("a Phone preview is a phone screen in a phone frame (plan 164)", () => {
  const source = read("components/docs/ComponentPreview.tsx")
  const css = read("components/docs/ComponentPreview.module.css")
  const pages = ["content/components", "content/vue/components"].flatMap((dir) =>
    readdirSync(`${root}/${dir}`).filter((file) => file.endsWith(".mdx")).map((file) => `${dir}/${file}`))

  test("by default, and an example that is not a screen itself stands on a phone page", () => {
    expect(source).toContain("const phonePresentation = requestedPhonePresentation ?? 'screen';")
    expect(source).toContain("const phonePage = requestedPhonePresentation === undefined && !phoneDialog && !phoneOnly;")
    expect(source).toContain("data-preview-phone-page={phonePage || undefined}")
  })

  test("the phone page puts the example under the status bar, within the layout margins, from the top down", () => {
    expect(css).toContain(".PreviewContainer[data-preview-phone-page] {\n  /* Where the content starts under the status bar: under the top bar, which takes the status bar's height. */\n  --phone-page-content-top: 0px;\n  min-height: 100dvh;\n}")
    expect(css).toContain("padding: calc(var(--phone-page-content-top) + 16px) var(--mobile-layout-margin, 16px) calc(var(--safe-area-inset-bottom, 0px) + 16px);")
    expect(css).toContain(".PreviewContainer[data-preview-phone-page] [data-phone-rows] {\n  padding-top: calc(var(--phone-page-content-top) + 16px);")
    expect(css).toContain(".PreviewContainer[data-preview-phone-page]:has([data-phone-rows]) {\n  background: var(--mobile-surface-grouped-primary);\n}")
  })

  // Owner 08.11: a phone page always keeps the top bar of an app screen and names the example in it
  test("the phone page keeps a top bar under the status bar, titled by the example's section heading", () => {
    expect(source).toContain("{phonePage && (\n          <Toolbar className={s.PhonePageBar} aria-hidden=\"true\">\n            {previewTitle && <Toolbar.Title>{previewTitle}</Toolbar.Title>}")
    expect(css).toContain(".PreviewContainer[data-preview-phone-page] > .PhonePageBar {\n  --toolbar-padding-top: var(--safe-area-inset-top, 0px);")
    expect(css).toContain("  position: sticky;\n  top: 0;\n}")
    expect(css).toContain(".PreviewContainer[data-preview-phone-page]:has([data-phone-rows]) > .PhonePageBar {\n  --toolbar-background: var(--mobile-surface-grouped-primary);\n}")
    // An example with its own top bar keeps it alone and starts under the status bar
    expect(css).toContain(".PreviewContainer[data-preview-phone-page]:has(> .PreviewInner [data-toolbar][data-placement=\"top\"]) {\n  --phone-page-content-top: var(--safe-area-inset-top, 0px);\n\n  & > .PhonePageBar {\n    display: none;\n  }\n}")
    const remark = read("lib/remark-preview-id.ts")
    expect(remark).toContain("if (node.type === 'heading' && node.depth >= 2) heading = textOf(node).trim() || heading;")
    expect(remark).toContain("if (heading && !titled) node.attributes.push({ type: 'mdxJsxAttribute', name: 'previewTitle', value: heading });")
  })

  test("no example asks for the compact slice or keeps room for a menu any more", () => {
    for (const path of pages) {
      expect(read(path), path).not.toContain('phonePresentation="component"')
      expect(read(path), path).not.toContain("phoneMenuHeight")
    }
    expect(source).not.toContain("phoneMenuHeight")
  })
})

describe("Date Range Picker shortcuts on a phone (plan 161.shortcuts)", () => {
  const [react, vue] = both("date-range-picker").map(read)
  const reactPhone = react.slice(react.indexOf("// Phone: the shortcuts are a pop-up"), react.indexOf("<DateRangePickerShortcutsDemo />"))
  const vuePhone = vue.slice(vue.indexOf("export const shortcutsPhone = `"), vue.indexOf("export const monthStepperPhone"))
  const rows = (code: string) => [...code.matchAll(/<Field row label="([^"]+)">/g)].map((match) => match[1])

  test("a Period pop-up of the shortcuts above the Dates row, in React and Vue", () => {
    expect(rows(reactPhone)).toEqual(["Period", "Dates"])
    expect(rows(vuePhone)).toEqual(["Period", "Dates"])
    for (const code of [reactPhone, vuePhone]) {
      expect(code).toMatch(/<Select\b/)
      expect(code).toMatch(/Custom' : 'None'|"Custom" : "None"/)
      // The calendar row shows the dates, not a shortcut label
      expect(code.slice(code.indexOf('label="Dates"'))).not.toContain("shortcuts")
    }
  })

  test("the live demos are the code, and keep room for the calendar of the second row", () => {
    const demo = read("components/docs/DateRangePickerDemos.tsx")
    expect(demo).toContain("<PhoneRowsStage className={phoneCalendarSecondRowStageClassName}>")
    expect(demo).toContain("placeholder={value ? 'Custom' : 'None'}")
    expect(vue).toContain("phoneTemplate={phoneRows(shortcutsPhone)} phoneStageClassName={phoneCalendarSecondRowStageClassName}")
    expect(read("components/docs/phoneRowsTemplate.ts")).toContain("export const phoneCalendarSecondRowStageClassName = 'flex w-full min-h-[533px] flex-col';")
  })
})

describe("a component that looks the same on a phone has no Phone view (plan 161.phone-toggle)", () => {
  // No phone rule changes how these look (CodeBlock's only phone rule widens the copy button's target to 44px), so
  // a Phone view would repeat the desktop one. Their pages show desktop previews only, in React and Vue. Avatar keeps
  // the web look on a phone (owner 07.11: parity with the web matters more than an iOS monogram).
  test.each(["avatar", "code-block", "markdown", "separator", "shimmer-text", "skeleton", "text-link"])("%s", (page) => {
    for (const path of both(page)) {
      const previews = read(path).match(/<ComponentPreview\b[^\n]*/g) ?? []
      expect(previews.length, path).toBeGreaterThan(0)
      for (const preview of previews) expect(preview, path).toContain('phonePresentation="none"')
    }
  })
})
