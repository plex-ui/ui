import { afterEach, describe, expect, test, vi } from "vitest"
import { HOLD_PRESSES_CLASS, holdEnteringPresses } from "../../packages/ui/src/lib/holdEnteringPresses"
import {
  HOLD_PRESSES_CLASS as VUE_HOLD_PRESSES_CLASS,
  holdEnteringPresses as vueHoldEnteringPresses,
} from "../../packages/vue/src/lib/holdEnteringPresses"

// Console 16.11: a double tap on a row opened a sheet and a second one over it, a double tap on a menu button chose
// the first item. A press that starts while a sheet or menu comes in does nothing, as on iOS.
// Dialog and Menu install the hold on import; each case here runs alone on its own install
let dispose: () => void = () => {}
afterEach(() => { dispose(); document.body.replaceChildren() })

const pointer = (target: Element, type: string, pointerType = "touch") =>
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType }))
const tap = (target: Element, pointerType = "touch") => {
  pointer(target, "pointerdown", pointerType)
  pointer(target, "pointerup", pointerType)
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }))
}

describe.each([
  ["React", HOLD_PRESSES_CLASS, holdEnteringPresses],
  ["Vue", VUE_HOLD_PRESSES_CLASS, vueHoldEnteringPresses],
] as const)("%s holdEnteringPresses", (_, className, installHold) => {
  const install = () => { dispose = installHold() }
  test("a press that starts while the root enters is held whole; once it stands presses act", () => {
    install()
    document.body.innerHTML = `<div class="${className}" data-entering><button>Item</button></div>`
    const root = document.body.firstElementChild as HTMLElement
    const button = root.querySelector("button")!
    const seen = vi.fn()
    for (const type of ["pointerdown", "pointerup", "click"]) button.addEventListener(type, () => seen(type))
    tap(button)
    expect(seen).not.toHaveBeenCalled()
    root.removeAttribute("data-entering")
    tap(button)
    expect(seen.mock.calls.map(([type]) => type)).toEqual(["pointerdown", "pointerup", "click"])
  })

  test("the press that opened it, and a key's click, still act", () => {
    install()
    document.body.innerHTML = `<button>Open</button>`
    const trigger = document.body.firstElementChild as HTMLElement
    const seen = vi.fn()
    for (const type of ["pointerup", "click"]) trigger.addEventListener(type, () => seen(type))
    pointer(trigger, "pointerdown")
    // The menu mounts on pointerdown and enters while the same press comes up
    document.body.insertAdjacentHTML("beforeend", `<div class="${className}" data-entering><button>Item</button></div>`)
    pointer(trigger, "pointerup")
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }))
    const item = document.querySelector(`.${className} button`) as HTMLElement
    item.addEventListener("click", () => seen("key"))
    item.click()
    expect(seen.mock.calls.map(([type]) => type)).toEqual(["pointerup", "click", "key"])
  })

  test("a mouse click is not held: a quick second click toggles a desktop menu", () => {
    install()
    document.body.innerHTML = `<div class="${className}" data-entering><button>Item</button></div>`
    const button = document.querySelector("button")!
    const clicked = vi.fn()
    button.addEventListener("click", clicked)
    tap(button, "mouse")
    expect(clicked).toHaveBeenCalledTimes(1)
  })

  test("another root entering does not hold presses", () => {
    install()
    document.body.innerHTML = `<div data-entering><button>Toast</button></div>`
    const button = document.querySelector("button")!
    const clicked = vi.fn()
    button.addEventListener("click", clicked)
    tap(button)
    expect(clicked).toHaveBeenCalledTimes(1)
  })
})
