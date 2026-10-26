import { fireEvent } from "@testing-library/react"
import { createElement, type ComponentType } from "react"
import { describe, expect, test, vi } from "vitest"
import { h, type Component } from "vue"
import { CircularProgress as RCircularProgress, LoadingDots as RLoadingDots, LoadingIndicator as RLoadingIndicator } from "../../packages/ui/src/components/Indicator"
import { Image as RImage } from "../../packages/ui/src/components/Image"
import { Label as RLabel } from "../../packages/ui/src/components/Label"
import { Separator as RSeparator } from "../../packages/ui/src/components/Separator"
import { ShimmerableText as RShimmerableText, ShimmerText as RShimmerText } from "../../packages/ui/src/components/ShimmerText"
import { Skeleton as RSkeleton } from "../../packages/ui/src/components/Skeleton"
import { CircularProgress, LoadingDots, LoadingIndicator } from "../../packages/vue/src/components/Indicator"
import { Image } from "../../packages/vue/src/components/Image"
import { Label } from "../../packages/vue/src/components/Label"
import { Separator } from "../../packages/vue/src/components/Separator"
import { ShimmerableText, ShimmerText } from "../../packages/vue/src/components/ShimmerText"
import { Skeleton } from "../../packages/vue/src/components/Skeleton"
import { interact, renderPair, walkPairWithState } from "./pair"

type Props = Record<string, unknown>

// React prop names map to Vue ones
const toVue = ({ className, htmlFor, ...props }: Props) => ({
  ...props,
  ...(className ? { class: className } : {}),
  ...(htmlFor ? { for: htmlFor } : {}),
})

const parity = async (React: ComponentType<Props>, Vue: Component, props: Props, text?: string) =>
  renderPair(createElement(React, props, text), () => h(Vue as never, toVue(props), text ? { default: () => text } : undefined))

type Case = [string, ComponentType<Props>, Component, Props, string?]

const cases: Case[] = [
  ["LoadingIndicator default", RLoadingIndicator as never, LoadingIndicator, {}],
  ["LoadingIndicator size + stroke", RLoadingIndicator as never, LoadingIndicator, { size: 24, strokeWidth: 3, className: "x" }],
  ["LoadingIndicator string size", RLoadingIndicator as never, LoadingIndicator, { size: "2em" }],
  ["LoadingIndicator style wins", RLoadingIndicator as never, LoadingIndicator, { size: 24, style: { color: "red" } }],
  ["CircularProgress progress", RCircularProgress as never, CircularProgress, { progress: 40 }],
  ["CircularProgress zero", RCircularProgress as never, CircularProgress, { progress: 0 }],
  ["CircularProgress done", RCircularProgress as never, CircularProgress, { done: true }],
  ["CircularProgress styling", RCircularProgress as never, CircularProgress, { progress: 75, size: 40, strokeWidth: 6, trackActiveColor: "red", trackColor: "blue", className: "c", id: "p" }],
  ["CircularProgress style wins", RCircularProgress as never, CircularProgress, { progress: 75, size: 40, style: { opacity: 0.5 } }],
  ["LoadingDots", RLoadingDots as never, LoadingDots, { className: "dots", id: "d" }],
  ["Skeleton", RSkeleton as never, Skeleton, { className: "h-4 w-10" }],
  ["Skeleton circle + attributes", RSkeleton as never, Skeleton, { circle: true, style: { width: "12px" }, id: "s", "aria-hidden": true }],
  ["Skeleton children", RSkeleton as never, Skeleton, {}, "Loading"],
  ["ShimmerText", RShimmerText as never, ShimmerText, { className: "t" }, "Thinking"],
  ["ShimmerText as span drops extra attributes", RShimmerText as never, ShimmerText, { as: "span", id: "x" }, "Thinking"],
  ["ShimmerableText idle", RShimmerableText as never, ShimmerableText, { id: "x" }, "Thinking"],
  ["ShimmerableText shimmering", RShimmerableText as never, ShimmerableText, { shimmer: true, as: "p" }, "Thinking"],
  ["Separator", RSeparator as never, Separator, {}],
  ["Separator vertical", RSeparator as never, Separator, { orientation: "vertical" }],
  ["Separator not decorative", RSeparator as never, Separator, { decorative: false }],
  ["Separator vertical not decorative", RSeparator as never, Separator, { orientation: "vertical", decorative: false, className: "my-2", id: "sep" }],
  ["Image without src renders nothing", RImage as never, Image, {}],
  ["Image", RImage as never, Image, { src: "/a.png", alt: "A", className: "rounded" }],
  ["Image draggable", RImage as never, Image, { src: "/b.png", draggable: true }],
  ["Label", RLabel as never, Label, { htmlFor: "email", className: "l" }, "Email"],
]

