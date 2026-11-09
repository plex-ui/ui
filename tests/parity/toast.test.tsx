import { act, fireEvent } from "@testing-library/react"
import { createElement, type ComponentType } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, type Component } from "vue"
import * as RToast from "../../packages/ui/src/components/Toast"
import * as VToast from "../../packages/vue/src/components/Toast"
import { walkPairWithState } from "./pair"

type Props = Record<string, unknown>
type ToastApi = typeof RToast.toast
type Tools = {
  /** The framework under test's `toast` (sonner or vue-sonner) */
  toast: ToastApi
  /** The framework under test's `compact` options */
  compact: Record<string, string>
  advance: (ms: number) => Promise<void>
  snapshot: () => void
  /** Runs a DOM event (or anything) and lets both frameworks settle */
  run: (fn: () => void) => Promise<void>
}

afterEach(() => {
  document.documentElement.removeAttribute("data-theme")
})

// Vue exposes closeButtonPosition; React has no counterpart. All other renderer DOM must match.
const normalizePortAttributes = (dom: string) => dom.replace(/ data-close-button-position="[a-z-]+"/g, "")

const isVue = () => document.querySelector("[data-v-app]") !== null

/** Runs the same script against React's and Vue's Toaster; returns raw snapshots of each. */
const walkToasts = async (toasterProps: Props, script: (tools: Tools) => Promise<void>) => {
  const vueProps = Object.fromEntries(Object.entries(toasterProps).map(([key, value]) => [key, value]))
  return walkPairWithState(
    {},
    () => createElement(RToast.Toaster as ComponentType<Props>, toasterProps),
    () => h(VToast.Toaster as Component, vueProps),
    async ({ advance, snapshot }) => {
      const vue = isVue()
      await script({
        toast: (vue ? VToast.toast : RToast.toast) as unknown as ToastApi,
        compact: vue ? VToast.compact : RToast.compact,
        advance,
        snapshot,
        run: async (fn) => {
          await act(async () => {
            fn()
          })
          await advance(0)
        },
      })
      // Leave nothing for the next script
      ;(vue ? VToast.toast : RToast.toast).dismiss()
      await advance(1000)
    },
  )
}

const expectParity = ({ react, vue }: { react: string[]; vue: string[] }) => {
  expect(vue.map(normalizePortAttributes)).toEqual(react.map(normalizePortAttributes))
}

// Lets a new toast mount, measure and settle
const settle = async (advance: Tools["advance"]) => {
  await advance(0)
  await advance(16)
}

