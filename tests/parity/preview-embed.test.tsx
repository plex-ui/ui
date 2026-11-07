import { readFileSync } from "node:fs"
import postcss from "postcss"
import { compileSync, evaluateSync } from "@mdx-js/mdx"
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react"
import { useState, type ReactNode } from "react"
import * as runtime from "react/jsx-runtime"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive } from "vue"
import { ComponentPreview } from "../../components/docs/ComponentPreview"
import { compactPreviewHeight, measureCompactPreviewHeight, PreviewEmbed, useDemoControlSync } from "../../components/docs/PreviewEmbed"
import { PreviewViewportControl, PreviewViewportProvider, usePreviewViewport } from "../../components/docs/PreviewViewport"
import { ToastDemosHost } from "../../components/docs/ToastDemos"
import { VueToastDemosHost } from "../../components/docs/vue/VueToastDemos"
import { remarkPreviewId } from "../../lib/remark-preview-id"
import { Dialog as ReactDialog } from "../../packages/ui/src/components/Dialog"
import { Popover as ReactPopover } from "../../packages/ui/src/components/Popover"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../packages/vue/src/components/Dialog"
import { flushVue, mountVue } from "./harness"

vi.mock("../../components/docs/VuePreview", () => ({ VuePreview: () => <section aria-label="Vue notifications" /> }))
vi.mock("next/navigation", () => ({ usePathname: () => "/components/form-examples" }))
vi.mock("@plexui/ui/hooks/useBreakpoints", () => ({ useBreakpoint: () => true }))
vi.mock("fumadocs-ui/components/dynamic-codeblock", () => ({ DynamicCodeBlock: () => null }))

const repeatedExamples = `
<ComponentPreview code="identical example"><Demo label="Verify email" /></ComponentPreview>

<div>
  <ComponentPreview code="identical example"><Demo label="Confirm phone" /></ComponentPreview>
</div>
`

const Demo = ({ label }: { label: string }) => <div>{label}</div>

const compiledIds = (source: string) =>
  Array.from(
    String(compileSync(source, { remarkPlugins: [remarkPreviewId] })).matchAll(/previewId: "(preview-\d+)"/g),
    (match) => match[1],
  )

describe("Phone preview identity", () => {
  test.each([
    ["preview-1", "Verify email", "Confirm phone"],
    ["preview-2", "Confirm phone", "Verify email"],
  ])("%s mounts only its example even with identical code and component names", (target, expected, other) => {
    const { default: Page } = evaluateSync(repeatedExamples, { ...runtime, remarkPlugins: [remarkPreviewId] })
    const view = render(
      <PreviewEmbed target={target}>
        <Page components={{ ComponentPreview, Demo }} />
      </PreviewEmbed>,
    )
    expect(view.getByText(expected)).toBeTruthy()
    expect(view.queryByText(other)).toBeNull()
    expect(view.container.querySelectorAll("[data-preview-embed]")).toHaveLength(1)
  })

  test("the transform is deterministic across compilations and resets for each page", () => {
    expect(compiledIds(repeatedExamples)).toEqual(["preview-1", "preview-2"])
    expect(compiledIds(repeatedExamples)).toEqual(["preview-1", "preview-2"])
    expect(compiledIds('<ComponentPreview code="identical example" />')).toEqual(["preview-1"])
  })

  test.each(["content/components/form-examples.mdx", "content/vue/components/form-examples.mdx"])(
    "%s assigns a unique identity to every preview",
    (path) => {
      const source = readFileSync(path, "utf8")
      const ids = compiledIds(source)
      expect(ids.length).toBeGreaterThan(10)
      expect(ids).toHaveLength(source.match(/<ComponentPreview(?:\s|>)/g)?.length ?? 0)
      expect(new Set(ids).size).toBe(ids.length)
    },
  )
})

describe("Phone presentation of an embedded preview", () => {
  afterEach(cleanup)

  // An example that draws no screen of its own stands on a phone page (safe area and 16px insets) by default
  test.each([
    ["no presentation", {}, "screen", "true"],
    ["an explicit screen", { phonePresentation: "screen" as const }, "screen", null],
    ["a component", { phonePresentation: "component" as const }, "component", null],
    ["a phone dialog", { phoneDialog: true }, "screen", null],
  ])("%s", (_, props, presentation, page) => {
    const view = render(<PreviewEmbed target="phone"><ComponentPreview previewId="phone" {...props}><div>Row</div></ComponentPreview></PreviewEmbed>)
    const container = view.container.querySelector("[data-preview-embed]")
    expect(container?.getAttribute("data-preview-presentation")).toBe(presentation)
    expect(container?.getAttribute("data-preview-phone-page")).toBe(page)
  })
})

describe("Modal preview underlay", () => {
  afterEach(cleanup)

  test.each([false, true])("only an initially open demo hides its launcher (phoneDialog=%s)", (phoneDialog) => {
    const stylesheet = document.createElement("style")
    const css = postcss.parse(readFileSync("components/docs/PreviewEmbed.module.css", "utf8"))
    css.walkRules((rule) => {
      if (!rule.selector.includes('[aria-haspopup="dialog"]')) return
      stylesheet.textContent += rule.toString().replace(':global(body:has([data-plex-dialog][data-state="open"]))', 'body:has([data-plex-dialog][data-state="open"])')
    })
    document.head.append(stylesheet)
    try {
      const view = render(<>
        <PreviewEmbed target="account">
          <ComponentPreview previewId="account" phoneDialog={phoneDialog}>
            <div data-demo-stage><button aria-haspopup="dialog">Email jane@example.com</button></div>
          </ComponentPreview>
        </PreviewEmbed>
        <div data-plex-dialog data-state="open" role="dialog" aria-label="Account editor" />
      </>)
      const row = view.getByText("Email jane@example.com")
      expect(getComputedStyle(row).visibility).toBe(phoneDialog ? "hidden" : "visible")
      expect(row.textContent).toBe("Email jane@example.com")
    } finally {
      stylesheet.remove()
    }
  })
})

