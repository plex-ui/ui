import { readFileSync } from "node:fs"
import postcss, { type Rule } from "postcss"
import { describe, expect, test } from "vitest"

// Plan 169g: Button on a phone. A solid, soft or outline label is Semibold and a ghost one Regular, as iOS 26
// screens set them (IMG_5432, IMG_5516, IMG_5437, IMG_5494, IMG_5453; the kit draws them all Regular); an icon-only
// button is the kit's symbol button, a circle as tall as a text button of its size, with or without `uniform`
// (Button - Content Area 40:58696; owner 08.11: uniform made every size 44). The docs pages show a phone as screens of
// these buttons, the same in React and Vue.

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")

/** The declarations of the rules for `selector` in a stylesheet, inside the phone media query when `phone`. */
const declsOf = (path: string, selector: string, phone: boolean) => {
  const decls: Record<string, string> = {}
  postcss.parse(read(path)).walkRules((rule) => {
    if (rule.selector !== selector) return
    let parent = rule.parent
    let inPhone = false
    while (parent) {
      if (parent.type === "atrule" && (parent as unknown as { name: string; params: string }).name === "media"
        && ["(max-width: 767px)", "(max-width: 767.98px)"].includes((parent as unknown as { params: string }).params)) inPhone = true
      parent = parent.parent as typeof parent
    }
    if (inPhone !== phone) return
    rule.each((node) => { if (node.type === "decl") decls[node.prop] = node.value })
  })
  return decls
}

