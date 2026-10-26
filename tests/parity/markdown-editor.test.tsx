import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useSyncExternalStore, type ReactElement } from "react"
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import { h, reactive, type VNode } from "vue"
import type { Editor as CoreEditor } from "@tiptap/core"
import { Translate as ReactTranslate } from "../../packages/ui/src/components/Icon"
import {
  MarkdownEditor as ReactMarkdownEditor,
  markdownEditorStyles as reactMarkdownEditorStyles,
} from "../../packages/ui/src/components/MarkdownEditor"
import { Translate } from "../../packages/vue/src/components/Icon"
import { MarkdownEditor, markdownEditorStyles } from "../../packages/vue/src/components/MarkdownEditor"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { renderPair } from "./pair"

// React-vs-Vue parity for MarkdownEditor. Both run the same tiptap 3.21
// extensions and tiptap-markdown 0.9 (React through @tiptap/react, Vue
// through @tiptap/vue-3), so ProseMirror's DOM and the emitted markdown must
// match exactly after every step.
//
// jsdom has no layout: Range rects and elementFromPoint are stubbed the same
// way for both (ProseMirror reads them to scroll the selection into view).
// Content is typed through the editor's own commands (the editor instance
// tiptap stores on its DOM node) and keyboard shortcuts through keydown on
// the editable element, which is what ProseMirror listens to.

const EMPTY_RECT = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }
const original = {
  getClientRects: Range.prototype.getClientRects,
  getBoundingClientRect: Range.prototype.getBoundingClientRect,
  elementFromPoint: document.elementFromPoint,
}

beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => EMPTY_RECT as DOMRect
  document.elementFromPoint = () => null
})

afterAll(() => {
  Range.prototype.getClientRects = original.getClientRects
  Range.prototype.getBoundingClientRect = original.getBoundingClientRect
  document.elementFromPoint = original.elementFromPoint
})

const ALL_FORMATTING_MD = `This is regular text with **bold** and *italic* formatting.

Read our [Privacy Policy](https://example.com/privacy) and [Terms of Service](https://example.com/terms) for details.

1. First ordered item
2. Second ordered item
3. Third ordered item

- Unordered item one
- Unordered item two
- Unordered item three`

/* ------------------------------------------------------------------ */
/*  Shared props                                                       */
/* ------------------------------------------------------------------ */

type Case = {
  variant?: "outline" | "soft"
  disabled?: boolean
  invalid?: boolean
  placeholder?: string
  value?: string
  defaultValue?: string
  rows?: number
  className?: string
  id?: string
  ariaDescribedby?: string
  ariaInvalid?: boolean
  /** Renders the docs' "Edit translations" toolbarEnd button */
  toolbarEnd?: boolean
}

type Events = { values: string[]; changes: string[]; log: string[] }
const events: Events = { values: [], changes: [], log: [] }
const resetEvents = () => {
  events.values = []
  events.changes = []
  events.log = []
}

const reactEditor = ({ className, ariaDescribedby, ariaInvalid, toolbarEnd, ...props }: Case) => (
  <ReactMarkdownEditor
    {...props}
    className={className}
    aria-describedby={ariaDescribedby}
    aria-invalid={ariaInvalid}
    onChange={(md) => {
      events.values.push(md)
      events.changes.push(md)
    }}
    toolbarEnd={
      toolbarEnd ? (
        <button
          type="button"
          className={reactMarkdownEditorStyles.toolbarButton}
          aria-label="Edit translations"
          title="Edit translations"
        >
          <ReactTranslate />
        </button>
      ) : undefined
    }
  />
)

const vueEditor = ({ className, ariaDescribedby, ariaInvalid, toolbarEnd, ...props }: Case) =>
  h(
    MarkdownEditor,
    {
      ...props,
      "class": className,
      "aria-describedby": ariaDescribedby,
      "aria-invalid": ariaInvalid,
      "onUpdate:value": (md: string) => events.values.push(md),
      "onChange": (md: string) => events.changes.push(md),
    },
    toolbarEnd
      ? {
          toolbarEnd: () =>
            h(
              "button",
              {
                "type": "button",
                "class": markdownEditorStyles.toolbarButton,
                "aria-label": "Edit translations",
                "title": "Edit translations",
              },
              [h(Translate)],
            ),
        }
      : undefined,
  )