describe("Toast parity", () => {
  test("default toast: appears, auto-closes after the Toaster's 3000ms, unmounts", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      snapshot()
      toast("Inquiry ID copied")
      await settle(advance)
      snapshot()
      await advance(2900)
      snapshot()
      await advance(200)
      snapshot()
      await advance(300)
      snapshot()
    })
    expectParity(result)
    expect(result.react[1]).toContain('"Inquiry ID copied"')
    expect(result.react[1]).not.toContain("data-icon")
    expect(result.react[3]).toContain('data-removed="true"')
    expect(result.react[4]).not.toContain("data-sonner-toast")
  })

  test.each(["success", "error", "warning", "info"] as const)("%s variant: Plex icon and class", async (variant) => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      toast[variant]("Inquiry ID copied")
      await settle(advance)
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain(`data-type="${variant}"`)
    expect(result.react[0]).toContain('class="Icon" data-icon=""')
  })

  test("description, action and cancel", async () => {
    const onAction = vi.fn()
    const onCancel = vi.fn()
    const result = await walkToasts({}, async ({ toast, advance, snapshot, run }) => {
      toast("Message sent", {
        description: "Delivered to #design channel.",
        action: { label: "Undo", onClick: onAction },
        cancel: { label: "Keep", onClick: onCancel },
      })
      await settle(advance)
      snapshot()
      await run(() => fireEvent.click(document.querySelector("[data-action]")!))
      snapshot()
      await advance(300)
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('class="Description" data-description=""')
    expect(result.react[0]).toContain('class="CancelButton"')
    expect(result.react[1]).toContain('data-removed="true"')
    expect(onAction).toHaveBeenCalledTimes(2)
    expect(onCancel).not.toHaveBeenCalled()
  })

  // Release 12 (plan 176): on a phone the message keeps its room beside whatever follows it, so the
  // stylesheet keys its floors on `.Content ~ *`; only the cancel and the action may stand there (Codex r12c)
  test("only the cancel and the action follow the message, the caller's own elements too", async () => {
    const after: string[][] = []
    await walkToasts({}, async ({ toast, advance }) => {
      const own = (label: string) => isVue() ? h("a", { href: "#", "data-own": label }, label) : createElement("a", { href: "#", "data-own": label }, label)
      toast("Message sent", { cancel: own("Keep"), action: own("History") } as never)
      await settle(advance)
      const next: string[] = []
      for (let el = document.querySelector("[data-sonner-toast] [data-content]")!.nextElementSibling; el; el = el.nextElementSibling) next.push(`${el.tagName.toLowerCase()} ${el.getAttribute("data-own")}`)
      after.push(next)
    })
    expect(after).toEqual([["a Keep", "a History"], ["a Keep", "a History"]])
  })

  test("cancel button closes the toast", async () => {
    const onCancel = vi.fn()
    const result = await walkToasts({}, async ({ toast, advance, snapshot, run }) => {
      toast("Archive?", { cancel: { label: "Cancel", onClick: onCancel } })
      await settle(advance)
      await run(() => fireEvent.click(document.querySelector("[data-cancel]")!))
      snapshot()
      await advance(300)
      snapshot()
    })
    expectParity(result)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  test("action that prevents default keeps the toast", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot, run }) => {
      toast("Keep me", { duration: Infinity, action: { label: "Stay", onClick: (event: { preventDefault: () => void }) => event.preventDefault() } })
      await settle(advance)
      await run(() => fireEvent.click(document.querySelector("[data-action]")!))
      await advance(300)
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('data-removed="false"')
  })

  test("promise: loading, then success with a function message", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      const save = new Promise<{ name: string }>((resolve) => setTimeout(() => resolve({ name: "Profile" }), 1500))
      toast.promise(save, { loading: "Saving…", success: (data: { name: string }) => `${data.name} saved`, error: "Save failed" })
      await settle(advance)
      snapshot()
      await advance(1500)
      await settle(advance)
      snapshot()
      await advance(3200)
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('data-type="loading"')
    expect(result.react[0]).toContain('class="sonner-loading-wrapper" data-visible="true"')
    expect(result.react[1]).toContain('"Profile saved"')
    expect(result.react[1]).toContain('data-type="success"')
  })

  test("promise: error", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      const save = new Promise((_resolve, reject) => setTimeout(() => reject(new Error("nope")), 500))
      toast.promise(save, { loading: "Saving…", success: "Saved", error: "Save failed" })
      await settle(advance)
      await advance(500)
      await settle(advance)
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('"Save failed"')
    expect(result.react[0]).toContain('data-type="error"')
  })

  test("loading toast has no timer until it is updated", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      const id = toast.loading("Uploading")
      await settle(advance)
      snapshot()
      await advance(5000)
      snapshot()
      toast.success("Uploaded", { id })
      await settle(advance)
      snapshot()
    })
    expectParity(result)
    expect(result.react[1]).toContain('data-removed="false"')
    expect(result.react[2]).toContain('"Uploaded"')
  })

  test("compact, persistent and dismissed by id", async () => {
    const result = await walkToasts({}, async ({ toast, compact, advance, snapshot }) => {
      toast.success("Inquiry ID copied", compact)
      const id = toast("Backup scheduled", { description: "This stays open until you dismiss it.", duration: Infinity })
      await settle(advance)
      snapshot()
      await advance(5000)
      snapshot()
      toast.dismiss(id)
      await advance(16)
      await advance(16)
      snapshot()
      await advance(300)
      await advance(300)
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('class="Compact Toast Success"')
    expect(result.react[1]).toContain('"Backup scheduled"')
    expect(result.react[2]).toContain('data-removed="true"')
    expect(result.react[3]).not.toContain('"Backup scheduled"')
  })

  test.each([
    ["default", undefined, {}],
    ["zero", 0, { top: "0px", right: "0px", bottom: "0px", left: "0px" }],
    ["number", 24, { top: "24px", right: "24px", bottom: "24px", left: "24px" }],
    ["CSS length", "2rem", { top: "2rem", right: "2rem", bottom: "2rem", left: "2rem" }],
    ["partial", { top: 0, bottom: "24px", left: undefined }, { top: "0px", bottom: "24px" }],
  ] as const)("safe mobile offsets retain explicit %s overrides and desktop offsets", async (_name, mobileOffset, overrides) => {
    const result = await walkToasts({ offset: 40, mobileOffset }, async ({ toast, advance, snapshot }) => {
      toast("Safe viewport", { duration: Infinity })
      await settle(advance)
      const list = document.querySelector<HTMLElement>("[data-sonner-toaster]")!
      const expectedOverrides: Partial<Record<"top" | "right" | "bottom" | "left", string>> = overrides
      for (const edge of ["top", "right", "bottom", "left"] as const) {
        const safe = `calc(${edge === "left" || edge === "right" ? 14 : 16}px + var(--safe-area-inset-${edge}, env(safe-area-inset-${edge}, 0px)))`
        const expected = expectedOverrides[edge] ?? (edge === "top" || edge === "bottom" ? `var(--toast-mobile-offset-${edge}, ${safe})` : safe)
        expect(list.style.getPropertyValue(`--mobile-offset-${edge}`)).toBe(expected)
        expect(list.style.getPropertyValue(`--offset-${edge}`)).toBe("40px")
      }
      snapshot()
    })
    expectParity(result)
  })

  test.each(["ltr", "rtl"])("long content keeps native action/cancel/close targets and accessible labels (%s)", async (dir) => {
    const title = "The document has been archived with all its attachments and revision history"
    const description = "A very long identifier: " + "a".repeat(150)
    const actionLabel = "Restore the document and all previous attachments"
    const cancelLabel = "Keep the document in the archive for now"
    const onAction = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    const onCancel = vi.fn()
    const result = await walkToasts({ dir }, async ({ toast, advance, snapshot, run }) => {
      toast(title, { description, closeButton: true, duration: Infinity,
        action: { label: actionLabel, onClick: onAction },
        cancel: { label: cancelLabel, onClick: onCancel },
      })
      await settle(advance)
      const root = document.querySelector<HTMLElement>("[data-sonner-toast]")!
      expect(root.querySelector("[data-title]")?.textContent).toBe(title)
      expect(root.querySelector("[data-description]")?.textContent).toBe(description)
      const action = root.querySelector<HTMLButtonElement>("button[data-action]")!
      const cancel = root.querySelector<HTMLButtonElement>("button[data-cancel]")!
      const close = root.querySelector<HTMLButtonElement>("button[data-close-button]")!
      expect(action.textContent).toBe(actionLabel)
      expect(cancel.textContent).toBe(cancelLabel)
      expect(close.getAttribute("aria-label")).toBe("Close toast")
      expect([action, cancel, close].map((button) => button.tabIndex)).toEqual([0, 0, 0])
      expect(action.classList.contains("ActionButton")).toBe(true)
      expect(cancel.classList.contains("CancelButton")).toBe(true)
      await run(() => action.focus())
      expect(document.activeElement).toBe(action)
      await run(() => fireEvent.click(action))
      expect(root.getAttribute("data-removed")).toBe("false")
      snapshot()
      await run(() => fireEvent.click(cancel))
      expect(root.getAttribute("data-removed")).toBe("true")
    })
    expectParity(result)
    expect(onAction).toHaveBeenCalledTimes(2)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  test("close button (per-toast option)", async () => {
    const onDismiss = vi.fn()
    const result = await walkToasts({}, async ({ toast, advance, snapshot, run }) => {
      toast("Closable", { closeButton: true, onDismiss })
      await settle(advance)
      snapshot()
      await run(() => fireEvent.click(document.querySelector("[data-close-button]")!))
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('aria-label="Close toast"')
    expect(result.react[0]).toContain('stroke-width="1.5"')
    expect(result.react[1]).toContain('data-removed="true"')
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  test("stack: four toasts, three visible, front, index and offsets", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      toast("One")
      await settle(advance)
      toast.success("Two")
      await settle(advance)
      toast.error("Three")
      await settle(advance)
      toast.info("Four")
      await settle(advance)
      snapshot()
      await advance(3200)
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('data-visible="false"')
    expect(result.react[0]).toContain("--offset: 42px")
  })

  test("hovering the list expands the stack", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot, run }) => {
      toast("One")
      toast("Two")
      await settle(advance)
      await run(() => fireEvent.mouseEnter(document.querySelector("ol")!))
      snapshot()
      await run(() => fireEvent.mouseLeave(document.querySelector("ol")!))
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('data-expanded="true"')
    expect(result.react[1]).not.toContain('data-expanded="true"')
  })

  test("theme follows <html data-theme>", async () => {
    document.documentElement.setAttribute("data-theme", "dark")
    const result = await walkToasts({}, async ({ toast, advance, snapshot, run }) => {
      toast("Dark")
      await settle(advance)
      snapshot()
      await run(() => document.documentElement.setAttribute("data-theme", "light"))
      await advance(0)
      snapshot()
      await run(() => document.documentElement.setAttribute("data-theme", "dark"))
      await advance(0)
      snapshot()
    })
    expectParity(result)
    expect(result.react[0]).toContain('data-sonner-theme="dark"')
    expect(result.react[1]).toContain('data-sonner-theme="light"')
    expect(result.react[2]).toContain('data-sonner-theme="dark"')
  })

  test.each<[string, Props]>([
    ["position, offset and gap", { position: "bottom-right", offset: 16, gap: 8 }],
    ["offset object and duration", { offset: { top: 40 }, duration: 1000 }],
    ["expand and visibleToasts", { expand: true, visibleToasts: 1 }],
    ["class replaces the Plex class, as React's className does", { class: "mine" }],
  ])("Toaster props: %s", async (_name, props) => {
    const reactProps = Object.fromEntries(Object.entries(props).map(([key, value]) => [key === "class" ? "className" : key, value]))
    const reactRun = await walkPairWithState(
      {},
      () => createElement(RToast.Toaster as ComponentType<Props>, reactProps),
      () => h(VToast.Toaster as Component, props),
      async ({ advance, snapshot }) => {
        const toast = (isVue() ? VToast.toast : RToast.toast) as unknown as ToastApi
        toast("One")
        toast.success("Two")
        await settle(advance)
        snapshot()
        await advance(1200)
        snapshot()
        toast.dismiss()
        await advance(1000)
      },
    )
    expectParity(reactRun)
  })
})

describe("Toast wrapper fixes", () => {
  test("a caller's icons.loading replaces the spinner", async () => {
    const VueSpinner = defineComponent({ render: () => h("span", { class: "spinner" }) })
    const result = await walkPairWithState(
      {},
      () => createElement(RToast.Toaster as ComponentType<Props>, { icons: { loading: <span className="spinner" /> } }),
      () => h(VToast.Toaster as Component, { icons: { loading: VueSpinner } }),
      async ({ advance, snapshot }) => {
        const toast = (isVue() ? VToast.toast : RToast.toast) as unknown as ToastApi
        toast.loading("Uploading")
        await settle(advance)
        snapshot()
        toast.dismiss()
        await advance(1000)
      },
    )
    expectParity(result)
    expect(result.react[0]).toContain('<div class="sonner-loader" data-visible="true">')
    expect(result.react[0]).toContain('<span class="spinner">')
    expect(result.react[0]).not.toContain("sonner-spinner")
  })

  // vue-sonner reads only the Toaster's `descriptionClass`. The wrapper adds a
  // toast's own to its `classes.description`, which vue-sonner applies after
  // the Toaster's description class (sonner: before), so only the order of
  // the two classes differs.
  test("a per-toast descriptionClass (React descriptionClassName) reaches the description", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      toast("Title", { description: "Details", ...(isVue() ? { descriptionClass: "custom" } : { descriptionClassName: "custom" }) })
      await settle(advance)
      snapshot()
    })
    expect(result.react[0]).toContain('class="custom Description" data-description=""')
    expect(result.vue[0]).toContain('class="Description custom" data-description=""')
    const sameOrder = (dom: string) => dom.replace('class="Description custom"', 'class="custom Description"')
    expect(result.vue.map(sameOrder).map(normalizePortAttributes)).toEqual(result.react.map(normalizePortAttributes))
  })
})

