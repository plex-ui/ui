import { readFileSync } from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, test, vi } from "vitest"
import { attachAccordionMotion } from "../../packages/ui/src/lib/accordionMotion"

const classes = { root: "Root", item: "Item", content: "Content" }
const reversed: Animation[] = []

/** An accordion of three items, the first two with a panel, in a root with something after it. */
const build = () => {
  document.body.innerHTML = `
    <div class="Root" id="root">
      <div class="Item" id="a"><button>A</button><div class="Content" data-state="closed" id="panel-a"></div></div>
      <div class="Item" id="b"><button>B</button><div class="Content" data-state="closed" id="panel-b">
        <div class="Root" id="nested"><div class="Item" id="n1"><div class="Content" data-state="closed" id="panel-n1"></div></div>
        <div class="Item" id="n2"></div></div><p id="after-nested"></p>
      </div></div>
      <div class="Item" id="c"></div>
    </div>
    <p id="after-root"></p>`
  for (const panel of document.querySelectorAll<HTMLElement>(".Content")) {
    panel.style.setProperty("--accordion-motion-duration", "495ms")
    panel.style.setProperty("--accordion-motion-easing", "linear(0, 1)")
    panel.getBoundingClientRect = () => ({ height: 120 }) as DOMRect
  }
  const calls: { id: string; keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = []
  reversed.length = 0
  HTMLElement.prototype.animate = function (keyframes, options) {
    calls.push({ id: this.id, keyframes: keyframes as Keyframe[], options: options as KeyframeAnimationOptions })
    const animation = new EventTarget() as unknown as Animation
    animation.cancel = vi.fn()
    animation.reverse = vi.fn()
    reversed.push(animation)
    return animation
  }
  return calls
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  document.body.innerHTML = ""
  // @ts-expect-error jsdom has no Web Animations; each test stubs it
  delete HTMLElement.prototype.animate
})

describe("Accordion motion (lib/accordionMotion)", () => {
  test("React and Vue run the same helper", () => {
    const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), "utf8")
    expect(read("packages/vue/src/lib/accordionMotion.ts")).toBe(read("packages/ui/src/lib/accordionMotion.ts"))
  })

  test("opening slides what follows the item down from the panel's height, inside the accordion only", async () => {
    const calls = build()
    const detach = attachAccordionMotion(document.getElementById("root")!, classes)
    document.getElementById("panel-a")!.dataset.state = "open"
    await flush()
    expect(calls.map((call) => call.id)).toEqual(["b", "c"])
    expect(calls[0].keyframes).toEqual([{ transform: "translateY(-120px)" }, { transform: "none" }])
    expect(calls[0].options).toMatchObject({ duration: 495, easing: "linear(0, 1)", fill: "none", composite: "add" })
    detach()
  })

  test("closing slides them up and holds there until the panel's keyframes end", async () => {
    const calls = build()
    const detach = attachAccordionMotion(document.getElementById("root")!, classes)
    const panel = document.getElementById("panel-a")!
    panel.dataset.state = "open"
    await flush()
    calls.length = 0
    panel.dataset.state = "closed"
    await flush()
    expect(calls[0].keyframes.at(-1)).toEqual({ transform: "translateY(-120px)" })
    expect(calls[0].options.fill).toBe("forwards")
    detach()
  })

  test("opened again while it closes, the close turns back instead of a new move", async () => {
    const calls = build()
    const detach = attachAccordionMotion(document.getElementById("root")!, classes)
    const panel = document.getElementById("panel-a")!
    panel.dataset.state = "open"
    await flush()
    panel.dataset.state = "closed"
    await flush()
    calls.length = 0
    const closeMoves = reversed.slice(-2)
    panel.dataset.state = "open"
    await flush()
    expect(calls).toEqual([])
    for (const animation of closeMoves) expect(animation.reverse).toHaveBeenCalled()
    detach()
  })

  test("a nested item moves what follows it up to the outermost accordion, and its own root handles it once", async () => {
    const calls = build()
    const detachRoot = attachAccordionMotion(document.getElementById("root")!, classes)
    const detachNested = attachAccordionMotion(document.getElementById("nested")!, classes)
    document.getElementById("panel-n1")!.dataset.state = "open"
    await flush()
    expect(calls.map((call) => call.id)).toEqual(["n2", "after-nested", "c"])
    detachRoot()
    detachNested()
  })

  test("with reduced motion or a zero duration nothing moves", async () => {
    const calls = build()
    const detach = attachAccordionMotion(document.getElementById("root")!, classes)
    document.getElementById("panel-a")!.style.setProperty("--accordion-motion-duration", "0ms")
    document.getElementById("panel-a")!.dataset.state = "open"
    await flush()
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }))
    document.getElementById("panel-b")!.dataset.state = "open"
    await flush()
    vi.unstubAllGlobals()
    expect(calls).toEqual([])
    detach()
  })
})
