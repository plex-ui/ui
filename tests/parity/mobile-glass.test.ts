import { readFileSync } from "node:fs"
import { expect, test } from "vitest"

// Owner 10.11: «раз и навсегда» — phone glass is flat. Native iOS 27.2 glass has no gradient from top to bottom
// (ref-app glass-bands): a translucent fill, a hairline outline darker at the sides, a rim of light along the top
// and the bottom, a faint shadow.
const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")

test("the shared glass draws no sheen, and no component brings one back", () => {
  const materials = read("styles/mobile-materials.css")
  expect(materials).toContain("--mobile-glass-sheen: none;")
  expect(materials).toContain("--mobile-glass-rim: light-dark(rgb(255 255 255 / 100%), rgb(255 255 255 / 24%));")
  for (const path of ["components/Dialog/Dialog.module.css", "components/Toolbar/Toolbar.module.css", "components/Page/Page.module.css", "components/Button/Button.module.css", "components/ButtonGroup/ButtonGroup.module.css", "components/TabBar/TabBar.module.css"]) {
    expect(read(path), path).not.toMatch(/--mobile-glass-sheen:\s*linear-gradient/)
  }
})

// Review 10.11: a phone calendar's popover is glass as a menu is, so it draws the menu's edge (touch.css
// --menu-shadow); block 11 measures it against the native compact DatePicker's popover
test("a phone calendar popover takes the menu's glass edge", () => {
  for (const path of ["components/DatePicker/Calendar.module.css", "components/DateRangePicker/Calendar.module.css"]) {
    const phone = read(path).slice(read(path).indexOf("@media (max-width: 767px)"))
    expect(phone, path).toContain("box-shadow: var(--menu-shadow, var(--shadow), var(--shadow-hairline));")
  }
  expect(read("styles/touch.css")).toContain("inset 0 0.67px 0 var(--mobile-glass-rim, transparent)")
})