/* ------------------------------------------------------------------ */
/*  Walker                                                             */
/* ------------------------------------------------------------------ */

type EditorElement = HTMLElement & { editor: CoreEditor }
const PM = ".ProseMirror"
const editorOf = () => (document.querySelector(PM) as EditorElement).editor
const markdown = () =>
  (editorOf().storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown()

const describeFocus = () => {
  const element = document.activeElement
  if (!element || element === document.body) return "focus: body"
  return `focus: <${element.tagName.toLowerCase()} class="${element.getAttribute("class") ?? ""}"${element.id ? ` id="${element.id}"` : ""}>`
}

const snapshotDom = () =>
  [
    serializeDom(),
    describeFocus(),
    `markdown: ${JSON.stringify(markdown())}`,
    `onChange / update:value: ${JSON.stringify(events.values)}`,
    `change: ${JSON.stringify(events.changes)}`,
    `log: ${JSON.stringify(events.log)}`,
  ].join("\n")

type Target = string | (() => Element | null)
const resolve = (target: Target) => {
  const element = typeof target === "string" ? document.querySelector(target) : target()
  if (!element) throw new Error(`No element for ${String(target)}`)
  return element
}

const button = (label: string) => () => document.querySelector(`button[aria-label="${label}"]`)
const dialogButton = (text: string) => () =>
  Array.from(document.querySelectorAll('[role="dialog"] button')).find((el) => el.textContent === text) ?? null

type Tools<T> = {
  snapshot: () => void
  /** Fires a DOM event; the result (false when prevented) goes to the log when `label` is given */
  fire: (target: Target, event: keyof typeof fireEvent, init?: object, label?: string) => Promise<void>
  /** keydown on the editable element */
  key: (init: KeyboardEventInit & { key: string }) => Promise<void>
  /** Runs editor commands (typing, selection) */
  command: (run: (editor: CoreEditor) => unknown) => Promise<void>
  focus: (target: Target) => Promise<void>
  blur: (target: Target) => Promise<void>
  advance: (ms: number) => Promise<void>
  set: (patch: Partial<T>) => Promise<void>
}

type App<T, R> = (state: T, update: (patch: Partial<T>) => void) => R

/**
 * Runs `steps` against a React app, then a Vue app, both reading one shared
 * state, with fake timers. `update` lets an app change the state itself
 * (a parent that follows onChange).
 */
const walk = async <T extends object>(
  initial: T,
  reactApp: App<T, ReactElement>,
  vueApp: App<T, VNode>,
  steps: (tools: Tools<T>) => Promise<void>,
) => {
  let current = { ...initial }
  const listeners = new Set<() => void>()
  const vueState = reactive({ ...initial }) as T
  const update = (patch: Partial<T>) => {
    current = { ...current, ...patch }
    Object.assign(vueState, patch)
    for (const listener of listeners) listener()
  }

  function ReactApp() {
    const state = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => current,
    )
    return reactApp(state, update)
  }

  const run = async (action: () => unknown) => {
    await act(async () => {
      await action()
    })
    await flushVue()
    await flushVue()
  }

  // Vue's event invoker skips a listener when the event's timestamp is not
  // later than the moment the listener was attached. With Date faked and
  // frozen, the clock moves 1ms (no timers run) before each DOM event.
  const dispatch = (action: () => unknown) =>
    run(() => {
      vi.setSystemTime(Date.now() + 1)
      return action()
    })

  const tools = (snapshots: string[]): Tools<T> => ({
    snapshot: () => snapshots.push(snapshotDom()),
    fire: (target, event, init, label) =>
      dispatch(() => {
        const result = (fireEvent[event] as (element: Element, init?: object) => boolean)(resolve(target), init)
        if (label) events.log.push(`${label}: ${result ? "not prevented" : "prevented"}`)
      }),
    key: (init) =>
      dispatch(() => {
        fireEvent.keyDown(resolve(PM), init)
      }),
    command: (commands) => dispatch(() => commands(editorOf())),
    focus: (target) => dispatch(() => (resolve(target) as HTMLElement).focus()),
    blur: (target) => dispatch(() => (resolve(target) as HTMLElement).blur()),
    advance: (ms) => run(() => vi.advanceTimersByTime(ms)),
    set: (patch) => run(() => update(patch)),
  })

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    resetEvents()
    const react: string[] = []
    await run(() => {
      render(createElement(ReactApp))
    })
    await run(() => vi.advanceTimersByTime(20))
    await steps(tools(react))
    await run(() => cleanup())
    // React's useEditor destroys the editor on a 1ms timer
    await run(() => vi.advanceTimersByTime(20))
    vi.clearAllTimers()

    resetEvents()
    current = { ...initial }
    for (const key of Object.keys(vueState)) {
      if (!(key in initial)) delete (vueState as Record<string, unknown>)[key]
    }
    Object.assign(vueState, initial)
    const vue: string[] = []
    const { unmount } = mountVue(() => vueApp(vueState, update))
    await run(() => {})
    await run(() => vi.advanceTimersByTime(20))
    await steps(tools(vue))
    unmount()
    vi.clearAllTimers()

    return { react, vue }
  } finally {
    vi.useRealTimers()
  }
}

