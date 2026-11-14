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
  ["breadcrumb", ["Sizes"]],
])("%s on a phone", (page, desktop) => {
  test("leaves out the examples a phone cannot show, in React and Vue, and says why", () => {
    for (const path of both(page)) {
      expect(desktopOnly(path), path).toEqual(desktop)
      const section = read(path).split(`### ${desktop[0]}\n`)[1]
      expect(section.slice(0, section.indexOf("</>}")), path).toMatch(/so this example is desktop only\./)
    }
  })
})

// Popover: Open on hover, once a desktop-only example, is showOnHover of the one Overview (row 33), a desktop setting
// as side and align are: a phone has no hover and no room beside the trigger
test("Popover: side, align and showOnHover are desktop controls of the Overview, and the page says why", () => {
  for (const name of ["side", "align", "showOnHover"]) {
    expect(read("components/docs/PopoverDemos.tsx")).toMatch(new RegExp(`name="${name}"[^\\n]*desktopOnly`))
    expect(read("content/vue/components/popover.mdx")).toMatch(new RegExp(`\\{ name: "${name}"[^\\n]*desktopOnly: true`))
  }
  for (const path of both("popover")) {
    expect(desktopOnly(path), path).toEqual([])
    expect(read(path), path).toContain("A phone has no hover: a tap opens it, so the setting stays on the desktop.")
  }
})

