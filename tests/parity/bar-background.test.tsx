import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { h, type VNode } from "vue"
import { Dialog as RDialog } from "../../packages/ui/src/components/Dialog"
import { Home as RHome } from "../../packages/ui/src/components/Icon"
import { Page as RPage } from "../../packages/ui/src/components/Page"
import { TabBar as RTabBar } from "../../packages/ui/src/components/TabBar"
import { Toolbar as RToolbar } from "../../packages/ui/src/components/Toolbar"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../packages/vue/src/components/Dialog"
import { Home } from "../../packages/vue/src/components/Icon"
import { Page, PageContent, PageFooter, PageHeader } from "../../packages/vue/src/components/Page"
import { TabBar, TabBarItem } from "../../packages/vue/src/components/TabBar"
import { Toolbar } from "../../packages/vue/src/components/Toolbar"
import { flushVue, mountVue } from "./harness"

// One `background` vocabulary on every bar of a phone screen, after the scroll edge styles of iOS 26 (kit
// Materials, Scroll Edge Effect - Soft 5661:26943 and - Hard 5661:26978): soft (the default), hard, glass and
// solid. Hard and glass show their line only while content is under the bar: under a top bar once the content
// has scrolled, above a bottom bar while the content continues below it.

const BACKGROUNDS = ["soft", "hard", "glass", "solid"] as const
type Background = (typeof BACKGROUNDS)[number]
type Framework = "React" | "Vue"
const FRAMEWORKS = ["React", "Vue"] as const

const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")

afterEach(() => cleanup())

// Page with a header, content, footer, both toolbars and a tab bar, all on one background.
const reactPage = (background?: Background | "edge", bars: "page" | "toolbars" = "page") => (
  <RPage>
    {bars === "page" ? <RPage.Header background={background as Background}>Orders</RPage.Header> : <RToolbar background={background}>Orders</RToolbar>}
    <RPage.Content><p>Rows</p></RPage.Content>
    {bars === "page" ? <RPage.Footer background={background as Background}>Save</RPage.Footer> : (
      <>
        <RToolbar placement="bottom" background={background}>Actions</RToolbar>
        <RTabBar background={background as Background} defaultValue="home"><RTabBar.Item value="home" label="Home" icon={<RHome />} /></RTabBar>
      </>
    )}
  </RPage>
)
const vuePage = (background?: Background | "edge", bars: "page" | "toolbars" = "page") => () => h(Page, null, () => [
  bars === "page" ? h(PageHeader, { background: background as Background }, () => "Orders") : h(Toolbar, { background }, () => "Orders"),
  h(PageContent, null, () => h("p", null, "Rows")),
  ...(bars === "page" ? [h(PageFooter, { background: background as Background }, () => "Save")] : [
    h(Toolbar, { placement: "bottom", background }, () => "Actions"),
    h(TabBar, { background: background as Background, defaultValue: "home" }, () => h(TabBarItem, { value: "home", label: "Home" }, { icon: () => h(Home) })),
  ]),
])

const mountPage = async (framework: Framework, background?: Background | "edge", bars: "page" | "toolbars" = "page") => {
  if (framework === "React") await act(async () => { render(reactPage(background, bars)) })
  else { mountVue(vuePage(background, bars) as () => VNode); await flushVue() }
}

const reactSheet = (background?: Background) => (
  <RDialog open>
    <RDialog.Content>
      <RDialog.Header background={background}><RDialog.Title>Filters</RDialog.Title></RDialog.Header>
      <RDialog.Body><p>Rows</p></RDialog.Body>
      <RDialog.Footer background={background}>Apply</RDialog.Footer>
    </RDialog.Content>
  </RDialog>
)
const vueSheet = (background?: Background) => () => h(Dialog, { open: true }, () => h(DialogContent, null, () => [
  h(DialogHeader, { background }, () => h(DialogTitle, null, () => "Filters")),
  h(DialogBody, null, () => h("p", null, "Rows")),
  h(DialogFooter, { background }, () => "Apply"),
]))

const mountSheet = async (framework: Framework, background?: Background) => {
  if (framework === "React") await act(async () => { render(reactSheet(background)) })
  else { mountVue(vueSheet(background) as () => VNode); await flushVue() }
}

const backgrounds = (selector: string) => Array.from(document.querySelectorAll(selector), (bar) => bar.getAttribute("data-background"))