describe("Preview support hosts", () => {
  afterEach(cleanup)

  test.each([
    ["React", ToastDemosHost],
    ["Vue", VueToastDemosHost],
  ])("%s toast host survives preview filtering through MDX wrappers", (_, Host) => {
    const stylesheet = document.createElement("style")
    const css = readFileSync("components/docs/PreviewEmbed.module.css", "utf8")
    stylesheet.textContent = css.slice(0, css.indexOf("}") + 1)
    document.head.append(stylesheet)
    try {
      const view = render(<div className="Root">
        <p>Outside prose</p>
        <section data-host-wrapper><p>Nested prose</p><Host /></section>
        <div data-preview-embed>Selected preview</div>
      </div>)
      const host = view.container.querySelector<HTMLElement>("[data-preview-support]")!
      expect(host).toBeTruthy()
      expect(getComputedStyle(host).display).not.toBe("none")
      expect(getComputedStyle(host.parentElement!).display).not.toBe("none")
      expect(getComputedStyle(view.getByText("Selected preview")).display).not.toBe("none")
      expect(getComputedStyle(view.getByText("Outside prose")).display).toBe("none")
      expect(getComputedStyle(view.getByText("Nested prose")).display).toBe("none")
    } finally {
      stylesheet.remove()
    }
  })
})

