import { isHoverPointer } from "./inputMode.js"

type SelectEvent = {
  defaultPrevented: boolean
  target: EventTarget | null
  currentTarget: EventTarget | null
}

type SelectPointerEvent = SelectEvent & { button: number; pointerType: string }
type SelectClickEvent = SelectEvent & { button: number; detail: number }

/** A nested clear button, link or input owns its activation. */
export const isNestedSelectControl = (event: SelectEvent): boolean => {
  const target = event.target
  const current = event.currentTarget
  if (!(target instanceof Element) || !(current instanceof Element)) return false
  const control = target.closest('button, a[href], input, textarea, select, [contenteditable="true"], [role="button"]')
  return !!control && control !== current && current.contains(control)
}

/** Mouse supports press-drag-select; touch and assistive clicks commit on click. */
export const createSelectPress = () => {
  let mouseClickHandled = false
  return {
    onPointerDown: () => { mouseClickHandled = false },
    onPointerCancel: () => { mouseClickHandled = false },
    onPointerUp: (event: SelectPointerEvent) => {
      if (event.defaultPrevented || event.button !== 0 || isNestedSelectControl(event)) return false
      mouseClickHandled = event.pointerType !== "pen" && isHoverPointer(event)
      return mouseClickHandled
    },
    onClick: (event: SelectClickEvent) => {
      const handled = mouseClickHandled
      mouseClickHandled = false
      if (event.defaultPrevented || event.button !== 0 || isNestedSelectControl(event)) return false
      // Virtual clicks have no matching pointerup. Never discard them because
      // another gesture was interrupted before its compatibility click.
      return event.detail === 0 || !handled
    },
  }
}