/** Sets the scroll range and offset of a scroll area, which jsdom does not lay out, and tells it. */
const scroll = async (framework: Framework, element: HTMLElement, { top, height }: { top: number; height: number }) => {
  Object.defineProperty(element, "clientHeight", { configurable: true, value: 600 })
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: height })
  Object.defineProperty(element, "scrollTop", { configurable: true, value: top })
  if (framework === "React") await act(async () => { fireEvent.scroll(element) })
  else { element.dispatchEvent(new Event("scroll")); await flushVue() }
}

describe("Bar background", () => {
  test.each(FRAMEWORKS)("%s: a top bar is glass and a bottom bar soft by default", async (framework) => {
    await mountPage(framework)
    expect(backgrounds(".Header, .Footer")).toEqual(["glass", "soft"])
    cleanup()
    document.body.innerHTML = ""
    await mountPage(framework, undefined, "toolbars")
    expect(backgrounds("[data-toolbar], nav")).toEqual(["glass", "soft", "soft"])
    cleanup()
    document.body.innerHTML = ""
    await mountSheet(framework)
    expect(backgrounds(".Header, .Footer")).toEqual(["glass", "soft"])
  })

  test.each(FRAMEWORKS.flatMap((framework) => BACKGROUNDS.map((background) => [framework, background] as const)))(
    "%s: %s reaches every bar",
    async (framework, background) => {
      await mountPage(framework, background)
      expect(backgrounds(".Header, .Footer")).toEqual([background, background])
      cleanup()
      document.body.innerHTML = ""
      await mountPage(framework, background, "toolbars")
      expect(backgrounds("[data-toolbar], nav")).toEqual([background, background, background])
      cleanup()
      document.body.innerHTML = ""
      await mountSheet(framework, background)
      expect(backgrounds(".Header, .Footer")).toEqual([background, background])
    },
  )

  test.each(FRAMEWORKS)("%s: a toolbar's earlier `edge` is soft", async (framework) => {
    await mountPage(framework, "edge", "toolbars")
    expect(backgrounds("[data-toolbar]")).toEqual(["soft", "soft"])
  })
})

describe("Bar lines follow the content under the bars", () => {
  test.each(FRAMEWORKS)("%s: a page's header and footer", async (framework) => {
    await mountPage(framework, "hard")
    const content = document.querySelector<HTMLElement>(".Content")!
    const header = () => document.querySelector(".Header")!
    const footer = () => document.querySelector(".Footer")!
    // A long list at the top: content continues under the footer only.
    await scroll(framework, content, { top: 0, height: 1400 })
    expect([header().hasAttribute("data-scrolled"), footer().hasAttribute("data-content-below")]).toEqual([false, true])
    await scroll(framework, content, { top: 300, height: 1400 })
    expect([header().hasAttribute("data-scrolled"), footer().hasAttribute("data-content-below")]).toEqual([true, true])
    // Within 4px of the end, as at the top, a trackpad's settle does not count.
    await scroll(framework, content, { top: 796, height: 1400 })
    expect([header().hasAttribute("data-scrolled"), footer().hasAttribute("data-content-below")]).toEqual([true, false])
    // Content that fits leaves both bars without a line.
    await scroll(framework, content, { top: 0, height: 600 })
    expect([header().hasAttribute("data-scrolled"), footer().hasAttribute("data-content-below")]).toEqual([false, false])
  })

  test.each(FRAMEWORKS)("%s: a page's toolbars and tab bar", async (framework) => {
    await mountPage(framework, "glass", "toolbars")
    const content = document.querySelector<HTMLElement>(".Content")!
    const below = () => Array.from(document.querySelectorAll("[data-toolbar], nav"), (bar) => bar.hasAttribute("data-content-below"))
    await scroll(framework, content, { top: 0, height: 1400 })
    // The top toolbar marks scrolled content, never content below.
    expect(below()).toEqual([false, true, true])
    expect(document.querySelector('[data-toolbar][data-placement="top"]')!.hasAttribute("data-scrolled")).toBe(false)
    await scroll(framework, content, { top: 800, height: 1400 })
    expect(below()).toEqual([false, false, false])
    expect(document.querySelector('[data-toolbar][data-placement="top"]')!.hasAttribute("data-scrolled")).toBe(true)
    expect(document.querySelector('[data-toolbar][data-placement="bottom"]')!.hasAttribute("data-scrolled")).toBe(false)
  })

  test.each(FRAMEWORKS)("%s: a sheet's header and footer follow its body", async (framework) => {
    await mountSheet(framework, "hard")
    const body = document.querySelector<HTMLElement>(".Body")!
    const header = () => document.querySelector(".Header")!
    const footer = () => document.querySelector(".Footer")!
    await scroll(framework, body, { top: 0, height: 1400 })
    expect([header().hasAttribute("data-scrolled"), footer().hasAttribute("data-content-below")]).toEqual([false, true])
    await scroll(framework, body, { top: 300, height: 1400 })
    expect([header().hasAttribute("data-scrolled"), footer().hasAttribute("data-content-below")]).toEqual([true, true])
    await scroll(framework, body, { top: 800, height: 1400 })
    expect([header().hasAttribute("data-scrolled"), footer().hasAttribute("data-content-below")]).toEqual([true, false])
  })
})

