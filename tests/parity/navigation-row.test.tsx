import { readFileSync } from "node:fs"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { createRef } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { h, ref } from "vue"
import { FieldGroup as RFieldGroup } from "../../packages/ui/src/components/FieldGroup"
import { NavigationRow as RNavigationRow } from "../../packages/ui/src/components/NavigationRow"
import { FieldGroup } from "../../packages/vue/src/components/FieldGroup"
import { NavigationRow } from "../../packages/vue/src/components/NavigationRow"
import { flushVue, mountVue } from "./harness"
import { renderPair } from "./pair"

// React-vs-Vue parity for NavigationRow (console 15.11): an iOS Settings drill-in row of a FieldGroup, its label,
// value, description and chevron, a button or a link, disabled, and the attributes forwarded to the pressable.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("NavigationRow markup", () => {
  test.each([
    ["label only", { label: "About" }],
    ["label and value", { label: "Language", value: "English" }],
    ["value 0 shows", { label: "Accounts", value: 0 }],
    ["empty value hides", { label: "Accounts", value: "" }],
    ["null value hides", { label: "Accounts", value: null }],
    ["description", { label: "Fetch New Data", description: "How new mail arrives", value: "Push" }],
    ["disabled", { label: "Temperature", value: "°C", disabled: true }],
    ["link", { label: "Accounts", value: 2, href: "/settings/accounts" }],
    ["disabled link is a disabled button", { label: "Accounts", value: 2, href: "/settings/accounts", disabled: true }],
    [
      "attributes go to the pressable",
      { label: "Tags", value: "3", id: "tags", "aria-haspopup": "dialog", "aria-expanded": false, "data-test": "x", className: "extra" },
    ],
  ] as const)("%s", async (_, props) => {
    const { className, ...vueProps } = props as Record<string, unknown>
    const pair = await renderPair(
      <RFieldGroup>
        <RNavigationRow {...(props as never)} />
      </RFieldGroup>,
      () => h(FieldGroup, null, { default: () => h(NavigationRow, { ...vueProps, class: className } as never) }),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("in a FieldGroup with columns", async () => {
    const pair = await renderPair(
      <RFieldGroup columns>
        <RNavigationRow label="Language" value="English" />
        <RNavigationRow label="About" />
      </RFieldGroup>,
      () =>
        h(FieldGroup, { columns: true }, {
          default: () => [h(NavigationRow, { label: "Language", value: "English" }), h(NavigationRow, { label: "About" })],
        }),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("the row is a data-row with the pressable inside, and the chevron is hidden from assistive tech", () => {
    const { container } = render(<RNavigationRow label="Language" value="English" description="Of the system" />)
    const row = container.firstElementChild as HTMLElement
    expect(row.hasAttribute("data-row")).toBe(true)
    expect(row.hasAttribute("data-value")).toBe(true)
    expect(row.hasAttribute("data-description")).toBe(true)
    const button = row.querySelector("button")!
    expect(button.getAttribute("data-variant")).toBe("ghost")
    expect(button.hasAttribute("data-block")).toBe(true)
    expect(button.textContent).toBe("LanguageOf the systemEnglish")
    expect(button.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true")
    expect(button.hasAttribute("aria-haspopup")).toBe(false)
  })
})

describe("NavigationRow press", () => {
  test("React: a press calls onClick, a disabled row does not, and the ref is the pressable", () => {
    const onClick = vi.fn()
    const ref = createRef<HTMLButtonElement | HTMLAnchorElement>()
    const { getAllByRole, rerender } = render(<RNavigationRow ref={ref} label="Language" onClick={onClick} />)
    fireEvent.click(getAllByRole("button")[0])
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(ref.current?.tagName).toBe("BUTTON")
    rerender(<RNavigationRow ref={ref} label="Language" onClick={onClick} disabled />)
    fireEvent.click(getAllByRole("button")[0])
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<RNavigationRow ref={ref} label="Language" href="/language" />)
    expect(ref.current?.tagName).toBe("A")
  })

  test("Vue: a press emits click, a disabled row does not", async () => {
    const onClick = vi.fn()
    const { unmount } = mountVue(() => h("div", [h(NavigationRow, { label: "Language", onClick }), h(NavigationRow, { label: "Temperature", disabled: true, onClick })]))
    await flushVue()
    const [enabled, disabled] = document.querySelectorAll<HTMLButtonElement>("[data-navigation-row]")
    enabled.click()
    disabled.click()
    disabled.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
  })
})

describe("NavigationRow link and ref", () => {
  test("React: an external link keeps its new tab, and link attributes reach the anchor", () => {
    const { container, rerender } = render(<RNavigationRow label="Help" href="https://example.com" external />)
    expect(container.querySelector("a")!.getAttribute("target")).toBe("_blank")
    rerender(<RNavigationRow label="Report" href="/report.pdf" download="report.pdf" target="_self" />)
    const link = container.querySelector("a")!
    expect(link.getAttribute("download")).toBe("report.pdf")
    expect(link.getAttribute("target")).toBe("_self")
  })

  test("Vue: a ref reaches the pressable, its element and focus()", async () => {
    const row = ref<{ focus: () => void; element: HTMLElement | null } | null>(null)
    const { unmount } = mountVue(() => h(NavigationRow, { ref: row, label: "Language" }))
    await flushVue()
    expect(row.value?.element?.tagName).toBe("BUTTON")
    row.value?.focus()
    expect(document.activeElement).toBe(row.value?.element)
    unmount()
  })
})

describe("NavigationRow CSS", () => {
  const css = read("packages/styles/src/components/NavigationRow/NavigationRow.module.css")

  test("keeps the row's 52 as a minimum and grows with a description to the subtitle cell's height", () => {
    expect(css).toMatch(/\.Pressable\.Pressable \{[^}]*height: auto;[^}]*min-height: var\(--field-row-min-height, 52px\)/)
    expect(css).toMatch(/\[data-description\] > \.Pressable\.Pressable \{[^}]*--field-row-description-min-height/)
  })

  test("the label in the text color, the value secondary, the chevron tertiary and 20px with -5px margins", () => {
    expect(css).toMatch(/\.Label \{\s*color: var\(--navigation-row-label-color, var\(--color-text\)\)/)
    expect(css).toMatch(/\.Value \{[^}]*flex: 0 0 auto;[^}]*max-width: var\(--navigation-row-value-max-width, 60%\);[^}]*color: var\(--navigation-row-value-color, var\(--mobile-label-secondary/)
    expect(css).toMatch(/\.Disclosure \{[^}]*width: 20px;[^}]*height: 20px;[^}]*margin-inline: -5px;[^}]*--mobile-label-tertiary/)
  })

  test("a short value keeps its width, a label breaks only between words, RTL turns the chevron", () => {
    expect(css).toMatch(/\.Label,\s*\.Description \{[^}]*overflow-wrap: break-word/)
    expect(css).toMatch(/\.Pressable:dir\(rtl\) \.Disclosure \{\s*transform: scaleX\(-1\)/)
    expect(css).toMatch(/\[data-field-columns\] \.NavigationRow \{\s*--field-row-gap: 16px/)
  })
})
