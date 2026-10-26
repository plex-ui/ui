import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useRef, useState, type ReactNode } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString as renderReactToString } from "react-dom/server"
import { afterEach, describe, expect, test, vi } from "vitest"
import { createSSRApp, defineComponent, h, ref, type VNode } from "vue"
import { renderToString as renderVueToString } from "vue/server-renderer"
import { useAnimatedScrollTo as useAnimatedScrollToReact } from "../../packages/ui/src/hooks/useAnimatedScrollTo"
import { useAutoGrowTextarea as useAutoGrowTextareaReact } from "../../packages/ui/src/hooks/useAutoGrowTextarea"
import { useBreakpoint as useBreakpointReact } from "../../packages/ui/src/hooks/useBreakpoints"
import { useCharactersPerSecond as useCharactersPerSecondReact } from "../../packages/ui/src/hooks/useCharactersPerSecond"
import { useDocumentVisible as useDocumentVisibleReact } from "../../packages/ui/src/hooks/useDocumentVisible"
import { useEscCloseStack as useEscCloseStackReact } from "../../packages/ui/src/hooks/useEscCloseStack"
import { usePrevious as usePreviousReact } from "../../packages/ui/src/hooks/usePrevious"
import { useScrollable as useScrollableReact } from "../../packages/ui/src/hooks/useScrollable"
import { useSimulatedProgress as useSimulatedProgressReact } from "../../packages/ui/src/hooks/useSimulatedProgress"
import { useTextSelection as useTextSelectionReact } from "../../packages/ui/src/hooks/useTextSelection"
import { useTrailingValue as useTrailingValueReact } from "../../packages/ui/src/hooks/useTrailingValue"
import { useDocumentTheme as useDocumentThemeReact } from "../../packages/ui/src/lib/theme"
import { useAnimatedScrollTo } from "../../packages/vue/src/composables/useAnimatedScrollTo"
import { useAutoGrowTextarea } from "../../packages/vue/src/composables/useAutoGrowTextarea"
import { useBreakpoint } from "../../packages/vue/src/composables/useBreakpoints"
import { useCharactersPerSecond } from "../../packages/vue/src/composables/useCharactersPerSecond"
import { useDocumentVisible } from "../../packages/vue/src/composables/useDocumentVisible"
import { useEscCloseStack } from "../../packages/vue/src/composables/useEscCloseStack"
import { useScrollable } from "../../packages/vue/src/composables/useScrollable"
import { useSimulatedProgress } from "../../packages/vue/src/composables/useSimulatedProgress"
import { useTextSelection } from "../../packages/vue/src/composables/useTextSelection"
import { useTrailingValue } from "../../packages/vue/src/composables/useTrailingValue"
import { useDocumentTheme } from "../../packages/vue/src/lib/theme"
import { flushVue, mountVue } from "./harness"
import { interact, walkPairWithState } from "./pair"

// Runs a script against a mounted React tree, then a Vue tree, and returns
// the text of #out after each step.
const textWalk = async (
  reactTree: () => ReactNode,
  vueTree: () => VNode,
  script: (step: () => void) => Promise<void>,
  read: () => string = () => document.getElementById("out")?.textContent ?? "",
) => {
  const react: string[] = []
  render(<>{reactTree()}</>)
  await interact(() => {})
  await script(() => react.push(read()))
  cleanup()
  const vue: string[] = []
  mountVue(vueTree)
  await flushVue()
  await script(() => vue.push(read()))
  return { react, vue }
}

const fakeTimers = () =>
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"] })

// Probes are declared once: a component type created inside a render
// function would remount on every update and lose its state.
const ReactTrailing = ({ value }: { value: string }) => <span id="out">{useTrailingValueReact(value, 100)}</span>
const VueTrailing = defineComponent({
  props: { value: { type: String, required: true } },
  setup(props) {
    const trailing = useTrailingValue(() => props.value, 100)
    return () => h("span", { id: "out" }, trailing.value)
  },
})

