import { readFileSync } from "node:fs"
import { expect, test } from "vitest"

// Owner 10.11 («Делай все 6 пунктов», point 4): the phone menu row is defined once, so Menu (and Context Menu, which
// draws Menu's items) and Select's list do not drift apart. touch.css holds the row's metrics; the components read
// them, and their fallbacks, for a page without touch.css, repeat the same values.
const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")
const tokens = {
  "--menu-row-min-height": "42px",
  "--menu-row-padding-block": "10px",
  "--menu-description-font-size": "13px",
  "--menu-description-line-height": "18px",
  "--menu-check-slot-height": "22px",
}
const phone = (css: string) => css.slice(css.indexOf("@media (max-width: 767px)"))

test("touch.css defines the phone menu row once", () => {
  const touch = read("styles/touch.css")
  for (const [name, value] of Object.entries(tokens)) expect(touch).toContain(`${name}: ${value};`)
})

test.each(["components/Menu/Menu.module.css", "components/Select/Select.module.css"])("%s reads the row from touch.css", (path) => {
  const css = phone(read(path))
  for (const [name, value] of Object.entries(tokens)) {
    const uses = [...css.matchAll(new RegExp(`var\\(${name}, ([^)]+)\\)`, "g"))]
    expect(uses.length, `${path} ${name}`).toBeGreaterThan(0)
    for (const use of uses) expect(use[1], `${path} ${name}`).toBe(value)
  }
  // No row metric is written out on its own any more
  expect(css).not.toMatch(/min-height: 42px;|font-size: 13px;|line-height: 18px;|\bheight: 22px;/)
})
