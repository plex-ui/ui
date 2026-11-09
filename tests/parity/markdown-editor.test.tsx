import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useSyncExternalStore, type ReactElement } from "react"
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import { h, reactive, type VNode } from "vue"
import type { Editor as CoreEditor, JSONContent } from "@tiptap/core"
import { Translate as ReactTranslate } from "../../packages/ui/src/components/Icon"
import {
  MarkdownEditor as ReactMarkdownEditor,
  markdownEditorStyles as reactMarkdownEditorStyles,
  type MarkdownEditorFormat,
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
  ariaLabel?: string
  ariaLabelledby?: string
  ariaDescribedby?: string
  ariaInvalid?: boolean
  formats?: MarkdownEditorFormat[]
  breaks?: boolean
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

const reactEditor = ({ className, ariaLabel, ariaLabelledby, ariaDescribedby, ariaInvalid, toolbarEnd, ...props }: Case) => (
  <ReactMarkdownEditor
    {...props}
    className={className}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledby}
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

const vueEditor = ({ className, ariaLabel, ariaLabelledby, ariaDescribedby, ariaInvalid, toolbarEnd, ...props }: Case) =>
  h(
    MarkdownEditor,
    {
      ...props,
      "class": className,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledby,
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
  if (element instanceof HTMLInputElement && element.closest('[role="dialog"]')) {
    return `focus: ${element.labels?.[0]?.textContent ?? "unnamed"} input`
  }
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
  ["aria-label", { ariaLabel: "Notes" }],
  ["aria-labelledby (a Field label)", { ariaLabelledby: "notes-label", ariaDescribedby: "notes-help" }],
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

  test("toolbar buttons are toggles; aria-label and aria-labelledby reach the editable element", async () => {
    const props: Case = { ariaLabel: "Notes", ariaLabelledby: "notes-label" }
    const pair = await renderPair(reactEditor(props), () => vueEditor(props))
    expect(pair.vue).toBe(pair.react)
    expect(pair.react.match(/aria-pressed="false"/g)).toHaveLength(5)
    expect(pair.react).toContain('aria-label="Notes" aria-labelledby=')
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
        expect(document.querySelector('button[aria-label="Bold"]')!.getAttribute("aria-pressed")).toBe("true")
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

  test("mousedown in the text is left to the browser, which places the caret", async () => {
    const result = await walkEditor({ defaultValue: "Hello world" }, async ({ snapshot, fire, advance }) => {
      await fire(`${PM} p`, "mouseDown", {}, "paragraph")
      await advance(20)
      snapshot()
    })
    expectSame(result)
    expect(result.react[0]).toContain('"paragraph: not prevented"')
    expect(result.react[0]).toContain("focus: body")
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

const URL_INPUT = '[role="dialog"] input[type="url"]'
const TITLE_INPUT = '[role="dialog"] input[type="text"]'

describe("MarkdownEditor parity: link dialog", () => {
  test("link button is disabled without a selection", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Read the docs" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection(3))
        await fire(button("Link"), "click")
        await advance(500)
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
        await advance(500)
        snapshot()
        await fire(URL_INPUT, "input", { target: { value: "https://example.com/docs" } })
        snapshot()
        await fire(dialogButton("Save"), "click")
        snapshot()
        await advance(500)
        snapshot()

        // Cursor inside the link: the dialog edits it
        await command((e) => e.commands.setTextSelection(12))
        snapshot()
        await fire(button("Link"), "click")
        await advance(500)
        snapshot()
        await fire(URL_INPUT, "input", { target: { value: "https://example.com/guide" } })
        await fire(dialogButton("Save"), "click")
        await advance(500)
        snapshot()

        await command((e) => e.commands.setTextSelection(12))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(dialogButton("Remove"), "click")
        await advance(500)
        snapshot()
      }),
    )
  })

  test("a new title replaces the selected text", async () => {
    const result = await walkEditor({ defaultValue: "Read the docs today" }, async ({ snapshot, command, fire, advance }) => {
      await command((e) => e.commands.setTextSelection({ from: 10, to: 14 }))
      await fire(button("Link"), "click")
      await advance(500)
      await fire(URL_INPUT, "input", { target: { value: "https://example.com" } })
      await fire(TITLE_INPUT, "input", { target: { value: "the guide" } })
      snapshot()
      await fire(dialogButton("Save"), "click")
      await advance(500)
      snapshot()
    })
    expectSame(result)
    expect(result.react[1]).toContain('markdown: "Read the [the guide](https://example.com) today"')
  })

  test("a new title on an existing link", async () => {
    const result = await walkEditor({ defaultValue: "See [docs](https://a.com) now" }, async ({ snapshot, command, fire, advance }) => {
      await command((e) => e.commands.setTextSelection(7))
      await fire(button("Link"), "click")
      await advance(500)
      snapshot()
      await fire(TITLE_INPUT, "input", { target: { value: "documentation" } })
      await fire(dialogButton("Save"), "click")
      await advance(500)
      snapshot()
    })
    expectSame(result)
    expect(result.react[1]).toContain('markdown: "See [documentation](https://a.com) now"')
  })

  test("link text and URL are taken as written, not as HTML", async () => {
    const result = await walkEditor({ defaultValue: "Read the docs today" }, async ({ snapshot, command, fire, advance }) => {
      await command((e) => e.commands.setTextSelection({ from: 10, to: 14 }))
      await fire(button("Link"), "click")
      await advance(500)
      await fire(URL_INPUT, "input", { target: { value: 'https://example.com/?q="x"' } })
      await fire(TITLE_INPUT, "input", { target: { value: "a <b>bold</b> guide" } })
      await fire(dialogButton("Save"), "click")
      await advance(500)
      snapshot()
    })
    expectSame(result)
    expect(result.react[0]).toContain('<a href="https://example.com/?q="x"" rel="noopener noreferrer nofollow" target="_blank">')
    expect(result.react[0]).toContain('"a <b>bold</b> guide"')
  })

  test("saving an empty URL unsets the link", async () => {
    expectSame(
      await walkEditor({ defaultValue: "See [docs](https://a.com) now" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection(7))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(URL_INPUT, "input", { target: { value: "" } })
        await fire(dialogButton("Save"), "click")
        await advance(500)
        snapshot()
      }),
    )
  })

  test("Enter saves, Escape and Cancel close, the overlay cancels", async () => {
    expectSame(
      await walkEditor({ defaultValue: "One two three" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection({ from: 1, to: 4 }))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(URL_INPUT, "input", { target: { value: "https://one.com" } })
        await fire(URL_INPUT, "keyDown", { key: "Enter" }, "Enter in the dialog")
        await advance(500)
        snapshot()

        await command((e) => e.commands.setTextSelection({ from: 5, to: 8 }))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(TITLE_INPUT, "keyDown", { key: "Escape" }, "Escape in the dialog")
        await advance(500)
        snapshot()

        await command((e) => e.commands.setTextSelection({ from: 5, to: 8 }))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(dialogButton("Cancel"), "click")
        await advance(500)
        snapshot()

        await command((e) => e.commands.setTextSelection({ from: 5, to: 8 }))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(".Overlay", "pointerDown", { button: 0, pointerType: "mouse" })
        await fire(".Overlay", "click")
        await advance(500)
        expect(document.querySelector('[role="dialog"]')).toBeNull()
        expect(markdown()).toBe("[One](https://one.com) two three")
        snapshot()
      }),
    )
  })

  test("dialog presses preserve the selected text instead of focusing the editor end", async () => {
    expectSame(
      await walkEditor({ defaultValue: "Pick a word here" }, async ({ snapshot, command, fire, advance }) => {
        await command((e) => e.commands.setTextSelection({ from: 8, to: 12 }))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(URL_INPUT, "mouseDown")
        await fire('[role="dialog"] .Title', "mouseDown")
        await advance(500)
        expect(editorOf().state.selection.from).toBe(8)
        expect(editorOf().state.selection.to).toBe(12)
        await fire(URL_INPUT, "input", { target: { value: "https://example.com" } })
        await fire(dialogButton("Save"), "click")
        await advance(500)
        snapshot()
        expect(markdown()).toBe("Pick a [word](https://example.com) here")
        expect(document.activeElement).toBe(resolve(PM))
      }),
    )
  })

  test.each(["Save", "Cancel", "Remove"])("%s preserves focus moved outside while the link dialog closes", async (action) => {
    const finalFocus: string[] = []
    const result = await walk(
      { defaultValue: "See [docs](https://example.com)" },
      (state) => <div>{reactEditor(state)}<input id="external-field" aria-label="Next field" /></div>,
      (state) => h("div", [vueEditor(state), h("input", { id: "external-field", "aria-label": "Next field" })]),
      async ({ command, fire, focus, advance, snapshot }) => {
        await command((e) => e.commands.setTextSelection(7))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(dialogButton(action), "click")
        // A consumer or the user moves on while the dialog exit transition runs.
        await focus("#external-field")
        expect(document.activeElement).toBe(resolve("#external-field"))
        await advance(500)
        expect(document.querySelector('[role="dialog"]')).toBeNull()
        finalFocus.push(document.activeElement?.id ?? "")
        snapshot()

        // Skipping one restore must not suppress a later ordinary dismissal.
        await command((e) => e.commands.setTextSelection({ from: 5, to: 9 }))
        await fire(button("Link"), "click")
        await advance(500)
        await fire(dialogButton("Cancel"), "click")
        await advance(500)
        expect(document.activeElement).toBe(resolve(PM))
        snapshot()
      },
    )
    expectSame(result)
    expect(finalFocus).toEqual(["external-field", "external-field"])
  })

  test("IME confirmation does not submit the link dialog", async () => {
    expectSame(await walkEditor({ defaultValue: "word" }, async ({ command, fire, advance, snapshot }) => {
      await command((e) => e.commands.setTextSelection({ from: 1, to: 5 }))
      await fire(button("Link"), "click")
      await advance(500)
      await fire(URL_INPUT, "input", { target: { value: "https://example.com" } })
      await fire(TITLE_INPUT, "keyDown", { key: "Enter", isComposing: true })
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
      expect(markdown()).toBe("word")
      await fire(TITLE_INPUT, "keyDown", { key: "Enter", isComposing: false })
      await advance(500)
      expect(markdown()).toBe("[word](https://example.com)")
      snapshot()
    }))
  })

  test("disabling an open link dialog blocks saving and removing", async () => {
    expectSame(await walkEditor({ defaultValue: "See [docs](https://example.com)", disabled: false }, async ({ command, fire, set, advance, snapshot }) => {
      await command((e) => e.commands.setTextSelection(7))
      await fire(button("Link"), "click")
      await advance(500)
      await set({ disabled: true })
      const save = dialogButton("Save")()
      if (save) {
        expect(save).toHaveProperty("disabled", true)
        await fire(() => save, "click")
      }
      await advance(500)
      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(markdown()).toBe("See [docs](https://example.com)")
      snapshot()
    }))
  })

  test("external controlled content invalidates an open link selection", async () => {
    expectSame(await walkEditor({ value: "Old word" }, async ({ command, fire, set, advance, snapshot }) => {
      await command((e) => e.commands.setTextSelection({ from: 5, to: 9 }))
      await fire(button("Link"), "click")
      await advance(500)
      await set({ value: "Replacement text" })
      await advance(500)
      expect(document.querySelector('[role="dialog"]')).toBeNull()
      expect(markdown()).toBe("Replacement text")
      snapshot()
    }))
  })

  test("editing one of two separate links with the same URL keeps its own title", async () => {
    expectSame(await walkEditor({ defaultValue: "[First](https://example.com) and [Second](https://example.com)" }, async ({ command, fire, advance, snapshot }) => {
      await command((e) => e.commands.setTextSelection(3))
      await fire(button("Link"), "click")
      await advance(500)
      expect(resolve(TITLE_INPUT)).toHaveProperty("value", "First")
      await fire(dialogButton("Save"), "click")
      await advance(500)
      expect(markdown()).toBe("[First](https://example.com) and [Second](https://example.com)")
      snapshot()
    }))
  })

  test("Enter on a dialog button is that button's: Enter on Cancel does not save", async () => {
    const result = await walkEditor({ defaultValue: "One two three" }, async ({ snapshot, command, fire, advance }) => {
      await command((e) => e.commands.setTextSelection({ from: 1, to: 4 }))
      await fire(button("Link"), "click")
      await advance(500)
      await fire(URL_INPUT, "input", { target: { value: "https://one.com" } })
      await fire(dialogButton("Cancel"), "keyDown", { key: "Enter" }, "Enter on Cancel")
      await advance(500)
      snapshot() // still open, nothing saved
      await fire(dialogButton("Cancel"), "click")
      await advance(500)
      snapshot()
    })
    expectSame(result)
    expect(result.react[0]).toContain('"Enter on Cancel: not prevented"')
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[1]).toContain('markdown: "One two three"')
  })

  test("the dialog is modal: Tab and Shift+Tab wrap around its controls", async () => {
    const result = await walkEditor({ defaultValue: "See [docs](https://a.com) now" }, async ({ snapshot, command, fire, focus, advance }) => {
      await command((e) => e.commands.setTextSelection(7))
      await fire(button("Link"), "click")
      await advance(500)
      expect(document.activeElement).toBe(resolve(URL_INPUT))
      expect(resolve(URL_INPUT).parentElement?.getAttribute("data-focused")).toBe("true")
      snapshot() // the URL field has focus
      await focus(dialogButton("Save"))
      await fire(dialogButton("Save"), "keyDown", { key: "Tab" }, "Tab on Save")
      snapshot() // back to the URL field
      await fire(URL_INPUT, "keyDown", { key: "Tab", shiftKey: true }, "Shift+Tab on the URL field")
      snapshot() // on Save
      await fire(dialogButton("Save"), "keyDown", { key: "Tab", shiftKey: true }, "Shift+Tab on Save")
      await focus(TITLE_INPUT)
      await fire(TITLE_INPUT, "keyDown", { key: "Tab" }, "Tab on the title field")
      snapshot() // left to the browser
    })
    expectSame(result)
    expect(result.react[0]).toContain('role="dialog"')
    expect(result.react[0]).toContain('aria-hidden="true" data-aria-hidden="true"')
    expect(result.react[1]).toContain('focus: URL input')
    expect(result.react[2]).toContain('focus: <button class="Button">')
    expect(result.react[3]).toContain(
      '["Tab on Save: prevented","Shift+Tab on the URL field: prevented","Shift+Tab on Save: not prevented","Tab on the title field: not prevented"]',
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
        await set({ id: "editor", ariaDescribedby: "help", ariaInvalid: true, ariaLabel: "Notes", ariaLabelledby: "notes" })
        snapshot()
        await set({ ariaInvalid: false, ariaDescribedby: undefined, ariaLabel: undefined, ariaLabelledby: undefined })
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

/* ------------------------------------------------------------------ */
/*  Formats and line breaks                                            */
/* ------------------------------------------------------------------ */

// Text typed into the editor as the browser does: each character through
// ProseMirror's handleTextInput, where input rules run, then inserted
const typeText = (text: string) => (e: CoreEditor) => {
  for (const char of text) {
    const { view } = e
    const { from, to } = view.state.selection
    const insert = () => view.state.tr.insertText(char, from, to)
    if (!view.someProp("handleTextInput", (handle) => handle(view, from, to, char, insert))) view.dispatch(insert())
  }
}

const toolbarLabels = () =>
  Array.from(document.querySelectorAll(".Toolbar button, .Toolbar .ToolbarSeparator")).map((element) =>
    element.tagName === "BUTTON" ? element.getAttribute("aria-label") : "|",
  )

const BOLD_AND_LINK: MarkdownEditorFormat[] = ["bold", "link"]

// A paste event's init with what the clipboard holds (jsdom has no DataTransfer)
const clipboard = (data: Record<string, string>) => ({ clipboardData: { getData: (type: string) => data[type] ?? "" } })

describe("MarkdownEditor parity: formats", () => {
  const formatCases: Array<[string, Case]> = [
    ["bold and link", { formats: BOLD_AND_LINK }],
    ["lists only, in either order", { formats: ["bulletList", "orderedList"] }],
    ["one list", { formats: ["bulletList"] }],
    ["none: no toolbar", { formats: [] }],
    ["none with toolbarEnd: the end slot without a separator", { formats: [], toolbarEnd: true }],
    ["bold and link with toolbarEnd", { formats: BOLD_AND_LINK, toolbarEnd: true }],
    ["incoming markdown keeps the text of formats left out", { formats: BOLD_AND_LINK, defaultValue: ALL_FORMATTING_MD }],
  ]

  test.each(formatCases)("renders the same: %s", async (_name, props) => {
    const pair = await renderPair(reactEditor(props), () => vueEditor(props))
    expect(pair.vue).toBe(pair.react)
  })

  test("the toolbar offers the formats in their groups, a separator between two groups", async () => {
    const expected: Array<[MarkdownEditorFormat[] | undefined, Array<string | null>]> = [
      [undefined, ["Bold", "Italic", "|", "Numbered list", "Bullet list", "|", "Link"]],
      [BOLD_AND_LINK, ["Bold", "|", "Link"]],
      [["link", "orderedList", "italic"], ["Italic", "|", "Numbered list", "|", "Link"]],
      [["bulletList"], ["Bullet list"]],
      [[], []],
    ]
    for (const [formats, labels] of expected) {
      for (const mount of [
        () => render(reactEditor({ formats })).unmount,
        () => mountVue(() => vueEditor({ formats })).unmount,
      ]) {
        const unmount = mount()
        await flushVue()
        expect(toolbarLabels()).toEqual(labels)
        expect(document.querySelector(".Toolbar") !== null).toBe(labels.length > 0)
        unmount()
        cleanup()
      }
    }
  })

  test("markdown with formats left out keeps their text, with no markers, and does not write them", async () => {
    expectSame(
      await walkEditor({ formats: BOLD_AND_LINK, defaultValue: ALL_FORMATTING_MD }, async ({ snapshot }) => {
        snapshot()
        expect(document.querySelector(`${PM} em, ${PM} ul, ${PM} ol, ${PM} li`)).toBeNull()
        expect(document.querySelectorAll(`${PM} strong, ${PM} a`)).toHaveLength(3)
        expect(markdown()).toBe(
          "This is regular text with **bold** and italic formatting.\n\n" +
            "Read our [Privacy Policy](https://example.com/privacy) and [Terms of Service](https://example.com/terms) for details.\n\n" +
            "First ordered item\n\nSecond ordered item\n\nThird ordered item\n\n" +
            "Unordered item one\n\nUnordered item two\n\nUnordered item three",
        )
      }),
    )
  })

  test("an item of a list left out is its paragraphs, not an item of the list offered", async () => {
    expectSame(
      await walkEditor({ formats: ["bulletList"], defaultValue: "1. one\n2. two\n   - nested\n\n- three" }, async ({ snapshot }) => {
        snapshot()
        // Two bullet lists side by side stay two lists
        expect(markdown()).toBe("one\n\ntwo\n\n- nested\n\n\n- three")
      }),
    )
  })

  test("a format left out has no shortcut", async () => {
    expectSame(
      await walkEditor({ formats: BOLD_AND_LINK, defaultValue: "Shortcut text here" }, async ({ snapshot, command, key, focus }) => {
        await focus(PM)
        await command((e) => e.commands.setTextSelection({ from: 1, to: 9 }))
        await key({ key: "i", ctrlKey: true })
        await key({ key: "7", ctrlKey: true, shiftKey: true })
        await key({ key: "8", ctrlKey: true, shiftKey: true })
        expect(markdown()).toBe("Shortcut text here")
        await key({ key: "b", ctrlKey: true })
        expect(markdown()).toBe("**Shortcut** text here")
        snapshot()
      }),
    )
  })

  test("a format left out has no input rule; one offered still has", async () => {
    const typed = "*soft* and **strong**"
    expectSame(
      await walkEditor({ formats: BOLD_AND_LINK }, async ({ snapshot, command, key, focus }) => {
        await focus(PM)
        await command(typeText("- "))
        await command(typeText("one"))
        await key({ key: "Enter" })
        await command(typeText("1. two"))
        await key({ key: "Enter" })
        await command(typeText(typed))
        snapshot()
        expect(document.querySelector(`${PM} ul, ${PM} ol, ${PM} em`)).toBeNull()
        expect(markdown()).toBe("\\- one\n\n1\\. two\n\n\\*soft\\* and **strong**")
      }),
    )
    // The same typing with every format makes a list
    expectSame(
      await walkEditor({}, async ({ snapshot, command, focus }) => {
        await focus(PM)
        await command(typeText("- one *soft*"))
        snapshot()
        expect(markdown()).toBe("- one *soft*")
      }),
    )
  })

  test("pasted text keeps the markers of the formats left out as text, pasted HTML keeps their text without them", async () => {
    expectSame(
      await walkEditor({ formats: ["bold"] }, async ({ snapshot, command, fire, focus }) => {
        await focus(PM)
        await fire(PM, "paste", clipboard({ "text/plain": "**b** *i* [l](https://example.com)\n\n- one\n1. two" }))
        // A pasted newline is a line break, as it was with every format (ProseMirror keeps the pasted lines)
        expect(markdown()).toBe("**b** \\*i\\* \\[l\\](https://example.com)\n\n\\- one\\\n1\\. two")
        await command((e) => e.commands.clearContent(true))
        await fire(PM, "paste", clipboard({
          "text/html": '<p><strong>b</strong> <em>i</em> <a href="https://example.com">l</a></p><ul><li>one</li></ul><ol><li>two</li></ol>',
        }))
        expect(markdown()).toBe("**b** i l\n\none\n\ntwo")
        snapshot()
      }),
    )
  })

  // Pasted text reads as it would be typed: what a format left out or a block never offered would open stays text with
  // its markers, a format offered still reads, and the markdown written reads back the same
  test("pasted text reads as typed and reads back the same", async () => {
    const pastes: Array<[pasted: string, text: string, written: string]> = [
      ["- one\n- two", "- one\n- two", "\\- one\n\\- two"],
      ["*it* and **b**", "*it* and b", "\\*it\\* and **b**"],
      ["# Title\n> quote\n1. first", "# Title\n> quote\n1. first", "\\# Title\n&gt; quote\n1\\. first"],
      [
        "```\ncode\n```\n---\n~~gone~~ `tick`",
        "```\ncode\n```\n---\n~~gone~~ `tick`",
        "\\`\\`\\`\ncode\n\\`\\`\\`\n\\---\n\\~\\~gone\\~\\~ \\`tick\\`",
      ],
      [
        "Title\n===\nx | y\n|---|---|\n![alt](https://example.com/a.png)",
        "Title\n===\nx | y\n|---|---|\n![alt](https://example.com/a.png)",
        // The URL is a link, as a pasted URL is where links are offered
        "Title\n\\===\nx | y\n\\|---|---|\n!\\[alt\\](<https://example.com/a.png>)",
      ],
      ["[a link](https://example.com) and __bold__", "a link and bold", "[a link](https://example.com) and **bold**"],
    ]
    expectSame(
      await walkEditor({ formats: BOLD_AND_LINK, breaks: true }, async ({ snapshot, command, fire, focus }) => {
        await focus(PM)
        for (const [pasted, text, written] of pastes) {
          await command((e) => e.commands.clearContent(true))
          await fire(PM, "paste", clipboard({ "text/plain": pasted }))
          expect(editorOf().getText(), pasted).toBe(text)
          expect(markdown(), pasted).toBe(written)
          const doc = editorOf().getJSON()
          await command((e) => e.commands.setContent(written))
          expect(editorOf().getJSON(), pasted).toEqual(doc)
          snapshot()
        }
        // A plain-text paste (Shift) is left to ProseMirror: a paragraph a line
        await command((e) => e.commands.clearContent(true))
        await fire(PM, "keyDown", { key: "Shift", keyCode: 16, shiftKey: true })
        await fire(PM, "paste", clipboard({ "text/plain": "- one\n**b**" }))
        // Bold's paste rule still reads "**b**", as with every format
        expect(markdown()).toBe("\\- one\n\n**b**")
        await fire(PM, "keyUp", { key: "Shift", keyCode: 16 })
      }),
    )
  })

  test("pasted text with one list and one of bold and italic offered keeps the markers of the other", async () => {
    const pasted = "- a\n- 2) c\n\n1. b\n\n**strong** *em* __s__ _e_\n\n![img](x) [l](y)"
    expectSame(
      await walkEditor({ formats: ["italic", "bulletList"], breaks: true }, async ({ snapshot, command, fire, focus }) => {
        await focus(PM)
        await fire(PM, "paste", clipboard({ "text/plain": pasted }))
        expect(document.querySelectorAll(`${PM} ul > li`)).toHaveLength(2)
        expect(Array.from(document.querySelectorAll(`${PM} em`), (em) => em.textContent)).toEqual(["em", "e"])
        expect(Array.from(document.querySelectorAll(`${PM} p`), (p) => p.textContent)).toEqual(["a", "2) c", "1. b", "**strong** em __s__ e", "![img](x) [l](y)"])
        const written = markdown()
        expect(written).toBe("- a\n- 2\\) c\n\n1\\. b\n\n\\*\\*strong\\*\\* *em* \\_\\_s\\_\\_ *e*\n\n!\\[img\\](x) \\[l\\](y)")
        const doc = editorOf().getJSON()
        await command((e) => e.commands.setContent(written))
        expect(editorOf().getJSON()).toEqual(doc)
        snapshot()
      }),
    )
  })

  test("pasted text: white space that would start code, an image in an autolink, an image by reference", async () => {
    // The document read back: markdown drops the white space at the start of a paragraph
    const trimmed = (doc: JSONContent): JSONContent => {
      const [paragraph] = doc.content!
      const [first, ...rest] = paragraph!.content!
      const text = first!.text!.trimStart()
      return { ...doc, content: [{ ...paragraph, content: text ? [{ ...first, text }, ...rest] : rest }] }
    }
    expectSame(
      await walkEditor({ formats: BOLD_AND_LINK, breaks: true }, async ({ snapshot, command, fire, focus }) => {
        await focus(PM)
        // Pasted, the spaces stay; written, they would start code, so they are not
        for (const [pasted, written] of [["    _x_", "\\_x\\_"], ["    **bold**", "**bold**"]]) {
          await command((e) => e.commands.clearContent(true))
          await fire(PM, "paste", clipboard({ "text/plain": pasted }))
          expect(editorOf().getText()).toBe(pasted.replace("**", "").replace("**", ""))
          const doc = editorOf().getJSON()
          expect(markdown(), pasted).toBe(written)
          await command((e) => e.commands.setContent(markdown()))
          expect(editorOf().getJSON(), pasted).toEqual(trimmed(doc))
        }
        // An autolink keeps its address; an image by reference is its source text, the definition is a link's
        await command((e) => e.commands.clearContent(true))
        await fire(PM, "paste", clipboard({ "text/plain": "<https://plexui.com/![a]>" }))
        expect(editorOf().getText()).toBe("https://plexui.com/![a]")
        expect(markdown()).toBe("<https://plexui.com/![a]>")
        await command((e) => e.commands.setContent(markdown()))
        // markdown-it percent-encodes the brackets of the address it reads: the same address
        expect(editorOf().getText()).toBe("https://plexui.com/![a]")
        expect(decodeURI(document.querySelector(`${PM} a`)!.getAttribute("href")!)).toBe("https://plexui.com/![a]")
        await command((e) => e.commands.clearContent(true))
        await fire(PM, "paste", clipboard({ "text/plain": "![alt][logo] and ![x](x.png)\n\n[logo]: https://plexui.com/img.png" }))
        expect(editorOf().getText()).toBe("![alt][logo] and ![x](x.png)")
        expect(document.querySelector(`${PM} a`)).toBeNull()
        expect(markdown()).toBe("!\\[alt\\]\\[logo\\] and !\\[x\\](x.png)")
        const doc = editorOf().getJSON()
        await command((e) => e.commands.setContent(markdown()))
        expect(editorOf().getJSON()).toEqual(doc)
        snapshot()
      }),
    )
  })

  test("pasted text: a link title over two lines, a list marker inside an image of a list left out", async () => {
    expectSame(
      await walkEditor({ formats: ["link", "bulletList"], breaks: true }, async ({ snapshot, command, fire, focus }) => {
        await focus(PM)
        // The title's line ending is written as a reference: its second line would start a heading
        await fire(PM, "paste", clipboard({ "text/plain": '[a](https://plexui.com "title\n# h &amp;lt;")' }))
        expect(document.querySelector(`${PM} a`)?.getAttribute("title")).toBe("title\n# h &lt;")
        expect(markdown()).toBe('[a](https://plexui.com "title&#10;# h &amp;lt;")')
        let doc = editorOf().getJSON()
        await command((e) => e.commands.setContent(markdown()))
        expect(editorOf().getJSON()).toEqual(doc)
        // A backslash before a line ending, a quote or the end, and one before a letter, read back as they were
        const title = 'a\\\nb " c\\d &lt; \\'
        await command((e) =>
          e.commands.setContent({
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "https://plexui.com", title } }] }] }],
          }),
        )
        expect(markdown()).toBe('[x](https://plexui.com "a\\\\&#10;b \\" c\\d &amp;lt; \\\\")')
        await command((e) => e.commands.setContent(markdown()))
        expect(document.querySelector(`${PM} a`)?.getAttribute("title")).toBe(title)
        // An image keeps its source as it was pasted; an ordered marker opens no list and ends no paragraph
        await command((e) => e.commands.clearContent(true))
        await fire(PM, "paste", clipboard({ "text/plain": "![a\n2. b](c)\n1. d\n- e" }))
        const [first, list] = editorOf().getJSON().content!
        expect(first!.content!.map((node) => node.text ?? "\n").join("")).toBe("![a\n2. b](c)\n1. d")
        expect(list!.type).toBe("bulletList")
        expect(markdown()).toBe("!\\[a\n2\\. b\\](c)\n1\\. d\n\n- e")
        doc = editorOf().getJSON()
        await command((e) => e.commands.setContent(markdown()))
        expect(editorOf().getJSON()).toEqual(doc)
        snapshot()
      }),
    )
  })

  test("with every format, pasted text reads as before: a heading is its text, a newline a line break", async () => {
    expectSame(
      await walkEditor({}, async ({ snapshot, command, fire, focus }) => {
        await focus(PM)
        await fire(PM, "paste", clipboard({ "text/plain": "# Title\n- *one*" }))
        expect(markdown()).toBe("Title\n\n- *one*")
        await command((e) => e.commands.clearContent(true))
        await fire(PM, "paste", clipboard({ "text/plain": "a\nb" }))
        expect(markdown()).toBe("a\\\nb")
        snapshot()
      }),
    )
  })

  test("formats and breaks are read when the editor is created", async () => {
    expectSame(
      await walkEditor({ formats: BOLD_AND_LINK, defaultValue: "a\nb" } as Case, async ({ snapshot, set }) => {
        await set({ formats: ["italic"], breaks: true })
        snapshot()
        expect(toolbarLabels()).toEqual(["Bold", "|", "Link"])
        expect(markdown()).toBe("a b")
      }),
    )
  })
})

