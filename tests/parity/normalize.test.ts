import { afterEach, describe, expect, test } from "vitest"
import { serializeDom } from "./normalize"

// The serializer itself: live form state must show even when the attributes match.

const mount = (html: string) => {
  const root = document.createElement("div")
  root.innerHTML = html
  document.body.append(root)
  return root
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("serializeDom live form state", () => {
  test("a property that differs from identical attributes shows", () => {
    const a = mount('<input type="text" value="a"><input type="checkbox"><select><option>1</option><option>2</option></select><textarea></textarea>')
    const b = mount(a.innerHTML)
    expect(serializeDom(b)).toBe(serializeDom(a))

    b.querySelector<HTMLInputElement>('input[type="text"]')!.value = "b"
    b.querySelector<HTMLInputElement>('input[type="checkbox"]')!.indeterminate = true
    b.querySelector("select")!.value = "2"
    b.querySelector("textarea")!.value = "typed"

    expect(serializeDom(a)).toBe(
      [
        '<input type="text" value="a" .value="a">',
        '<input type="checkbox" .checked=false>',
        '<select .value="1">',
        '  <option .selected=true>',
        '    "1"',
        '  <option .selected=false>',
        '    "2"',
        '<textarea .value="">',
      ].join("\n"),
    )
    expect(serializeDom(b)).toBe(
      [
        '<input type="text" value="a" .value="b">',
        '<input type="checkbox" .checked=false .indeterminate=true>',
        '<select .value="2">',
        '  <option .selected=false>',
        '    "1"',
        '  <option .selected=true>',
        '    "2"',
        '<textarea .value="typed">',
      ].join("\n"),
    )
  })
})