describe("Toast store and renderer contracts", () => {
  test("updating a loading toast restarts the new finite duration", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      const id = toast.loading("Uploading", { duration: Infinity })
      await settle(advance)
      toast.success("Uploaded", { id, duration: 50 })
      await settle(advance)
      await advance(60)
      snapshot()
      await advance(500)
      snapshot()
    })
    // sonner restarts the timer with the new duration; vue-sonner keeps the old one (Infinity)
    expect(result.react[0]).toContain('data-removed="true"')
    // The polite announcer still holds the words it read; the toast itself is gone
    expect(result.react[1]).not.toContain("<li")
    expect(result.vue[0]).toContain('data-removed="true"')
    expect(result.vue[1]).not.toContain("<li")
  })

  test("component action and cancel labels render their content", async () => {
    const VueLabel = defineComponent({ render: () => h("b", "Undo") })
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      const label = isVue() ? VueLabel : <b>Undo</b>
      toast("Archived", { action: { label, onClick: () => {} }, cancel: { label, onClick: () => {} } } as never)
      await settle(advance)
      snapshot()
    })
    expect(result.react[0].match(/<b>/g)).toHaveLength(2)
    expect(result.vue[0].match(/<b>/g)).toHaveLength(2)
  })

  test("renderer accessibility and native controls are consistent", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      snapshot()
      toast("Plain", { action: { label: "Undo", onClick: () => {} }, cancel: { label: "No", onClick: () => {} }, closeButton: true })
      await settle(advance)
      snapshot()
    })
    const [reactEmpty, reactToast] = result.react as [string, string]
    const [vueEmpty, vueToast] = result.vue as [string, string]
    expect(reactEmpty).not.toContain("<ol")
    expect(vueEmpty).not.toContain("<ol")
    // Plain toast type
    expect(reactToast).not.toContain("data-type=")
    expect(vueToast).not.toContain("data-type=")
    // z-index counts
    expect(reactToast).toContain("--z-index: 1")
    expect(vueToast).toContain("--z-index: 1")
    // Button data attributes
    expect(reactToast).toContain('data-action="true" data-button="true"')
    expect(vueToast).toContain('data-action="true" data-button="true"')
    expect(reactToast).toContain('data-button="true" data-cancel="true"')
    expect(vueToast).toContain('data-button="true" data-cancel="true"')
    // Close button
    expect(reactToast).not.toContain("data-close-button-position")
    expect(vueToast).toContain('data-close-button-position="top-left"')
    // Fixed by the wrapper: no data-invert / data-rich-colors / data-theme, data-sonner-toaster="true",
    // and sonner's close icon (vue-sonner's misspells `stroke-width`)
    for (const dom of [reactToast, vueToast]) {
      expect(dom).toContain('stroke-width="1.5"')
      expect(dom).not.toContain("stoke-width")
      expect(dom).not.toContain("data-invert")
      expect(dom).not.toContain("data-rich-colors")
      expect(dom).not.toContain("data-theme")
      expect(dom).toContain('data-sonner-toaster="true"')
    }
  })

  test("toasts added in one tick keep newest-first stack offsets", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      toast("One")
      toast.success("Two")
      toast.error("Three")
      await settle(advance)
      snapshot()
    })
    const offsets = (dom: string) => [...dom.matchAll(/--offset: (\d+)px/g)].map((match) => Number(match[1]))
    expect(offsets(result.react[0]!)).toEqual([0, 14, 28])
    expect(offsets(result.vue[0]!)).toEqual([0, 14, 28])
    expect(offsets(result.vue[0]!).sort((a, b) => a - b)).toEqual([0, 14, 28])
    const withoutOffsets = (dom: string) => normalizePortAttributes(dom).replace(/--offset: \d+px/g, "")
    expect(withoutOffsets(result.vue[0]!)).toBe(withoutOffsets(result.react[0]!))
  })

  test("settled promise keeps its fading loader in both renderers", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      toast.promise(Promise.resolve("ok"), { loading: "Saving", success: "Saved" })
      await settle(advance)
      await settle(advance)
      snapshot()
    })
    expect(result.react[0]).toContain('class="sonner-loading-wrapper" data-visible="false"')
    expect(result.vue[0]).toContain('class="sonner-loading-wrapper" data-visible="false"')
    expect(normalizePortAttributes(result.vue[0]!)).toBe(normalizePortAttributes(result.react[0]!))
  })
})