/** A walk over one editor whose props come from the shared state. */
const walkEditor = <T extends Case>(initial: T, steps: (tools: Tools<T>) => Promise<void>) =>
  walk(initial, (state) => reactEditor(state), (state) => vueEditor(state), steps)

const expectSame = ({ react, vue }: { react: string[]; vue: string[] }) => {
  expect(vue.length).toBe(react.length)
  vue.forEach((snapshot, index) => expect(snapshot, `step ${index + 1}`).toBe(react[index]))
}

/* ------------------------------------------------------------------ */
/*  Initial render                                                     */
/* ------------------------------------------------------------------ */

const renderCases: Array<[string, Case]> = [
  ["empty", {}],
  ["placeholder", { placeholder: "Enter text..." }],
  ["default value with all formatting", { defaultValue: ALL_FORMATTING_MD }],
  ["controlled value", { value: "Controlled **bold** text" }],
  ["value wins over defaultValue", { value: "From *value*", defaultValue: "From defaultValue" }],
  ["variant soft", { variant: "soft", placeholder: "Soft variant..." }],
  ["variant outline", { variant: "outline", placeholder: "Outline variant..." }],
  ["disabled with content", { disabled: true, defaultValue: "This content is **read-only**." }],
  ["disabled hides the placeholder", { disabled: true, placeholder: "Enter text..." }],
  ["invalid", { invalid: true, placeholder: "Tell us about yourself..." }],
  ["aria-invalid", { ariaInvalid: true }],
  ["aria-invalid false", { ariaInvalid: false }],
  ["id + aria-describedby (Field wiring)", { id: "description", ariaDescribedby: "description-help" }],
  ["rows", { rows: 4 }],
  ["fractional rows", { rows: 2.5 }],
  ["class", { className: "custom-editor" }],
  ["toolbarEnd slot", { placeholder: "Enter text...", toolbarEnd: true }],
  ["everything", { variant: "soft", invalid: true, disabled: true, rows: 3, className: "x", id: "e", ariaDescribedby: "d", ariaInvalid: true, toolbarEnd: true, defaultValue: "a\n\nb" }],
  ["hard break", { defaultValue: "line one\\\nline two" }],
  ["html is not parsed (html: false)", { defaultValue: "<b>tag</b> and <a href=\"https://x.com\">link</a>" }],
  ["nested lists", { defaultValue: "- one\n  - nested\n- two\n\n3. three\n4. four" }],
  ["loose list", { defaultValue: "- one\n\n- two" }],
  ["headings and code are plain text", { defaultValue: "# Title\n\n`code` and > quote" }],
]