describe("Primitive parity (4.1)", () => {
  test.each(cases)("%s", async (_name, React, Vue, props, text) => {
    const { react, vue } = await parity(React, Vue, props, text)
    expect(vue).toBe(react)
  })
})

describe("Primitive behaviour parity (4.1)", () => {
  test("CircularProgress simulates progress over time", async () => {
    const { react, vue } = await walkPairWithState(
      { done: false },
      (state) => <RCircularProgress maxDuration={5000} done={state.done} />,
      (state) => h(CircularProgress, { maxDuration: 5000, done: state.done }),
      async ({ set, advance, snapshot }) => {
        snapshot()
        await advance(500)
        snapshot()
        await advance(3000)
        snapshot()
        await set({ done: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(new Set(react).size).toBe(4)
  })

  test("ShimmerableText pauses after an iteration and resumes", async () => {
    const { react, vue } = await walkPairWithState(
      { shimmer: true },
      (state) => <RShimmerableText shimmer={state.shimmer}>Thinking</RShimmerableText>,
      (state) => h(ShimmerableText, { shimmer: state.shimmer }, { default: () => "Thinking" }),
      async ({ set, snapshot }) => {
        snapshot()
        await set({ shimmer: false })
        snapshot()
        // jsdom has no AnimationEvent, so React listens for the webkit-prefixed name there;
        // browsers fire the standard one, which Vue listens for. Send both.
        await interact(() => {
          const el = document.querySelector("div div")!
          el.dispatchEvent(new Event("animationiteration", { bubbles: true }))
          el.dispatchEvent(new Event("webkitAnimationIteration", { bubbles: true }))
        })
        snapshot()
        await set({ shimmer: true })
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(react[2]).toContain("data-idle")
    expect(react[3]).not.toContain("data-idle")
  })

  test("Image already loaded at mount (as before hydration) is marked loaded without a load event", async () => {
    // React does not replay a load event fired before hydration; the element's own state tells
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true)
    const width = vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(0)
    // Complete with no width is a failed image: not loaded
    const failed = await parity(RImage as never, Image, { src: "/complete-broken.png" })
    expect(failed.vue).toBe(failed.react)
    expect(failed.react).not.toContain("data-loaded")
    width.mockReturnValue(64)
    const { react, vue } = await parity(RImage as never, Image, { src: "/complete.png", alt: "" })
    expect(vue).toBe(react)
    expect(react).toContain("data-loaded")
  })

  test("Image marks loaded, drops on error unless forced", async () => {
    const script = (src: string, force: boolean) =>
      walkPairWithState(
        { force },
        (state) => <RImage src={src} forceRenderAfterLoadFail={state.force} />,
        (state) => h(Image, { src, forceRenderAfterLoadFail: state.force }),
        async ({ snapshot }) => {
          snapshot()
          await interact(() => fireEvent.load(document.querySelector("img")!))
          snapshot()
          await interact(() => fireEvent.error(document.querySelector("img")!))
          snapshot()
        },
      )
    for (const [src, force] of [["/load.png", false], ["/forced.png", true]] as const) {
      const { react, vue } = await script(src, force)
      expect(vue).toEqual(react)
      expect(react[1]).toContain("data-loaded")
    }
  })
})