const pointer = (target: Element, type: string, options: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) => {
  const event = new MouseEvent(type, { bubbles: true, ...options })
  Object.defineProperties(event, { pointerId: { value: options.pointerId ?? 1 }, pointerType: { value: options.pointerType ?? "touch" } })
  fireEvent(target, event)
}

describe("Toast owned interaction lifecycle", () => {
  test("touch hover does not pause auto-dismiss", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      document.documentElement.dataset.input = "touch"
      const onAutoClose = vi.fn()
      try {
        toast("Touch feedback", { duration: 1000, onAutoClose })
        await settle(advance)
        await run(() => fireEvent.mouseEnter(document.querySelector("ol")!))
        await advance(1500)
        expect(onAutoClose).toHaveBeenCalledOnce()
        expect(document.querySelector("[data-sonner-toast]")).toBeNull()
      } finally { delete document.documentElement.dataset.input }
    })
  })

  test("pointercancel releases swipe and resumes the remaining timer", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const onAutoClose = vi.fn()
      toast("Cancelled gesture", { duration: 1000, onAutoClose })
      await settle(advance)
      const root = document.querySelector<HTMLElement>("[data-sonner-toast]")!
      root.setPointerCapture = () => {}
      await run(() => pointer(root, "pointerdown", { pointerType: "touch", pointerId: 1, button: 0 }))
      await advance(1500)
      expect(onAutoClose).not.toHaveBeenCalled()
      await run(() => pointer(root, "pointercancel", { pointerType: "touch", pointerId: 1 }))
      expect(root.dataset.swiping).toBe("false")
      await advance(1500)
      expect(onAutoClose).toHaveBeenCalledOnce()
      expect(document.querySelector("[data-sonner-toast]")).toBeNull()
    })
  })

  test("moving focus out does not bounce through the previous control", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const previous = document.createElement("button")
      const destination = document.createElement("button")
      document.body.append(previous, destination)
      try {
        await run(() => previous.focus())
        const focus = vi.spyOn(previous, "focus")
        toast("Keyboard feedback", { duration: Infinity, action: { label: "Undo", onClick: () => {} } })
        await settle(advance)
        await run(() => document.querySelector<HTMLButtonElement>("[data-action]")!.focus())
        await run(() => destination.focus())
        expect(document.activeElement).toBe(destination)
        expect(focus).not.toHaveBeenCalled()
      } finally { previous.remove(); destination.remove() }
    })
  })

  test("focusing an older action reveals its collapsed stack", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      toast("Older", { duration: Infinity, action: { label: "Older action", onClick: () => {} } })
      await settle(advance)
      toast("Newer", { duration: Infinity })
      await settle(advance)
      const root = document.querySelector<HTMLElement>('[data-sonner-toast][data-index="1"]')!
      const action = root.querySelector<HTMLButtonElement>("[data-action]")!
      await run(() => action.focus())
      expect(document.activeElement).toBe(action)
      expect(root.dataset.expanded).toBe("true")
    })
  })

  test("non-dismissible close and cancel are disabled but its action remains available", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const onCancel = vi.fn()
      const onDismiss = vi.fn()
      const onAction = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
      toast("Persistent", { duration: Infinity, dismissible: false, closeButton: true,
        cancel: { label: "Cancel", onClick: onCancel }, action: { label: "Retry", onClick: onAction }, onDismiss })
      await settle(advance)
      const cancel = document.querySelector<HTMLButtonElement>("[data-cancel]")!
      const close = document.querySelector<HTMLButtonElement>("[data-close-button]")!
      const action = document.querySelector<HTMLButtonElement>("[data-action]")!
      expect(cancel.disabled).toBe(true)
      expect(close.disabled).toBe(true)
      expect(action.disabled).toBe(false)
      await run(() => { fireEvent.click(cancel); fireEvent.click(close); fireEvent.click(action) })
      expect(onCancel).not.toHaveBeenCalled()
      expect(onDismiss).not.toHaveBeenCalled()
      expect(onAction).toHaveBeenCalledOnce()
    })
  })
})