describe("MarkdownEditor parity: initial render", () => {
  test.each(renderCases)("%s", async (_name, props) => {
    const pair = await renderPair(reactEditor(props), () => vueEditor(props))
    expect(pair.vue).toBe(pair.react)
  })

  test("an empty toolbarEnd slot renders no separator, like a falsy toolbarEnd", async () => {
    const pair = await renderPair(
      <ReactMarkdownEditor toolbarEnd={false} />,
      () => h(MarkdownEditor, null, { toolbarEnd: () => [] }),
    )
    expect(pair.vue).toBe(pair.react)
  })

  test("markdownEditorStyles exposes the toolbar button class", () => {
    expect(markdownEditorStyles).toEqual(reactMarkdownEditorStyles)
  })
})

/* ------------------------------------------------------------------ */
/*  Mount                                                              */
/* ------------------------------------------------------------------ */

describe("MarkdownEditor parity: mount", () => {
  const mountCases: Array<[string, Case]> = [
    ["uncontrolled, empty", {}],
    ["uncontrolled with defaultValue", { defaultValue: ALL_FORMATTING_MD }],
    ["controlled", { value: "Hello **world**" }],
    ["controlled value that serializes differently", { value: "__bold__ and _it_\n\n* item" }],
    ["disabled", { disabled: true, defaultValue: "Read only" }],
  ]

  // React's setEditable effect emits an update once the editor exists, so
  // onChange reports the initial markdown; the port does the same
  test.each(mountCases)("reports the initial markdown once: %s", async (_name, props) => {
    expectSame(await walkEditor(props, async ({ snapshot }) => snapshot()))
  })
})

/* ------------------------------------------------------------------ */
/*  Toolbar commands                                                   */
/* ------------------------------------------------------------------ */

describe("MarkdownEditor parity: toolbar", () => {
  test("bold and italic on a selection, toggled off again", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Hello world, plain text" }, async ({ snapshot, command, fire, advance }) => {
        snapshot()
        await command((e) => e.commands.setTextSelection({ from: 1, to: 6 }))
        snapshot()
        await fire(button("Bold"), "click")
        snapshot()
        await advance(20)
        snapshot()
        await fire(button("Italic"), "click")
        await advance(20)
        snapshot()
        await fire(button("Bold"), "click")
        await advance(20)
        snapshot()
        await command((e) => e.commands.setTextSelection(3))
        snapshot()
      }),
    )
  })

  test("numbered and bullet lists toggle and switch", async () => {
    expectSame(
      await walkEditor({ defaultValue: "First\n\nSecond" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.selectAll())
        await fire(button("Numbered list"), "click")
        await advance(20)
        snapshot()
        await fire(button("Bullet list"), "click")
        await advance(20)
        snapshot()
        await fire(button("Bullet list"), "click")
        await advance(20)
        snapshot()
      }),
    )
  })

  test("toolbar mousedown is prevented; on the toolbar background it focuses the editor", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Text" }, async ({ snapshot, fire, advance }) => {
        await fire(button("Bold"), "mouseDown", {}, "bold button")
        await fire(".Toolbar", "mouseDown", {}, "toolbar")
        await advance(20)
        snapshot()
      }),
    )
  })

  test("disabled toolbar buttons do nothing", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Some text", disabled: true }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection({ from: 1, to: 5 }))
        await fire(button("Bold"), "click")
        await fire(button("Numbered list"), "click")
        await advance(20)
        snapshot()
      }),
    )
  })

  test("toolbarEnd content stays clickable and is skipped by the container", async () => {
    expectSame(
      await walkEditor({ toolbarEnd: true }, async ({ snapshot, fire, advance }) => {
        await fire(button("Edit translations"), "mouseDown", {}, "toolbarEnd mousedown")
        await advance(20)
        snapshot()
      }),
    )
  })
})