describe("MarkdownEditor parity: escapes", () => {
  // The writer escapes "<" and ">", and the "&" of what markdown reads as a character reference, so typed text that
  // looks like one keeps its characters when read again
  test("typed text that looks like a character reference reads back the same", async () => {
    const typed = "&lt; &amp; &#60; &#x3C; &copy; & AT&T &nbsp <b> &foo;"
    expectSame(
      await walkEditor({}, async ({ snapshot, command }) => {
        await command((e) => e.commands.setContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: typed }] }] }))
        const written = markdown()
        expect(written).toBe("&amp;lt; &amp;amp; &amp;#60; &amp;#x3C; &amp;copy; & AT&T &nbsp &lt;b&gt; &amp;foo;")
        await command((e) => e.commands.setContent(written))
        expect(editorOf().getText()).toBe(typed)
        snapshot()
      }),
    )
  })

  // prosemirror-markdown keeps a "_" with a word character or another "_" on each side, so "__s__" read back italic
  test("a run of underscores stays as it is only inside a word, and reads back the same", async () => {
    const typed = "__s__ a__b _x_ snake_case Foo_(bar) é_é ___"
    expectSame(
      await walkEditor({}, async ({ snapshot, command }) => {
        const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: typed }] }] }
        await command((e) => e.commands.setContent(doc))
        const written = markdown()
        expect(written).toBe("\\_\\_s\\_\\_ a__b \\_x\\_ snake_case Foo\\_(bar) é_é \\_\\_\\_")
        await command((e) => e.commands.setContent(written))
        expect(editorOf().getJSON()).toEqual(doc)
        snapshot()
      }),
    )
  })

  // markdown reads no escape in an autolink: an escaped "_" or "~" would end up in the link's address
  test("the URL of an autolink is written as it is and reads back the same", async () => {
    const url = "https://en.wikipedia.org/wiki/Foo_(bar)/~x*y"
    expectSame(
      await walkEditor({}, async ({ snapshot, command }) => {
        const link = { type: "link", attrs: { href: url } }
        await command((e) =>
          e.commands.setContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "see " }, { type: "text", text: url, marks: [link] }] }] }),
        )
        const doc = editorOf().getJSON()
        const written = markdown()
        expect(written).toBe(`see <${url}>`)
        await command((e) => e.commands.setContent(written))
        expect(editorOf().getJSON()).toEqual(doc)
        snapshot()
      }),
    )
  })
})