describe("Toast public contracts", () => {
  test("toasterId routes only its own toasts and supports all six positions in RTL", async () => {
    const result = await walkToasts({ id: "editor", dir: "rtl" }, async ({ toast, advance, snapshot }) => {
      toast("Global", { duration: Infinity })
      toast("Other host", { toasterId: "other", duration: Infinity })
      for (const position of ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"] as const) {
        toast(position, { toasterId: "editor", position, duration: Infinity })
      }
      await settle(advance)
      expect(document.querySelectorAll("[data-sonner-toaster]")).toHaveLength(6)
      expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(6)
      for (const list of document.querySelectorAll("[data-sonner-toaster]")) expect(list.getAttribute("dir")).toBe("rtl")
      expect(document.body.textContent).not.toContain("Global")
      expect(document.body.textContent).not.toContain("Other host")
      snapshot()
    })
    expectParity(result)
  })

  test("custom content retains the vendor-specific API and can dismiss its own id", async () => {
    await walkToasts({}, async ({ advance, run }) => {
      if (isVue()) {
        const Custom = defineComponent({
          props: { message: String, onCloseToast: Function, isPaused: Boolean },
          setup: (props) => () => h("button", { "data-custom": "", onClick: () => props.onCloseToast?.() }, props.message),
        })
        VToast.toast.custom(Custom, { componentProps: { message: "Custom feedback" }, duration: Infinity })
      } else {
        RToast.toast.custom((id) => <button data-custom="" onClick={() => RToast.toast.dismiss(id)}>Custom feedback</button>, { duration: Infinity })
      }
      await settle(advance)
      expect(document.querySelector("[data-sonner-toast]")?.getAttribute("data-styled")).toBe("false")
      const button = document.querySelector<HTMLButtonElement>("[data-custom]")!
      expect(button.textContent).toBe("Custom feedback")
      await run(() => fireEvent.click(button))
      await advance(32)
      await advance(250)
      expect(document.querySelector("[data-sonner-toast]")).toBeNull()
    })
  })

  test("custom hotkey enters the stack; Escape restores its opener without scrolling", async () => {
    await walkToasts({ hotkey: ["ctrlKey", "KeyN"] }, async ({ toast, advance, run }) => {
      const opener = document.createElement("button")
      document.body.append(opener)
      try {
        await run(() => opener.focus())
        const focus = vi.spyOn(opener, "focus")
        toast("Keyboard", { duration: Infinity })
        await settle(advance)
        await run(() => fireEvent.keyDown(document, { ctrlKey: true, code: "KeyN", key: "n" }))
        expect(document.activeElement).toBe(document.querySelector("[data-sonner-toaster]"))
        expect(document.querySelector("[data-sonner-toast]")?.getAttribute("data-expanded")).toBe("true")
        await run(() => fireEvent.keyDown(document, { key: "Escape", code: "Escape" }))
        expect(document.activeElement).toBe(opener)
        expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
      } finally { opener.remove() }
    })
  })

  test("close restores owned focus but respects an onDismiss destination", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const opener = document.createElement("button")
      const destination = document.createElement("button")
      document.body.append(opener, destination)
      try {
        await run(() => opener.focus())
        toast("Normal close", { duration: Infinity, closeButton: true })
        await settle(advance)
        const close = document.querySelector<HTMLButtonElement>("[data-close-button]")!
        await run(() => close.focus())
        await run(() => fireEvent.click(close))
        expect(document.activeElement).toBe(opener)
        await advance(300)
        const focus = vi.spyOn(opener, "focus")
        toast("Consumer focus", { duration: Infinity, closeButton: true, onDismiss: () => destination.focus() })
        await settle(advance)
        const nextClose = document.querySelector<HTMLButtonElement>("[data-close-button]")!
        await run(() => nextClose.focus())
        await run(() => fireEvent.click(nextClose))
        expect(document.activeElement).toBe(destination)
        expect(focus).not.toHaveBeenCalled()
      } finally { opener.remove(); destination.remove() }
    })
  })

  test("focus pauses and leaving resumes the remaining duration", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const destination = document.createElement("button")
      document.body.append(destination)
      try {
        const onAutoClose = vi.fn()
        toast("Timer", { duration: 1000, onAutoClose, action: { label: "Undo", onClick: () => {} } })
        await settle(advance)
        await advance(300)
        await run(() => document.querySelector<HTMLButtonElement>("[data-action]")!.focus())
        await advance(5000)
        expect(onAutoClose).not.toHaveBeenCalled()
        await run(() => destination.focus())
        await advance(600)
        expect(onAutoClose).not.toHaveBeenCalled()
        await advance(120)
        expect(onAutoClose).toHaveBeenCalledOnce()
      } finally { destination.remove() }
    })
  })

  test("lost pointer capture resumes the timer; an allowed swipe dismisses once", async () => {
    await walkToasts({ swipeDirections: ["left"] }, async ({ toast, advance, run }) => {
      const onAutoClose = vi.fn()
      toast("Lost capture", { duration: 1000, onAutoClose })
      await settle(advance)
      let root = document.querySelector<HTMLElement>("[data-sonner-toast]")!
      root.setPointerCapture = () => {}
      await run(() => pointer(root, "pointerdown", { clientX: 100, clientY: 50 }))
      await advance(1500)
      expect(onAutoClose).not.toHaveBeenCalled()
      await run(() => pointer(root, "lostpointercapture"))
      await advance(1500)
      expect(onAutoClose).toHaveBeenCalledOnce()
      const onDismiss = vi.fn()
      toast("Swipe", { duration: Infinity, onDismiss })
      await settle(advance)
      root = document.querySelector<HTMLElement>("[data-sonner-toast]")!
      root.setPointerCapture = () => {}
      await run(() => pointer(root, "pointerdown", { clientX: 100, clientY: 50 }))
      await advance(100)
      await run(() => pointer(root, "pointermove", { clientX: 20, clientY: 50 }))
      await run(() => pointer(root, "pointerup", { clientX: 20, clientY: 50 }))
      expect(root.dataset.swipeDirection).toBe("left")
      expect(root.dataset.removed).toBe("true")
      expect(onDismiss).toHaveBeenCalledOnce()
      await run(() => pointer(root, "lostpointercapture"))
      expect(onDismiss).toHaveBeenCalledOnce()
    })
  })

  test("updating a dragging toast to loading cancels its gesture, then finite success resumes", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const id = toast("Starting", { duration: 1000 })
      await settle(advance)
      const root = document.querySelector<HTMLElement>("[data-sonner-toast]")!
      root.setPointerCapture = () => {}
      await run(() => pointer(root, "pointerdown", { clientX: 100 }))
      toast.loading("Working", { id })
      await settle(advance)
      expect(root.dataset.swiping).toBe("false")
      await advance(5000)
      expect(root.dataset.removed).toBe("false")
      toast.success("Done", { id, duration: 100 })
      await settle(advance)
      await advance(400)
      expect(document.querySelector("[data-sonner-toast]")).toBeNull()
    })
  })

  test("a reused id survives the preceding toast's exit timer", async () => {
    await walkToasts({}, async ({ toast, advance }) => {
      toast("Old", { id: "reuse", duration: Infinity })
      await settle(advance)
      toast.dismiss("reuse")
      await advance(32)
      await advance(0)
      toast.success("Replacement", { id: "reuse", duration: Infinity })
      await settle(advance)
      await advance(500)
      expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(1)
      expect(document.querySelector("[data-title]")?.textContent).toBe("Replacement")
      expect(document.querySelector("[data-sonner-toast]")?.getAttribute("data-removed")).toBe("false")
    })
  })
})