/* ------------------------------------------------------------------ */
/*  Keyboard and typing                                                */
/* ------------------------------------------------------------------ */

describe("MarkdownEditor parity: keyboard and typing", () => {
  test("Mod-b, Mod-i, list shortcuts, undo and redo", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Shortcut text here" }, async ({ snapshot, command, key, focus }) => {
        await focus(PM)
        await command((e) => e.commands.setTextSelection({ from: 1, to: 9 }))
        await key({ key: "b", ctrlKey: true })
        snapshot()
        await key({ key: "i", ctrlKey: true })
        snapshot()
        await key({ key: "7", ctrlKey: true, shiftKey: true })
        snapshot()
        await key({ key: "8", ctrlKey: true, shiftKey: true })
        snapshot()
        await key({ key: "z", ctrlKey: true })
        snapshot()
        await key({ key: "z", ctrlKey: true, shiftKey: true })
        snapshot()
      }),
    )
  })

  test("typing through editor commands emits markdown", async () => {
    expectSame(
      await walkEditor({}, async ({ snapshot, command, key, focus }) => {
        await focus(PM)
        await command((e) => e.commands.insertContent("Plain "))
        snapshot()
        await command((e) => e.commands.insertContent("**strong** and *soft* "))
        snapshot()
        await command((e) => e.commands.insertContent("[a link](https://example.com)"))
        snapshot()
        await key({ key: "Enter" })
        await command((e) => e.commands.insertContent("Next paragraph"))
        snapshot()
        await key({ key: "Enter", shiftKey: true })
        await command((e) => e.commands.insertContent("after a hard break"))
        snapshot()
        await command((e) => e.commands.insertContent("<em>html</em> & *stars*"))
        snapshot()
      }),
    )
  })

  test("typing into a list and leaving it", async () => {
    expectSame(
      await walkEditor({}, async ({ snapshot, command, key, focus }) => {
        await focus(PM)
        await command((e) => e.chain().toggleBulletList().insertContent("one").run())
        await key({ key: "Enter" })
        await command((e) => e.commands.insertContent("two"))
        snapshot()
        await key({ key: "Enter" })
        await key({ key: "Enter" })
        await command((e) => e.commands.insertContent("after"))
        snapshot()
      }),
    )
  })

  test("shortcuts are ignored while disabled", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Locked", disabled: true }, async ({ snapshot, command, key }) => {
        await command((e) => e.commands.setTextSelection({ from: 1, to: 4 }))
        await key({ key: "b", ctrlKey: true })
        snapshot()
      }),
    )
  })
})

/* ------------------------------------------------------------------ */
/*  Focus and container                                                */
/* ------------------------------------------------------------------ */

describe("MarkdownEditor parity: focus", () => {
  test("focus and blur toggle data-focused", async () => {
    expectSame(
      await walkEditor({ placeholder: "Enter text..." }, async ({ snapshot, focus, blur }) => {
        await focus(PM)
        snapshot()
        await blur(PM)
        snapshot()
      }),
    )
  })

  test("mousedown on the container focuses the end of the editor", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Click **me**" }, async ({ snapshot, fire, advance }) => {
        await fire(".Editor", "mouseDown", {}, "editor area")
        snapshot()
        await advance(20)
        snapshot()
        // Already focused: left alone
        await fire(".Editor", "mouseDown", {}, "editor area, focused")
        snapshot()
      }),
    )
  })

  test("mousedown on a disabled container does nothing", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Locked", disabled: true }, async ({ snapshot, fire, advance }) => {
        await fire(".Editor", "mouseDown", {}, "editor area")
        await advance(20)
        snapshot()
      }),
    )
  })
})

/* ------------------------------------------------------------------ */
/*  Links                                                              */
/* ------------------------------------------------------------------ */

const URL_INPUT = "#md-editor-link-url"
const TITLE_INPUT = "#md-editor-link-title"