describe("Phone modal scrim reporting", () => {
  const parentDescriptor = Object.getOwnPropertyDescriptor(window, "parent")
  const postMessage = vi.fn()
  const observe = vi.fn()
  const unobserve = vi.fn()
  let resizeGeometry: (() => void) | undefined

  beforeEach(() => {
    postMessage.mockClear()
    observe.mockClear()
    unobserve.mockClear()
    resizeGeometry = undefined
    Object.defineProperty(window, "parent", { configurable: true, value: { postMessage } })
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { resizeGeometry = callback }
      observe = observe
      unobserve = unobserve
      disconnect() {}
    })
  })

  afterEach(() => {
    cleanup()
    if (parentDescriptor) Object.defineProperty(window, "parent", parentDescriptor)
    vi.unstubAllGlobals()
  })

  const expectModal = async (open: boolean) => {
    await waitFor(() => expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ previewKey: "preview-1", previewDialogOpen: open, previewStatusBarScrim: open }),
      window.location.origin,
    ))
  }

  test("a portalled Popover with role=dialog does not dim the phone", async () => {
    render(
      <PreviewEmbed target="preview-1">
        <div data-preview-embed>
          <ReactPopover open>
            <ReactPopover.Trigger><button>Category</button></ReactPopover.Trigger>
            <ReactPopover.Content><p>Category options</p></ReactPopover.Content>
          </ReactPopover>
        </div>
      </PreviewEmbed>,
    )
    await waitFor(() => expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeTruthy())
    expect(document.querySelector("[data-plex-dialog]")).toBeNull()
    await expectModal(false)
    expect(postMessage.mock.calls.some(([message]) => message.previewDialogOpen === true)).toBe(false)
  })

  test("compact height follows a portal mounted and repositioned after the stage", async () => {
    const view = render(<PreviewEmbed target="preview-1"><div data-preview-embed data-preview-presentation="component" /></PreviewEmbed>)
    const stage = view.container.querySelector<HTMLElement>("[data-preview-embed]")!
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 402, 100))
    const portal = document.createElement("div")
    portal.setAttribute("data-radix-popper-content-wrapper", "")
    vi.spyOn(portal, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 100, 300, 300))
    document.body.append(portal)
    await waitFor(() => expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ previewHeight: 416 }), window.location.origin))
    portal.style.visibility = "hidden"
    await waitFor(() => expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ previewHeight: 100 }), window.location.origin))
    portal.remove()
    vi.restoreAllMocks()
  })

  test("compact height observes toast children despite their zero-height fixed host", async () => {
    const view = render(<PreviewEmbed target="preview-1"><div data-preview-embed data-preview-presentation="component" /></PreviewEmbed>)
    const stage = view.container.querySelector<HTMLElement>("[data-preview-embed]")!
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 402, 84))
    const toaster = document.createElement("ol")
    toaster.setAttribute("data-sonner-toaster", "")
    vi.spyOn(toaster, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 32, 370, 0))
    const toast = document.createElement("li")
    toast.setAttribute("data-sonner-toast", "")
    // Entry animation starts above the viewport, while its resting actions
    // already need space in the crop. The list itself cannot supply its height.
    const geometry = vi.spyOn(toast, "getBoundingClientRect").mockReturnValue(new DOMRect(16, -248, 370, 280))
    let height = 280
    Object.defineProperty(toast, "offsetHeight", { get: () => height })
    toaster.append(toast)
    document.body.append(toaster)
    try {
      await waitFor(() => expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ previewHeight: 328 }), window.location.origin))
      expect(observe).toHaveBeenCalledWith(toast)
      expect(observe).not.toHaveBeenCalledWith(toaster)
      height = 360
      geometry.mockReturnValue(new DOMRect(16, 32, 370, height))
      act(() => resizeGeometry?.())
      await waitFor(() => expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ previewHeight: 408 }), window.location.origin))
      toast.remove()
      await waitFor(() => expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ previewHeight: 84 }), window.location.origin))
      expect(unobserve).toHaveBeenCalledWith(toast)
    } finally {
      toaster.remove()
      vi.restoreAllMocks()
    }
  })

  test.each(["React", "Vue"])("%s fullscreen uses the panel color, while mobile placement overrides restore the canvas scrim", async (framework) => {
    render(<PreviewEmbed target="preview-1"><div data-preview-embed data-preview-presentation="screen">
      <div data-width="full" data-surface="grouped" style={{ backgroundColor: "rgb(0, 0, 0)" }} />
    </div></PreviewEmbed>)
    type Placement = "fullscreen" | "bottom" | undefined
    let update: (placement: Placement, open?: boolean) => Promise<void>
    if (framework === "React") {
      const example = (mobilePlacement: Placement, open = true) => (
        <ReactDialog open={open}><ReactDialog.Content placement="fullscreen" mobilePlacement={mobilePlacement}>
          <ReactDialog.Title>Full screen</ReactDialog.Title>
          <ReactDialog.Description>Screen details</ReactDialog.Description>
        </ReactDialog.Content></ReactDialog>
      )
      const dialog = render(example(undefined))
      update = async (placement, open = true) => { dialog.rerender(example(placement, open)) }
    } else {
      const state = reactive<{ mobilePlacement: Placement; open: boolean }>({ mobilePlacement: undefined, open: true })
      mountVue(() => h(Dialog, { open: state.open }, {
        default: () => h(DialogContent, { placement: "fullscreen", mobilePlacement: state.mobilePlacement }, {
          default: () => [h(DialogTitle, null, () => "Full screen"), h(DialogDescription, null, () => "Screen details")],
        }),
      }))
      await flushVue()
      update = async (placement, open = true) => {
        await act(async () => { state.mobilePlacement = placement; state.open = open; await flushVue() })
      }
    }
    const panel = document.querySelector<HTMLElement>("[data-plex-dialog] > div")!
    panel.style.backgroundColor = "rgb(28, 28, 30)"
    const expectPresentation = async (open: boolean, scrim: boolean, background: string) => {
      await waitFor(() => expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({
        previewDialogOpen: open, previewStatusBarScrim: scrim, previewBackground: background,
      }), window.location.origin))
    }
    await expectPresentation(true, false, "rgb(28, 28, 30)")
    await update("bottom")
    await expectPresentation(true, true, "rgb(0, 0, 0)")
    await update("fullscreen")
    await expectPresentation(true, false, "rgb(28, 28, 30)")
    await update("fullscreen", false)
    await expectPresentation(false, false, "rgb(0, 0, 0)")
  })

  test.each(["React", "Vue"])("%s Dialog portals dim the phone only while open", async (framework) => {
    const stage = render(<PreviewEmbed target="preview-1"><div data-preview-embed /></PreviewEmbed>)
    await expectModal(false)
    if (framework === "React") {
      const example = (open: boolean) => (
        <ReactDialog open={open}>
          <ReactDialog.Content>
            <ReactDialog.Title>Confirm</ReactDialog.Title>
            <ReactDialog.Description>Save these changes?</ReactDialog.Description>
          </ReactDialog.Content>
        </ReactDialog>
      )
      const dialog = render(example(true))
      await expectModal(true)
      dialog.rerender(example(false))
    } else {
      const state = reactive({ open: true })
      mountVue(() => h(Dialog, { open: state.open }, {
        default: () => h(DialogContent, null, {
          default: () => [
            h(DialogTitle, null, () => "Confirm"),
            h(DialogDescription, null, () => "Save these changes?"),
          ],
        }),
      }))
      await flushVue()
      await expectModal(true)
      await act(async () => { state.open = false; await flushVue() })
    }
    await expectModal(false)
    expect(stage.container.querySelector('[role="dialog"]')).toBeNull()
  })
})


