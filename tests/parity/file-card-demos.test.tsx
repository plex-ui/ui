import { readFileSync } from "node:fs"
import { fireEvent, render, within } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { defineComponent, h, reactive } from "vue"
import { FileCardDemo } from "../../components/docs/FileUploadDemos"
import { removeFileWithFocus } from "../../components/docs/fileRemovalFocus"
import { FileCard, FileCardGroup } from "../../packages/vue/src/components/FileUpload"
import { flushVue, mountVue } from "./harness"
import { interact } from "./pair"

vi.mock("@plexui/ui/components/FileUpload", async () => import("../../packages/ui/src/components/FileUpload"))

// Exercise the template rendered by the Vue documentation, not a test-only copy.
const mdx = readFileSync("content/vue/components/file-upload.mdx", "utf8")
const readTemplate = (name: string, next: string) => {
  const start = `export const ${name} = `
  const expression = mdx.slice(mdx.indexOf(start) + start.length, mdx.indexOf(`export const ${next} = `)).trim()
  const template = new Function(`return ${expression}`)()
  if (typeof template !== "string") throw new Error(`File card ${name} template was not resolved`)
  return template
}
// One example: a list of cards whose `onRemove` control makes them read-only
const template = readTemplate("fileList", "fileListControls")

const names = [
  "government-id-scan.pdf",
  "passport-photo.png",
  "non-citizen-travel-2026-approved-document.pdf",
]

const mountExample = async (framework: string, removable = true) => {
  if (framework === "React") {
    render(<FileCardDemo />)
    if (!removable) await interact(() => fireEvent.click(within(document.body).getByRole("switch", { name: "onRemove" })))
  } else {
    const Example = defineComponent({
      components: { FileCard, FileCardGroup },
      setup: () => reactive({
        files: names.map((name) => new File(["sample"], name)),
        removable,
        removeFileWithFocus,
      }),
      template,
    })
    mountVue(() => h(Example))
    await flushVue()
  }
}

describe.each(["React", "Vue"])("%s standalone file-card list demo", (framework) => {
  test("keyboard removal preserves focus on the next, previous, then empty status without scrolling", async () => {
    await mountExample(framework)
    const page = within(document.body)
    for (const [removed, targetName] of [[names[1], names[2]], [names[2], names[0]]]) {
      const source = page.getByRole("button", { name: `Remove ${removed}` })
      const target = page.getByRole("button", { name: `Remove ${targetName}` })
      const focus = vi.spyOn(target, "focus")
      await interact(() => source.focus())
      // The native click is how Enter/Space activates the focused remove button.
      await interact(() => fireEvent.click(source))
      expect(page.queryByRole("button", { name: `Remove ${removed}` })).toBeNull()
      expect(document.activeElement).toBe(target)
      expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    }
    const last = page.getByRole("button", { name: `Remove ${names[0]}` })
    const status = page.getByRole("status")
    const focus = vi.spyOn(status, "focus")
    await interact(() => last.focus())
    await interact(() => fireEvent.click(last))
    expect(page.queryByRole("button", { name: /^Remove / })).toBeNull()
    expect(status.textContent?.trim()).toBe("Files removed")
    expect(status.getAttribute("tabindex")).toBe("-1")
    expect(document.activeElement).toBe(status)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  test("without onRemove the cards are read-only", async () => {
    await mountExample(framework, false)
    const page = within(document.body)
    // A name is split in two for its middle truncation
    for (const name of names) expect(document.body.textContent).toContain(name)
    expect(page.queryByRole("button", { name: /^Remove / })).toBeNull()
  })

  test("pointer removal without button focus does not move focus", async () => {
    await mountExample(framework)
    const page = within(document.body)
    const outside = document.createElement("button")
    document.body.append(outside)
    await interact(() => outside.focus())
    for (const remove of page.getAllByRole("button", { name: /^Remove / })) {
      await interact(() => {
        fireEvent.pointerDown(remove)
        fireEvent.click(remove)
      })
      expect(document.activeElement).toBe(outside)
    }
    expect(page.getByRole("status").textContent?.trim()).toBe("Files removed")
  })
})
