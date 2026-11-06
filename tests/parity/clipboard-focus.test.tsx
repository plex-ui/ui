import { describe, expect, test, vi } from "vitest"
import { copyText as reactCopyText } from "../../packages/ui/src/lib/copyToClipboard"
import { copyText as vueCopyText } from "../../packages/vue/src/lib/copyToClipboard"
import "./harness"

describe.each([["React", reactCopyText], ["Vue", vueCopyText]] as const)("%s clipboard fallback focus", (_framework, copyText) => {
  test.each([true, false, "throw"] as const)("restores input focus and selection after result %s", async (result) => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined })
    const input = document.createElement("input")
    input.value = "original value"
    document.body.append(input)
    input.focus()
    input.setSelectionRange(2, 7, "backward")
    const focus = vi.spyOn(input, "focus")
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => {
      expect(document.activeElement?.tagName).toBe("TEXTAREA")
      if (result === "throw") throw new Error("copy denied")
      return result
    }) })
    expect(await copyText("secret")).toBe(result === true)
    expect(document.activeElement).toBe(input)
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([2, 7, "backward"])
    expect(document.querySelector("textarea")).toBeNull()
  })

  test("does not take focus back if a copy handler moved it elsewhere", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined })
    const previous = document.createElement("button")
    const destination = document.createElement("button")
    document.body.append(previous, destination)
    previous.focus()
    const focus = vi.spyOn(previous, "focus")
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => { destination.focus(); return true } })
    expect(await copyText("secret")).toBe(true)
    expect(document.activeElement).toBe(destination)
    expect(focus).not.toHaveBeenCalled()
  })

  test("uses the supplied container's document for fallback and restoration", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined })
    const frame = document.createElement("iframe")
    document.body.append(frame)
    const doc = frame.contentDocument!
    const button = doc.createElement("button")
    doc.body.append(button)
    button.focus()
    const focus = vi.spyOn(button, "focus")
    const execCommand = vi.fn(() => { expect(doc.activeElement?.tagName).toBe("TEXTAREA"); return true })
    Object.defineProperty(doc, "execCommand", { configurable: true, value: execCommand })
    expect(await copyText("secret", doc.body)).toBe(true)
    expect(execCommand).toHaveBeenCalledExactlyOnceWith("copy")
    expect(doc.activeElement).toBe(button)
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
  })
})