describe("MarkdownEditor parity: line breaks", () => {
  test("breaks: a single newline is a line break, written as one newline", async () => {
    expectSame(
      await walkEditor({ breaks: true, defaultValue: "line one\nline two\\\nthree  \nfour\n\nnext" }, async ({ snapshot, command, key, focus }) => {
        snapshot()
        expect(document.querySelectorAll(`${PM} p:first-child br`)).toHaveLength(3)
        expect(markdown()).toBe("line one\nline two\nthree\nfour\n\nnext")
        await focus(PM)
        await command((e) => e.commands.focus("end"))
        await key({ key: "Enter", shiftKey: true })
        await command(typeText("after"))
        expect(markdown()).toBe("line one\nline two\nthree\nfour\n\nnext\nafter")
        snapshot()
      }),
    )
  })

  test("without breaks a single newline joins the lines and a line break is a backslash and a newline", async () => {
    expectSame(
      await walkEditor({ defaultValue: "line one\nline two\\\nthree" }, async ({ snapshot }) => {
        snapshot()
        expect(markdown()).toBe("line one line two\\\nthree")
      }),
    )
  })

  // A line after a line break starts a line of the markdown: what would open a list, a heading or a rule there is
  // escaped, so the text reads back as it was, without the white space markdown drops at the start of a line
  test.each([false, true])("a line after a break keeps its text when read again (breaks: %s)", async (breaks) => {
    const lines = ["- b", "+ b", "# b", "1. b", "1) b", "===", "  - b", "    - b", "\t- b", "-5 degrees", "3.14 is pi", "2024 was"]
    expectSame(
      await walkEditor({ breaks }, async ({ snapshot, command }) => {
        for (const line of lines) {
          // At the start of a paragraph, white space of four columns would start code: it is not written
          const doc = {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: line }] },
              { type: "paragraph", content: [{ type: "text", text: line }] },
            ],
          }
          const read = JSON.parse(JSON.stringify(doc).replaceAll(JSON.stringify(line), JSON.stringify(line.trimStart())))
          await command((e) => e.commands.setContent(doc))
          const written = markdown()
          await command((e) => e.commands.setContent(written))
          expect(editorOf().getJSON(), `${line} as ${JSON.stringify(written)}`).toEqual(read)
        }
        snapshot()
      }),
    )
  })

  // With breaks, "\n" ends a line of text; a break that would leave a blank line is a backslash and a newline
  test.each([false, true])("line breaks at the start and in a row keep their lines when read again (breaks: %s)", async (breaks) => {
    const text = (value: string): { type: string; text?: string } => ({ type: "text", text: value })
    const hardBreak: { type: string; text?: string } = { type: "hardBreak" }
    const paragraphs = [
      [hardBreak, text("b")],
      [text("a"), hardBreak, hardBreak, text("b")],
      [text("a"), hardBreak, hardBreak, hardBreak, text("b")],
      [text("a"), hardBreak, text("  "), hardBreak, text("b")],
      [text("a"), hardBreak],
    ]
    const written: string[] = []
    expectSame(
      await walkEditor({ breaks }, async ({ command }) => {
        for (const content of paragraphs) {
          const doc = { type: "doc", content: [{ type: "paragraph", content }] }
          await command((e) => e.commands.setContent(doc))
          const markdownText = markdown()
          written.push(markdownText)
          await command((e) => e.commands.setContent(markdownText))
          // A break at the end of a paragraph is not written, as before, and markdown drops the spaces at the start
          // of a line
          const read = content.filter((node, index) => !(node === hardBreak && index === content.length - 1) && !(node.text?.trim() === ""))
          const expected = { type: "doc", content: [{ type: "paragraph", content: read }] }
          expect(editorOf().getJSON(), JSON.stringify(markdownText)).toEqual(expected)
        }
      }),
    )
    expect(written.slice(0, paragraphs.length)).toEqual(
      breaks
        ? ["\\\nb", "a\n\\\nb", "a\n\\\n\\\nb", "a\n  \\\nb", "a"]
        : ["\\\nb", "a\\\n\\\nb", "a\\\n\\\n\\\nb", "a\\\n  \\\nb", "a"],
    )
  })

  test.each([false, true])("white space before an opener after a break: a tab in a list item, marked spaces (breaks: %s)", async (breaks) => {
    const text = (value: string, marks?: object[]) => ({ type: "text", text: value, ...(marks && { marks }) })
    const docs = [
      [
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("a"), { type: "hardBreak" }, text("\t===")] }] }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("a"), { type: "hardBreak" }, text("===")] }] }] },
      ],
      [
        { type: "paragraph", content: [text("a"), { type: "hardBreak" }, text("  ", [{ type: "bold" }]), text("===")] },
        { type: "paragraph", content: [text("a"), { type: "hardBreak" }, text("===")] },
      ],
      [
        { type: "paragraph", content: [text("a"), { type: "hardBreak" }, text("  ", [{ type: "bold" }]), text("- b")] },
        { type: "paragraph", content: [text("a"), { type: "hardBreak" }, text("- b")] },
      ],
    ]
    // A break ends with its paragraph: the next one starts as a paragraph does, where four spaces would start code, so
    // they are not written and its opener is escaped
    const nextParagraph = {
      type: "doc",
      content: [
        { type: "paragraph", content: [text("a"), { type: "hardBreak" }, text(" ")] },
        { type: "paragraph", content: [text("    - b")] },
      ],
    }
    expectSame(
      await walkEditor({ breaks }, async ({ command }) => {
        for (const [written, read] of docs) {
          await command((e) => e.commands.setContent({ type: "doc", content: [written] }))
          const markdownText = markdown()
          await command((e) => e.commands.setContent(markdownText))
          expect(editorOf().getJSON(), JSON.stringify(markdownText)).toEqual(editorOf().schema.nodeFromJSON({ type: "doc", content: [read] }).toJSON())
        }
        await command((e) => e.commands.setContent(nextParagraph))
        expect(markdown()).toMatch(/\n\n\\- b$/)
        await command((e) => e.commands.setContent(markdown()))
        expect(editorOf().getJSON().content?.[1]).toEqual({ type: "paragraph", content: [text("- b")] })
      }),
    )
  })

  test("what the lines are written as", async () => {
    expectSame(
      await walkEditor({ breaks: true }, async ({ command }) => {
        const written: string[] = []
        for (const line of ["- b", "1) b", "===", "  - b", "    - b", "3.14 is pi"]) {
          await command((e) =>
            e.commands.setContent({
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: line }] }],
            }),
          )
          written.push(markdown())
        }
        expect(written).toEqual(["a\n\\- b", "a\n1\\) b", "a\n\\===", "a\n  \\- b", "a\n    \\- b", "a\n3.14 is pi"])
      }),
    )
  })
})