describe("MarkdownEditor parity: link dialog", () => {
  test("link button is disabled without a selection", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Read the docs" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection(3))
        await fire(button("Link"), "click")
        await advance(20)
        snapshot()
      }),
    )
  })

  test("add a link to the selection, edit it, remove it", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Read the docs today" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection({ from: 10, to: 14 }))
        await fire(button("Link"), "click")
        snapshot()
        await advance(20)
        snapshot()
        await fire(URL_INPUT, "input", { target: { value: "https://example.com/docs" } })
        snapshot()
        await fire(dialogButton("Save"), "click")
        snapshot()
        await advance(20)
        snapshot()

        // Cursor inside the link: the dialog edits it
        await command((e) => e.commands.setTextSelection(12))
        snapshot()
        await fire(button("Link"), "click")
        await advance(20)
        snapshot()
        await fire(URL_INPUT, "input", { target: { value: "https://example.com/guide" } })
        await fire(dialogButton("Save"), "click")
        await advance(20)
        snapshot()

        await command((e) => e.commands.setTextSelection(12))
        await fire(button("Link"), "click")
        await advance(20)
        await fire(dialogButton("Remove"), "click")
        await advance(20)
        snapshot()
      }),
    )
  })

  test("a new title replaces the selected text", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Read the docs today" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection({ from: 10, to: 14 }))
        await fire(button("Link"), "click")
        await advance(20)
        await fire(URL_INPUT, "input", { target: { value: "https://example.com" } })
        await fire(TITLE_INPUT, "input", { target: { value: "the guide" } })
        snapshot()
        await fire(dialogButton("Save"), "click")
        await advance(20)
        snapshot()
      }),
    )
  })

  test("a new title on an existing link", async () => {
    expectSame(
      await walkEditor({ defaultValue: "See [docs](https://a.com) now" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection(7))
        await fire(button("Link"), "click")
        await advance(20)
        snapshot()
        await fire(TITLE_INPUT, "input", { target: { value: "documentation" } })
        await fire(dialogButton("Save"), "click")
        await advance(20)
        snapshot()
      }),
    )
  })

  test("saving an empty URL unsets the link", async () => {
    expectSame(
      await walkEditor({ defaultValue: "See [docs](https://a.com) now" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection(7))
        await fire(button("Link"), "click")
        await advance(20)
        await fire(URL_INPUT, "input", { target: { value: "" } })
        await fire(dialogButton("Save"), "click")
        await advance(20)
        snapshot()
      }),
    )
  })

  test("Enter saves, Escape and Cancel close, the overlay cancels", async () => {
    expectSame(
      await walkEditor({ defaultValue: "One two three" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection({ from: 1, to: 4 }))
        await fire(button("Link"), "click")
        await advance(20)
        await fire(URL_INPUT, "input", { target: { value: "https://one.com" } })
        await fire(URL_INPUT, "keyDown", { key: "Enter" }, "Enter in the dialog")
        await advance(20)
        snapshot()

        await command((e) => e.commands.setTextSelection({ from: 5, to: 8 }))
        await fire(button("Link"), "click")
        await advance(20)
        await fire(TITLE_INPUT, "keyDown", { key: "Escape" }, "Escape in the dialog")
        await advance(20)
        snapshot()

        await command((e) => e.commands.setTextSelection({ from: 5, to: 8 }))
        await fire(button("Link"), "click")
        await advance(20)
        await fire(dialogButton("Cancel"), "click")
        await advance(20)
        snapshot()

        await command((e) => e.commands.setTextSelection({ from: 5, to: 8 }))
        await fire(button("Link"), "click")
        await advance(20)
        await fire("[class='LinkDialogOverlay']", "mouseDown", {}, "overlay mousedown")
        await fire("[class='LinkDialogOverlay']", "click")
        await advance(20)
        snapshot()
      }),
    )
  })

  // React portal events bubble through the component tree to the
  // container's mousedown handler, which focuses the end of the editor and
  // collapses the selection while the dialog stays open; saving then
  // inserts a new link at the end. The port reproduces it.
  test("mousedown inside the dialog reaches the container (React portal bubbling)", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Pick a word here" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection({ from: 6, to: 10 }))
        await fire(button("Link"), "click")
        await advance(20)
        await fire(URL_INPUT, "mouseDown", {}, "URL input mousedown")
        await fire("[class='LinkDialogTitle']", "mouseDown", {}, "dialog title mousedown")
        snapshot()
        await advance(20)
        snapshot()
        await fire(URL_INPUT, "input", { target: { value: "https://end.com" } })
        await fire(dialogButton("Save"), "click")
        await advance(20)
        snapshot()
      }),
    )
  })
})

