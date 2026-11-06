import { fireEvent } from "@testing-library/react"
import { expect, test } from "vitest"
import { h } from "vue"
import { Menu as ReactMenu } from "../../packages/ui/src/components/Menu"
import { Button as ReactButton } from "../../packages/ui/src/components/Button"
import { Button as VueButton } from "../../packages/vue/src/components/Button"
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuSub, MenuSubTrigger, MenuSubContent } from "../../packages/vue/src/components/Menu"
import { interact, walkPairWithState } from "./pair"

const pointer = (target: Element, type: string, pointerType = "mouse") => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 })
  Object.defineProperties(event, { pointerType: { value: pointerType }, pointerId: { value: 1 } })
  fireEvent(target, event)
}

const scenarios = ["touch cancel", "pen commit", "mouse dedup", "assistive click", "IME", "live disabled", "re-enable", "consumer pointer cancellation", "consumer click cancellation"] as const
for (const child of ["native", "Button"] as const) {
  test.each(scenarios)(`Menu.Trigger ${child}: %s`, async (scenario) => {
    const cancelPointer = (event: { preventDefault(): void }) => {
      if (scenario === "consumer pointer cancellation") event.preventDefault()
    }
    const cancelClick = (event: { preventDefault(): void }) => {
      if (scenario === "consumer click cancellation") event.preventDefault()
    }
    await walkPairWithState(
      { disabled: scenario === "re-enable" },
      (state) => <ReactMenu><ReactMenu.Trigger disabled={state.disabled} onPointerDown={cancelPointer} onClick={cancelClick}>{child === "native" ? <button>Open</button> : <ReactButton>Open</ReactButton>}</ReactMenu.Trigger><ReactMenu.Content><ReactMenu.Item>Edit</ReactMenu.Item></ReactMenu.Content></ReactMenu>,
      (state) => h(Menu, null, () => [h(MenuTrigger, { disabled: state.disabled, onPointerdown: cancelPointer, onClick: cancelClick }, () => child === "native" ? h("button", "Open") : h(VueButton, null, () => "Open")), h(MenuContent, null, () => h(MenuItem, null, () => "Edit"))]),
      async ({ advance, set }) => {
        await advance(20)
        const trigger = document.querySelector<HTMLElement>('[aria-haspopup="menu"]')!
        const isOpen = () => trigger.getAttribute("aria-expanded") === "true"
        const click = (detail = 1) => interact(() => { fireEvent.click(trigger, { detail }) })
        if (scenario === "IME") {
          await interact(() => { fireEvent.keyDown(trigger, { key: "Enter", isComposing: true }) })
          expect(isOpen()).toBe(false)
          await interact(() => { fireEvent.keyDown(trigger, { key: "Enter", keyCode: 229 }) })
          expect(isOpen()).toBe(false)
          await interact(() => { fireEvent.keyDown(trigger, { key: "Enter" }) })
          expect(isOpen()).toBe(true)
        } else if (scenario === "assistive click") {
          await click(0)
          expect(isOpen()).toBe(true)
        } else if (scenario === "consumer click cancellation") {
          await click(0)
          expect(isOpen()).toBe(false)
        } else if (scenario === "re-enable") {
          await click(0)
          expect(isOpen()).toBe(false)
          await set({ disabled: false })
          await advance(1)
          await click(0)
          expect(isOpen()).toBe(true)
        } else {
          const pointerType = scenario === "mouse dedup" ? "mouse" : scenario === "pen commit" ? "pen" : "touch"
          await interact(() => pointer(trigger, "pointerdown", pointerType))
          expect(isOpen()).toBe(scenario === "mouse dedup")
          if (scenario === "touch cancel") {
            await interact(() => pointer(trigger, "pointercancel", pointerType))
            expect(isOpen()).toBe(false)
            await interact(() => { fireEvent.keyDown(trigger, { key: "ArrowDown" }) })
            expect(isOpen()).toBe(true)
          } else {
            if (scenario === "live disabled") {
              await set({ disabled: true })
              await advance(1)
            }
            await click()
            expect(isOpen()).toBe(scenario === "mouse dedup" || scenario === "pen commit")
          }
        }
      },
    )
  })
}

test("Menu.SubTrigger rejects a queued hover-open after becoming disabled", async () => {
  let opens = 0
  await walkPairWithState(
    { disabled: false },
    (state) => <ReactMenu forceOpen><ReactMenu.Trigger><button>Open</button></ReactMenu.Trigger><ReactMenu.Content><ReactMenu.Sub onOpen={() => opens++}><ReactMenu.SubTrigger disabled={state.disabled}>More</ReactMenu.SubTrigger><ReactMenu.SubContent><ReactMenu.Item>Nested</ReactMenu.Item></ReactMenu.SubContent></ReactMenu.Sub></ReactMenu.Content></ReactMenu>,
    (state) => h(Menu, { forceOpen: true }, () => [h(MenuTrigger, null, () => h("button", "Open")), h(MenuContent, null, () => h(MenuSub, { onOpen: () => opens++ }, () => [h(MenuSubTrigger, { disabled: state.disabled }, () => "More"), h(MenuSubContent, null, () => h(MenuItem, null, () => "Nested"))]))]),
    async ({ set, advance }) => {
      opens = 0
      await advance(20)
      const trigger = document.querySelector<HTMLElement>('[role="menuitem"][aria-haspopup="menu"]')!
      await interact(() => pointer(trigger, "pointermove"))
      await advance(50)
      await set({ disabled: true })
      await advance(100)
      expect(opens).toBe(0)
      expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1)
      await set({ disabled: false })
      await advance(1)
      await interact(() => { fireEvent.keyDown(trigger, { key: "ArrowRight" }) })
      expect(opens).toBe(1)
      expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2)
    },
  )
})
