import { act, fireEvent } from "@testing-library/react"
import { createElement, type ComponentType } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { h, type Component } from "vue"
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

// vue-sonner differences that the wrapper cannot reach, each asserted on the
// raw DOM in "known vue-sonner gaps" below. Everything else must match.
const KNOWN_GAPS: [string, RegExp, string][] = [
  // vue-sonner's toast() sets type "default"; sonner leaves it unset (both render no icon box)
  ["data-type default", / data-type="default"/g, ""],
  // vue-sonner counts only toasts with an explicit `position` for `--z-index` (0, -1, ...; sonner: n, n-1, ...)
  ["z-index", /; --z-index: -?\d+|--z-index: -?\d+; /g, ""],
  // Vue-sonner prints boolean data attributes on buttons as "" (sonner: "true")
  ["button data attributes", / data-(button|action|cancel)="true"/g, ' data-$1=""'],
  // vue-sonner positions the close button with an extra attribute
  ["close button position", / data-close-button-position="[a-z-]+"/g, ""],
]

// Vue keeps an empty <ol data-sonner-toaster> when there are no toasts; React renders none
const dropEmptyToasterList = (dom: string) => {
  const lines = dom.split("\n")
  const indent = (line: string) => line.length - line.trimStart().length
  return lines
    .filter((line, i) => !(line.trimStart().startsWith("<ol ") && line.includes("data-sonner-toaster") && !(lines[i + 1] && indent(lines[i + 1]!) > indent(line))))
    .join("\n")
}

// React keeps sonner's hidden loader next to the icon once a promise toast settles; vue-sonner swaps it out
const dropSettledLoader = (dom: string) => {
  const lines = dom.split("\n")
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.includes('class="sonner-loading-wrapper" data-visible="false"')) {
      const level = line.length - line.trimStart().length
      while (lines[i + 1] && lines[i + 1]!.length - lines[i + 1]!.trimStart().length > level) i++
      continue
    }
    out.push(line)
  }
  return out.join("\n")
}

const normalizeGaps = (dom: string) =>
  dropSettledLoader(dropEmptyToasterList(KNOWN_GAPS.reduce((text, [, pattern, replacement]) => text.replace(pattern, replacement), dom)))

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
  expect(vue.map(normalizeGaps)).toEqual(react.map(normalizeGaps))
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

describe("known vue-sonner gaps (each one shows up, and nothing else differs)", () => {
  test("raw attribute differences", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      snapshot()
      toast("Plain", { action: { label: "Undo", onClick: () => {} }, cancel: { label: "No", onClick: () => {} }, closeButton: true })
      await settle(advance)
      snapshot()
    })
    const [reactEmpty, reactToast] = result.react as [string, string]
    const [vueEmpty, vueToast] = result.vue as [string, string]
    // Empty Toaster: Vue keeps the <ol>
    expect(reactEmpty).not.toContain("<ol")
    expect(vueEmpty).toContain('<ol class="Toaster" data-sonner-theme="light" data-sonner-toaster="true"')
    // Plain toast type
    expect(reactToast).not.toContain("data-type=")
    expect(vueToast).toContain('data-type="default"')
    // z-index counts
    expect(reactToast).toContain("--z-index: 1")
    expect(vueToast).toContain("--z-index: 0")
    // Button data attributes
    expect(reactToast).toContain('data-action="true" data-button="true"')
    expect(vueToast).toContain('data-action="" data-button=""')
    expect(reactToast).toContain('data-button="true" data-cancel="true"')
    expect(vueToast).toContain('data-button="" data-cancel=""')
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

  test("toasts added in the same tick: vue-sonner orders the measured heights differently", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      toast("One")
      toast.success("Two")
      toast.error("Three")
      await settle(advance)
      snapshot()
    })
    const offsets = (dom: string) => [...dom.matchAll(/--offset: (\d+)px/g)].map((match) => Number(match[1]))
    // Newest first: sonner offsets the stack 0, 14, 28; vue-sonner shuffles them
    expect(offsets(result.react[0]!)).toEqual([0, 14, 28])
    expect(offsets(result.vue[0]!)).not.toEqual([0, 14, 28])
    expect(offsets(result.vue[0]!).sort((a, b) => a - b)).toEqual([0, 14, 28])
    const withoutOffsets = (dom: string) => normalizeGaps(dom).replace(/--offset: \d+px/g, "")
    expect(withoutOffsets(result.vue[0]!)).toBe(withoutOffsets(result.react[0]!))
  })

  test("settled promise toast: React keeps the hidden loader, vue-sonner does not", async () => {
    const result = await walkToasts({}, async ({ toast, advance, snapshot }) => {
      toast.promise(Promise.resolve("ok"), { loading: "Saving", success: "Saved" })
      await settle(advance)
      await settle(advance)
      snapshot()
    })
    expect(result.react[0]).toContain('class="sonner-loading-wrapper" data-visible="false"')
    expect(result.vue[0]).not.toContain("sonner-loading-wrapper")
    expect(normalizeGaps(result.vue[0]!)).toBe(normalizeGaps(result.react[0]!))
  })
})