describe("Button on a phone", () => {
  const touch = "packages/styles/src/styles/touch.css"

  const steps = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]

  test("a filled, tinted or gray button is Semibold, on the button itself with no specificity, a disabled link too", () => {
    expect(declsOf(touch, ':where(:is(button, a, [role="link"])[data-variant]:not([data-variant="ghost"])[data-color][data-size])', true))
      .toEqual({ "--button-font-weight": "var(--font-weight-semibold)" })
  })

  test("the root keeps Regular for ghost buttons and drops the gutters of an icon-only button; uniform takes no size of its own", () => {
    const rootDecls = declsOf(touch, "html:root", true)
    expect(rootDecls).toMatchObject({
      "--button-font-weight": "var(--font-weight-normal)",
      "--button-icon-only-gutter-scale": "0",
    })
    expect(rootDecls).not.toHaveProperty("--button-icon-only-aspect-ratio")
    for (const step of steps) expect(rootDecls, step).not.toHaveProperty(`--button-uniform-size-${step}`)
  })

  test("a uniform button falls back to the size of a text button of its step, so a component's own size reaches it", () => {
    const css = read("packages/styles/src/components/Button/Button.module.css")
    for (const step of steps) {
      expect(css, step).toContain(`--button-uniform-size: var(--button-uniform-size-${step}, var(--button-size-${step}, var(--control-size-${step})));`)
    }
  })

  test("bars and rows that want a 44px uniform button set it themselves", () => {
    const page = read("packages/styles/src/components/Page/Page.module.css")
    expect(page).toMatch(/\.Leading > :is\(button, a\),\n\s+\.Actions > :is\(button, a\) \{\n\s+--button-size: 44px;[\s\S]*?--button-uniform-size: 44px;/)
    expect(read("packages/styles/src/components/Toolbar/Toolbar.module.css")).toContain("--button-uniform-size: var(--toolbar-item-size);")
    expect(declsOf("packages/styles/src/components/DataTable/DataTable.module.css", ".PaginationButtons", false))
      .toMatchObject({ "--button-uniform-size-sm": "var(--data-table-control-target, var(--control-size-sm))" })
    expect(declsOf("components/docs/ComponentPreview.module.css", ".ResetPreview", true))
      .toMatchObject({ "--button-uniform-size-xs": "var(--control-size-sm)" })
  })

  test("a desktop keeps its icon-only buttons: their tokens are set only inside the phone query", () => {
    const sources = ["packages/styles/src/styles/touch.css", "packages/styles/src/components/Button/Button.module.css"]
    for (const source of sources) {
      postcss.parse(read(source)).walkDecls((decl) => {
        if (!decl.prop.startsWith("--button-icon-only-") || decl.prop === "--button-icon-only-inset") return
        let parent = decl.parent
        let inPhone = false
        while (parent) {
          if (parent.type === "atrule" && (parent as unknown as { params: string }).params === "(max-width: 767px)") inPhone = true
          parent = parent.parent as typeof parent
        }
        expect(inPhone, `${source} ${decl.prop}`).toBe(true)
      })
    }
  })

  test("an icon-only button is at least as wide as its own size, read on the button itself", () => {
    expect(declsOf(touch, ':where(:is(button, a, [role="link"])[data-size]:not([data-uniform]))', true))
      .toEqual({ "--button-icon-only-min-width": "var(--button-size)" })
  })

  test("a group of uniform buttons alone and a group beside a field keep the 44px of a control", () => {
    const iconGroup = declsOf(touch, ':where([data-slot="button-group"]):not([data-slot="button-group"] *):not(:has(:is(button, a)[data-size]:not([data-uniform])))', true)
    for (const step of steps) {
      const control = ["3xs", "2xs", "xs"].includes(step) ? "sm" : step
      expect(iconGroup[`--button-uniform-size-${step}`], step).toBe(`var(--control-size-${control})`)
    }
    const fieldGroup: Record<string, string> = {}
    postcss.parse(read(touch)).walkRules((rule) => {
      if (rule.selector.startsWith(':where([data-slot="button-group"]):has(') && rule.toString().includes("--button-size-sm: var(--control-size-sm)")) {
        rule.each((node) => { if (node.type === "decl") fieldGroup[node.prop] = node.value })
      }
    })
    // A text button there takes the field's height, and a uniform one follows it (Button.module.css)
    for (const step of ["sm", "md", "lg", "xl", "2xl", "3xl"]) expect(fieldGroup[`--button-size-${step}`], step).toBe(`var(--control-size-${step})`)
    for (const step of ["3xs", "2xs", "xs"]) expect(fieldGroup[`--button-uniform-size-${step}`], step).toBe("var(--control-size-sm)")
  })

  test("an icon-only button without uniform weighs as .Button alone and reads the phone tokens", () => {
    const sheet = postcss.parse(read("packages/styles/src/components/Button/Button.module.css"))
    let iconOnly: Rule | undefined
    sheet.walkRules((rule) => {
      if (rule.selector === "&:where(:not([data-uniform]):has(> .ButtonInner > svg:only-child))") iconOnly = rule
    })
    expect(iconOnly, "icon-only rule").toBeDefined()
    expect((iconOnly!.parent as Rule).selector).toBe(".Button")
    const decls: Record<string, string> = {}
    iconOnly!.each((node) => { if (node.type === "decl") decls[node.prop] = node.value })
    expect(Object.keys(decls).sort()).toEqual(["--button-icon-only-inset", "min-width", "padding-inline"])
    expect(decls["min-width"]).toBe("var(--button-icon-only-min-width, auto)")
    expect(decls["padding-inline"]).toBe("calc(var(--button-gutter) * var(--button-icon-only-gutter-scale, 1))")
    const pill = iconOnly!.nodes.find((node): node is Rule => node.type === "rule" && node.selector === "&:where([data-pill])")
    expect(pill?.toString()).toContain("var(--control-gutter-pill-scaling) * var(--button-icon-only-gutter-scale, 1)")
    // Optical alignment pulls the icon to the edge by what stands around it: the gutter, or half of what the circle
    // leaves on a phone; it outweighs the text button rules, pill included
    for (const [side, prop] of [["start", "margin-inline-start"], ["end", "margin-inline-end"]] as const) {
      const optical = iconOnly!.nodes.find((node): node is Rule => node.type === "rule" && node.selector === `&[data-optically-align="${side}"]`)
      expect(optical?.toString(), side).toContain(`${prop}: calc(var(--button-icon-only-inset) * -1)`)
    }
  })

  // Block 3 of plan 178, measured in iOS 27.2 on an iPhone 17 (SwiftUI controlSize, UIKit buttonSize): small 28 with a
  // 15pt label and 10pt gutters, medium 34 and large 50 with a 17pt label and 12 and 20pt gutters; the plus of a
  // symbol is 12pt in the small button and 13.7 in the others; the spinner of a loading button 18 and 20pt; 11pt
  // between the symbol's ink and the label's at every size (owner 10.11: the kit's 3 and 4px were too tight).
  test("takes the label, gutters, symbol, spinner and symbol gap of the iOS 27.2 buttons", () => {
    const root = declsOf(touch, "html:root", true)
    for (const step of ["3xs", "2xs", "xs", "sm"]) {
      expect([root[`--button-size-${step}`], root[`--button-gutter-${step}`], root[`--button-font-size-${step}`]]).toEqual(["28px", "10px", "15px"])
      expect(root[`--button-indicator-size-${step}`]).toBe("18px")
    }
    for (const step of ["md", "lg"]) {
      expect([root[`--button-size-${step}`], root[`--button-gutter-${step}`], root[`--button-font-size-${step}`], root[`--button-line-height-${step}`]]).toEqual(["34px", "12px", "17px", "22px"])
      expect(root[`--button-icon-size-${step}`]).toBe("var(--control-icon-size-lg)")
    }
    for (const step of ["md", "lg", "xl", "2xl", "3xl"]) expect(root[`--button-indicator-size-${step}`]).toBe("20px")
    for (const step of ["xl", "2xl", "3xl"]) expect([root[`--button-size-${step}`], root[`--button-gutter-${step}`], root[`--button-font-size-${step}`]]).toEqual(["50px", "20px", "17px"])
    expect([root["--button-touch-gap-sm"], root["--button-touch-gap"]]).toEqual(["8px", "8px"])
    // A disabled button keeps the gray of a gray button, with touch.css only; without it the phone query falls back
    // to the desktop disabled fill. Outline reads its own outline fill, so a disabled one keeps its border and no fill.
    expect(root["--button-mobile-disabled-background"]).toBe("var(--color-background-secondary-soft-alpha)")
    expect(read("packages/styles/src/styles/variables-components.css")).not.toContain("--button-mobile-disabled-background")
    // Tabs keep their own segment gaps
    expect(root["--button-gap-lg"]).toBe("4px")

    const button = read("packages/styles/src/components/Button/Button.module.css")
    for (const step of ["sm", "md", "lg", "xl", "2xl", "3xl"]) {
      expect(button).toMatch(new RegExp(`--indicator-size: var\\(--button-indicator-size-${step}, \\d+px\\);`))
      expect(button).toMatch(new RegExp(`--circular-progress-size: var\\(--button-indicator-size-${step}, \\d+px\\);`))
    }
    for (const step of ["md", "lg"]) expect(button).toContain(`--button-icon-size: var(--button-icon-size-${step}, var(--control-icon-size-md));`)
    expect(button.match(/--button-gap: var\(--button-touch-gap, var\(--button-gap-lg\)\);/g)).toHaveLength(5)
    expect(button.match(/--button-gap: var\(--button-touch-gap-sm, var\(--button-gap-(sm|md)\)\);/g)).toHaveLength(4)
  })

  test("a Page bar's text button keeps the Toolbar's label gutter, not the 12px of a medium content button", () => {
    expect(declsOf("packages/styles/src/components/Page/Page.module.css", ':is(.Leading, .Actions) > :is(button, a, [role="link"]):not([data-navigation-action], [data-uniform])', true))
      .toEqual({ "--button-gutter": "var(--toolbar-label-gutter)" })
    expect(declsOf("packages/styles/src/components/Toolbar/Toolbar.module.css", '.Toolbar :is(.Leading, .Trailing, .Content, .Group) > :where(button, a, [role="link"]):not([data-navigation-action], [data-uniform])', true))
      .toEqual({ "--button-gutter": "var(--toolbar-label-gutter)" })
    expect(declsOf("packages/styles/src/components/Toolbar/Toolbar.module.css", '.Toolbar[data-placement="bottom"] :is(.Leading, .Trailing, .Content, .Group) > :where(button, a, [role="link"]):not([data-navigation-action], [data-uniform])', true))
      .toEqual({ "--button-gutter": "var(--toolbar-bottom-label-gutter)" })
  })

  test("a bar's text button is medium and a solid one semibold, set as font-weight past touch.css's semibold (iOS 27.2)", () => {
    // touch.css is unlayered, so its semibold --button-font-weight on a filled phone button outweighs the bar's token;
    // the bars set the weight on the button itself, 16 from the capsule's edge to the text (ref-app nav-inline, nav-text)
    const tokens = read("packages/styles/src/styles/variables-components.css")
    expect(tokens).toMatch(/--toolbar-label-font-weight: 510;\s*--toolbar-label-prominent-font-weight: 590;\s*--toolbar-label-gutter: 16px;/)
    const toolbar = "packages/styles/src/components/Toolbar/Toolbar.module.css"
    expect(declsOf(toolbar, '.Toolbar :is(.Leading, .Trailing, .Content, .Group) > :where(button, a, [role="link"])', true))
      .toEqual({ "font-weight": "var(--toolbar-label-font-weight)" })
    expect(declsOf(toolbar, '.Toolbar :is(.Leading, .Trailing, .Content, .Group) > :where(button, a, [role="link"])[data-variant="solid"]', true))
      .toEqual({ "font-weight": "var(--toolbar-label-prominent-font-weight)" })
    const page = "packages/styles/src/components/Page/Page.module.css"
    expect(declsOf(page, ':is(.Leading, .Actions) > :is(button, a, [role="link"])', true))
      .toEqual({ "font-weight": "var(--toolbar-label-font-weight)" })
    expect(declsOf(page, ':is(.Leading, .Actions) > :is(button, a, [role="link"])[data-variant="solid"]', true))
      .toEqual({ "font-weight": "var(--toolbar-label-prominent-font-weight)" })
    // A title with a subtitle: baselines 82.17 and 97.17 under the screen's top, as UIKit sets them (ref-app nav-subtitle)
    const css = read(toolbar)
    expect(css).toMatch(/\.Heading:has\(> \.Subtitle\) \{\s*transform: translateY\(-0\.33px\);/)
    expect(css).not.toContain("translateY(1px)")
  })

  test("a Field row action sets its weight on its buttons, so the filled weight does not replace it", () => {
    expect(declsOf("packages/styles/src/components/Field/Field.module.css", '.Action :where(button, a, [role="link"])', false))
      .toEqual({ "--button-font-weight": "var(--field-row-action-font-weight)" })
  })
})

describe("Button docs on a phone", () => {
  const react = read("components/docs/ButtonDemos.tsx")
  const vue = read("content/vue/components/button.mdx")
  const pages = [read("content/components/button.mdx"), vue]

  test("Selected is desktop only in React and Vue, Inert is told in States; Optical alignment has a phone view", () => {
    for (const page of pages) {
      expect(page).not.toContain("\n### Inert\n")
      // The old #inert link leads to States, where inert is told
      expect(page.indexOf('<span id="inert" />')).toBeGreaterThan(-1)
      expect(page.indexOf('<span id="inert" />')).toBeLessThan(page.indexOf("\n### States\n"))
      for (const title of ["Selected", "Optical alignment"]) {
        const section = page.split(`\n### ${title}\n`)[1]
        expect(section, title).toBeDefined()
        const preview = section.match(/<ComponentPreview\b[^\n]*/)?.[0]
        if (title === "Optical alignment") expect(preview, title).not.toContain('phonePresentation="none"')
        else expect(preview, title).toContain('phonePresentation="none"')
      }
    }
    expect(react).not.toContain("ButtonInertDemo")
    // A soft button under text starts its label where the text does, 40px in, as Forgot your password? under a
    // sign-in (IMG_5505); a phone-only control turns the offset off
    expect(react).toContain("<Button color=\"secondary\" variant=\"soft\" size=\"xl\" opticallyAlign={align === 'start' ? 'start' : undefined}>")
    expect(vue).toContain("<Button color=\"secondary\" variant=\"soft\" size=\"xl\" :optically-align=\"opticallyAlign === 'start' ? 'start' : undefined\">Forgot your password?</Button>")
    for (const source of [react, vue]) expect(source).toContain("flex w-full flex-col items-start gap-4 px-6")
    expect(vue).toContain('{ name: "opticallyAlign", type: "select", options: ["none", "start"], default: "start", phoneOnly: true }')
  })

  test("the actions of a screen are a stack 11px apart at its top, next to the controls, in React and Vue", () => {
    for (const source of [react, vue]) {
      expect(source).toContain('flex w-full flex-col items-center gap-[11px]')
      for (const label of ["Other Options", "Not Now"]) expect(source).toContain(label)
    }
    // Owner 08.11: the buttons stand up near the example's toggles, not at the foot of the screen
    expect(read("components/docs/ComponentPreview.module.css")).not.toContain("data-phone-actions")
    expect(react).not.toContain("data-phone-actions")
    expect(vue).not.toContain("data-phone-actions")
  })

  test("Sizing shows the three phone sizes with the same names in React and Vue", () => {
    for (const [size, name, height] of [["sm", "Small", 28], ["md", "Medium", 34], ["xl", "Large", 50]] as const) {
      expect(react).toContain(`{ size: '${size}', name: '${name}', height: ${height} }`)
      expect(vue).toContain(`{ size: '${size}', name: '${name}', height: ${height} }`)
    }
  })
})

// Owner 09.11 (plan 176 item 7): a disabled glass button keeps its glass and dims only its symbol or label, as a bar
// button does (iOS 26 kit _Button - Symbol, Text and Back, State=Disabled); a uniform button draws 28 or 34 and takes
// touches 44px around its center, as the close button of a phone Alert.
describe("A glass or uniform Button on a phone", () => {
  const css = "packages/styles/src/components/Button/Button.module.css"
  test("a disabled glass button keeps the glass; flat and other disabled buttons drop the material", () => {
    expect(declsOf(css, '.Button[data-mobile-material="glass"]:where([data-color="primary"], [data-color="secondary"]):where([data-variant="soft"], [data-variant="ghost"])', true))
      .toMatchObject({ "--button-mobile-material-background": "var(--mobile-glass-background)", "--button-mobile-material-opacity": "1" })
    expect(declsOf(css, '.Button:is([data-mobile-material="flat"], [data-disabled]:where(:not([data-mobile-material="glass"])))', true))
      .toMatchObject({ "--button-mobile-material-background": "initial" })
    expect(declsOf(css, '.Button[data-disabled][data-variant]', true)).toEqual({
      "--button-background-color": "var(--button-mobile-disabled-background, var(--color-background-disabled))",
      "--button-text-color": "var(--mobile-label-tertiary, var(--color-text-disabled))",
    })
  })

  test("a uniform button takes touches 44px around its center and keeps its drawn size, but not beside a neighbor", () => {
    expect(declsOf(css, '.Button[data-uniform]:not(:is([data-slot="button-group"], [data-slot="input-group"], [data-slot="input"], [data-slot="textarea"]) *) > .ButtonInner::before', true)).toEqual({
      position: "absolute",
      top: "50%",
      left: "50%",
      width: "max(100%, 44px)",
      height: "max(100%, 44px)",
      transform: "translate(-50%, -50%)",
      content: '""',
    })
  })
})
