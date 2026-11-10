import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

// Plan 169j. On a phone a pressed menu row or Select option is the capsule iOS 26 draws under the finger (Files, the
// owner's shots of 08.11): the whole row, 10px from the panel's edges, round at its ends, in one even gray. The
// checkmark column is the native one (iOS-menu IMG_5666, IMG_5687, IMG_5688), and a submenu grows out of its row in
// step with the parent stepping back.

const menuCss = readFileSync("packages/styles/src/components/Menu/Menu.module.css", "utf8")
const selectCss = readFileSync("packages/styles/src/components/Select/Select.module.css", "utf8")
const touch = readFileSync("packages/styles/src/styles/touch.css", "utf8")

const MEDIA = "@media (max-width: 767px) {"

/** Where the phone blocks of a stylesheet stand: each `@media (max-width: 767px) { ... }` whole. */
function phoneRanges(css: string) {
  const ranges: Array<[number, number]> = []
  for (let start = css.indexOf(MEDIA); start !== -1; start = css.indexOf(MEDIA, start + 1)) {
    let depth = 0
    for (let i = start + MEDIA.length - 1; i < css.length; i++) {
      if (css[i] === "{") depth++
      else if (css[i] === "}" && --depth === 0) {
        ranges.push([start, i + 1])
        break
      }
    }
  }
  return ranges
}

/** The phone blocks of a stylesheet, and nothing between them. */
const phone = (css: string) => phoneRanges(css).map(([start, end]) => css.slice(start, end)).join("\n")

/** The stylesheet without its phone blocks. */
const desktop = (css: string) =>
  phoneRanges(css).reduceRight((rest, [start, end]) => rest.slice(0, start) + rest.slice(end), css)

describe("the pressed capsule on a phone", () => {
  test("a pressed Menu row and Select option fill the whole row 10px from the panel's edges, in one even gray", () => {
    const capsule = [
      "inset-inline: calc(var(--menu-gutter) - var(--menu-padding-inline, var(--menu-gutter)));",
      "background: var(--menu-press-background, var(--menu-item-background-color));",
    ]
    for (const css of [menuCss, selectCss]) {
      for (const line of capsule) expect(phone(css)).toContain(line)
      expect(desktop(css)).not.toContain("--menu-press-background")
    }
    expect(phone(menuCss)).toMatch(
      /:not\(:has\(\.ItemActions:active\)\):active::before \{\s*opacity: 1;\s*transform: scale\(var\(--menu-item-press-scale, var\(--scale, 0\.98\)\)\);\s*transition-duration: 0s;/,
    )
    expect(phone(selectCss)).toMatch(/\.Option:active::before \{\s*opacity: 1;\s*transition-duration: 0s;/)
  })

  test("touch.css gives the press the native capsule's average strength and keeps highlights off", () => {
    expect(touch).toContain("--menu-press-background: light-dark(var(--alpha-08), var(--alpha-10));")
    expect(touch).toContain("--menu-item-highlight-opacity: 0;")
  })

  test("Vue menus and lists listen for touches, so iOS Safari applies :active (React listens at its root)", () => {
    const vueMenu = readFileSync("packages/vue/src/components/Menu/Menu.ts", "utf8")
    const vueSelect = readFileSync("packages/vue/src/components/Select/Select.ts", "utf8")
    expect(vueMenu).toContain("const pressListeners = { onTouchstartPassive: () => {} }")
    expect(vueMenu.match(/\.\.\.pressListeners/g)).toHaveLength(2)
    expect(vueSelect).toContain('"onTouchstartPassive": () => {},')
  })

  test("Safari's tap highlight does not stack on the capsule", () => {
    expect(phone(menuCss)).toMatch(/\.MenuItem \{\s*-webkit-tap-highlight-color: transparent;/)
    expect(phone(selectCss)).toMatch(/\.Option,\s*\.Action \{\s*-webkit-tap-highlight-color: transparent;/)
  })
})

describe("the checkmark column on a phone", () => {
  test("the column, its gap and a selection row's icon follow native iOS 26 menus", () => {
    for (const token of [
      "--menu-check-column: 13px;",
      "--menu-check-gap: 8.5px;",
      "--menu-check-size: 18px;",
      "--menu-check-icon-offset: 2px;",
      "--menu-check-icon-gap: 14px;",
    ]) expect(touch).toContain(token)
    // Labels start after the row's 6px start, the column and the gap: 16 + 6 + 13 + 8.5 = 43.5 from the panel's edge
    expect(touch).toContain("--menu-item-padding: 10px 8px 10px 6px;")
    expect(touch).toContain("--menu-check-label-inset: calc(6px + var(--menu-check-column) + var(--menu-check-gap));")
  })

  test("in a menu with checkmarks, plain rows, read-only rows and section titles start where the labels do", () => {
    const inset = "padding-inline-start: var(--menu-check-label-inset, calc(8px + 13px + 8.5px));"
    expect(phone(menuCss)).toMatch(/& \.MenuItem:not\(\.RadioItem, \.CheckboxItem, \[data-submenu-collapse\]\)[^{]*& \.MenuItemContent,\s*& \.MenuLabel \{\s*padding-inline-start/)
    expect(phone(menuCss)).toContain(inset)
    // Select: only a list with checkmarks moves its titles, note, more-options row and actions to the label line
    expect(phone(selectCss)).toMatch(/\.MenuList:has\(\.OptionIndicatorSlot\[data-position\]\) :is\(\s*\.OptionGroupHeading,\s*\.OptionHardLimitHeading:not\(:has\(> \.OptionIndicatorSlot\)\),\s*\.OptionsLimit > \.PressableInner:not\(:has\(> \.OptionIndicatorSlot\)\)\s*\) \{\s*padding-inline-start/)
    // An action's symbol stands after the checkmarks' column and its label from 79.5, as a menu's (Select.module.css)
    expect(phone(selectCss)).toMatch(/\.MenuList:has\(\.OptionIndicatorSlot\[data-position\]\) \.ActionInner \{\s*gap: var\(--menu-check-icon-gap, 14px\);/)
    expect(phone(selectCss)).toContain(inset)
    expect(desktop(menuCss) + desktop(selectCss)).not.toContain("--menu-check-label-inset")
    expect(phone(selectCss)).toContain(":is(.PressableInner, .OptionHardLimitHeading):has(> .OptionIndicatorSlot) {\n    gap: var(--menu-check-gap, 8.5px);")
  })
})

describe("a submenu on a phone", () => {
  test("grows out of the middle of its top, on the parent's timing, and leaves on the exit timing", () => {
    const css = phone(menuCss)
    expect(css).toMatch(/\.MenuList\[data-submenu-phone\] \{\s*transform-origin: 50% 0;\s*\}/)
    expect(css).toMatch(/\.Menu\[data-entering-active\] \.MenuList\[data-submenu-phone\],\s*\.Menu\[data-entering\]\[data-interrupted\] \.MenuList\[data-submenu-phone\] \{\s*transition-duration: var\(--motion-enter\);/)
    expect(css).toMatch(/\.Menu\[data-exiting-active\] \.MenuList\[data-submenu-phone\],\s*\.Menu\[data-exiting\]\[data-interrupted\] \.MenuList\[data-submenu-phone\] \{\s*transition-duration: var\(--motion-exit\);/)
    // The parent steps back on the same duration and curve
    expect(css).toMatch(/\.MenuList\[data-submenu-over\] \{\s*scale: 0\.968;\s*transform-origin: 50% 0;\s*transition: scale var\(--motion-enter\) var\(--cubic-enter\)/)
  })
})
