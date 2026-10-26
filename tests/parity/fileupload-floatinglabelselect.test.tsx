import { cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useState, type ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { defineComponent, h, ref } from "vue"
import {
  FileCard as RFileCard,
  FileCardGroup as RFileCardGroup,
  FileUpload as RFileUpload,
} from "../../packages/ui/src/components/FileUpload"
import { FloatingLabelSelect as RFloatingLabelSelect } from "../../packages/ui/src/components/FloatingLabelSelect"
import { FileCard, FileCardGroup, FileUpload } from "../../packages/vue/src/components/FileUpload"
import { FloatingLabelSelect } from "../../packages/vue/src/components/FloatingLabelSelect"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { interact, renderPair, walkPair } from "./pair"

type Props = Record<string, unknown>

// ---------------------------------------------------------------------------
// Fixtures shared by both frameworks
// ---------------------------------------------------------------------------

const file = (name: string, size: number, type = "") => new File([new Uint8Array(size)], name, { type, lastModified: 1 })

const PDF = file("government-id-scan.pdf", 2100 * 1024, "application/pdf")
const PNG = file("passport-photo.png", 340 * 1024, "image/png")
const LONG = file("non-citizen-travel-2026-approved-document.pdf", 1500 * 1024, "application/pdf")

/** A FileList stand-in: indexable, iterable, with item() */
const fileList = (files: File[]) => Object.assign([...files], { item: (index: number) => files[index] ?? null })

/** The same DataTransfer stub for both frameworks (jsdom has no DataTransfer) */
const dataTransfer = (files: File[]) => ({
  files: fileList(files),
  items: files.map((f) => ({ kind: "file", type: f.type, getAsFile: () => f })),
  types: ["Files"],
  dropEffect: "none",
  effectAllowed: "all",
  getData: () => "",
  setData: () => {},
  clearData: () => {},
})

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement

/** Picks files through the hidden input, as the browser's file dialog does */
const selectFiles = async (files: File[]) => {
  const input = fileInput()
  Object.defineProperty(input, "files", { value: fileList(files), configurable: true })
  await interact(() => {
    fireEvent.change(input)
  })
}

const names = (files: unknown) => (files as File[]).map((f) => f.name)

// React-only props become Vue equivalents: className -> class, callbacks -> listeners
const toVueFileUpload = (props: Props) => {
  const { className, onValueChange, onFileReject, ...rest } = props
  return {
    ...rest,
    ...(className ? { class: className } : {}),
    ...(onValueChange ? { "onUpdate:value": onValueChange } : {}),
    ...(onFileReject ? { onFileReject } : {}),
  }
}

// ---------------------------------------------------------------------------
// FileUpload / FileCard / FileCardGroup markup
// ---------------------------------------------------------------------------

const fileUploadCases: Array<[string, Props]> = [
  ["default compact", {}],
  ["compact with label", { label: "Attach documents" }],
  ["area", { variant: "area" }],
  ["area with label and description", { variant: "area", label: "Upload ID", description: "PDF or PNG, up to 10 MB" }],
  ["description is ignored by compact", { description: "Not rendered" }],
  ["area with error message", { variant: "area", id: "docs", errorMessage: "Please upload at least 2 documents." }],
  ["area invalid without message", { variant: "area", invalid: true }],
  ["invalid false with message", { variant: "area", id: "docs", invalid: false, errorMessage: "Required" }],
  ["compact with error message (generated ids)", { errorMessage: "Required" }],
  ["accept, multiple, id, class", { accept: ".pdf,.png", multiple: true, id: "docs", className: "w-full" }],
  ["aria-describedby", { "aria-describedby": "hint" }],
  ["aria-describedby and error", { "id": "docs", "aria-describedby": "hint", "errorMessage": "Required" }],
  ["disabled compact", { disabled: true }],
  ["disabled area", { variant: "area", disabled: true }],
  ["controlled files, compact", { value: [PDF, PNG, LONG] }],
  ["controlled files, area", { variant: "area", value: [PDF, PNG] }],
  ["controlled empty list", { value: [] }],
  ["at maxFiles the trigger disables", { maxFiles: 2, value: [PDF, PNG] }],
  ["at maxFiles, area", { variant: "area", maxFiles: 1, value: [PDF] }],
  ["maxFiles 0 means no limit", { maxFiles: 0, value: [PDF] }],
  ["disabled with files disables remove buttons", { disabled: true, value: [PDF, PNG] }],
  ["value null falls back to the internal list", { value: null }],
  ["other attributes are dropped", { "data-testid": "upload", "style": { color: "red" }, "aria-invalid": true, "title": "t" }],
]

describe("FileUpload parity", () => {
  test.each(fileUploadCases)("%s", async (_name, props) => {
    const { react, vue } = await renderPair(createElement(RFileUpload, props as never), () =>
      h(FileUpload, toVueFileUpload(props) as never),
    )
    expect(vue).toBe(react)
  })

  test("browser animation mode", async () => {
    animation.disabled = false
    const props = { value: [PDF], errorMessage: "Required" }
    const { react, vue } = await renderPair(createElement(RFileUpload, props as never), () => h(FileUpload, props as never))
    expect(vue).toBe(react)
  })
})

const cardFiles: Array<[string, File]> = [
  ["pdf by type", file("brief", 2400 * 1024, "application/pdf")],
  ["docx by name", file("Contract.DOCX", 12_345)],
  ["txt", file("notes.txt", 512)],
  ["rtf", file("letter.rtf", 0)],
  ["image by type", file("scan.heic", 3 * 1024 * 1024, "image/heic")],
  ["image by extension", file("photo.JPEG", 1023)],
  ["svg", file("logo.svg", 1024)],
  ["other type", file("archive.tar.gz", 5_500_000, "application/gzip")],
  ["dotfile keeps the whole name as stem", file(".env", 10)],
  ["no extension", file("README", 2048)],
]

describe("FileCard parity", () => {
  test.each(cardFiles)("read-only: %s", async (_name, f) => {
    const { react, vue } = await renderPair(createElement(RFileCard, { file: f }), () => h(FileCard, { file: f }))
    expect(vue).toBe(react)
  })

  const noop = () => {}
  const cases: Array<[string, Props]> = [
    ["with remove", { file: PDF, onRemove: noop }],
    ["with remove, disabled", { file: PNG, onRemove: noop, disabled: true }],
    ["disabled without remove", { file: PNG, disabled: true }],
    ["class", { file: LONG, className: "extra" }],
    ["other attributes are dropped", { "file": PDF, "data-x": "1", "title": "t" }],
  ]
  test.each(cases)("%s", async (_name, props) => {
    const { className, ...rest } = props
    const { react, vue } = await renderPair(createElement(RFileCard, props as never), () =>
      h(FileCard, { ...rest, ...(className ? { class: className } : {}) } as never),
    )
    expect(vue).toBe(react)
  })

  test("group with cards and class", async () => {
    const react = createElement(
      RFileCardGroup,
      { className: "w-[360px]" } as never,
      [PDF, PNG].map((f) => createElement(RFileCard, { key: f.name, file: f, onRemove: () => {} })) as ReactNode,
    )
    const { react: reactDom, vue } = await renderPair(react, () =>
      h(FileCardGroup, { class: "w-[360px]" }, { default: () => [PDF, PNG].map((f) => h(FileCard, { key: f.name, file: f, onRemove: () => {} })) }),
    )
    expect(vue).toBe(reactDom)
  })

  test("empty group", async () => {
    const { react, vue } = await renderPair(createElement(RFileCardGroup, { children: null }), () => h(FileCardGroup))
    expect(vue).toBe(react)
  })
})

// ---------------------------------------------------------------------------
// FileUpload behaviour
// ---------------------------------------------------------------------------

type UploadLog = Array<[string, ...unknown[]]>

/** Mounts the uncontrolled FileUpload in each framework, runs `steps`, returns DOM snapshots and callbacks */
const walkUpload = async (props: Props, steps: (snap: () => void) => Promise<void>) => {
  const reactLog: UploadLog = []
  const vueLog: UploadLog = []
  const callbacks = (log: UploadLog) => ({
    onValueChange: (files: File[]) => log.push(["valueChange", names(files)]),
    onFileReject: (f: File, reason: string) => log.push(["fileReject", f.name, reason]),
  })
  const { react, vue } = await walkPair(
    () => {
      render(createElement(RFileUpload, { ...props, ...callbacks(reactLog) } as never))
    },
    () => h(FileUpload, toVueFileUpload({ ...props, ...callbacks(vueLog) }) as never),
    steps,
  )
  return { react, vue, reactLog, vueLog }
}

describe("FileUpload behaviour parity", () => {
  test("uncontrolled selection, validation, limit and removal", async () => {
    const big = file("big.pdf", 2 * 1024 * 1024, "application/pdf")
    const { react, vue, reactLog, vueLog } = await walkUpload(
      { accept: ".pdf,image/*", multiple: true, maxFiles: 3, maxSize: 1024 * 1024 },
      async (snap) => {
        await selectFiles([file("a.pdf", 100, "application/pdf"), file("b.png", 2048, "image/png"), file("c.txt", 10, "text/plain"), big])
        snap()
        await selectFiles([file("d.pdf", 300 * 1024), file("e.pdf", 1)])
        snap()
        // At the limit: the trigger is disabled
        await interact(() => {
          fireEvent.click(document.querySelector('button[aria-label="Remove a.pdf"]')!)
        })
        snap()
        await selectFiles([])
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('aria-disabled="true"')
    expect(react[2]).not.toContain("a.pdf")
    expect(vueLog).toEqual(reactLog)
    expect(reactLog).toEqual([
      ["fileReject", "c.txt", "File type not accepted: c.txt"],
      ["fileReject", "big.pdf", "File too large: big.pdf (2.0 MB)"],
      ["valueChange", ["a.pdf", "b.png"]],
      ["fileReject", "e.pdf", "Maximum 3 files allowed"],
      ["valueChange", ["a.pdf", "b.png", "d.pdf"]],
      ["valueChange", ["b.png", "d.pdf"]],
    ])
  })

  test("accept matching: extensions, wildcards, exact MIME, case and spaces", async () => {
    const picks = [
      file("UPPER.PDF", 1),
      file("doc.pdf", 1, "application/octet-stream"),
      file("pic", 1, "image/webp"),
      file("clip.mp4", 1, "video/mp4"),
      file("data.json", 1, "application/json"),
      file("sheet.csv", 1, "text/csv"),
    ]
    const { react, vue, reactLog, vueLog } = await walkUpload(
      { accept: " .pdf , IMAGE/* ,application/json", multiple: true },
      async (snap) => {
        await selectFiles(picks)
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(vueLog).toEqual(reactLog)
    expect(reactLog.at(-1)).toEqual(["valueChange", ["UPPER.PDF", "doc.pdf", "pic", "data.json"]])
  })

  test("without multiple, each pick still appends to the list (React quirk)", async () => {
    const { react, vue, reactLog, vueLog } = await walkUpload({}, async (snap) => {
      await selectFiles([PDF])
      snap()
      await selectFiles([PNG])
      snap()
    })
    expect(vue).toEqual(react)
    expect(vueLog).toEqual(reactLog)
    expect(reactLog).toEqual([
      ["valueChange", [PDF.name]],
      ["valueChange", [PDF.name, PNG.name]],
    ])
  })

  test("controlled without updates reports changes but keeps its list", async () => {
    const { react, vue, reactLog, vueLog } = await walkUpload({ value: [PDF], multiple: true }, async (snap) => {
      await selectFiles([PNG])
      snap()
      await interact(() => {
        fireEvent.click(document.querySelector(`button[aria-label="Remove ${PDF.name}"]`)!)
      })
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[1]).toContain(PDF.name)
    expect(vueLog).toEqual(reactLog)
    expect(reactLog).toEqual([
      ["valueChange", [PDF.name, PNG.name]],
      ["valueChange", []],
    ])
  })

  test("controlled by parent state (v-model:value)", async () => {
    function ReactApp() {
      const [files, setFiles] = useState<File[]>([PDF])
      return <RFileUpload variant="area" multiple maxFiles={3} value={files} onValueChange={setFiles} />
    }
    const VueApp = defineComponent({
      setup() {
        const files = ref<File[]>([PDF])
        return () =>
          h(FileUpload, {
            "variant": "area",
            "multiple": true,
            "maxFiles": 3,
            "value": files.value,
            "onUpdate:value": (next: File[]) => (files.value = next),
          })
      },
    })
    const { react, vue } = await walkPair(
      () => {
        render(<ReactApp />)
      },
      () => h(VueApp),
      async (snap) => {
        await selectFiles([PNG, LONG])
        snap()
        await interact(() => {
          fireEvent.click(document.querySelector(`button[aria-label="Remove ${PNG.name}"]`)!)
        })
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain("disabled")
    expect(react[1]).not.toContain(PNG.name)
  })

  test("update:value carries the new list once per change", async () => {
    const updates: string[][] = []
    mountVue(() =>
      h(FileUpload, {
        "multiple": true,
        "onUpdate:value": (files: File[]) => updates.push(names(files)),
      }),
    )
    await flushVue()
    await selectFiles([PDF, PNG])
    expect(updates).toEqual([[PDF.name, PNG.name]])
  })

  test("the trigger clicks the hidden input; disabled and full triggers do not", async () => {
    const counts: Record<string, number[]> = { react: [], vue: [] }
    const scenarios: Props[] = [
      {},
      { variant: "area" },
      { disabled: true },
      { variant: "area", disabled: true },
      { maxFiles: 1, value: [PDF] },
      // The input stays enabled at the limit: only the trigger's disabled state stops the click
      { variant: "area", maxFiles: 1, value: [PDF] },
    ]
    for (const framework of ["react", "vue"] as const) {
      for (const props of scenarios) {
        if (framework === "react") render(createElement(RFileUpload, props as never))
        else mountVue(() => h(FileUpload, props as never))
        await interact(() => {})
        let clicks = 0
        fileInput().addEventListener("click", () => clicks++)
        const trigger = document.querySelector("button") as HTMLButtonElement
        await interact(() => {
          fireEvent.click(trigger)
        })
        counts[framework]!.push(clicks)
        cleanup()
        document.body.innerHTML = ""
      }
    }
    expect(counts.vue).toEqual(counts.react)
    expect(counts.react).toEqual([1, 1, 0, 0, 0, 0])
  })

  test("the input value is cleared after every selection", async () => {
    const sets: Record<string, unknown[]> = { react: [], vue: [] }
    for (const framework of ["react", "vue"] as const) {
      if (framework === "react") render(createElement(RFileUpload, { accept: ".png" }))
      else mountVue(() => h(FileUpload, { accept: ".png" }))
      await interact(() => {})
      Object.defineProperty(fileInput(), "value", {
        configurable: true,
        get: () => "",
        set: (value: unknown) => sets[framework]!.push(value),
      })
      await selectFiles([PNG])
      await selectFiles([PDF]) // rejected, still cleared
      cleanup()
      document.body.innerHTML = ""
    }
    expect(sets.vue).toEqual(sets.react)
    expect(sets.react).toEqual(["", ""])
  })

  test("drag and drop is not handled (React has no drop zone)", async () => {
    const { react, vue, reactLog, vueLog } = await walkUpload({ variant: "area", multiple: true }, async (snap) => {
      const prevented: boolean[] = []
      for (const target of [() => document.querySelector("button")!, () => fileInput(), () => document.querySelector("div")!]) {
        for (const type of ["dragEnter", "dragOver", "drop"] as const) {
          await interact(() => {
            prevented.push(!fireEvent[type](target(), { dataTransfer: dataTransfer([PDF, PNG]) }))
          })
        }
      }
      snap()
      expect(prevented.every((p) => p === false)).toBe(true)
    })
    expect(vue).toEqual(react)
    expect(react[0]).not.toContain(PDF.name)
    expect(reactLog).toEqual([])
    expect(vueLog).toEqual(reactLog)
  })

  test("FileCard remove and disabled remove", async () => {
    const calls: Record<string, number[]> = { react: [], vue: [] }
    for (const framework of ["react", "vue"] as const) {
      for (const disabled of [false, true]) {
        let removed = 0
        const onRemove = () => removed++
        if (framework === "react") render(<RFileCard file={PDF} onRemove={onRemove} disabled={disabled} />)
        else mountVue(() => h(FileCard, { file: PDF, onRemove, disabled }))
        await interact(() => {})
        await interact(() => {
          fireEvent.click(document.querySelector("button")!)
        })
        calls[framework]!.push(removed)
        cleanup()
        document.body.innerHTML = ""
      }
    }
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react).toEqual([1, 0])
  })
})

// ---------------------------------------------------------------------------
// FloatingLabelSelect markup
// ---------------------------------------------------------------------------

const toVueSelect = (props: Props) => {
  const { className, children, ...rest } = props
  return {
    props: { ...rest, ...(className ? { class: className } : {}) },
    slots: children === undefined ? {} : { default: () => [h("strong", String(children))] },
  }
}
const toReactSelect = (props: Props) => {
  const { children, ...rest } = props
  return { ...rest, ...(children === undefined ? {} : { children: <strong>{String(children)}</strong> }) }
}

const pairSelect = (props: Props) => {
  const vue = toVueSelect(props)
  return renderPair(createElement(RFloatingLabelSelect, toReactSelect(props) as never), () =>
    h(FloatingLabelSelect, vue.props as never, vue.slots),
  )
}

const noop = () => {}
const selectCases: Array<[string, Props]> = [
  ["label only", { label: "Role" }],
  ["selected with content", { label: "Role", selected: true, children: "Designer" }],
  ["content hidden while not selected", { label: "Role", children: "Designer" }],
  ["open", { label: "Role", open: true }],
  ["error message", { label: "Country", errorMessage: "Please select a country." }],
  ["invalid without message", { label: "Country", invalid: true }],
  ["invalid false with message", { label: "Country", invalid: false, errorMessage: "Required" }],
  ["disabled", { label: "Role", disabled: true }],
  ["clear button when selected", { label: "Role", selected: true, children: "Designer", onClearClick: noop }],
  ["no clear button while empty", { label: "Role", onClearClick: noop }],
  ["no clear button when disabled", { label: "Role", selected: true, disabled: true, children: "Designer", onClearClick: noop }],
  ["class goes to the root, attributes to the field", { "label": "Role", "className": "w-full", "id": "role", "style": { color: "red" }, "data-testid": "x", "aria-label": "Role picker" }],
  ["aria-describedby", { "label": "Role", "aria-describedby": "hint" }],
  ["aria-describedby and error", { "label": "Role", "aria-describedby": "hint", "errorMessage": "Required" }],
  ["rest attributes override built-ins (role)", { label: "Role", role: "combobox", selected: true, children: "A" }],
]

describe("FloatingLabelSelect parity", () => {
  test.each(selectCases)("%s", async (_name, props) => {
    const { react, vue } = await pairSelect(props)
    expect(vue).toBe(react)
  })

  test("browser animation mode", async () => {
    animation.disabled = false
    const { react, vue } = await pairSelect({ label: "Role", selected: true, children: "A", onClearClick: noop })
    expect(vue).toBe(react)
  })
})

// ---------------------------------------------------------------------------
// FloatingLabelSelect behaviour
// ---------------------------------------------------------------------------

const ROLES = ["Designer", "Engineer"]
const field = () => document.querySelector('[aria-haspopup="listbox"]') as HTMLElement

/** A select built on FloatingLabelSelect: interact toggles a list, options set the value, clear resets it */
const selectApps = (log: string[], extra: Props = {}) => {
  function ReactApp() {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState("")
    return (
      <div>
        <RFloatingLabelSelect
          label="Role"
          selected={!!value}
          open={open}
          onInteract={() => {
            log.push("interact")
            setOpen((o) => !o)
          }}
          onClearClick={value ? () => (log.push("clear"), setValue("")) : undefined}
          {...(extra as object)}
        >
          {value}
        </RFloatingLabelSelect>
        {open && (
          <ul role="listbox">
            {ROLES.map((r) => (
              <li key={r} role="option" onClick={() => (setValue(r), setOpen(false))}>
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  const VueApp = defineComponent({
    setup() {
      const open = ref(false)
      const value = ref("")
      return () =>
        h("div", [
          h(
            FloatingLabelSelect,
            {
              label: "Role",
              selected: !!value.value,
              open: open.value,
              onInteract: () => {
                log.push("interact")
                open.value = !open.value
              },
              onClearClick: value.value ? () => (log.push("clear"), (value.value = "")) : undefined,
              ...extra,
            },
            { default: () => [value.value] },
          ),
          open.value
            ? h(
                "ul",
                { role: "listbox" },
                ROLES.map((r) => h("li", { key: r, role: "option", onClick: () => ((value.value = r), (open.value = false)) }, r)),
              )
            : null,
        ])
    },
  })
  return { ReactApp, VueApp }
}

const walkSelect = async (extra: { react?: Props; vue?: Props }, steps: (snap: () => void) => Promise<void>) => {
  const reactLog: string[] = []
  const vueLog: string[] = []
  const { ReactApp } = selectApps(reactLog, extra.react)
  const { VueApp } = selectApps(vueLog, extra.vue)
  const { react, vue } = await walkPair(
    () => {
      render(<ReactApp />)
    },
    () => h(VueApp),
    steps,
  )
  return { react, vue, reactLog, vueLog }
}

describe("FloatingLabelSelect behaviour parity", () => {
  test("pointer opens, an option selects, clear resets", async () => {
    const results: boolean[] = []
    const { react, vue, reactLog, vueLog } = await walkSelect({}, async (snap) => {
      await interact(() => {
        results.push(fireEvent.pointerDown(field(), { button: 0 }))
      })
      snap()
      await interact(() => {
        fireEvent.click(document.querySelectorAll('[role="option"]')[1]!)
      })
      snap()
      // The clear button stops its pointerdown and click from reaching the field
      const clear = document.querySelector('button[aria-label="Clear selection"]') as HTMLButtonElement
      await interact(() => {
        results.push(fireEvent.pointerDown(clear, { button: 0 }))
        results.push(fireEvent.click(clear))
      })
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain("data-open")
    expect(react[1]).toContain('"Engineer"')
    expect(react[1]).toContain("Clear selection")
    expect(react[2]).not.toContain("Engineer")
    expect(vueLog).toEqual(reactLog)
    expect(reactLog).toEqual(["interact", "clear"])
    // Per framework: pointerdown on the field is prevented, on the clear
    // button it is not; the clear click is prevented
    expect(results).toEqual([false, true, false, false, true, false])
  })

  test("right click and disabled do not interact", async () => {
    const results: Record<string, boolean[]> = { react: [], vue: [] }
    for (const framework of ["react", "vue"] as const) {
      const log: string[] = []
      for (const disabled of [false, true]) {
        const props = { label: "Role", disabled, onInteract: () => log.push(`interact ${disabled}`) }
        if (framework === "react") render(createElement(RFloatingLabelSelect, props))
        else mountVue(() => h(FloatingLabelSelect, props))
        await interact(() => {})
        await interact(() => {
          results[framework]!.push(fireEvent.pointerDown(field(), { button: 2 }))
          results[framework]!.push(fireEvent.pointerDown(field(), { button: 0 }))
        })
        cleanup()
        document.body.innerHTML = ""
      }
      results[framework]!.push(...log.map((entry) => entry === "interact false"))
    }
    expect(results.vue).toEqual(results.react)
    expect(results.react).toEqual([true, false, true, true, true])
  })

  test("keyboard: ArrowDown, ArrowUp and Space interact; Enter and others do not", async () => {
    type Run = { log: string[]; reachedDocument: number; tabindex: string | null }
    const runs: Record<string, Run[]> = { react: [], vue: [] }
    for (const framework of ["react", "vue"] as const) {
      for (const disabled of [false, true]) {
        const log: string[] = []
        const consumer = (evt: { key: string }) => log.push(`consumer ${evt.key}`)
        const onInteract = () => log.push("interact")
        if (framework === "react") render(<RFloatingLabelSelect label="Role" disabled={disabled} onInteract={onInteract} onKeyDown={consumer} />)
        else mountVue(() => h(FloatingLabelSelect, { label: "Role", disabled, onInteract, onKeydown: consumer }))
        await interact(() => {})
        let reachedDocument = 0
        const onDocument = () => reachedDocument++
        document.addEventListener("keydown", onDocument)
        for (const key of ["ArrowDown", "ArrowUp", " ", "Enter", "Escape", "a"]) {
          await interact(() => {
            // fireEvent returns false when the default was prevented
            log.push(`${key}: ${fireEvent.keyDown(field(), { key })}`)
          })
        }
        document.removeEventListener("keydown", onDocument)
        runs[framework]!.push({ log, reachedDocument, tabindex: field().getAttribute("tabindex") })
        cleanup()
        document.body.innerHTML = ""
      }
    }
    expect(runs.vue).toEqual(runs.react)
    const [enabled, disabled] = runs.react as [Run, Run]
    expect(enabled.log).toEqual([
      "consumer ArrowDown", "interact", "ArrowDown: false",
      "consumer ArrowUp", "interact", "ArrowUp: false",
      "consumer  ", "interact", " : false",
      "consumer Enter", "Enter: true",
      "consumer Escape", "Escape: true",
      "consumer a", "a: true",
    ])
    // Handled keys stop propagating
    expect(enabled.reachedDocument).toBe(3)
    expect(enabled.tabindex).toBe("0")
    // Disabled: the consumer handler still runs, nothing else does
    expect(disabled.log.filter((entry) => entry === "interact")).toEqual([])
    expect(disabled.log.filter((entry) => entry.endsWith("true"))).toHaveLength(6)
    expect(disabled.reachedDocument).toBe(6)
    expect(disabled.tabindex).toBe("-1")
  })

  test("keyboard flow toggles the list", async () => {
    const { react, vue, reactLog, vueLog } = await walkSelect({}, async (snap) => {
      for (const key of ["ArrowDown", "Enter", " "]) {
        await interact(() => {
          fireEvent.keyDown(field(), { key })
        })
        snap()
      }
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain('role="listbox"')
    expect(react[2]).not.toContain('role="listbox"')
    expect(vueLog).toEqual(reactLog)
    expect(reactLog).toEqual(["interact", "interact"])
  })

  test("a consumer pointerdown replaces the built-in handler (React spread order)", async () => {
    const consumerCalls: Record<string, number> = { react: 0, vue: 0 }
    const { react, vue, reactLog, vueLog } = await walkSelect(
      { react: { onPointerDown: () => consumerCalls.react!++ }, vue: { onPointerdown: () => consumerCalls.vue!++ } },
      async (snap) => {
        await interact(() => {
          fireEvent.pointerDown(field(), { button: 0 })
        })
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(reactLog).toEqual([])
    expect(vueLog).toEqual(reactLog)
    expect(consumerCalls).toEqual({ react: 1, vue: 1 })
  })
})

