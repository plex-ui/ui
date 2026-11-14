import { readFileSync } from "node:fs"
import postcss from "postcss"
import { expect, test } from "vitest"

// An iOS list draws no scroller as it opens; a browser flashes its overlay scrollbar for a second on every open, so a
// phone's Select and Menu lists hide it and still scroll (owner 14.11)
test.each([
  ["packages/styles/src/components/Select/Select.module.css", ".OptionsList"],
  ["packages/styles/src/components/Menu/Menu.module.css", ".MenuList"],
])("%s: %s hides its scrollbar on a phone only", (path, selector) => {
  const root = postcss.parse(readFileSync(`${process.cwd()}/${path}`, "utf8"))
  const hidden: string[] = []
  root.walkDecls("scrollbar-width", (decl) => {
    const rule = decl.parent as postcss.Rule
    const media = rule.parent?.type === "atrule" ? (rule.parent as postcss.AtRule).params : ""
    if (decl.value === "none" && rule.selector === selector) hidden.push(media)
  })
  expect(hidden).toEqual(["(max-width: 767px)"])
})