const ReactProgress = ({ startAt, completed }: { startAt: number; completed: boolean }) => (
  <span id="out">{useSimulatedProgressReact(startAt, 10_000, completed).toFixed(3)}</span>
)
const VueProgress = defineComponent({
  props: { startAt: { type: Number, required: true }, completed: Boolean },
  setup(props) {
    const value = useSimulatedProgress(() => props.startAt, 10_000, () => props.completed)
    return () => h("span", { id: "out" }, value.value.toFixed(3))
  },
})

const ReactCps = ({ text, streaming }: { text: string; streaming: boolean }) => {
  const cps = useCharactersPerSecondReact(text, streaming)
  return <span id="out">{cps().toFixed(2)}</span>
}
const VueCps = defineComponent({
  props: { text: { type: String, required: true }, streaming: Boolean },
  setup(props) {
    const cps = useCharactersPerSecond(() => props.text, () => props.streaming)
    return () => {
      void props.text // re-render on text, like the React probe
      return h("span", { id: "out" }, cps().toFixed(2))
    }
  },
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("Composables match the React hooks", () => {
  test("useTrailingValue", async () => {
    const { react, vue } = await walkPairWithState(
      { value: "a" },
      (state) => <ReactTrailing value={state.value} />,
      (state) => h(VueTrailing, { value: state.value }),
      async ({ set, advance, snapshot }) => {
        snapshot()
        await set({ value: "b" })
        snapshot()
        await advance(60)
        await set({ value: "c" })
        snapshot()
        await advance(50)
        snapshot()
        await advance(60)
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react.join(" ")).toContain('"b"')
    expect(react.at(-1)).toContain('"c"')
  })

  test("useSimulatedProgress", async () => {
    const { react, vue } = await walkPairWithState(
      { startAt: 0, completed: false },
      (state) => <ReactProgress startAt={state.startAt} completed={state.completed} />,
      (state) => h(VueProgress, { startAt: state.startAt, completed: state.completed }),
      async ({ set, advance, snapshot }) => {
        await set({ startAt: Date.now() })
        await advance(1000)
        snapshot()
        await advance(4000)
        snapshot()
        await advance(9000)
        snapshot()
        await set({ completed: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).not.toBe(react[1])
    expect(react.at(-1)).toContain("100.000")
  })

  test("useCharactersPerSecond", async () => {
    const chunks = [["Hello", 100], ["Hello world", 200], ["Hello world!!", 50], ["Hello world!! more text", 300], ["Hello world!! more text.", 5]] as const
    const { react, vue } = await walkPairWithState(
      { text: "", streaming: true },
      (state) => <ReactCps text={state.text} streaming={state.streaming} />,
      (state) => h(VueCps, { text: state.text, streaming: state.streaming }),
      async ({ set, advance, snapshot }) => {
        for (const [text, ms] of chunks) {
          await advance(ms)
          await set({ text })
          snapshot()
        }
        await set({ streaming: false, text: "Hello world!! more text. Done" })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(new Set(react).size).toBeGreaterThan(2)
  })

  test("useDocumentVisible", async () => {
    let state: DocumentVisibilityState = "visible"
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state })
    const { react, vue } = await textWalk(
      () => {
        const Show = () => <span id="out">{String(useDocumentVisibleReact())}</span>
        return <Show />
      },
      () => h(defineComponent({ setup: () => {
        const visible = useDocumentVisible()
        return () => h("span", { id: "out" }, String(visible.value))
      } })),
      async (step) => {
        state = "visible"
        await interact(() => document.dispatchEvent(new Event("visibilitychange")))
        step()
        state = "hidden"
        await interact(() => document.dispatchEvent(new Event("visibilitychange")))
        step()
      },
    )
    expect(vue).toEqual(react)
    expect(react).toEqual(["true", "false"])
  })

  test("useEscCloseStack closes the latest listener first", async () => {
    const log: string[] = []
    const ReactLayer = ({ name }: { name: string }) => {
      useEscCloseStackReact(true, () => log.push(`react:${name}`))
      return null
    }
    const VueLayer = defineComponent({
      props: { name: String },
      setup(props) {
        useEscCloseStack(true, () => log.push(`vue:${props.name}`))
        return () => null
      },
    })
    const press = () => interact(() => fireEvent.keyDown(document.body, { key: "Escape" }))
    render(<><ReactLayer name="outer" /><ReactLayer name="inner" /></>)
    await press()
    cleanup()
    await press()
    mountVue(() => h("div", [h(VueLayer, { name: "outer" }), h(VueLayer, { name: "inner" })]))
    await flushVue()
    await press()
    expect(log).toEqual(["react:inner", "vue:inner"])
  })

  test("useTextSelection", async () => {
    fakeTimers()
    const { react, vue } = await textWalk(
      () => {
        const Show = () => {
          const [text, setText] = useState("none")
          useTextSelectionReact(true, (selection) => setText(selection ? selection.toString() : "null"))
          return <><p id="source">Select this text</p><span id="out">{text}</span></>
        }
        return <Show />
      },
      () => h(defineComponent({ setup: () => {
        const text = ref("none")
        useTextSelection(true, (selection) => (text.value = selection ? selection.toString() : "null"))
        return () => h("div", [h("p", { id: "source" }, "Select this text"), h("span", { id: "out" }, text.value)])
      } })),
      async (step) => {
        const range = document.createRange()
        range.setStart(document.getElementById("source")!.firstChild!, 0)
        range.setEnd(document.getElementById("source")!.firstChild!, 6)
        window.getSelection()!.removeAllRanges()
        window.getSelection()!.addRange(range)
        await interact(() => {
          fireEvent.mouseUp(document)
          vi.advanceTimersByTime(1)
        })
        step()
        window.getSelection()!.removeAllRanges()
        await interact(() => {
          fireEvent.mouseUp(document)
          vi.advanceTimersByTime(1)
        })
        step()
      },
    )
    expect(vue).toEqual(react)
    expect(react).toEqual(["Select", "null"])
  })

  test("useBreakpoint", async () => {
    let width = 800
    const lists = new Set<{ query: string; listeners: Set<() => void> }>()
    vi.stubGlobal("matchMedia", (query: string) => {
      const min = Number(/min-width: (\d+)px/.exec(query)?.[1])
      const entry = { query, listeners: new Set<() => void>() }
      lists.add(entry)
      return {
        get matches() {
          return width >= min
        },
        media: query,
        addEventListener: (_: string, l: () => void) => entry.listeners.add(l),
        removeEventListener: (_: string, l: () => void) => entry.listeners.delete(l),
        addListener: (l: () => void) => entry.listeners.add(l),
        removeListener: (l: () => void) => entry.listeners.delete(l),
      }
    })
    const resize = (next: number) =>
      interact(() => {
        width = next
        for (const entry of lists) for (const listener of entry.listeners) listener()
      })
    const { react, vue } = await textWalk(
      () => {
        const Show = () => <span id="out">{`${useBreakpointReact("md")}/${useBreakpointReact("xl")}`}</span>
        return <Show />
      },
      () => h(defineComponent({ setup: () => {
        const md = useBreakpoint("md")
        const xl = useBreakpoint("xl")
        return () => h("span", { id: "out" }, `${md.value}/${xl.value}`)
      } })),
      async (step) => {
        await resize(800)
        step()
        await resize(1400)
        step()
        await resize(500)
        step()
      },
    )
    expect(vue).toEqual(react)
    expect(react).toEqual(["true/false", "true/true", "false/false"])
  })

  test("useScrollable, useAutoGrowTextarea and useAnimatedScrollTo", async () => {
    fakeTimers()
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} })
    // jsdom has no layout: give boxes fixed metrics
    const metrics = (el: HTMLElement | null, m: Record<string, number>) => {
      if (!el) return
      for (const [key, value] of Object.entries(m)) Object.defineProperty(el, key, { configurable: true, value })
    }
    const read = () => {
      const box = document.getElementById("box")!
      const area = document.getElementById("area") as HTMLTextAreaElement
      return `${document.getElementById("out")!.textContent}|top=${Math.round(box.scrollTop)}|h=${area.style.height}`
    }

    const ReactProbe = () => {
      const box = useRef<HTMLDivElement>(null)
      const area = useRef<HTMLTextAreaElement>(null)
      const [, force] = useState(0)
      const { isScrollable, isAtStart, isAtEnd } = useScrollableReact(box)
      useAutoGrowTextareaReact(area, "hello")
      const scrollTo = useAnimatedScrollToReact(box)
      return (
        <>
          <div id="box" ref={(el) => { metrics(el, { scrollHeight: 600, clientHeight: 200 }); box.current = el }} />
          <textarea id="area" ref={(el) => { metrics(el, { scrollHeight: 80, offsetHeight: 82, clientHeight: 80, offsetWidth: 300 }); area.current = el }} defaultValue="hello" />
          <button id="go" onClick={() => scrollTo(300)}>go</button>
          <button id="refresh" onClick={() => force((n) => n + 1)}>refresh</button>
          <span id="out">{`${isScrollable}/${isAtStart}/${isAtEnd}`}</span>
        </>
      )
    }
    const VueProbe = defineComponent({
      setup() {
        const box = ref<HTMLDivElement | null>(null)
        const area = ref<HTMLTextAreaElement | null>(null)
        const { isScrollable, isAtStart, isAtEnd } = useScrollable(box)
        useAutoGrowTextarea(area, "hello")
        const scrollTo = useAnimatedScrollTo(box)
        const setBox = (el: unknown) => { metrics(el as HTMLElement, { scrollHeight: 600, clientHeight: 200 }); box.value = el as HTMLDivElement }
        const setArea = (el: unknown) => { metrics(el as HTMLElement, { scrollHeight: 80, offsetHeight: 82, clientHeight: 80, offsetWidth: 300 }); area.value = el as HTMLTextAreaElement }
        return () => h("div", [
          h("div", { id: "box", ref: setBox }),
          h("textarea", { id: "area", ref: setArea, value: "hello" }),
          h("button", { id: "go", onClick: () => scrollTo(300) }, "go"),
          h("span", { id: "out" }, `${isScrollable.value}/${isAtStart.value}/${isAtEnd.value}`),
        ])
      },
    })

    const script = async (step: () => void) => {
      step()
      await interact(() => fireEvent.click(document.getElementById("go")!))
      for (let frame = 0; frame < 6; frame++) {
        await interact(() => vi.advanceTimersByTime(16))
        step()
      }
      await interact(() => {
        vi.advanceTimersByTime(2000)
        fireEvent.scroll(document.getElementById("box")!)
      })
      step()
    }

    const { react, vue } = await textWalk(() => <ReactProbe />, () => h(VueProbe), script, read)
    expect(vue).toEqual(react)
    expect(react.at(0)).toBe("true/true/false|top=0|h=82px")
    // scrollTop 300 + clientHeight 200 < scrollHeight 600: not at the end
    expect(react.at(-1)).toBe("true/false/false|top=300|h=82px")
    expect(new Set(react.map((r) => r.split("|")[1])).size).toBeGreaterThan(3)
  })
})

describe("useBreakpoint on the server", () => {
  // No window or document while rendering, as in SSR: the composable reads the
  // breakpoint from the document's CSS variables only in the browser
  // (fresh modules load slowly, hence the longer timeouts)
  test("renders false without touching the document, also inside Slider", { timeout: 30_000 }, async () => {
    // Fresh modules: the breakpoint module caches the resolved values
    vi.resetModules()
    const { renderToString } = await import("vue/server-renderer")
    const { createSSRApp, defineComponent, h } = await import("vue")
    const { useBreakpoint: useFreshBreakpoint } = await import("../../packages/vue/src/composables/useBreakpoints")
    const { Slider } = await import("../../packages/vue/src/components/Slider")
    const Probe = defineComponent({
      setup() {
        const md = useFreshBreakpoint("md")
        return () => h("span", String(md.value))
      },
    })
    vi.stubGlobal("window", undefined)
    vi.stubGlobal("document", undefined)
    try {
      expect(await renderToString(createSSRApp(Probe))).toBe("<span>false</span>")
      expect(await renderToString(createSSRApp(() => h(Slider, { value: 30, min: 0, max: 100, step: 1, label: "Volume" })))).toContain("Volume")
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

// ---------------------------------------------------------------------------
// Server rendering and hydration: the server has no window, document or
// navigator; the client hydrates the server's markup without a mismatch
// ---------------------------------------------------------------------------

/** Runs `render` as a server would: without window and document */
const asServer = async <T,>(render: () => T | Promise<T>) => {
  vi.stubGlobal("window", undefined)
  vi.stubGlobal("document", undefined)
  try {
    return await render()
  } finally {
    vi.unstubAllGlobals()
  }
}

/** Hydrates React's server markup; returns the text after effects and the recoverable (mismatch) errors */
const hydrateReact = async (element: ReactNode, html: string) => {
  const container = document.createElement("div")
  container.innerHTML = html
  document.body.appendChild(container)
  const errors: string[] = []
  let root: ReturnType<typeof hydrateRoot> | undefined
  await act(async () => {
    root = hydrateRoot(container, element, { onRecoverableError: (error) => errors.push(String(error)) })
  })
  return {
    container,
    errors,
    unmount: () =>
      act(() => {
        root!.unmount()
        container.remove()
      }),
  }
}

/** Hydrates Vue's server markup; returns the text after mount and Vue's mismatch report */
const hydrateVue = async (component: Parameters<typeof createSSRApp>[0], html: string) => {
  const container = document.createElement("div")
  container.innerHTML = html
  document.body.appendChild(container)
  const errors = vi.spyOn(console, "error").mockImplementation(() => {})
  const app = createSSRApp(component)
  app.mount(container)
  await flushVue()
  const mismatches = errors.mock.calls.map((args) => args.map(String).join(" "))
  errors.mockRestore()
  return {
    container,
    errors: mismatches,
    unmount: () => {
      app.unmount()
      container.remove()
    },
  }
}

const stubMatchMedia = (matches: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }))

const ReactBreakpoint = () => <span>{String(useBreakpointReact("md"))}</span>
const VueBreakpoint = defineComponent({
  setup() {
    const md = useBreakpoint("md")
    return () => h("span", String(md.value))
  },
})

const ReactTheme = () => <span>{useDocumentThemeReact()}</span>
const VueTheme = defineComponent({
  setup() {
    const theme = useDocumentTheme()
    return () => h("span", theme.value)
  },
})

describe("Server rendering and hydration", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme")
  })

  test("React useBreakpoint renders false on the server, also inside Slider", { timeout: 30_000 }, async () => {
    // Fresh modules: the breakpoint module caches the resolved values and the root styles
    vi.resetModules()
    const { useBreakpoint: useFreshBreakpoint } = await import("../../packages/ui/src/hooks/useBreakpoints")
    const { Slider } = await import("../../packages/ui/src/components/Slider")
    const Probe = () => <span>{String(useFreshBreakpoint("md"))}</span>
    await asServer(() => {
      expect(renderReactToString(<Probe />)).toBe("<span>false</span>")
      expect(renderReactToString(<Slider value={30} min={0} max={100} step={1} label="Volume" onChange={() => {}} />)).toContain(
        "Volume",
      )
    })
  })

  test("useBreakpoint hydrates the server's false, then reads the viewport", async () => {
    const reactHtml = await asServer(() => renderReactToString(<ReactBreakpoint />))
    const vueHtml = await asServer(() => renderVueToString(createSSRApp(VueBreakpoint)))
    expect(vueHtml).toBe(reactHtml)
    expect(reactHtml).toBe("<span>false</span>")

    stubMatchMedia(true)
    const react = await hydrateReact(<ReactBreakpoint />, reactHtml)
    const reactText = react.container.textContent
    await react.unmount()
    const vue = await hydrateVue(VueBreakpoint, vueHtml)
    const vueText = vue.container.textContent
    vue.unmount()
    expect(react.errors).toEqual([])
    expect(vue.errors).toEqual([])
    expect(vueText).toBe(reactText)
    expect(reactText).toBe("true")
  })

  test("useDocumentTheme renders light on the server, hydrates, then follows the document", async () => {
    const reactHtml = await asServer(() => renderReactToString(<ReactTheme />))
    const vueHtml = await asServer(() => renderVueToString(createSSRApp(VueTheme)))
    expect(vueHtml).toBe(reactHtml)
    expect(reactHtml).toBe("<span>light</span>")

    const texts = { react: [] as (string | null)[], vue: [] as (string | null)[] }
    document.documentElement.setAttribute("data-theme", "dark")
    const react = await hydrateReact(<ReactTheme />, reactHtml)
    texts.react.push(react.container.textContent)
    await interact(() => document.documentElement.setAttribute("data-theme", "light"))
    texts.react.push(react.container.textContent)
    await interact(() => document.documentElement.classList.add("dark"))
    texts.react.push(react.container.textContent)
    await react.unmount()

    document.documentElement.classList.remove("dark")
    document.documentElement.setAttribute("data-theme", "dark")
    const vue = await hydrateVue(VueTheme, vueHtml)
    texts.vue.push(vue.container.textContent)
    await interact(() => document.documentElement.setAttribute("data-theme", "light"))
    await flushVue()
    texts.vue.push(vue.container.textContent)
    await interact(() => document.documentElement.classList.add("dark"))
    await flushVue()
    texts.vue.push(vue.container.textContent)
    vue.unmount()
    document.documentElement.classList.remove("dark")

    expect(react.errors).toEqual([])
    expect(vue.errors).toEqual([])
    expect(texts.vue).toEqual(texts.react)
    // data-theme wins over the dark class
    expect(texts.react).toEqual(["dark", "light", "light"])
  })

  test("useTrailingValue starts no timer on the server", async () => {
    fakeTimers()
    expect(renderReactToString(<ReactTrailing value="a" />)).toBe('<span id="out">a</span>')
    expect(await renderVueToString(createSSRApp(() => h(VueTrailing, { value: "a" })))).toBe('<span id="out">a</span>')
    expect(vi.getTimerCount()).toBe(0)
  })

  test("the userAgent helpers load without a navigator", { timeout: 30_000 }, async () => {
    vi.resetModules()
    vi.stubGlobal("navigator", undefined)
    const react = await import("../../packages/ui/src/lib/userAgent")
    const vue = await import("../../packages/vue/src/lib/userAgent")
    for (const lib of [react, vue]) {
      expect([lib.isMobileDevice(), lib.isIosChromeBrowser(), lib.isSafariBrowser(), lib.isMacDevice(), lib.isFirefoxBrowser()]).toEqual([
        false,
        false,
        false,
        false,
        false,
      ])
    }
  })
})

describe("usePrevious (React; Vue's Slider inlines it)", () => {
  test("returns the value before the latest change, also across renders that keep the value", () => {
    const seen: number[] = []
    const Probe = ({ value }: { value: number; tick: number }) => {
      seen.push(usePreviousReact(value))
      return null
    }
    const { rerender } = render(<Probe value={1} tick={0} />)
    rerender(<Probe value={2} tick={0} />)
    rerender(<Probe value={2} tick={1} />)
    rerender(<Probe value={3} tick={1} />)
    rerender(<Probe value={4} tick={1} />)
    expect(seen).toEqual([1, 1, 1, 2, 3])
  })
})