describe("Toast lifecycle review regressions", () => {
  test("a second pointer cannot replace the first toast's active gesture", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const onAutoClose = vi.fn()
      toast("First", { duration: 1000, onAutoClose })
      toast("Second", { duration: 1000, onAutoClose })
      await settle(advance)
      const [first, second] = Array.from(document.querySelectorAll<HTMLElement>("[data-sonner-toast]"))
      first!.setPointerCapture = () => {}
      second!.setPointerCapture = () => {}
      await run(() => pointer(first!, "pointerdown", { pointerId: 1, clientY: 100 }))
      await run(() => pointer(first!, "pointermove", { pointerId: 1, clientY: 60 }))
      expect(first!.style.getPropertyValue("--swipe-amount-y")).toBe("-40px")
      await run(() => pointer(second!, "pointerdown", { pointerId: 2, clientY: 100 }))
      expect(second!.dataset.swiping).toBe("false")
      await run(() => pointer(first!, "pointercancel", { pointerId: 1 }))
      expect(first!.dataset.swiping).toBe("false")
      expect(first!.style.getPropertyValue("--swipe-amount-y")).toBe("0px")
      await advance(1500)
      expect(onAutoClose).toHaveBeenCalledTimes(2)
    })
  })

  test("programmatic dismissal notifies once; auto/action store cleanup does not notify dismissal", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const onDismiss = vi.fn()
      const id = toast("Programmatic", { duration: Infinity, onDismiss })
      await settle(advance)
      toast.dismiss(id)
      await advance(32)
      await advance(300)
      expect(onDismiss).toHaveBeenCalledOnce()
      const onAutoClose = vi.fn()
      toast("Automatic", { duration: 100, onDismiss, onAutoClose })
      await settle(advance)
      await advance(400)
      expect(onAutoClose).toHaveBeenCalledOnce()
      expect(onDismiss).toHaveBeenCalledOnce()
      toast("Action", { duration: Infinity, onDismiss, action: { label: "Done", onClick: () => {} } })
      await settle(advance)
      await run(() => fireEvent.click(document.querySelector("[data-action]")!))
      await advance(300)
      expect(onDismiss).toHaveBeenCalledOnce()
    })
  })

  test("same-id active updates restart the lifetime even when type and duration stay unchanged", async () => {
    await walkToasts({}, async ({ toast, advance }) => {
      const onAutoClose = vi.fn()
      const id = toast("Original", { duration: 1000, onAutoClose })
      await settle(advance)
      await advance(900)
      toast("Updated", { id })
      await settle(advance)
      await advance(900)
      expect(onAutoClose).not.toHaveBeenCalled()
      await advance(120)
      expect(onAutoClose).toHaveBeenCalledOnce()
    })
  })

  test("same-id updates while paused keep the reduced remaining budget", async () => {
    await walkToasts({}, async ({ toast, advance, run }) => {
      const onAutoClose = vi.fn()
      const id = toast("Original", { duration: 1000, onAutoClose })
      await settle(advance)
      await advance(300)
      const list = document.querySelector("[data-sonner-toaster]")!
      await run(() => fireEvent.mouseEnter(list))
      await advance(5000)
      toast("Updated", { id })
      await settle(advance)
      await run(() => fireEvent.mouseLeave(list))
      await advance(600)
      expect(onAutoClose).not.toHaveBeenCalled()
      await advance(120)
      expect(onAutoClose).toHaveBeenCalledOnce()
    })
  })

  test("changing Toaster.id detaches its view without dismissing the store toast", async () => {
    const onDismiss = vi.fn()
    await walkPairWithState(
      { id: "first" },
      (state) => <RToast.Toaster id={state.id} />,
      (state) => h(VToast.Toaster, { id: state.id }),
      async ({ advance, set }) => {
        const toast = isVue() ? VToast.toast : RToast.toast
        toast("Scoped", { id: "route-id", toasterId: "first", duration: Infinity, onDismiss })
        await settle(advance)
        await set({ id: "other" })
        await advance(300)
        expect(onDismiss).not.toHaveBeenCalled()
        expect(toast.getToasts().some((item) => item.id === "route-id")).toBe(true)
        await set({ id: "first" })
        await settle(advance)
        expect(document.querySelector("[data-title]")?.textContent).toBe("Scoped")
        toast.dismiss()
        await advance(1000)
        onDismiss.mockClear()
      },
    )
  })
})

