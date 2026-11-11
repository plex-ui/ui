import { readdirSync, readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

// Owner 11.11: «может первыми всегда показывать разделы где есть и десктоп и мобила?» On every component page the
// Overview comes first, then the sections with a phone view, then the desktop-only ones; the same inside a section
// for its #### examples. A section is desktop only when each of its previews has phonePresentation="none".

const dirs = ["content/components", "content/vue/components"]

/** The `level` headings of `text`, each with whether it is desktop only. */
function sections(text: string, level: number) {
  const marker = `\n${"#".repeat(level)} `
  return text.split(marker).slice(1).map((part) => {
    // The opening line of each preview, where phonePresentation sits (a `>` in `details={<>` ends no tag)
    const previews = part.match(/<ComponentPreview\b[^\n]*/g) ?? []
    return {
      title: part.slice(0, part.indexOf("\n")),
      body: part,
      desktopOnly: previews.length > 0 && previews.every((preview) => preview.includes('phonePresentation="none"')),
    }
  })
}

/** The titles that come after a desktop-only one while they have a phone view. */
function misplaced(list: { title: string; desktopOnly: boolean }[]) {
  const first = list.findIndex((section) => section.desktopOnly)
  return first < 0 ? [] : list.slice(first).filter((section) => !section.desktopOnly).map((section) => section.title)
}

describe.each(dirs)("%s", (dir) => {
  const pages = readdirSync(dir).filter((name) => name.endsWith(".mdx"))

  test.each(pages)("%s: the Overview, then sections with a phone view, then desktop-only ones", (name) => {
    const text = readFileSync(`${dir}/${name}`, "utf8")
    const start = text.indexOf("\n## Examples\n")
    if (start < 0) return
    const end = text.indexOf("\n## ", start + 5)
    const examples = text.slice(start, end < 0 ? undefined : end)
    const list = sections(examples, 3)
    if (list.some((section) => section.title === "Overview")) expect(list[0].title).toBe("Overview")
    const rest = list.filter((section) => section.title !== "Overview")
    expect(misplaced(rest)).toEqual([])
    for (const section of list) expect(misplaced(sections(section.body, 4)), section.title).toEqual([])
  })
})