// Progress steps: Vertical, once a desktop-only example, is the orientation of the one Overview (owner 11.11), a
// desktop-only setting: on a phone the steps stand vertically
test("Progress Steps: orientation is a desktop control of the Overview, and the page says why", () => {
  expect(read("components/docs/ProgressStepsDemos.tsx")).toMatch(/name="orientation"[^\n]*desktopOnly/)
  expect(read("content/vue/components/progress-steps.mdx")).toMatch(/\{ name: "orientation", desktopOnly: true, phoneDefault: "vertical"/)
  for (const path of both("progress-steps")) {
    expect(desktopOnly(path), path).toEqual([])
    expect(read(path), path).toContain("so the steps stand vertically there and the phone has no <code>orientation</code> setting")
  }
})

// Page: Widths, once a desktop-only example, and Fill are settings of the one Overview (owner 11.11), desktop ones:
// a phone page takes the width of the screen and scrolls as a whole
test("Page: width and fill are desktop controls of the Overview, and the page says why", () => {
  const react = read("components/docs/PageDemos.tsx")
  expect(react).toMatch(/<Segments name="width"[^\n]*desktopOnly \/>/)
  expect(react).toMatch(/<DemoControlBoolean name="fill"[^\n]*desktopOnly \/>/)
  const vue = read("content/vue/components/page.mdx")
  expect(vue).toContain('{ name: "width", type: "select", options: ["full", "wide", "column"], default: "full", desktopOnly: true }')
  expect(vue).toContain('{ name: "fill", type: "boolean", default: false, desktopOnly: true }')
  for (const path of both("page")) {
    expect(desktopOnly(path), path).toEqual([])
    expect(read(path), path).toContain("On a phone a page takes the width of the screen at every width and scrolls as a whole, so the phone has neither setting.")
  }
})

test("Copy Tooltip: the hover delay is a desktop control, a tap copies at once", () => {
  expect(read("components/docs/CopyTooltipDemo.tsx")).toContain('<DemoControlRow name="openDelay" desktopOnly>')
  expect(read("content/vue/components/copy-tooltip.mdx")).toContain('{ name: "openDelay", desktopOnly: true, type: "range"')
  for (const path of both("copy-tooltip")) expect(read(path), path).toContain("On a phone a tap copies and shows Copied! at once")
})

describe("Page examples on a phone", () => {
  test("draw their orders as the rows of a FieldGroup, as the Toolbar examples do", () => {
    const react = read("components/docs/PageDemos.tsx")
    expect(react).toContain("import { BarBackgroundRow, Rows } from './ToolbarDemos';")
    expect(react).not.toMatch(/function Rows\(/)
    expect(read("components/docs/ToolbarDemos.tsx")).toMatch(/export function Rows\(\) \{\n {2}return \(\n {4}<FieldGroup>/)
    const vue = read("content/vue/components/page.mdx")
    expect(vue).toMatch(/export const list = `<FieldGroup>\n\s+<div v-for="row in rows" :key="row" data-row class="\$\{toolbarStyles\.Row\}">/)
  })

  test("each title matches the orders under it", () => {
    for (const path of ["components/docs/PageDemos.tsx", "content/vue/components/page.mdx"]) {
      const titles = [...read(path).matchAll(/<(?:Page\.Title|PageTitle)(?: v-else)?>([^<]+)</g)].map((match) => match[1])
      expect(titles.length, path).toBeGreaterThan(0)
      expect(new Set(titles), path).toEqual(new Set(["Orders"]))
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

// The geometry of the TipView in the iOS 27.2 simulator (ref-app screen `tip`, owner 11.11: the text and the icon on one line)
describe("an inline Alert on a phone takes the shape and text of an iOS tip (TipKit, the iOS 27.2 TipView)", () => {
  const css = "packages/styles/src/components/Alert/Alert.module.css"

  test("the description at 15/20 and the title at 17/22, 2 apart, the text ending 21 above the edge", () => {
    const touch = read("packages/styles/src/styles/touch.css")
    const phone = touch.slice(touch.indexOf("@media (max-width: 767px)"), touch.indexOf("@media (min-width: 414px)"))
    expect(phone).toMatch(/--alert-font-size: 15px;\n\s+--alert-line-height: 20px;/)
    expect(phone).toMatch(/--button-font-size-xl: 17px;\n\s+--button-line-height-xl: 22px;/)
    expect(phoneRule(css, ".Title")).toEqual({ "font-size": "17px", "line-height": "22px" })
    expect(phoneRule(css, ".Title,\n  .Description")).toEqual({ "text-wrap": "wrap" })
    expect(phoneRule(css, ".Title ~ .Description")).toEqual({ "margin-top": "2px", "margin-bottom": "4px" })
  })

  test("26px corners, the text 17 from the top, the icon where TipKit puts a 22pt image (22 from the edge, the text 12 after it)", () => {
    expect(phoneRule(css, ".Alert")).toMatchObject({ "border-radius": "26px", padding: "17px 16px", "column-gap": "8px", "row-gap": "18px", "--alert-indicator-size": "22px" })
    expect(phoneRule(css, "&:has(> .Content > .Actions > :not(.DismissButton))")).toEqual({ "padding-bottom": "16px" })
    expect(phoneRule(css, ".Alert[data-banner]")).toEqual({ "border-radius": "0" })
    expect(phoneRule(css, ".Content")).toEqual({ display: "contents" })
    // Not the simulator's 38pt TipView glyph (owner 11.11: «она не должна быть огромной»), nor a list row's 30 column
    // («не сильно большие паддинги вокруг иконки?»): a TipView with tipImageSize 22 puts it 22 from the edge, the text 12
    // after it (16 + 6 + 22 + 4 + 8 = 56), 20 from the top in Safari of the same simulator; a title alone stands on its middle
    expect(phoneRule(css, ".Indicator")).toEqual({ "padding-inline": "6px 4px", "margin-block": "5px", "min-height": "var(--alert-indicator-size)" })
    expect(phoneRule(css, ".Indicator + .Content > .Message:not(:has(> .Description))")).toEqual({ "align-self": "center" })
    // A description alone stands its first line on the icon's middle too (owner 13.11): 5 + 22/2 - 20/2 = 6, by the
    // text's own line height (lh), whatever unit --alert-line-height is given in
    expect(phoneRule(css, ".Indicator + .Content > .Message:not(:has(> .Title))")).toEqual({
      "margin-top": "calc(5px + var(--alert-indicator-size) / 2 - 0.5lh)",
    })
    expect(phoneRule(css, ".Message")).toEqual({ "padding-inline-start": "6px" })
    expect(phoneRule(css, ".Indicator + .Content > .Message")).toEqual({ "padding-inline-start": "0" })
  })

  test("the actions on a line of their own as 50px capsules, Dismiss as a close button in the corner", () => {
    expect(phoneRule(css, ".Actions")).toMatchObject({ flex: "1 0 100%", gap: "8px", margin: "0" })
    // Unless the Alert keeps its buttons' own size (mobileActions="own")
    expect(phoneRule(css, '.Alert:where(:not([data-mobile-actions="own"])) .Actions > :where(button, a, [role="link"])')).toMatchObject({
      "--button-size": "var(--button-size-xl, 50px)",
      "--button-gutter": "var(--button-gutter-xl, 20px)",
      "--button-radius": "var(--radius-full)",
      "min-width": "calc(50% - 4px)",
    })
    // The weight is a phone button's own: Medium filled, Regular ghost (touch.css)
    expect(phoneRule(css, '.Alert:where(:not([data-mobile-actions="own"])) .Actions > :where(button, a, [role="link"])')).not.toHaveProperty("--button-font-weight")
    expect(phoneRule(css, ".Alert .Actions > .DismissButton")).toEqual({ display: "none" })
    // A 44px target whose background and focus ring draw the 26px circle 14 from the edges, the first line of text short of it
    expect(phoneRule(css, ".Alert > .CloseButton")).toMatchObject({ "--button-uniform-size": "44px", "--button-icon-size": "19px", position: "absolute", top: "5px", "inset-inline-end": "5px", display: "inline-flex" })
    expect(phoneRule(css, "&::before,\n    &::after")).toEqual({ inset: "9px" })
    expect(phoneRule(css, ".Alert:has(> .CloseButton) .Message > :first-child:where(.Title, .Description)")).toEqual({ "padding-inline-end": "34px" })
    for (const path of ["packages/ui/src/components/Alert/Alert.tsx", "packages/vue/src/components/Alert/Alert.ts"]) {
      const source = read(path)
      expect(source, path).toMatch(/aria-label"?[:=] ?"Dismiss"/)
      expect(source, path).toContain("CloseButton")
      expect(source, path).toContain("DismissButton")
    }
  })
})

// Alert: Action placement, once a desktop-only example, is a desktop setting of the one Overview (owner 11.11): on a
// phone the actions always stand under the message
test("Alert: actionsPlacement is a desktop control of the Overview, and the page says why", () => {
  expect(read("components/docs/AlertDemos.tsx")).toMatch(/name="actionsPlacement"[^\n]*desktopOnly/)
  expect(read("content/vue/components/alert.mdx")).toMatch(/\{ name: "actionsPlacement",[^\n]*desktopOnly: true/)
  for (const path of both("alert")) {
    expect(desktopOnly(path), path).toEqual([])
    expect(read(path), path).toMatch(/so <code>actions-?[pP]lacement<\/code> is a desktop setting/)
  }
})

describe("a toast on a phone", () => {
  const css = "packages/styles/src/components/Toast/Toast.module.css"

  test("takes the corners, padding and text of the kit's notification banner", () => {
    expect(phoneRule(css, '.Toast[data-styled="true"]')).toEqual({
      gap: "10px !important",
      padding: "12px 14px !important",
      "border-radius": "24px !important",
      "letter-spacing": "var(--font-sans-tracking)",
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

  test("draws its buttons as the 34px capsule of a medium phone Button with the banner's 15px label, in a 44px target", () => {
    const touch = read("packages/styles/src/styles/touch.css")
    for (const token of ["--button-size-md: 34px;", "--button-touch-radius: var(--radius-full);"]) expect(touch).toContain(token)
    expect(phoneRule(css, "& > :is(.ActionButton, .CancelButton)")).toEqual({
      position: "relative",
      "min-height": "34px",
      padding: "7px 14px !important",
      "border-radius": "var(--radius-full) !important",
      "font-size": "15px !important",
      "font-weight": "var(--font-weight-normal) !important",
      "line-height": "20px",
    })
    // 34 + 5 + 5: the target of the coarse-pointer block above, reaching into the 12px padding
    expect(phoneRule(css, "&::after")).toEqual({ position: "absolute", inset: "-5px 0", content: '""' })
  })

  // Peer 09.11 (plan 176 release 12): one short line and Undo took a 101 high card, the button on a line of its own
  test("puts one button at the trailing end of the message's row, as the banner keeps its time; two stand under it", () => {
    const coarse: Record<string, Record<string, string>> = {}
    postcss.parse(read(css)).walkAtRules("media", (media) => {
      if (media.params !== "(max-width: 767px), (pointer: coarse)") return
      media.walkRules((rule) => {
        if (!rule.selector.includes("Content")) return
        rule.walkDecls((decl) => { (coarse[rule.selector] ??= {})[decl.prop] = decl.value })
      })
    })
    expect(coarse).toEqual({
      // The message grows into the row beside one button
      "& > .Content": { flex: "1 1 0", "min-width": "0" },
      // In a toast as wide as its content it keeps 8em beside a button, which wraps under it otherwise
      // (Codex r12b: a long label crushed the message), and never more than the row but the icon's 28px
      // A button is whatever follows the message: a caller's own action element too (Codex r12c)
      "&:has(> .Content ~ *) > .Content": { "min-width": "min(8em, 100% - 28px)" },
      // Where the toast fills the width it keeps at least half the row; a wider button wraps under it.
      // Half of a width the message sets would push a short message off its row, leaving the icon alone (Codex r12)
      "&:not(.Compact):has(> .Content ~ *) > .Content": { "min-width": "50%" },
      // Two buttons leave the message the row but the icon's 28px, so they stand together under it
      "&:has(> .Content ~ * ~ *) > .Content": { "flex-basis": "calc(100% - 28px)" },
    })
    const floors: string[] = []
    postcss.parse(read(css)).walkAtRules("media", (media) => {
      if (media.params === "(width <= 600px)" && media.parent?.type === "rule") media.walkRules((rule) => { floors.push(rule.selector) })
    })
    expect(floors).toEqual(["&:not(.Compact):has(> .Content ~ *) > .Content"])
  })

  test("a toast with a close button keeps the close button's room after the message", () => {
    // The coarse-pointer rule (0,3,0) must keep beating the phone padding (0,2,0)
    const coarse: string[] = []
    postcss.parse(read(css)).walkAtRules("media", (media) => {
      if (media.params === "(max-width: 767px), (pointer: coarse)") media.walkRules((rule) => { if (rule.selector.includes(":has([data-close-button])")) rule.walkDecls((decl) => { coarse.push(`${rule.selector} ${decl.prop}: ${decl.value}${decl.important ? " !important" : ""}`) }) })
    })
    // A toast with only a line of text is not shorter than the 44px target and Sonner's two 1px borders (Codex r12)
    expect(coarse).toEqual(["&:has([data-close-button]) min-height: 46px", "&:has([data-close-button]) padding-inline-end: 56px !important"])
  })
})

describe("a Phone preview is a phone screen in a phone frame (plan 164)", () => {
  const source = read("components/docs/ComponentPreview.tsx")
  const css = read("components/docs/ComponentPreview.module.css")
  const pages = ["content/components", "content/vue/components"].flatMap((dir) =>
    readdirSync(`${root}/${dir}`).filter((file) => file.endsWith(".mdx")).map((file) => `${dir}/${file}`))

  test("by default, and an example that is not a screen itself stands on a phone page", () => {
    // A page whose phone view is not ready (frontmatter phoneDraft, plan 169h) has no phone examples on a desktop
    expect(source).toContain("const phonePresentation = !pageViewport.phoneViews && !phoneOnly ? 'none' : requestedPhonePresentation ?? 'screen';")
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
    expect(css).toContain(".PreviewContainer[data-preview-phone-page] > .PhonePageBar {\n  --toolbar-padding-top: max(var(--toolbar-padding-bottom, 10px), var(--safe-area-inset-top, 0px));")
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