test("a touch action clears an earlier mouse-hover pause even when it prevents dismissal", async () => {
  await walkToasts({}, async ({ toast, advance, run }) => {
    const onAutoClose = vi.fn()
    toast("Hybrid input", { duration: 1000, onAutoClose, action: { label: "Keep open", onClick: (event) => event.preventDefault() } })
    await settle(advance)
    await run(() => fireEvent.mouseEnter(document.querySelector("[data-sonner-toaster]")!))
    await advance(1500)
    expect(onAutoClose).not.toHaveBeenCalled()
    const action = document.querySelector("[data-action]")!
    await run(() => { pointer(action, "pointerdown"); fireEvent.click(action) })
    await advance(1500)
    expect(onAutoClose).toHaveBeenCalledOnce()
  })
})

test("dir auto resolves the document's computed direction instead of guessing from toast text", async () => {
  const root = document.documentElement
  const previousDir = root.getAttribute("dir")
  const previousStyle = root.style.direction
  root.setAttribute("dir", "auto")
  root.style.direction = "rtl"
  try {
    await walkToasts({ dir: "auto" }, async ({ toast, advance }) => {
      toast("English feedback", { duration: Infinity })
      await settle(advance)
      expect(document.querySelector("[data-sonner-toaster]")?.getAttribute("dir")).toBe("rtl")
    })
  } finally {
    if (previousDir === null) root.removeAttribute("dir"); else root.setAttribute("dir", previousDir)
    root.style.direction = previousStyle
  }
})