describe("Bar background styles", () => {
  const tokens = read("styles/variables-components.css")
  const toolbar = read("components/Toolbar/Toolbar.module.css")
  const page = read("components/Page/Page.module.css")
  const dialog = read("components/Dialog/Dialog.module.css")
  const tabBar = read("components/TabBar/TabBar.module.css")
  const sheet = '.Content[data-mobile-variant="sheet"]'

  test("the hard line is the kit's Hard edge: 1pt black 12% in light", () => {
    expect(tokens).toContain("--page-bar-hard-line: light-dark(rgb(0 0 0 / 12%), var(--color-border));")
  })

  test("every bar other than soft fills itself without the edge's mask or blur", () => {
    for (const css of [toolbar, page, tabBar]) {
      expect(css).toMatch(/&:not\(\[data-background="soft"\]\)::before \{\s*inset: 0;[^}]*mask-image: none;/)
    }
    expect(dialog).toContain(`${sheet} .Header:not([data-background="soft"])::after,\n  ${sheet} .Footer:not([data-background="soft"])::before {\n    inset: 0;`)
  })

  test("glass is hidden until content is under the bar", () => {
    for (const css of [toolbar, page, tabBar]) {
      expect(css).toMatch(/&\[data-background="glass"\]::before \{[^}]*backdrop-filter: var\(--page-bar-glass-filter\);[^}]*opacity: 0;/)
    }
    expect(toolbar).toMatch(/&\[data-scrolled\]\[data-background="glass"\]::before \{\s*opacity: 1;/)
    expect(toolbar).toMatch(/&\[data-content-below\]\[data-background="glass"\]::before \{\s*opacity: 1;/)
    expect(page).toMatch(/&\[data-scrolled\]\[data-background="glass"\]::before \{\s*opacity: 1;/)
    expect(page).toMatch(/&\[data-content-below\]\[data-background="glass"\]::before \{\s*opacity: 1;/)
    expect(tabBar).toMatch(/&\[data-content-below\]\[data-background="glass"\]::before \{\s*opacity: 1;/)
    expect(dialog).toContain(`${sheet} .Header[data-scrolled][data-background="glass"]::after,\n  ${sheet} .Footer[data-content-below][data-background="glass"]::before {\n    opacity: 1;`)
  })

  test("hard and glass draw their line on the edge that faces the content", () => {
    expect(toolbar).toMatch(/&\[data-scrolled\]\[data-background="hard"\]::before \{\s*border-bottom-color: var\(--page-bar-hard-line\);/)
    expect(toolbar).toMatch(/&\[data-content-below\]\[data-background="hard"\]::before \{\s*border-top-color: var\(--page-bar-hard-line\);/)
    expect(page).toMatch(/&\[data-scrolled\]\[data-divider\]\[data-background="hard"\]::before \{\s*border-bottom-color: var\(--page-bar-hard-line\);/)
    expect(page).toMatch(/&\[data-scrolled\]\[data-divider\]\[data-background="glass"\]::before \{\s*border-bottom-color: var\(--page-bar-line\);/)
    expect(page).toMatch(/&\[data-content-below\]\[data-background="hard"\]::before \{\s*border-top-color: var\(--page-bar-hard-line\);/)
    expect(tabBar).toMatch(/&\[data-content-below\]\[data-background="hard"\]::before \{\s*border-top-color: var\(--page-bar-hard-line\);/)
    expect(dialog).toMatch(/\.Header\[data-scrolled\]\[data-background="hard"\]::after \{\s*border-bottom-color: var\(--page-bar-hard-line\);/)
    expect(dialog).toMatch(/\.Footer\[data-content-below\]\[data-background="hard"\]::before \{\s*border-top-color: var\(--page-bar-hard-line\);/)
  })

  test("a soft header fades out past its bar and a soft footer starts 27px above its actions and covers fully from their top, as a Toolbar's edges", () => {
    // Full cover down to the bottom of the bar, then a 32px fade past it (owner 08.11; plan 170)
    expect(page).toMatch(/\.Header \{[\s\S]*?&::before \{[^}]*inset: 0 0 calc\(-1 \* var\(--page-bar-soft-tail, 32px\)\);[^}]*mask-image: var\(--page-bar-soft-veil\);/)
    expect(page).toMatch(/&\[data-background="soft"\]::after \{[^}]*backdrop-filter: blur\(var\(--page-bar-soft-blur\)\);[^}]*mask-image: var\(--page-bar-soft-blur-mask\);/)
    expect(page).toMatch(/&\[data-background="soft"\]:not\(\[data-scrolled\]\)::before,\s*&\[data-background="soft"\]:not\(\[data-scrolled\]\)::after \{\s*opacity: 0;/)
    expect(dialog).toMatch(/\.Header::after \{\s*inset: 0 0 calc\(-1 \* var\(--page-bar-soft-tail, 32px\)\);[^}]*mask-image: var\(--page-bar-soft-veil\);/)
    expect(dialog).toMatch(/\.Header\[data-background="soft"\]::before \{[^}]*backdrop-filter: blur\(var\(--page-bar-soft-blur\)\);[^}]*mask-image: var\(--page-bar-soft-blur-mask\);/)
    expect(page).toMatch(/\.Footer \{[^}]*background: none;\s*&::before \{[^}]*inset: calc\(var\(--page-footer-padding-top\) - 27px\) 0 0;[^}]*mask-image: linear-gradient\(to bottom, transparent, #000 27px\);/)
    expect(dialog).toMatch(/\.Footer::before \{\s*inset: -15px 0 0;[^}]*mask-image: linear-gradient\(to bottom, transparent, #000 27px\);/)
  })

  test("a top bar of controls alone covers only the status bar, as in Notes; a bar with a title covers its row, as in Contacts", () => {
    expect(toolbar).toMatch(/\.Toolbar\[data-host="page"\]\[data-placement="top"\]\[data-background="soft"\]:not\(\[data-mobile-variant="sheet"\] \*\):not\(:has\(> \.Heading, > \.CollapsedTitle, > \.Content\[data-fill\]\)\) \{\s*&::before \{\s*inset: 0 0 auto;\s*height: var\(--toolbar-padding-top, 0px\);\s*-webkit-mask-image: linear-gradient\(to bottom, #000, transparent\);\s*mask-image: linear-gradient\(to bottom, #000, transparent\);/)
    expect(page).toMatch(/&\[data-background="soft"\]:not\(\[data-mobile-variant="sheet"\] \*\):not\(:has\(:is\(\.Heading, \.Title\)\)\)::before \{\s*inset: 0 0 auto;\s*height: var\(--safe-area-inset-top, env\(safe-area-inset-top, 0px\)\);\s*-webkit-mask-image: linear-gradient\(to bottom, #000, transparent\);\s*mask-image: linear-gradient\(to bottom, #000, transparent\);/)
    expect(page).toMatch(/&\[data-background="soft"\]:not\(\[data-mobile-variant="sheet"\] \*\):not\(:has\(:is\(\.Heading, \.Title\)\)\)::after \{\s*display: none;/)
    // A titled bar keeps the full cover and the fade past it.
    expect(toolbar).toMatch(/&::before \{[^}]*inset: 0 0 calc\(-1 \* var\(--page-bar-soft-tail, 32px\)\);/)
  })

  test("a large title is the content under the row until the inline title comes in", () => {
    const large = toolbar.slice(toolbar.indexOf('.Toolbar[data-host="page"][data-title-style="large"] {'))
    expect(large).toMatch(/&\[data-scrolled\]:not\(\[data-title-collapsed\]\)\[data-background="glass"\]::before \{\s*opacity: 0;/)
    expect(large).toMatch(/&\[data-scrolled\]:not\(\[data-title-collapsed\]\)\[data-background="hard"\]::before \{\s*border-bottom-color: transparent;/)
  })
})
