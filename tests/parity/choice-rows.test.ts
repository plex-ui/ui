import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, test } from "vitest"

// Plan 160, block B: on a phone a list of options is the rows of a FieldGroup (iOS settings list), examples that
// only show a desktop layout are desktop only, no row repeats between the examples of a page, and a row whose
// choice or popup control is disabled reads as disabled (kit Lists, Row - Button, Value=Disabled 550:49735).

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")

/** Each `### Section` of a docs page with the opening tag of its first preview. */
const sections = (page: string) => read(page).split(/\n### /).slice(1).map((part) => ({
  title: part.slice(0, part.indexOf("\n")),
  preview: part.match(/<ComponentPreview\b[^\n]*/)?.[0] ?? "",
}))
const desktopOnly = (page: string) => sections(page).filter(({ preview }) => preview.includes('phonePresentation="none"')).map(({ title }) => title)
const rowLabels = (code: string) => [...code.matchAll(/<Field (?:v-for="[^"]*" :key="[^"]*" )?row :?label="([^"]*)"/g)].map((match) => match[1])
const groupTitles = (code: string) => [...code.matchAll(/<FieldGroup\b[^>]*?\btitle="([^"]*)"/g)].map((match) => match[1])
/** What a phone example shows: group titles, row labels, disabled rows and a footer error. */
const shape = (code: string) => ({
  titles: groupTitles(code),
  rows: rowLabels(code),
  disabled: [...code.matchAll(/<Field row label="([^"]*)"[^>]*>\s*<RadioGroup\.?Item [^>]*:?disabled/g)].map((match) => match[1]),
  groupDisabled: /<RadioGroup\s[^>]*\s:?disabled\b/.test(code),
  error: code.match(/<FieldError id=[^>]*>([^<]*)</)?.[1] ?? null,
})
const reactPhone = (page: string) => [...read(page).matchAll(/\/\/ Phone[^\n]*\n([\s\S]*?)`\}/g)].map((match) => match[1])
const vuePhone = (page: string) => [...read(page).matchAll(/export const (\w+Phone) = `([\s\S]*?)`\n/g)].map((match) => ({ name: match[1], code: match[2] }))

describe("a disabled choice or popup row on a phone", () => {
  const rules: postcss.Rule[] = []
  postcss.parse(read("packages/styles/src/components/Field/Field.module.css")).walkAtRules("media", (media) => {
    if (media.params === "(max-width: 767px)") media.walkRules((rule) => { if (rule.selector.includes('):is([disabled], [data-disabled], [aria-disabled="true"])')) rules.push(rule) })
  })
  const decls = (rule: postcss.ChildNode | undefined) => rule && "nodes" in rule ? Object.fromEntries((rule.nodes ?? []).filter((n): n is postcss.Declaration => n.type === "decl").map((d) => [d.prop, d.value])) : {}

  test("dims the label to the tertiary and the description to the quaternary label", () => {
    expect(rules).toHaveLength(1)
    const [rule] = rules
    expect(decls(rule)).toEqual({ "--field-description-color": "var(--mobile-label-quaternary, var(--color-text-disabled))" })
    const label = rule.nodes.find((n): n is postcss.Rule => n.type === "rule" && n.selector === "> .LabelGroup .Label")
    expect(decls(label)).toEqual({ color: "var(--mobile-label-tertiary, var(--color-text-disabled))" })
  })

  test("only in a horizontal row whose choice control has no enabled option, or whose popup control is disabled", () => {
    const [choice, popup] = rules[0].selectors
    expect(choice).toContain(':not([data-orientation="vertical"])')
    expect(choice).toContain(":not(:has(> .Content > .Control [data-row]))")
    for (const role of ['button[role="checkbox"]', 'button[role="radio"]', 'button[role="switch"]']) expect(choice).toContain(role)
    // A control that still has an enabled option (a segmented control with one disabled segment) leaves the row as it is
    expect(choice).toContain(':not(:has(> .Content > .Control :is(button[role="checkbox"], button[role="radio"], button[role="switch"], input[type="checkbox"], input[type="radio"]):not([disabled], [data-disabled], [aria-disabled="true"], [aria-hidden="true"])))')
    expect(popup).toContain(':not([data-orientation="vertical"])')
    expect(popup).toContain('> .Content > .Control > :is(button, [role="button"])[aria-haspopup]:not([aria-haspopup="false"]):is([disabled], [data-disabled], [aria-disabled="true"])')
  })
})

describe.each([
  ["Radio Group", "radio-group", "RadioGroupDemos", ["With Checkbox", "Descriptions", "Choice card", "Card selection"], 3],
  ["Checkbox", "checkbox", "CheckboxDemos", ["With Radio Group", "Descriptions"], 2],
])("%s on a phone", (_, page, demos, desktop, phoneExamples) => {
  const react = `content/components/${page}.mdx`
  const vue = `content/vue/components/${page}.mdx`

  test("leaves out the examples of desktop layouts, in React and Vue", () => {
    expect(desktopOnly(react)).toEqual(desktop)
    expect(desktopOnly(vue)).toEqual(desktop)
  })

  test("shows the other lists as FieldGroup rows, the same in React and Vue", () => {
    const reactBlocks = reactPhone(react)
    const vueBlocks = vuePhone(vue)
    expect(reactBlocks).toHaveLength(phoneExamples)
    expect(vueBlocks).toHaveLength(phoneExamples)
    for (const block of reactBlocks) expect(rowLabels(block).length, block).toBeGreaterThan(1)
    // Vue loops over the rows of one example with `v-for`; compare its titles and the React rows it stands for
    expect(vueBlocks.map(({ code }) => shape(code).titles)).toEqual(reactBlocks.map((code) => shape(code).titles))
    vueBlocks.forEach(({ code }, index) => {
      const vueShape = shape(code)
      const reactShape = shape(reactBlocks[index])
      if (!code.includes("v-for")) expect(vueShape.rows).toEqual(reactShape.rows)
      expect(vueShape.groupDisabled).toBe(reactShape.groupDisabled)
      expect(vueShape.disabled).toEqual(reactShape.disabled)
      expect(vueShape.error).toBe(reactShape.error)
    })
  })

  test("each Vue phone template is the phone layout of its example", () => {
    const source = read(vue)
    for (const { name } of vuePhone(vue)) expect(source, name).toMatch(new RegExp(`phoneTemplate=\\{phoneRows\\(${name}\\)\\}`))
  })

  test("the React demos show the rows their code shows", () => {
    const source = read(`components/docs/${demos}.tsx`)
    for (const label of reactPhone(react).flatMap(rowLabels)) {
      // A demo that maps its items writes the label once, as data
      expect(source.includes(`row label="${label}"`) || source.includes(`label: '${label}'`), label).toBe(true)
    }
    for (const error of reactPhone(react).map((code) => shape(code).error).filter(Boolean)) {
      expect(source).toContain(`<FieldError id={errorId}>${error}</FieldError>`)
    }
  })
})

test.each(["radio-group", "checkbox"])("no row repeats between the phone examples of %s", (page) => {
  const path = `content/components/${page}.mdx`
  const grouped = read(path).slice(read(path).indexOf("### Grouped sections"))
  const labels = [...reactPhone(path), grouped].flatMap(rowLabels)
  expect(labels.length).toBeGreaterThan(8)
  expect(new Set(labels).size).toBe(labels.length)
})

test("Switch shows the row with a description once", () => {
  for (const page of ["content/components/switch.mdx", "content/vue/components/switch.mdx"]) {
    expect(read(page).match(/Sent on Mondays\./g)?.length, page).toBe(2)
    expect(read(page)).toContain('<Field row label="Product updates" description="A few emails a month.">')
  }
})

test("Slider: on a phone each slider stands in a cell of a grouped list; the tooltip and the vertical slider are desktop only", () => {
  for (const page of ["content/components/slider.mdx", "content/vue/components/slider.mdx"]) {
    expect(desktopOnly(page), page).toEqual(["Adding a tooltip", "Vertical"])
  }
  // The group's title names the slider; a short value ends its cell, and a range, several values or marks go under
  // the track in a cell whose track stands in its first 44px (iOS Settings, Siri, Speaking Rate)
  const cells = read("components/docs/phoneRowsTemplate.ts")
  expect(cells).toContain("export const sliderCellClassName = 'flex min-h-[var(--field-row-min-height)] items-center gap-3 px-[var(--field-row-padding-inline)]';")
  expect(cells).toContain("export const sliderCellStackedClassName = 'flex flex-col px-[var(--field-row-padding-inline)] pb-1 [--slider-control-height:44px]';")
  expect(cells).toContain("text-[length:var(--field-row-description-font-size)] leading-[var(--field-row-description-line-height)]")
  const demos = read("components/docs/SliderDemos.tsx")
  expect(demos.match(/<FieldGroup title="[^"]+">\s*<div data-row className=\{sliderCell(Stacked)?ClassName\}>/g)).toHaveLength(4)
  expect(demos.match(/className=\{sliderCellStackedClassName\}/g)).toHaveLength(3)
  expect(demos.match(/className=\{sliderCellValueBelowClassName\}/g)).toHaveLength(2)
  const react = read("content/components/slider.mdx")
  expect(react.match(/<div data-row className="\$\{sliderCellClassName\}">/g)).toHaveLength(1)
  expect(react.match(/<div data-row className="\$\{sliderCellStackedClassName\}">/g)).toHaveLength(3)
  const vue = read("content/vue/components/slider.mdx")
  expect(vue.match(/phoneTemplate=\{phoneRows\(\w+Phone\)\}/g)).toHaveLength(4)
  expect(vue.match(/<div data-row class="\$\{sliderCellClassName\}">/g)).toHaveLength(1)
  expect(vue.match(/<div data-row class="\$\{sliderCellStackedClassName\}">/g)).toHaveLength(3)
})