/* ------------------------------------------------------------------ */
/*  Value and prop updates                                             */
/* ------------------------------------------------------------------ */

describe("MarkdownEditor parity: value", () => {
  test("controlled value updates from outside replace the content without onChange", async () => {
    expectSame(
      await walkEditor({ value: "Start" } as Case, async ({ snapshot, set }) => {
        await set({ value: "Now **bold** and\n\n1. a list" })
        snapshot()
        // Same markdown as the editor holds: left alone
        await set({ value: "Now **bold** and\n\n1. a list" })
        snapshot()
        await set({ value: "" })
        snapshot()
        // Back to uncontrolled: the editor keeps its content
        await set({ value: undefined })
        snapshot()
      }),
    )
  })

  test("v-model: a parent that follows onChange", async () => {
    expectSame(
      await walk(
        { value: "Draft" } as Case,
        (state, update) => (
          <ReactMarkdownEditor
            value={state.value}
            onChange={(md) => {
              events.values.push(md)
              events.changes.push(md)
              update({ value: md })
            }}
          />
        ),
        (state, update) =>
          h(MarkdownEditor, {
            "value": state.value,
            "onUpdate:value": (md: string) => {
              events.values.push(md)
              update({ value: md })
            },
            "onChange": (md: string) => events.changes.push(md),
          }),
        async ({ snapshot, command, focus, set }) => {
          snapshot()
          await focus(PM)
          await command((e) => e.commands.insertContent(" more"))
          snapshot()
          await command((e) => e.commands.selectAll())
          await command((e) => e.commands.toggleBold())
          snapshot()
          await set({ value: "Reset from outside" })
          snapshot()
        },
      ),
    )
  })

  test("a controlled value the parent does not update keeps the typed text (as in React)", async () => {
    expectSame(
      await walkEditor({ value: "Fixed" } as Case, async ({ snapshot, command, focus }) => {
        await focus(PM)
        await command((e) => e.commands.insertContent("typed "))
        snapshot()
      }),
    )
  })

  test("uncontrolled defaultValue is read once", async () => {
    expectSame(
      await walkEditor({ defaultValue: "First" } as Case, async ({ snapshot, set }) => {
        await set({ defaultValue: "Second" })
        snapshot()
      }),
    )
  })

  test("toggling disabled reports the markdown again and locks the editor", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Toggle me", placeholder: "Empty", disabled: false } as Case, async ({ snapshot, set, command }) => {
        await set({ disabled: true })
        snapshot()
        await set({ disabled: false })
        snapshot()
        await command((e) => e.commands.clearContent(true))
        snapshot()
        await set({ disabled: true })
        snapshot()
      }),
    )
  })

  test("props follow updates; placeholder is read once (as in React)", async () => {
    expectSame(
      await walkEditor({ placeholder: "First placeholder" } as Case, async ({ snapshot, set }) => {
        await set({ id: "editor", ariaDescribedby: "help", ariaInvalid: true })
        snapshot()
        await set({ ariaInvalid: false, ariaDescribedby: undefined })
        snapshot()
        await set({ variant: "soft", invalid: true, rows: 5, className: "grown" })
        snapshot()
        await set({ placeholder: "Second placeholder", toolbarEnd: true })
        snapshot()
        await set({ toolbarEnd: false, invalid: false })
        snapshot()
      }),
    )
  })
})