// Plan 176 item 3: the region is not live itself. A polite announcer reads each toast once, and again only when
// its words change; an error that waits to be closed is an alert, read by its own role and not by the announcer.
describe("Toast speaks once, by its kind", () => {
  test("the announcer reads each toast once, the oldest first; a waiting error is an alert instead", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot, run }) => {
      const saved = toast("Saved", { description: "Your changes are live" })
      toast.error("Upload failed", { description: "The file is too big", duration: Infinity })
      toast.error("Try again later!")
      await settle(advance)
      snapshot()
      const section = document.querySelector("section")!
      const announcer = section.querySelector('[data-toast-announcer="polite"]')!
      const lines = () => [...announcer.children].map((line) => line.textContent)
      expect(section.getAttribute("aria-live")).toBe("off")
      expect(section.hasAttribute("aria-relevant")).toBe(false)
      expect(announcer.getAttribute("aria-live")).toBe("polite")
      expect(lines()).toEqual(["Saved. Your changes are live", "Try again later!"])
      const alerts = [...section.querySelectorAll('[data-content][role="alert"]')]
      expect(alerts.map((alert) => alert.textContent)).toEqual(["Upload failedThe file is too big"])
      expect(alerts[0]!.matches("[data-content]")).toBe(true)
      // A render that changes nothing it says (the stack expands) reads nothing again
      await run(() => fireEvent.mouseEnter(document.querySelector("[data-sonner-toaster]")!))
      expect(lines()).toHaveLength(2)
      // New words in the same toast are read
      await run(() => { toast.success("Saved twice", { id: saved }) })
      await settle(advance)
      expect(lines().at(-1)).toBe("Saved twice. Your changes are live")
      snapshot()
      await run(() => fireEvent.mouseLeave(document.querySelector("[data-sonner-toaster]")!))
      await advance(7000)
      expect(lines()).toEqual([])
    })
    expectParity(result)
  })

  test("a waiting error from the Toaster's own duration is an alert; a finite one is read politely", async () => {
    const result = await walkToasts({ duration: Infinity }, async ({ toast, advance, snapshot }) => {
      toast.error("Card declined")
      toast.error("Retrying", { duration: 4000 })
      await settle(advance)
      const section = document.querySelector("section")!
      expect([...section.querySelectorAll('[data-content][role="alert"]')].map((alert) => alert.textContent)).toEqual(["Card declined"])
      expect([...section.querySelector('[data-toast-announcer="polite"]')!.children].map((line) => line.textContent)).toEqual(["Retrying"])
      snapshot()
    })
    expectParity(result)
  })

  test("an update to a waiting error with the same words is read once, as the alert", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      toast("Connection lost", { id: "network" })
      toast.error("Connection lost", { id: "network", duration: Infinity })
      await settle(advance)
      const section = document.querySelector("section")!
      expect(section.querySelector('[data-toast-announcer="polite"]')!.children).toHaveLength(0)
      expect(section.querySelector('[data-toast-announcer="assertive"]')!.children).toHaveLength(0)
      expect([...section.querySelectorAll('[data-content][role="alert"]')].map((alert) => alert.textContent)).toEqual(["Connection lost"])
      snapshot()
    })
    expectParity(result)
  })

  test("a toast behind the stack that turns into a waiting error is read by the assertive announcer, not by a hidden role", async () => {
    const result = await walkToasts({ duration: 60000 }, async ({ toast, advance, snapshot }) => {
      const first = toast("Syncing")
      toast("One")
      toast("Two")
      toast("Three")
      await settle(advance)
      toast.error("Sync stopped", { id: first, duration: Infinity })
      await settle(advance)
      const section = document.querySelector("section")!
      const read = (kind: string) => [...section.querySelector(`[data-toast-announcer="${kind}"]`)!.children].map((line) => line.textContent)
      expect(read("assertive")).toEqual(["Sync stopped"])
      expect(read("polite")).toEqual(["Syncing", "One", "Two", "Three"])
      expect(section.querySelectorAll('[data-content][role="alert"]')).toHaveLength(0)
      const behind = [...section.querySelectorAll("[data-sonner-toast]")].find((item) => item.textContent?.includes("Sync stopped"))!
      expect(behind.getAttribute("aria-hidden")).toBe("true")
      snapshot()
    })
    expectParity(result)
  })
})

test("words still waiting to be read politely, once the toast turns into a waiting error behind the stack, are read once", async () => {
  const result = await walkToasts({}, async ({ toast, advance }) => {
    toast("Connection lost", { id: "network" })
    toast("One")
    toast("Two")
    toast("Three")
    toast.error("Connection lost", { id: "network", duration: Infinity })
    await settle(advance)
    await settle(advance)
    const section = document.querySelector("section")!
    const lines = [...section.querySelectorAll("[data-toast-announcer] > div")].map((line) => line.textContent)
    const alerts = [...section.querySelectorAll('[data-content][role="alert"]')].filter((alert) => !alert.closest('[aria-hidden="true"]'))
    // Read once: by an announcer, or by the alert's own role while it is shown
    expect(lines.filter((line) => line === "Connection lost").length + alerts.filter((alert) => alert.textContent === "Connection lost").length).toBe(1)
  })
  expect(result.react).toEqual(result.vue)
})