describe("Compact Phone viewport", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })))
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  function ChoosePhone() {
    const { change } = usePreviewViewport()
    return <button onClick={() => change("phone")}>Use Phone</button>
  }

  function PhonePage({ children }: { children: ReactNode }) {
    return <PreviewViewportProvider><ChoosePhone />{children}</PreviewViewportProvider>
  }

  function ResettableExample({ name }: { name: string }) {
    const [text, setText] = useState('Initial');
    const [count, setCount] = useState(0);
    useDemoControlSync('test-count', count, setCount);
    return <div>
      <input aria-label={`${name} text`} value={text} onChange={(event) => setText(event.target.value)} />
      <button onClick={() => setCount((value) => value + 1)}>Increment {name}</button>
      <output aria-label={`${name} count`}>{count}</output>
    </div>;
  }

  test('Reset preview restores only its example and retains focus on the toolbar', () => {
    const view = render(<PhonePage>
      <ComponentPreview phonePresentation="component" previewId="reset-first"><ResettableExample name="First" /></ComponentPreview>
      <ComponentPreview phonePresentation="component" previewId="reset-second"><ResettableExample name="Second" /></ComponentPreview>
    </PhonePage>);
    fireEvent.change(view.getByLabelText('First text'), { target: { value: 'Edited first' } });
    fireEvent.change(view.getByLabelText('Second text'), { target: { value: 'Edited second' } });
    fireEvent.click(view.getByText('Increment First'));
    fireEvent.click(view.getByText('Increment Second'));
    const reset = view.getAllByRole('button', { name: 'Reset preview' })[0];
    reset.focus();
    fireEvent.click(reset);
    expect((view.getByLabelText('First text') as HTMLInputElement).value).toBe('Initial');
    expect(view.getByLabelText('First count').textContent).toBe('0');
    expect((view.getByLabelText('Second text') as HTMLInputElement).value).toBe('Edited second');
    expect(view.getByLabelText('Second count').textContent).toBe('1');
    expect(document.activeElement).toBe(reset);
  });

  test('Phone reset replaces only its iframe and rejects old-frame control messages', () => {
    const view = render(<PhonePage>
      <ComponentPreview phonePresentation="component" previewId="reset-first"><ResettableExample name="First" /></ComponentPreview>
      <ComponentPreview phonePresentation="component" previewId="reset-second"><ResettableExample name="Second" /></ComponentPreview>
    </PhonePage>);
    fireEvent.click(view.getByText('Use Phone'));
    fireEvent.click(view.getByText('Increment First'));
    fireEvent.click(view.getByText('Increment Second'));
    const frames = view.getAllByTitle('Phone component preview') as HTMLIFrameElement[];
    const oldWindow = frames[0].contentWindow;
    fireEvent.click(view.getAllByRole('button', { name: 'Reset preview' })[0]);
    const freshFrames = view.getAllByTitle('Phone component preview') as HTMLIFrameElement[];
    expect(freshFrames).toHaveLength(2);
    expect(freshFrames[0]).not.toBe(frames[0]);
    expect(freshFrames[1]).toBe(frames[1]);
    expect(freshFrames[0].src).toBe(frames[0].src);
    const post = vi.spyOn(freshFrames[0].contentWindow!, 'postMessage');
    act(() => window.dispatchEvent(new MessageEvent('message', {
      source: freshFrames[0].contentWindow, origin: window.location.origin, data: { previewKey: 'reset-first', demoReady: true },
    })));
    expect(post).toHaveBeenCalledWith({ previewKey: 'reset-first', demoControl: { name: 'test-count', value: 0 } }, window.location.origin);
    act(() => window.dispatchEvent(new MessageEvent('message', {
      source: oldWindow, origin: window.location.origin, data: { previewKey: 'reset-first', demoControlChange: { name: 'test-count', value: 99 } },
    })));
    expect(view.getByLabelText('First count').textContent).toBe('0');
    expect(view.getByLabelText('Second count').textContent).toBe('1');
  });

  test("components crop the visible area while accepting heights only from their own iframe", () => {
    const view = render(<PhonePage><ComponentPreview phonePresentation="component" previewId="height" previewMinHeight={240}><span>Control</span></ComponentPreview></PhonePage>)
    fireEvent.click(view.getByText("Use Phone"))
    const frame = view.getByTitle("Phone component preview") as HTMLIFrameElement
    const viewport = frame.parentElement!
    expect(view.queryByText("9:41")).toBeNull()
    expect(viewport.style.height).toBe("240px")
    const send = (height: number, source: Window | null = frame.contentWindow, origin = window.location.origin, key = "height") => {
      act(() => window.dispatchEvent(new MessageEvent("message", { source, origin, data: { previewKey: key, previewHeight: height } })))
    }
    send(300, window)
    send(300, frame.contentWindow, "https://untrusted.example")
    send(300, frame.contentWindow, window.location.origin, "another-preview")
    send(Number.NaN)
    expect(viewport.style.height).toBe("240px")
    send(300.2)
    expect(viewport.style.height).toBe("301px")
    send(9999)
    expect(viewport.style.height).toBe("812px")
    send(100)
    expect(viewport.style.height).toBe("100px")
    // The iframe itself never receives measured height, avoiding vh feedback.
    expect(frame.style.height).toBe("")
  })

  test("choosing Phone waits for the iframe bridge and the mounted keyboard field before focusing", () => {
    const view = render(<PhonePage>
      <ComponentPreview previewId="active" phonePresentation="screen"><span>Active example</span></ComponentPreview>
      <ComponentPreview previewId="passive" phonePresentation="screen"><span>Passive example</span></ComponentPreview>
    </PhonePage>)
    fireEvent.click(view.getAllByLabelText("Phone")[0])
    const frame = view.getByTitle("Phone preview") as HTMLIFrameElement
    const post = vi.spyOn(frame.contentWindow!, "postMessage")
    expect(post).not.toHaveBeenCalled()
    act(() => window.dispatchEvent(new MessageEvent("message", {
      source: frame.contentWindow, origin: window.location.origin, data: { previewKey: "active", demoReady: true },
    })))
    expect(post).not.toHaveBeenCalled()
    act(() => window.dispatchEvent(new MessageEvent("message", {
      source: frame.contentWindow, origin: window.location.origin,
      data: { previewKey: "active", previewKeyboard: { available: true, open: true, kind: "numeric" } },
    })))
    expect(frame.style.height).toBe("566px")
    expect(post).toHaveBeenCalledExactlyOnceWith({ previewKey: "active", previewKeyboardCommand: "activate" }, window.location.origin)
    // Repeated readiness reports must not steal focus back after the user moves on.
    act(() => window.dispatchEvent(new MessageEvent("message", {
      source: frame.contentWindow, origin: window.location.origin, data: { previewKey: "active", demoReady: true },
    })))
    expect(post).toHaveBeenCalledTimes(1)
    expect(view.getAllByTitle("Phone preview")).toHaveLength(1)
  })

  test("numeric keyboard reduces only its screen iframe and focuses only an explicitly activated preview", () => {
    const view = render(<PhonePage>
      <ComponentPreview previewId="otp-one" phonePresentation="screen"><span>First OTP</span></ComponentPreview>
      <ComponentPreview previewId="otp-two" phonePresentation="screen"><span>Second OTP</span></ComponentPreview>
      <ComponentPreview phonePresentation="component" previewId="compact"><span>Compact</span></ComponentPreview>
    </PhonePage>)
    fireEvent.click(view.getByText("Use Phone"))
    const [first, second] = view.getAllByTitle("Phone preview") as HTMLIFrameElement[]
    const compact = view.getByTitle("Phone component preview") as HTMLIFrameElement
    const firstPost = vi.spyOn(first.contentWindow!, "postMessage")
    const secondPost = vi.spyOn(second.contentWindow!, "postMessage")
    const send = (frame: HTMLIFrameElement, key: string, message: object) => act(() => {
      window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, origin: window.location.origin, data: { previewKey: key, ...message } }))
    })
    send(first, "otp-one", { demoReady: true })
    send(second, "otp-two", { demoReady: true })
    expect(firstPost).not.toHaveBeenCalled()
    expect(secondPost).not.toHaveBeenCalled()
    send(second, "otp-one", { previewKeyboard: { available: true, open: true, kind: "numeric" } })
    expect(first.style.height).toBe("")
    send(first, "otp-one", { previewKeyboard: { available: true, open: true, kind: "numeric" } })
    expect(first.style.height).toBe("566px")
    // A page-wide Phone setting is passive; pressing an already-selected Phone
    // tab explicitly activates only the chosen example.
    expect(firstPost).not.toHaveBeenCalled()
    fireEvent.click(view.getAllByLabelText("Phone")[0])
    expect(firstPost).toHaveBeenCalledExactlyOnceWith({ previewKey: "otp-one", previewKeyboardCommand: "activate" }, window.location.origin)
    expect(secondPost).not.toHaveBeenCalled()
    firstPost.mockClear()
    expect(second.style.height).toBe("")
    expect(first.parentElement!.classList.contains("PhoneScreen")).toBe(true)
    fireEvent.click(view.getByRole("button", { name: "1", exact: true }))
    expect(firstPost).toHaveBeenLastCalledWith({ previewKey: "otp-one", previewKeyboardCommand: "1" }, window.location.origin)
    expect(secondPost).not.toHaveBeenCalled()
    const keyboardToggle = view.getByRole("switch", { name: "keyboard" })
    expect(keyboardToggle.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(keyboardToggle)
    expect(firstPost).toHaveBeenLastCalledWith({ previewKey: "otp-one", previewKeyboardCommand: "hide" }, window.location.origin)
    send(first, "otp-one", { previewKeyboard: { available: true, open: false, kind: "numeric" } })
    expect(keyboardToggle.getAttribute("aria-checked")).toBe("false")
    expect(first.style.height).toBe("")
    expect(view.queryByRole("group", { name: "Preview numeric keyboard" })).toBeNull()
    fireEvent.click(view.getByText("keyboard", { selector: "label" }))
    expect(firstPost).toHaveBeenLastCalledWith({ previewKey: "otp-one", previewKeyboardCommand: "show" }, window.location.origin)
    send(compact, "compact", { previewKeyboard: { available: true, open: true, kind: "numeric" } })
    expect(compact.style.height).toBe("")
    expect(view.queryByRole("group", { name: "Preview numeric keyboard" })).toBeNull()
  })

  test("text keyboard state selects its own layout and height, and malformed states are ignored", () => {
    const view = render(<PhonePage>
      <ComponentPreview previewId="album" phonePresentation="screen"><span>Album</span></ComponentPreview>
      <ComponentPreview previewId="other" phonePresentation="screen"><span>Other</span></ComponentPreview>
    </PhonePage>)
    fireEvent.click(view.getByText("Use Phone"))
    const [album, other] = view.getAllByTitle("Phone preview") as HTMLIFrameElement[]
    const albumPost = vi.spyOn(album.contentWindow!, "postMessage")
    const send = (frame: HTMLIFrameElement, message: object) => act(() => {
      window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, origin: window.location.origin, data: { previewKey: "album", ...message } }))
    })
    send(album, { demoReady: true })
    // The previous two-field protocol no longer describes which keyboard to draw.
    send(album, { previewKeyboard: { available: true, open: true } })
    send(album, { previewKeyboard: { available: true, open: true, kind: "emoji" } })
    expect(album.style.height).toBe("")
    expect(view.queryByRole("group", { name: "Preview text keyboard" })).toBeNull()
    send(other, { previewKeyboard: { available: true, open: true, kind: "text" } })
    expect(album.style.height).toBe("")
    send(album, { previewKeyboard: { available: true, open: true, kind: "text" } })
    expect(album.style.height).toBe("565px")
    expect(other.style.height).toBe("")
    const text = view.getByRole("group", { name: "Preview text keyboard" })
    expect(view.queryByRole("group", { name: "Preview numeric keyboard" })).toBeNull()
    expect(view.getByRole("switch", { name: "keyboard" }).getAttribute("aria-checked")).toBe("true")
    fireEvent.click(within(text).getByRole("button", { name: "q", exact: true }))
    expect(albumPost).toHaveBeenLastCalledWith({ previewKey: "album", previewKeyboardCommand: "q" }, window.location.origin)
    fireEvent.click(within(text).getByRole("button", { name: "Return", exact: true }))
    expect(albumPost).toHaveBeenLastCalledWith({ previewKey: "album", previewKeyboardCommand: "Enter" }, window.location.origin)
    // A numeric field in the same iframe swaps the keyboard and restores the numeric height.
    send(album, { previewKeyboard: { available: true, open: true, kind: "numeric" } })
    expect(album.style.height).toBe("566px")
    expect(view.queryByRole("group", { name: "Preview text keyboard" })).toBeNull()
    expect(view.getByRole("group", { name: "Preview numeric keyboard" })).toBeTruthy()
    // No eligible field: the keyboard is unavailable even if open is reported.
    send(album, { previewKeyboard: { available: true, open: true, kind: null } })
    expect(album.style.height).toBe("")
    expect(view.queryByRole("switch", { name: "keyboard" })).toBeNull()
  })

  test("screen examples retain the device, while none ignores page-wide Phone mode", () => {
    const view = render(<PhonePage>
      <ComponentPreview previewId="screen" phonePresentation="screen"><span>Screen</span></ComponentPreview>
      <ComponentPreview previewId="none" phonePresentation="none"><span>Pointer only</span></ComponentPreview>
    </PhonePage>)
    fireEvent.click(view.getByText("Use Phone"))
    expect(view.getAllByTitle("Phone preview")).toHaveLength(1)
    expect(view.queryByTitle("Phone component preview")).toBeNull()
    expect(view.getByText("9:41")).toBeTruthy()
    const pointerPreview = view.getByText("Pointer only").closest("[data-component-preview]")!
    expect(pointerPreview.querySelector('[aria-label="Screen"]')).toBeNull()
  })

  test("screen geometry stays at 100% in a narrow host, with horizontal scrolling instead of scaling", () => {
    // Apply the production geometry rules: jsdom can resolve their fixed sizes,
    // but does not perform flex layout or calculate scrollWidth.
    const css = readFileSync("components/docs/ComponentPreview.module.css", "utf8")
    const stylesheet = document.createElement("style")
    stylesheet.textContent = Array.from(css.matchAll(/\.(?:PhoneContainer|PhoneDevice|PhoneCanvas|PhoneScreen|PhoneFrame|PhoneStatusBar|ComponentPhoneFrame)\s*\{[^}]*\}/g), (match) => match[0]).join("\n")
    document.head.append(stylesheet)
    try {
      const view = render(<div style={{ width: 320 }}><PhonePage>
        <ComponentPreview previewId="unscaled" phonePresentation="screen"><span>Screen</span></ComponentPreview>
      </PhonePage></div>)
      fireEvent.click(view.getByText("Use Phone"))
      const frame = view.getByTitle("Phone preview")
      const device = frame.closest<HTMLElement>(".PhoneDevice")!
      const canvas = frame.closest<HTMLElement>(".PhoneCanvas")!
      const container = frame.closest<HTMLElement>(".PhoneContainer")!
      expect(getComputedStyle(device).width).toBe("450px")
      expect(getComputedStyle(device).flexShrink).toBe("0")
      expect(getComputedStyle(frame).width).toBe("402px")
      expect(getComputedStyle(frame).height).toBe("874px")
      const statusbar = frame.parentElement!.querySelector<HTMLElement>(".PhoneStatusBar")!
      expect(getComputedStyle(statusbar).position).toBe("absolute")
      expect(getComputedStyle(statusbar).height).toBe("62px")
      expect(getComputedStyle(statusbar).pointerEvents).toBe("none")
      const compact = document.createElement("iframe")
      compact.className = "ComponentPhoneFrame"
      view.container.append(compact)
      expect(getComputedStyle(compact).height).toBe("812px")
      expect(getComputedStyle(canvas).transform).not.toContain("scale")
      expect(getComputedStyle(container).overflowX).toBe("auto")
      // Centered flex overflow would put the leading edge outside the scroll range.
      expect(getComputedStyle(container).justifyContent).toBe("flex-start")
      view.container.firstElementChild?.setAttribute("style", "width: 240px")
      expect(getComputedStyle(device).width).toBe("450px")
      expect(canvas.style.transform).toBe("")
    } finally {
      stylesheet.remove()
    }
  })

  test("only a full screen reserves the statusbar inset at document scope, including portal consumers", () => {
    const css = postcss.parse(readFileSync("components/docs/PreviewEmbed.module.css", "utf8"))
    const scoped = postcss.root()
    css.walkDecls("--safe-area-inset-top", (decl) => {
      const rule = decl.parent
      if (!rule || rule.type !== "rule") throw new Error("Safe-area declaration needs a selector")
      // CSS Modules removes the outer :global wrapper in the real bundle.
      scoped.append(rule.clone({ selector: rule.selector.replace(/^:global\((.*)\)$/, "$1") }))
    })
    const stylesheet = document.createElement("style")
    stylesheet.textContent = scoped.toString()
    document.head.append(stylesheet)
    const portal = document.createElement("div")
    portal.setAttribute("data-plex-dialog", "")
    document.body.append(portal)
    try {
      const example = (presentation: "component" | "screen") => <PreviewEmbed target="safe-area">
        <div data-preview-embed data-preview-presentation={presentation} />
      </PreviewEmbed>
      const view = render(example("component"))
      const inset = () => getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-top").trim()
      expect(inset()).toBe("")
      view.rerender(example("screen"))
      expect(inset()).toBe("62px")
      expect(view.container.contains(portal)).toBe(false)
      // The declaration belongs to the common document ancestor, not the demo
      // subtree: body portals share it, while compact routes keep the native env.
      expect(document.documentElement.contains(portal)).toBe(true)
      view.rerender(example("component"))
      expect(inset()).toBe("")
      view.unmount()
      expect(inset()).toBe("")
    } finally {
      portal.remove()
      stylesheet.remove()
    }
  })

  test("modal statusbar dimming affects glyphs without painting another canvas scrim", () => {
    const css = postcss.parse(readFileSync("components/docs/ComponentPreview.module.css", "utf8"))
    const rules = postcss.root()
    css.walkRules((rule) => {
      if (rule.selector.includes("[data-status-bar-scrim]")) rules.append(rule.clone())
    })
    const stylesheet = document.createElement("style")
    stylesheet.textContent = rules.toString()
    document.head.append(stylesheet)
    try {
      const view = render(<div className="PhoneContainer" data-status-bar-scrim><div className="PhoneStatusBar">9:41</div></div>)
      const style = getComputedStyle(view.getByText("9:41"))
      expect(style.filter).toBe("brightness(0.5)")
      expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)")
      expect(rules.nodes.every((rule) => rule.type !== "rule" || !rule.selector.includes("::after"))).toBe(true)
    } finally {
      stylesheet.remove()
    }
  })

  test("the page-wide control exists only while a Phone-capable example is mounted", () => {
    const page = (presentation: "component" | "none", mounted = true) => (
      <PreviewViewportProvider>
        <PreviewViewportControl />
        <ComponentPreview previewId="pointer" phonePresentation="none"><span>Pointer only</span></ComponentPreview>
        {mounted && <ComponentPreview previewId="optional" phonePresentation={presentation}><span>Optional example</span></ComponentPreview>}
      </PreviewViewportProvider>
    )
    const view = render(page("none"))
    expect(view.queryByLabelText("All examples")).toBeNull()
    view.rerender(page("component"))
    expect(view.getByLabelText("All examples")).toBeTruthy()
    view.rerender(page("component", false))
    expect(view.queryByLabelText("All examples")).toBeNull()
  })

  test("phoneDialog keeps its screen presentation without an explicit mode", () => {
    const view = render(<PhonePage><ComponentPreview previewId="dialog" phoneDialog><span>Dialog</span></ComponentPreview></PhonePage>)
    fireEvent.click(view.getByText("Use Phone"))
    expect(view.getByTitle("Phone preview").hasAttribute("data-pending")).toBe(true)
  })

  test("a fullscreen dialog reveals the screen with its panel color and no statusbar scrim", () => {
    vi.stubGlobal("CSS", { ...CSS, supports: (property: string, value: string) => property === "color" && value.startsWith("rgb(") })
    const view = render(<PhonePage><ComponentPreview previewId="statusbar" phoneDialog><span>Dialog</span></ComponentPreview></PhonePage>)
    fireEvent.click(view.getByText("Use Phone"))
    const frame = view.getByTitle("Phone preview") as HTMLIFrameElement
    const container = frame.closest("[data-dialog-open]")!
    const send = (open: boolean, scrim: boolean, background: string) => act(() => {
      window.dispatchEvent(new MessageEvent("message", {
        source: frame.contentWindow, origin: window.location.origin,
        data: { previewKey: "statusbar", previewDialogOpen: open, previewStatusBarScrim: scrim, previewBackground: background },
      }))
    })
    expect(frame.hasAttribute("data-pending")).toBe(true)
    send(true, false, "rgb(28, 28, 30)")
    expect(frame.hasAttribute("data-pending")).toBe(false)
    expect(container.hasAttribute("data-dialog-open")).toBe(true)
    expect(container.hasAttribute("data-status-bar-scrim")).toBe(false)
    expect(frame.parentElement!.style.getPropertyValue("--phone-screen-background")).toBe("rgb(28, 28, 30)")
    send(true, true, "rgb(0, 0, 0)")
    expect(container.hasAttribute("data-status-bar-scrim")).toBe(true)
    expect(frame.parentElement!.style.getPropertyValue("--phone-screen-background")).toBe("rgb(0, 0, 0)")
    send(false, false, "rgb(0, 0, 0)")
    expect(container.hasAttribute("data-dialog-open")).toBe(false)
    expect(container.hasAttribute("data-status-bar-scrim")).toBe(false)
  })

  test("compact controls publish changes and replay the latest value when the iframe becomes ready", () => {
    function ControlledDemo() {
      const [disabled, setDisabled] = useState(false)
      useDemoControlSync("compact-disabled", disabled, setDisabled)
      return <div data-demo-controls><button onClick={() => setDisabled(!disabled)}>Toggle control</button></div>
    }
    const view = render(<PhonePage><ComponentPreview phonePresentation="component" previewId="controls"><ControlledDemo /></ComponentPreview></PhonePage>)
    fireEvent.click(view.getByText("Use Phone"))
    const frame = view.getByTitle("Phone component preview") as HTMLIFrameElement
    const post = vi.spyOn(frame.contentWindow!, "postMessage")
    fireEvent.click(view.getByText("Toggle control"))
    expect(post).toHaveBeenLastCalledWith({ previewKey: "controls", demoControl: { name: "compact-disabled", value: true } }, window.location.origin)
    post.mockClear()
    act(() => window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, origin: window.location.origin, data: { previewKey: "controls", demoReady: true } })))
    expect(post).toHaveBeenLastCalledWith({ previewKey: "controls", demoControl: { name: "compact-disabled", value: true } }, window.location.origin)
  })

  test("Phone changes update only their own control bar without echoing or publishing initial defaults", () => {
    function ControlledDemo({ label, initial }: { label: string; initial: boolean }) {
      const [checked, setChecked] = useState(initial)
      useDemoControlSync("checked", checked, setChecked)
      return <button onClick={() => setChecked(!checked)}>{label}: {String(checked)}</button>
    }
    const view = render(<PhonePage>
      <ComponentPreview phonePresentation="component" previewId="controlled"><ControlledDemo label="Host" initial /></ComponentPreview>
      <ComponentPreview phonePresentation="component" previewId="other"><ControlledDemo label="Other" initial={false} /></ComponentPreview>
    </PhonePage>)
    fireEvent.click(view.getByText("Use Phone"))
    const [frame, otherFrame] = view.getAllByTitle("Phone component preview") as HTMLIFrameElement[]
    const parentDescriptor = Object.getOwnPropertyDescriptor(window, "parent")
    const origin = window.location.origin
    const fromPhone = vi.fn((data: unknown) => {
      window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, origin, data }))
    })
    Object.defineProperty(window, "parent", { configurable: true, value: { postMessage: fromPhone } })
    const toPhone = vi.spyOn(frame.contentWindow!, "postMessage").mockImplementation((data: unknown) => {
      window.dispatchEvent(new MessageEvent("message", { source: window.parent, origin, data }))
    })
    const phoneChanges = () => fromPhone.mock.calls.filter(([data]) =>
      data !== null && typeof data === "object" && "demoControlChange" in data,
    )
    const sendChange = (name: string, value: unknown, source = frame.contentWindow, messageOrigin = origin, key = "controlled") => {
      act(() => window.dispatchEvent(new MessageEvent("message", {
        source, origin: messageOrigin, data: { previewKey: key, demoControlChange: { name, value } },
      })))
    }
    try {
      const phone = render(<PreviewEmbed target="controlled"><ControlledDemo label="Phone" initial={false} /></PreviewEmbed>)
      // The host's saved true wins over the iframe's false default.
      expect(phone.getByText("Phone: true")).toBeTruthy()
      expect(view.getByText("Host: true")).toBeTruthy()
      expect(phoneChanges()).toHaveLength(0)
      toPhone.mockClear()
      fromPhone.mockClear()

      fireEvent.click(phone.getByText("Phone: true"))
      expect(view.getByText("Host: false")).toBeTruthy()
      expect(view.getByText("Other: false")).toBeTruthy()
      expect(phoneChanges()).toHaveLength(1)
      expect(toPhone).not.toHaveBeenCalled()

      fireEvent.click(view.getByText("Host: false"))
      expect(phone.getByText("Phone: true")).toBeTruthy()
      expect(toPhone).toHaveBeenCalledTimes(1)
      expect(phoneChanges()).toHaveLength(1)

      sendChange("checked", false, otherFrame.contentWindow)
      sendChange("checked", false, frame.contentWindow, "https://untrusted.example")
      sendChange("checked", false, frame.contentWindow, origin, "other")
      sendChange("unregistered", false)
      expect(view.getByText("Host: true")).toBeTruthy()
      expect(view.getByText("Other: false")).toBeTruthy()
      expect(toPhone).toHaveBeenCalledTimes(1)

      // The iframe also rejects another source, origin and preview key.
      for (const [source, messageOrigin, key] of [
        [window, origin, "controlled"],
        [window.parent, "https://untrusted.example", "controlled"],
        [window.parent, origin, "other"],
      ] as const) {
        act(() => window.dispatchEvent(new MessageEvent("message", {
          source, origin: messageOrigin, data: { previewKey: key, demoControl: { name: "checked", value: false } },
        })))
      }
      expect(phone.getByText("Phone: true")).toBeTruthy()
      expect(phoneChanges()).toHaveLength(1)
      phone.unmount()
    } finally {
      if (parentDescriptor) Object.defineProperty(window, "parent", parentDescriptor)
    }
  })

  test("normal flow and visible portals determine height without document viewport floors", () => {
    const stage = document.createElement("div")
    const portal = document.createElement("div")
    portal.setAttribute("data-reka-popper-content-wrapper", "")
    document.body.append(stage, portal)
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 402, 84))
    vi.spyOn(portal, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 90, 300, 240))
    expect(measureCompactPreviewHeight(stage)).toBe(346)
    portal.style.visibility = "hidden"
    expect(measureCompactPreviewHeight(stage)).toBe(84)
    portal.remove()
    stage.remove()
    expect(compactPreviewHeight(12000)).toBe(812)
    expect(compactPreviewHeight(Number.NaN)).toBe(168)
  })

  test("the touch marker is document-wide and restored after the preview unmounts", () => {
    document.documentElement.setAttribute("data-input", "mouse")
    const view = render(<PreviewEmbed target="touch"><span>Preview</span></PreviewEmbed>)
    expect(document.documentElement.getAttribute("data-input")).toBe("touch")
    view.unmount()
    expect(document.documentElement.getAttribute("data-input")).toBe("mouse")
    document.documentElement.removeAttribute("data-input")
  })
})
