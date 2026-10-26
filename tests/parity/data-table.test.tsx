import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useSyncExternalStore, type ComponentType, type ReactElement, type ReactNode } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString as reactRenderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createSSRApp, h, shallowReactive, type VNode } from "vue"
import { renderToString as vueRenderToString } from "vue/server-renderer"
import * as R from "../../packages/ui/src/components/DataTable"
import * as V from "../../packages/vue/src/components/DataTable"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// React-vs-Vue parity for DataTable, DataTableColumnHeader,
// DataTablePagination and the column helpers. React renders through
// @tanstack/react-table, Vue through @tanstack/vue-table (same table-core).
//
// Every case runs the same script against a React app and a Vue app that
// read one shared state, with fake timers (the tooltip cases need them).
// Snapshots are the serialized body plus each <select>'s value and selected
// index: React selects options through properties, which the markup does
// not show.

type FW = "react" | "vue"
type Props = Record<string, unknown>

type User = {
  id: string
  name: string
  email: string
  role: string
  status: string
  department: string
  joined: string | null
  salary: number
}

const users: User[] = [
  { id: "USR-001", name: "Lindsay Walton", email: "lindsay@example.com", role: "Front-end Developer", status: "Active", department: "Engineering", joined: "2023-01-15T09:00:00Z", salary: 95000 },
  { id: "USR-002", name: "Courtney Henry", email: "courtney@example.com", role: "Designer", status: "Active", department: "Design", joined: "2023-03-22T09:00:00Z", salary: 88000 },
  { id: "USR-003", name: "Tom Cook", email: "tom@example.com", role: "Director of Product", status: "Active", department: "Product", joined: "2022-06-10T09:00:00Z", salary: 120000 },
  { id: "USR-004", name: "Whitney Francis", email: "whitney@example.com", role: "Copywriter", status: "Inactive", department: "Marketing", joined: "2023-07-04T09:00:00Z", salary: 72000 },
  { id: "USR-005", name: "Leonard Krasner", email: "leonard@example.com", role: "Senior Developer", status: "Active", department: "Engineering", joined: "2022-02-18T09:00:00Z", salary: 115000 },
  { id: "USR-006", name: "Floyd Miles", email: "floyd@example.com", role: "UX Researcher", status: "Active", department: "Design", joined: "2023-05-11T09:00:00Z", salary: 85000 },
  { id: "USR-007", name: "Emily Selman", email: "emily@example.com", role: "VP Marketing", status: "Active", department: "Marketing", joined: "2021-11-20T09:00:00Z", salary: 130000 },
  { id: "USR-008", name: "Kristin Watson", email: "kristin@example.com", role: "Data Analyst", status: "Pending", department: "Engineering", joined: null, salary: 78000 },
  { id: "USR-009", name: "Emma Dorsey", email: "emma@example.com", role: "QA Engineer", status: "Active", department: "Engineering", joined: "2023-09-14T09:00:00Z", salary: 82000 },
  { id: "USR-010", name: "Alicia Bell", email: "alicia@example.com", role: "Product Manager", status: "Processing", department: "Product", joined: "2023-04-01T09:00:00Z", salary: 105000 },
  { id: "USR-011", name: "Jenny Wilson", email: "jenny@example.com", role: "Designer", status: "Cancelled", department: "Design", joined: "2022-08-15T09:00:00Z", salary: 90000 },
  { id: "USR-012", name: "Anna Roberts", email: "anna@example.com", role: "Backend Developer", status: "Unknown", department: "Engineering", joined: "2023-02-28T09:00:00Z", salary: 98000 },
  { id: "USR-013", name: "Benjamin Russel", email: "ben@example.com", role: "DevOps Engineer", status: "FAILED", department: "Engineering", joined: "2022-12-05T09:00:00Z", salary: 110000 },
  { id: "USR-014", name: "Jeffrey Webb", email: "jeffrey@example.com", role: "Tech Lead", status: "Active", department: "Engineering", joined: "2021-09-01T09:00:00Z", salary: 135000 },
  { id: "USR-015", name: "Kathryn Murphy", email: "kathryn@example.com", role: "Content Strategist", status: "Inactive", department: "Marketing", joined: "", salary: 76000 },
]

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

// ---------------------------------------------------------------------------
// Building the same columns and tables for each framework

/** An element: React `className` becomes Vue `class`, listeners keep their names. */
const el = (fw: FW, tag: string, { className, ...props }: Props, ...children: unknown[]) =>
  fw === "react"
    ? createElement(tag, { className, ...props }, ...(children as ReactNode[]))
    : h(tag, { ...props, ...(className !== undefined ? { class: className } : {}) }, children as never)

const lib = (fw: FW) => (fw === "react" ? R : V) as typeof R

const sortHeader =
  (fw: FW, title: string, className?: string) =>
  ({ column }: { column: unknown }) =>
    fw === "react"
      ? createElement(R.DataTableColumnHeader as ComponentType<Props>, { column, title, className })
      : h(V.DataTableColumnHeader as never, { column, title, ...(className ? { class: className } : {}) })

const nameCell =
  (fw: FW) =>
  ({ row }: { row: { original: User } }) =>
    el(fw, "span", { className: "font-medium" }, row.original.name)

const basicColumns = (fw: FW) => [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "department", header: "Department" },
  { accessorKey: "status", header: "Status" },
]

const sortColumns = (fw: FW) => [
  { accessorKey: "name", header: sortHeader(fw, "Name"), cell: nameCell(fw) },
  { accessorKey: "role", header: sortHeader(fw, "Role") },
  { accessorKey: "status", header: sortHeader(fw, "Status") },
  {
    accessorKey: "salary",
    header: sortHeader(fw, "Salary"),
    meta: { align: "right" },
    cell: ({ row }: { row: { original: User } }) => el(fw, "span", {}, money.format(row.original.salary)),
  },
]

const cellVariantColumns = (fw: FW) => [
  { accessorKey: "id", header: "ID", cell: lib(fw).idCell<User>((row) => row.id) },
  { accessorKey: "name", header: "Name", cell: nameCell(fw) },
  { accessorKey: "status", header: "Status", cell: lib(fw).statusCell<User>((row) => row.status) },
  { accessorKey: "joined", header: "Joined", cell: lib(fw).dateTimeCell<User>((row) => row.joined) },
  {
    accessorKey: "salary",
    header: lib(fw).tooltipHeader("Salary", "Annual base salary in USD."),
    meta: { align: "right" },
    cell: ({ row }: { row: { original: User } }) => el(fw, "span", { className: "font-medium" }, money.format(row.original.salary)),
  },
]

const customHelperColumns = (fw: FW) => [
  {
    accessorKey: "status",
    header: "Status",
    cell: lib(fw).statusCell<User>((row) => row.status, { active: "info", unknown: "discovery", failed: "caution" }),
  },
  {
    accessorKey: "joined",
    header: "Joined",
    cell: lib(fw).dateTimeCell<User>((row) => row.joined, { year: "2-digit", month: "long" }),
  },
  { accessorKey: "department", header: lib(fw).tooltipHeader("Dept", "Where they work"), meta: { align: "center" } },
]

const headerVariantColumns = (fw: FW) => [
  { accessorKey: "name", header: sortHeader(fw, "Name", "custom-header") },
  { accessorKey: "role", enableSorting: false, header: sortHeader(fw, "Role", "plain-header") },
  { accessorKey: "email", enableSorting: false, header: sortHeader(fw, "Email") },
]

const groupedColumns = (fw: FW) => [
  {
    id: "person",
    header: "Person",
    columns: [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "email", header: "Email" },
    ],
  },
  { accessorKey: "role", header: "Role" },
]

const defaultRenderColumns = (fw: FW) => [
  { accessorKey: "name" },
  { accessorFn: (row: User) => row.email, id: "mail" },
  { accessorKey: "salary" },
  { id: "static", header: "Static", cell: "static text" },
  { id: "display", header: () => el(fw, "em", {}, "Display"), cell: ({ row }: { row: { index: number } }) => `#${row.index}` },
]

type Log = string[]

/**
 * Columns whose header and cells call the table API, to drive the
 * controlled state from inside the table, plus a probe that prints what
 * `getState()` holds for the three controlled keys.
 */
const apiColumns = (fw: FW, { selected = true }: { selected?: boolean } = {}) => [
  {
    id: "probe",
    header: ({ table }: { table: any }) => {
      const state = table.getState()
      return el(
        fw,
        "span",
        { className: "probe" },
        JSON.stringify({
          globalFilter: state.globalFilter === undefined ? "undefined" : state.globalFilter,
          columnVisibility: state.columnVisibility === undefined ? "undefined" : state.columnVisibility,
          rowSelection: state.rowSelection === undefined ? "undefined" : state.rowSelection,
          pageSize: state.pagination.pageSize,
        }),
      )
    },
    cell: ({ row }: { row: any }) =>
      el(
        fw,
        "button",
        {
          "className": "toggle-row",
          "data-row": row.id,
          "onClick": () => row.toggleSelected(),
        },
        selected ? `${row.id}:${row.getIsSelected()}:${row.getCanSelect()}` : row.id,
      ),
  },
  {
    accessorKey: "name",
    header: ({ table }: { table: any }) =>
      el(
        fw,
        "span",
        {},
        el(fw, "button", { className: "filter-design", onClick: () => table.setGlobalFilter("design") }, "filter"),
        el(fw, "button", { className: "hide-role", onClick: () => table.getColumn("role").toggleVisibility(false) }, "hide"),
        el(fw, "button", { className: "reset-visibility", onClick: () => table.resetColumnVisibility() }, "reset"),
        el(fw, "button", { className: "toggle-all", onClick: () => table.toggleAllRowsSelected() }, "all"),
        el(fw, "button", { className: "reset-filter", onClick: () => table.resetGlobalFilter() }, "clear"),
        el(fw, "button", { className: "set-selection", onClick: () => table.setRowSelection((old: object) => ({ ...old, 2: true })) }, "pick"),
      ),
  },
  { accessorKey: "role", header: "Role" },
  { accessorKey: "department", header: "Department" },
]

/**
 * Columns whose header runs two row selection updates from one click, in
 * one tick or across an await, and whose cells print each row's selection.
 */
const batchColumns = (fw: FW) => [
  {
    id: "batch",
    header: ({ table }: { table: any }) =>
      el(
        fw,
        "span",
        {},
        el(
          fw,
          "button",
          {
            className: "pick-two",
            onClick: () => {
              table.setRowSelection((old: object) => ({ ...old, 1: true }))
              table.setRowSelection((old: object) => ({ ...old, 2: true }))
            },
          },
          "two",
        ),
        el(
          fw,
          "button",
          {
            className: "pick-two-later",
            onClick: async () => {
              table.setRowSelection((old: object) => ({ ...old, 1: true }))
              await Promise.resolve()
              table.setRowSelection((old: object) => ({ ...old, 2: true }))
            },
          },
          "two later",
        ),
      ),
    cell: ({ row }: { row: any }) => el(fw, "span", { className: "selected" }, `${row.id}:${row.getIsSelected()}`),
  },
  { accessorKey: "name", header: "Name" },
]

/** React DataTable props → Vue props: `className` → `class`, `onXChange` → `onUpdate:x`. */
const vueProps = ({ className, onGlobalFilterChange, onColumnVisibilityChange, onRowSelectionChange, ...props }: Props) => ({
  ...props,
  ...(className !== undefined ? { class: className } : {}),
  ...(onGlobalFilterChange ? { "onUpdate:globalFilter": onGlobalFilterChange } : {}),
  ...(onColumnVisibilityChange ? { "onUpdate:columnVisibility": onColumnVisibilityChange } : {}),
  ...(onRowSelectionChange ? { "onUpdate:rowSelection": onRowSelectionChange } : {}),
})

const dataTable = (fw: FW, props: Props, vueSlots?: Record<string, () => unknown>) =>
  fw === "react"
    ? createElement(R.DataTable as ComponentType<Props>, props)
    : h(V.DataTable as never, vueProps(props), vueSlots as never)

// ---------------------------------------------------------------------------
// Walker

const settle = async () => {
  for (let i = 0; i < 100; i++) await Promise.resolve()
}

// Reka names the popper custom properties `--reka-popper-*` and sets
// `dir="ltr"` on its wrapper (see tooltip-popover.test.tsx)
const normalizePopper = (root: Element) => {
  for (const wrapper of Array.from(root.querySelectorAll("[data-reka-popper-content-wrapper]"))) {
    wrapper.removeAttribute("dir")
  }
  for (const element of Array.from(root.querySelectorAll("[style]"))) {
    const style = element.getAttribute("style")!
    if (style.includes("--reka-popper-")) element.setAttribute("style", style.replaceAll("--reka-popper-", "--radix-popper-"))
  }
}

const snapshotDom = () => {
  const clone = document.body.cloneNode(true) as HTMLElement
  normalizePopper(clone)
  const selects = Array.from(document.querySelectorAll("select")).map(
    (select) => `select value=${JSON.stringify(select.value)} index=${select.selectedIndex}`,
  )
  return [serializeDom(clone), ...selects].join("\n")
}

type Target = string | (() => Element | null | undefined)
const resolve = (target: Target) => {
  const element = typeof target === "string" ? document.querySelector(target) : target()
  if (!element) throw new Error(`No element for ${String(target)}`)
  return element
}

/** The first element matching `selector` whose text is `text`. */
const byText = (selector: string, text: string) => () =>
  Array.from(document.querySelectorAll(selector)).find((element) => element.textContent === text)

type Tools<T> = {
  /** Records the serialized DOM and select values */
  snapshot: () => void
  /** Fires a DOM event (testing-library's `fireEvent`) and lets both frameworks settle */
  fire: (target: Target, event: keyof typeof fireEvent, init?: object) => Promise<void>
  click: (target: Target, init?: object) => Promise<void>
  /** Picks an option of a <select> and fires `change`, like a user */
  choose: (target: Target, value: string) => Promise<void>
  /** Updates the state both apps read */
  set: (patch: Partial<T>) => Promise<void>
  /** Advances the fake clock */
  advance: (ms: number) => Promise<void>
}

type Setter<T> = (patch: Partial<T>) => void

/**
 * Runs `steps` against a React app, then against a Vue app, both reading one
 * shared state (which callbacks can update), with fake timers. Returns the
 * snapshots of each.
 */
const walk = async <T extends object>(
  initial: T,
  reactApp: (state: T, set: Setter<T>) => ReactElement,
  vueApp: (state: T, set: Setter<T>) => VNode,
  steps: (tools: Tools<T>) => Promise<void> = async ({ snapshot }) => snapshot(),
) => {
  let current = { ...initial }
  const listeners = new Set<() => void>()
  const vueState = shallowReactive({ ...initial }) as T

  const setState: Setter<T> = (patch) => {
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
    return reactApp(state, setState)
  }

  const run = async (action: () => void) => {
    await act(async () => {
      action()
      await settle()
    })
    await flushVue()
    await settle()
    await flushVue()
  }

  // Vue skips a listener when the event is not later than the moment the
  // listener was attached; with `Date` frozen, move the clock 1ms first.
  const dispatch = (action: () => void) =>
    run(() => {
      vi.setSystemTime(Date.now() + 1)
      action()
    })

  const tools = (snapshots: string[]): Tools<T> => ({
    snapshot: () => snapshots.push(snapshotDom()),
    fire: (target, event, init) =>
      dispatch(() => {
        ;(fireEvent[event] as (element: Element, init?: object) => boolean)(resolve(target), init)
      }),
    click: (target, init) => dispatch(() => fireEvent.click(resolve(target), init)),
    choose: (target, value) =>
      dispatch(() => {
        const select = resolve(target) as HTMLSelectElement
        select.value = value
        fireEvent.change(select)
      }),
    set: (patch) => run(() => setState(patch)),
    advance: (ms) => run(() => vi.advanceTimersByTime(ms)),
  })

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    const react: string[] = []
    await run(() => {
      render(createElement(ReactApp))
    })
    await steps(tools(react))
    await run(() => cleanup())
    vi.clearAllTimers()

    current = { ...initial }
    Object.assign(vueState, initial)
    const vue: string[] = []
    const { unmount } = mountVue(() => vueApp(vueState, setState))
    await run(() => {})
    await steps(tools(vue))
    unmount()
    vi.clearAllTimers()

    return { react, vue }
  } finally {
    vi.useRealTimers()
  }
}

/** One table with fixed props per framework: `make` builds the props (columns built once per framework). */
const tablePair = <T extends object = Record<string, never>>(
  make: (fw: FW, state: T, set: Setter<T>) => Props,
  options: {
    initial?: T
    vueSlots?: (state: T) => Record<string, () => unknown>
    steps?: (tools: Tools<T>) => Promise<void>
  } = {},
) =>
  walk<T>(
    options.initial ?? ({} as T),
    (state, set) => dataTable("react", make("react", state, set)),
    (state, set) => dataTable("vue", make("vue", state, set), options.vueSlots?.(state)),
    options.steps,
  )

/** Columns built once per framework, so re-renders keep the same array as the React demos' useMemo. */
const once = <C,>(build: (fw: FW) => C) => {
  const built = { react: build("react"), vue: build("vue") }
  return (fw: FW) => built[fw]
}

const writeText = vi.fn(async () => {})
beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  writeText.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Markup

describe("DataTable markup parity", () => {
  const basic = once(basicColumns)

  const cases: [string, (fw: FW) => Props][] = [
    ["defaults: 15 rows, page size 10", (fw) => ({ columns: basic(fw), data: users })],
    ["variant bordered + className", (fw) => ({ columns: basic(fw), data: users, variant: "bordered", className: "my-table" })],
    ["variant default explicit", (fw) => ({ columns: basic(fw), data: users, variant: "default" })],
    ["pageSize 5", (fw) => ({ columns: basic(fw), data: users, pageSize: 5 })],
    ["pageSize 0 disables pagination", (fw) => ({ columns: basic(fw), data: users, pageSize: 0 })],
    ["pageSize Infinity disables pagination", (fw) => ({ columns: basic(fw), data: users, pageSize: Infinity })],
    ["pageSize -1 disables pagination", (fw) => ({ columns: basic(fw), data: users, pageSize: -1 })],
    ["pageSize 20: all rows fit, controls hidden", (fw) => ({ columns: basic(fw), data: users, pageSize: 20 })],
    ["pageSize 15: exactly fits, controls hidden", (fw) => ({ columns: basic(fw), data: users, pageSize: 15 })],
    ["pageSize 14: one row over", (fw) => ({ columns: basic(fw), data: users, pageSize: 14 })],
    ["pageSize 20 (an option of the select) with 30 rows", (fw) => ({ columns: basic(fw), data: [...users, ...users], pageSize: 20 })],
    ["showPagination false", (fw) => ({ columns: basic(fw), data: users, pageSize: 5, showPagination: false })],
    ["onRowClick makes rows clickable", (fw) => ({ columns: basic(fw), data: users.slice(0, 3), onRowClick: () => {} })],
    ["empty data: default message", (fw) => ({ columns: basic(fw), data: [] })],
    ["empty data: custom message", (fw) => ({ columns: basic(fw), data: [], emptyMessage: "No users found." })],
    ["empty data: numeric message", (fw) => ({ columns: basic(fw), data: [], emptyMessage: 0 })],
    ["empty data: null message", (fw) => ({ columns: basic(fw), data: [], emptyMessage: null })],
    [
      "empty data: element message",
      (fw) => ({ columns: basic(fw), data: [], emptyMessage: el(fw, "strong", { className: "empty" }, "Nothing") }),
    ],
    [
      "empty data with hidden columns: colspan counts visible ones",
      (fw) => ({ columns: basic(fw), data: [], columnVisibility: { id: false, status: false } }),
    ],
    [
      "every column hidden: colspan 1",
      (fw) => ({ columns: basic(fw), data: [], columnVisibility: { id: false, name: false, department: false, status: false } }),
    ],
    [
      "every column hidden with rows: empty rows",
      (fw) => ({ columns: basic(fw), data: users.slice(0, 2), columnVisibility: { id: false, name: false, department: false, status: false } }),
    ],
    ["empty columns", (fw) => ({ columns: [], data: users.slice(0, 2) })],
    ["controlled column visibility", (fw) => ({ columns: basic(fw), data: users.slice(0, 4), columnVisibility: { department: false, name: true } })],
    ["globalFilter matches", (fw) => ({ columns: basic(fw), data: users, globalFilter: "engineering", pageSize: 5 })],
    ["globalFilter empty string", (fw) => ({ columns: basic(fw), data: users, globalFilter: "" })],
    ["globalFilter matches nothing", (fw) => ({ columns: basic(fw), data: users, globalFilter: "zzz", emptyMessage: "No match" })],
  ]

  test.each(cases)("%s", async (_name, make) => {
    const result = await tablePair(make)
    expect(result.vue).toEqual(result.react)
  })

  test("emptyMessage slot renders like a ReactNode", async () => {
    const result = await walk(
      {},
      () => dataTable("react", { columns: basic("react"), data: [], emptyMessage: el("react", "em", {}, "Nothing ", el("react", "b", {}, "here")) }),
      () =>
        dataTable("vue", { columns: basic("vue"), data: [], emptyMessage: "ignored" }, {
          emptyMessage: () => [h("em", null, ["Nothing ", h("b", null, "here")])],
        }),
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"Nothing "')
  })

  const sorted = once(sortColumns)
  const sortCases: [string, (fw: FW) => Props][] = [
    ["sortable headers, unsorted", (fw) => ({ columns: sorted(fw), data: users, pageSize: 5 })],
    ["initialSorting name asc", (fw) => ({ columns: sorted(fw), data: users, pageSize: 5, initialSorting: [{ id: "name", desc: false }] })],
    ["initialSorting salary desc", (fw) => ({ columns: sorted(fw), data: users, pageSize: 5, initialSorting: [{ id: "salary", desc: true }] })],
    [
      "initialSorting on two columns",
      (fw) => ({
        columns: sorted(fw),
        data: users,
        pageSize: 5,
        initialSorting: [
          { id: "status", desc: false },
          { id: "salary", desc: false },
        ],
      }),
    ],
  ]

  test.each(sortCases)("%s", async (_name, make) => {
    const result = await tablePair(make)
    expect(result.vue).toEqual(result.react)
  })

  test("sorted header carries data-sorted and the arrow", async () => {
    const result = await tablePair((fw) => ({ columns: sorted(fw), data: users, initialSorting: [{ id: "name", desc: true }] }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('data-sorted="desc"')
  })

  const headerVariants = once(headerVariantColumns)
  test("column header: className, enableSorting false renders a span", async () => {
    const result = await tablePair((fw) => ({ columns: headerVariants(fw), data: users.slice(0, 2) }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('<span class="plain-header">')
    expect(result.react[0]).toContain('<button class="ColumnHeaderButton custom-header" type="button">')
  })

  const grouped = once(groupedColumns)
  test("grouped columns: placeholder headers render empty, group headers span their columns", async () => {
    const result = await tablePair((fw) => ({ columns: grouped(fw), data: users.slice(0, 2) }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('<th class="TableHead" colspan="2">')
    expect(result.react[0].match(/colspan=/g)).toHaveLength(1)
  })

  test("grouped columns with row selection: the checkbox column has a placeholder above it", async () => {
    const result = await tablePair((fw) => ({ columns: grouped(fw), data: users.slice(0, 2), enableRowSelection: true }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0].match(/role="checkbox"/g)).toHaveLength(3)
  })

  const defaults = once(defaultRenderColumns)
  test("default header and cell renderers, string cell, renderer returning a string", async () => {
    const result = await tablePair((fw) => ({ columns: defaults(fw), data: users.slice(0, 3) }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"mail"')
    expect(result.react[0]).toContain('"static text"')
  })

  const variants = once(cellVariantColumns)
  test("column helpers: idCell, statusCell, dateTimeCell, tooltipHeader, align", async () => {
    const result = await tablePair((fw) => ({ columns: variants(fw), data: users, pageSize: 15 }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"—"')
    expect(result.react[0]).toContain('style="text-align: right"')
  })

  const customHelpers = once(customHelperColumns)
  test("column helpers: custom color map and date options, center align", async () => {
    const result = await tablePair((fw) => ({ columns: customHelpers(fw), data: users, pageSize: 15 }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('data-color="discovery"')
    expect(result.react[0]).toContain('style="text-align: center"')
  })

  const api = once((fw) => apiColumns(fw))
  test("controlled row selection, getRowId, enableRowSelection", async () => {
    const result = await tablePair((fw) => ({
      columns: api(fw),
      data: users.slice(0, 4),
      enableRowSelection: true,
      getRowId: (row: User) => row.id,
      rowSelection: { "USR-002": true, "USR-004": true },
    }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"USR-002:true:true"')
  })

  test("row selection disabled by default: getCanSelect false, no checkbox column", async () => {
    const result = await tablePair((fw) => ({ columns: api(fw), data: users.slice(0, 2), rowSelection: {} }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"0:false:false"')
    expect(result.react[0]).not.toContain('role="checkbox"')
  })

  const probe = once((fw) => apiColumns(fw, { selected: false }))
  test("getState(): without the props, the table holds its own initial state", async () => {
    const result = await tablePair((fw) => ({ columns: probe(fw), data: users.slice(0, 2) }))
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('\\"columnVisibility\\":{}')
    expect(result.react[0]).toContain('\\"rowSelection\\":{}')
    expect(result.react[0]).toContain('\\"globalFilter\\":\\"\\"')
  })
})

// ---------------------------------------------------------------------------
// Sorting

describe("DataTable sorting parity", () => {
  const sorted = once(sortColumns)
  const NAME = byText("button", "Name")
  const STATUS = byText("button", "Status")
  const SALARY = byText("button", "Salary")

  test("header clicks cycle asc, desc, unsorted; numbers start desc", async () => {
    const result = await tablePair((fw) => ({ columns: sorted(fw), data: users, pageSize: 5 }), {
      steps: async ({ click, snapshot }) => {
        snapshot()
        await click(NAME)
        snapshot() // asc
        await click(NAME)
        snapshot() // desc
        await click(NAME)
        snapshot() // unsorted
        await click(SALARY)
        snapshot() // desc first for numbers
        await click(STATUS)
        snapshot() // single sort replaces salary
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toContain('data-sorted="asc"')
    expect(result.react[2]).toContain('data-sorted="desc"')
    expect(result.react[3]).not.toContain("data-sorted")
    expect(result.react[4]).toContain('"$135,000"')
  })

  test("shift-click adds a column to the sort", async () => {
    const result = await tablePair((fw) => ({ columns: sorted(fw), data: users, pageSize: 5 }), {
      steps: async ({ click, snapshot }) => {
        await click(STATUS)
        await click(SALARY, { shiftKey: true })
        snapshot()
        await click(SALARY, { shiftKey: true })
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0].match(/data-sorted=/g)).toHaveLength(2)
  })

  test("initialSorting starts sorted and cycles from there; later changes are ignored", async () => {
    const result = await tablePair<{ initialSorting: unknown }>(
      (fw, state) => ({ columns: sorted(fw), data: users, pageSize: 5, initialSorting: state.initialSorting }),
      {
        initial: { initialSorting: [{ id: "name", desc: false }] },
        steps: async ({ click, set, snapshot }) => {
          snapshot()
          await set({ initialSorting: [{ id: "salary", desc: true }] })
          snapshot() // still name asc
          await click(NAME)
          snapshot() // desc
          await click(NAME)
          snapshot() // unsorted
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toEqual(result.react[0])
  })

  test("sorting resets the page index", async () => {
    const result = await tablePair((fw) => ({ columns: sorted(fw), data: users, pageSize: 5 }), {
      steps: async ({ click, snapshot }) => {
        await click(".PaginationButtons button:last-child")
        snapshot() // page 2
        await click(NAME)
        snapshot() // back to page 1
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"6–10 of 15"')
    expect(result.react[1]).toContain('"1–5 of 15"')
  })

  test("Enter and Space on a header do nothing beyond the native button", async () => {
    const result = await tablePair((fw) => ({ columns: sorted(fw), data: users, pageSize: 5 }), {
      steps: async ({ fire, snapshot }) => {
        await fire(NAME, "keyDown", { key: "Enter" })
        await fire(NAME, "keyDown", { key: " " })
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain("data-sorted")
  })
})

// ---------------------------------------------------------------------------
// Pagination

describe("DataTable pagination parity", () => {
  const basic = once(basicColumns)
  const NEXT = ".PaginationButtons button:last-child"
  const PREV = ".PaginationButtons button:first-child"

  test("next, next, last page, previous; buttons disable at the ends", async () => {
    const result = await tablePair((fw) => ({ columns: basic(fw), data: users, pageSize: 5 }), {
      steps: async ({ click, snapshot }) => {
        snapshot()
        await click(NEXT)
        snapshot()
        await click(NEXT)
        snapshot() // last page
        await click(NEXT)
        snapshot() // disabled: no change
        await click(PREV)
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[2]).toContain('"11–15 of 15"')
    expect(result.react[3]).toEqual(result.react[2])
  })

  test("rows-per-page select: a page size not in the list is an option too", async () => {
    const result = await tablePair((fw) => ({ columns: basic(fw), data: users, pageSize: 5 }), {
      steps: async ({ click, choose, snapshot }) => {
        snapshot() // 5 per page, select shows "5"
        await click(NEXT)
        await choose("select", "20")
        snapshot() // 20 per page, page 1: "1–15 of 15", controls stay (15 > 5)
        await choose("select", "10")
        snapshot()
        await click(NEXT)
        snapshot() // page 2 of 10
        await choose("select", "50")
        snapshot() // floor(10 / 50) = page 1
        await choose("select", "5")
        snapshot() // back to the initial size
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('select value="5" index=0')
    expect(result.react[0]).toContain('"1–5 of 15"')
    expect(result.react[1]).toContain('select value="20" index=2')
    expect(result.react[1]).toContain('"1–15 of 15"')
    expect(result.react[5]).toContain('select value="5" index=0')
    expect(result.react[5]).toContain('"1–5 of 15"')
  })

  test("select follows the state after a change from an out-of-range size", async () => {
    const result = await tablePair((fw) => ({ columns: basic(fw), data: users.slice(0, 4), pageSize: 1 }), {
      steps: async ({ choose, snapshot }) => {
        snapshot()
        await choose("select", "100")
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('select value="1" index=0')
    expect(result.react[1]).toContain('select value="100" index=4')
  })

  test("pageSize prop changes after mount are applied; turning pagination off shows every row", async () => {
    const rowCount = (snapshot: string) => snapshot.match(/<tr/g)!.length - 1
    const result = await tablePair<{ pageSize: number }>(
      (fw, state) => ({ columns: basic(fw), data: users, pageSize: state.pageSize }),
      {
        initial: { pageSize: 5 },
        steps: async ({ click, set, snapshot }) => {
          await click(NEXT)
          await click(NEXT)
          snapshot() // page 3 of 5 per page
          await set({ pageSize: 10 })
          snapshot() // the top row stays in view: page 2 of 10 per page
          await set({ pageSize: Infinity })
          snapshot() // controls hidden, every row shown
          await set({ pageSize: 3 })
          snapshot() // pagination back on: first page
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"11–15 of 15"')
    expect(result.react[1]).toContain('"11–15 of 15"')
    expect(result.react[1]).toContain('select value="10" index=1')
    expect(result.react[2]).not.toContain("Pagination")
    expect(rowCount(result.react[2]!)).toBe(15)
    expect(result.react[3]).toContain('"1–3 of 15"')
  })

  test("pagination turned on after mount uses the new page size", async () => {
    const result = await tablePair<{ pageSize: number }>(
      (fw, state) => ({ columns: basic(fw), data: users, pageSize: state.pageSize }),
      {
        initial: { pageSize: 0 },
        steps: async ({ set, snapshot }) => {
          snapshot()
          await set({ pageSize: 4 })
          snapshot()
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toContain('"1–4 of 15"')
  })

  test("server markup selects the page size; hydration keeps it", async () => {
    const props = (fw: FW) => ({ columns: basic(fw), data: [...users, ...users], pageSize: 20 })
    const element = dataTable("react", props("react"))
    const container = document.createElement("div")
    document.body.appendChild(container)
    const select = () => container.querySelector("select")!
    const state = () => `select value=${JSON.stringify(select().value)} index=${select().selectedIndex}`

    container.innerHTML = reactRenderToString(element)
    const reactServer = [serializeDom(container), state()]
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, element)
    })
    const react = [...reactServer, serializeDom(container), state()]
    await act(async () => root!.unmount())

    const renderVue = () => dataTable("vue", props("vue")) as VNode
    container.innerHTML = await vueRenderToString(createSSRApp({ render: renderVue }))
    const vueServer = [serializeDom(container), state()]
    const app = createSSRApp({ render: renderVue })
    app.mount(container)
    await flushVue()
    const vue = [...vueServer, serializeDom(container), state()]
    app.unmount()
    container.remove()

    expect(vue).toEqual(react)
    expect(react[0]).toMatch(/<option selected="" value="20" \.selected=true>/)
    expect(react[1]).toBe('select value="20" index=1')
    expect(react[3]).toBe('select value="20" index=1')
  })

  test("new data resets the page; data shrinking to nothing shows the empty row", async () => {
    const result = await tablePair<{ data: User[] }>((fw, state) => ({ columns: basic(fw), data: state.data, pageSize: 5 }), {
      initial: { data: users },
      steps: async ({ click, set, snapshot }) => {
        await click(NEXT)
        await click(NEXT)
        snapshot()
        await set({ data: [...users].reverse() })
        snapshot() // page 1
        await set({ data: [] })
        snapshot()
        await set({ data: users.slice(0, 7) })
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toContain('"1–5 of 15"')
    expect(result.react[2]).toContain('"No results."')
  })
})

// ---------------------------------------------------------------------------
// Row click

describe("DataTable row click parity", () => {
  const sorted = once(sortColumns)

  test("clicking a row passes its original data; removing the handler stops it", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    const result = await walk<{ clickable: boolean }>(
      { clickable: true },
      (state) =>
        dataTable("react", {
          columns: sorted("react"),
          data: users.slice(0, 8),
          pageSize: 4,
          onRowClick: state.clickable ? (row: User) => calls.react.push(`${row.name} (${row.id})`) : undefined,
        }),
      (state) =>
        dataTable("vue", {
          columns: sorted("vue"),
          data: users.slice(0, 8),
          pageSize: 4,
          onRowClick: state.clickable ? (row: User) => calls.vue.push(`${row.name} (${row.id})`) : undefined,
        }),
      async ({ click, set, snapshot }) => {
        snapshot()
        await click(byText("td span", "Tom Cook"))
        await click(byText("td", "Designer"))
        await click(byText("button", "Name")) // header clicks are not row clicks
        await click(byText("td span", "Courtney Henry"))
        await click(".PaginationButtons button:last-child")
        await click(byText("td", "Copywriter"))
        snapshot()
        await set({ clickable: false })
        await click(byText("td", "Data Analyst")) // new data array: back on page 1
        snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react).toEqual(["Tom Cook (USR-003)", "Courtney Henry (USR-002)", "Courtney Henry (USR-002)", "Whitney Francis (USR-004)"])
    expect(result.react[0]).toContain('data-clickable=""')
    expect(result.react[2]).not.toContain("data-clickable")
  })
})

// ---------------------------------------------------------------------------
// Filtering, column visibility, row selection

describe("DataTable controlled state parity", () => {
  const basic = once(basicColumns)
  const api = once((fw) => apiColumns(fw))
  const probe = once((fw) => apiColumns(fw, { selected: false }))

  test("globalFilter from the outside filters and resets the page", async () => {
    const result = await tablePair<{ globalFilter: string }>(
      (fw, state) => ({ columns: basic(fw), data: users, pageSize: 5, globalFilter: state.globalFilter }),
      {
        initial: { globalFilter: "" },
        steps: async ({ click, set, snapshot }) => {
          await click(".PaginationButtons button:last-child")
          snapshot()
          await set({ globalFilter: "eng" })
          snapshot() // page 1 of the matches
          await set({ globalFilter: "design" })
          snapshot() // fits on one page: controls hidden
          await set({ globalFilter: "zzz" })
          snapshot()
          await set({ globalFilter: "" })
          snapshot()
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toContain('"1–5 of 7"')
    expect(result.react[3]).toContain('"No results."')
  })

  test("table.setGlobalFilter: filters on its own without the prop, notifies the callback, follows the prop when bound", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    type S = { mode: "none" | "callback" | "bound"; globalFilter?: string }
    const make = (fw: FW, state: S, set: Setter<S>) => ({
      columns: probe(fw),
      data: users.slice(0, 6),
      ...(state.mode === "bound" ? { globalFilter: state.globalFilter } : {}),
      ...(state.mode !== "none"
        ? {
            onGlobalFilterChange: (value: string) => {
              calls[fw].push(String(JSON.stringify(value)))
              if (state.mode === "bound") set({ globalFilter: value })
            },
          }
        : {}),
    })
    const result = await tablePair<S>(make, {
      initial: { mode: "none" },
      steps: async ({ click, set, snapshot }) => {
        snapshot() // all rows
        await click(".filter-design")
        snapshot() // filtered by the table's own state, no callback
        await set({ mode: "callback" })
        await click(".reset-filter")
        snapshot() // reset to the initial state: undefined, all rows; callback called
        await click(".filter-design")
        snapshot() // filtered again, callback called
        await set({ mode: "bound", globalFilter: "" })
        snapshot() // the prop wins: all rows
        await click(".filter-design")
        snapshot() // filtered through the prop
        await click(".reset-filter")
        snapshot() // reset: undefined from the parent, the table's own state shows
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).not.toEqual(result.react[0])
    expect(result.react[1]).toContain('\\"globalFilter\\":\\"design\\"')
    expect(result.react[2]).toContain('\\"globalFilter\\":\\"undefined\\"')
    expect(result.react[4]).toEqual(result.react[2].replace('\\"globalFilter\\":\\"undefined\\"', '\\"globalFilter\\":\\"\\"'))
    expect(result.react[5]).toEqual(result.react[1])
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react).toEqual(["undefined", '"design"', '"design"', "undefined"])
  })

  test("column visibility: controlled from the outside and through the table", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    type S = { columnVisibility?: Record<string, boolean>; listen: boolean }
    const make = (fw: FW, state: S, set: Setter<S>) => ({
      columns: probe(fw),
      data: users.slice(0, 3),
      columnVisibility: state.columnVisibility,
      ...(state.listen
        ? {
            onColumnVisibilityChange: (visibility: Record<string, boolean>) => {
              calls[fw].push(JSON.stringify(visibility))
              set({ columnVisibility: visibility })
            },
          }
        : {}),
    })
    const result = await tablePair<S>(make, {
      initial: { columnVisibility: undefined, listen: false },
      steps: async ({ click, set, snapshot }) => {
        await click(".hide-role")
        snapshot() // no prop, no callback: the table hides it itself
        await set({ columnVisibility: { department: false } })
        snapshot()
        await set({ listen: true })
        await click(".hide-role")
        snapshot() // { department: false, role: false }
        await click(".reset-visibility")
        snapshot() // {}
        await set({ columnVisibility: { name: false, role: false, department: false, probe: false } })
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('\\"columnVisibility\\":{\\"role\\":false}')
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react).toEqual(['{"department":false,"role":false}', "{}"])
  })

  test("row selection through the table: toggles, select all, getRowId keys", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    type S = { rowSelection: Record<string, boolean>; byId: boolean }
    const make = (fw: FW, state: S, set: Setter<S>) => ({
      columns: api(fw),
      data: users.slice(0, 4),
      enableRowSelection: true,
      rowSelection: state.rowSelection,
      ...(state.byId ? { getRowId: (row: User) => row.id } : {}),
      onRowSelectionChange: (selection: Record<string, boolean>) => {
        calls[fw].push(JSON.stringify(selection))
        set({ rowSelection: selection })
      },
    })
    const result = await tablePair<S>(make, {
      initial: { rowSelection: {}, byId: false },
      steps: async ({ click, set, snapshot }) => {
        await click('[data-row="1"]')
        await click('[data-row="3"]')
        snapshot()
        await click('[data-row="1"]')
        snapshot()
        await click(".toggle-all")
        snapshot()
        await click(".toggle-all")
        snapshot()
        await set({ byId: true, rowSelection: { "USR-002": true } })
        await click('[data-row="USR-004"]')
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react.at(-1)).toBe('{"USR-002":true,"USR-004":true}')
  })

  test("row selection without the rowSelection prop: the table keeps its own selection and notifies", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    const result = await tablePair(
      (fw) => ({
        columns: api(fw),
        data: users.slice(0, 3),
        enableRowSelection: true,
        onRowSelectionChange: (selection: Record<string, boolean>) => calls[fw].push(JSON.stringify(selection)),
      }),
      {
        steps: async ({ click, snapshot }) => {
          snapshot()
          await click('[data-row="1"]')
          snapshot()
          await click(".set-selection")
          snapshot()
          await click(".toggle-all")
          snapshot()
          await click(".toggle-all")
          snapshot()
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react).toEqual(['{"1":true}', '{"1":true,"2":true}', '{"0":true,"1":true,"2":true}', "{}"])
    expect(result.react[0]).toContain('"1:false:true"')
    expect(result.react[1]).toContain('"1:true:true"')
    expect(result.react[3]).toContain('"0:true:true"')
  })

  const batch = once(batchColumns)
  const selected = (snapshot: string) => (snapshot.match(/"\d:true"/g) ?? []).join(",")

  test("updaters build on each other: uncontrolled across an await, controlled within one tick", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    type S = { mode: "uncontrolled" | "rejecting" | "accepting"; rowSelection?: Record<string, boolean> }
    const make = (fw: FW, state: S, set: Setter<S>) => ({
      columns: batch(fw),
      data: users.slice(0, 4),
      enableRowSelection: true,
      ...(state.mode === "uncontrolled" ? {} : { rowSelection: state.rowSelection }),
      onRowSelectionChange: (selection: Record<string, boolean>) => {
        calls[fw].push(`${state.mode} ${JSON.stringify(selection)}`)
        if (state.mode === "accepting") set({ rowSelection: selection })
      },
    })
    const result = await tablePair<S>(make, {
      initial: { mode: "uncontrolled" },
      steps: async ({ click, set, snapshot }) => {
        await click(".pick-two-later")
        snapshot() // the second update keeps the first
        await set({ mode: "rejecting", rowSelection: {} })
        await click(".pick-two")
        await click(".pick-two")
        await click(".pick-two-later")
        snapshot() // the prop never changes: nothing selected
        await set({ mode: "accepting", rowSelection: {} })
        await click(".pick-two")
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react).toEqual([
      'uncontrolled {"1":true}',
      'uncontrolled {"1":true,"2":true}',
      // One batch accumulates; every new batch starts from the prop
      'rejecting {"1":true}',
      'rejecting {"1":true,"2":true}',
      'rejecting {"1":true}',
      'rejecting {"1":true,"2":true}',
      'rejecting {"1":true}',
      'rejecting {"2":true}',
      'accepting {"1":true}',
      'accepting {"1":true,"2":true}',
    ])
    expect(result.react.map(selected)).toEqual(['"1:true","2:true"', "", '"1:true","2:true"'])
  })

  test("controlled row selection without a callback does nothing", async () => {
    const result = await tablePair((fw) => ({ columns: api(fw), data: users.slice(0, 3), enableRowSelection: true, rowSelection: {} }), {
      steps: async ({ click, snapshot }) => {
        snapshot()
        await click('[data-row="1"]')
        await click(".toggle-all")
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toEqual(result.react[0])
  })
})

// ---------------------------------------------------------------------------
// Row selection column, keyboard rows, pagination visibility

describe("DataTable row selection column parity", () => {
  const basic = once(basicColumns)
  const ALL = 'thead button[role="checkbox"]'
  const ROW_BOX = (index: number) => () => document.querySelectorAll('tbody button[role="checkbox"]')[index]

  test("enableRowSelection puts a checkbox column first: rows, select all, mixed state", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    const result = await tablePair(
      (fw) => ({
        columns: basic(fw),
        data: users,
        pageSize: 5,
        enableRowSelection: true,
        onRowSelectionChange: (selection: Record<string, boolean>) => calls[fw].push(JSON.stringify(selection)),
      }),
      {
        steps: async ({ click, snapshot }) => {
          snapshot()
          await click(ROW_BOX(1))
          snapshot() // one row: the header checkbox is mixed
          await click(ALL)
          snapshot() // every row, on every page
          await click(ROW_BOX(0))
          snapshot() // mixed again
          await click(ALL) // from mixed: every row
          await click(ALL) // none
          snapshot()
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(calls.vue).toEqual(calls.react)
    expect(result.react[0].match(/role="checkbox"/g)).toHaveLength(6)
    expect(result.react[0]).toContain('aria-label="Select all rows"')
    expect(result.react[0]).toContain('aria-label="Select row"')
    expect(result.react[1]).toContain('aria-checked="mixed"')
    expect(result.react[3]).toContain('aria-checked="mixed"')
    expect(result.react[4]).not.toContain('aria-checked="true"')
    expect(calls.react[0]).toBe('{"1":true}')
    expect(Object.keys(JSON.parse(calls.react[1]!))).toHaveLength(15)
    expect(calls.react.at(-1)).toBe("{}")
  })

  test("controlled selection drives the checkboxes; a parent that ignores changes keeps them", async () => {
    type S = { rowSelection: Record<string, boolean>; follow: boolean }
    const result = await tablePair<S>(
      (fw, state, set) => ({
        columns: basic(fw),
        data: users.slice(0, 3),
        enableRowSelection: true,
        getRowId: (row: User) => row.id,
        rowSelection: state.rowSelection,
        onRowSelectionChange: (selection: Record<string, boolean>) => {
          if (state.follow) set({ rowSelection: selection })
        },
      }),
      {
        initial: { rowSelection: { "USR-003": true }, follow: false },
        steps: async ({ click, set, snapshot }) => {
          snapshot()
          await click(ROW_BOX(0))
          snapshot() // unchanged: the parent did not follow
          await set({ follow: true })
          await click(ROW_BOX(0))
          snapshot()
          await set({ rowSelection: { "USR-001": true, "USR-002": true, "USR-003": true } })
          snapshot() // every row: the header checkbox is checked
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toEqual(result.react[0])
    expect(result.react[3]).toContain('aria-checked="true" aria-label="Select all rows"')
  })

  test("a click on a row checkbox selects the row without a row click", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    const result = await tablePair(
      (fw) => ({
        columns: basic(fw),
        data: users.slice(0, 3),
        enableRowSelection: true,
        onRowClick: (row: User) => calls[fw].push(row.id),
      }),
      {
        steps: async ({ click, snapshot }) => {
          await click(ROW_BOX(1))
          await click(byText("td", "Design"))
          snapshot()
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(calls.vue).toEqual(calls.react)
    expect(calls.react).toEqual(["USR-002"])
    expect(result.react[0]).toContain('aria-checked="true" aria-label="Select row"')
  })
})

describe("DataTable keyboard rows parity", () => {
  const basic = once(basicColumns)
  const ROW = (index: number) => () => document.querySelectorAll("tbody tr")[index]
  const ROW_BOX = (index: number) => () => document.querySelectorAll('tbody button[role="checkbox"]')[index]

  test("clickable rows take Tab and activate on Enter and Space; keys inside the row are left alone", async () => {
    const calls: Record<FW, string[]> = { react: [], vue: [] }
    const logs: string[][] = []
    const result = await tablePair(
      (fw) => ({
        columns: basic(fw),
        data: users.slice(0, 3),
        enableRowSelection: true,
        onRowClick: (row: User) => calls[fw].push(row.id),
      }),
      {
        steps: async ({ fire, snapshot }) => {
          const log: string[] = []
          logs.push(log)
          const listener = (event: KeyboardEvent) => log.push(`${JSON.stringify(event.key)} prevented=${event.defaultPrevented}`)
          document.addEventListener("keydown", listener)
          snapshot()
          await fire(ROW(1), "keyDown", { key: "Enter" })
          await fire(ROW(2), "keyDown", { key: " " })
          await fire(ROW(0), "keyDown", { key: "a" })
          await fire(ROW_BOX(0), "keyDown", { key: "Enter" })
          document.removeEventListener("keydown", listener)
          snapshot()
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(calls.vue).toEqual(calls.react)
    expect(logs[1]).toEqual(logs[0])
    expect(calls.react).toEqual(["USR-002", "USR-003"])
    expect(logs[0]).toEqual(['"Enter" prevented=true', '" " prevented=true', '"a" prevented=false', '"Enter" prevented=true'])
    expect(result.react[0].match(/<tr class="TableRow" tabindex="0">/g)).toHaveLength(3)
  })

  test("rows without onRowClick take no Tab stop and ignore keys", async () => {
    const result = await tablePair((fw) => ({ columns: basic(fw), data: users.slice(0, 2) }), {
      steps: async ({ fire, snapshot }) => {
        await fire(ROW(0), "keyDown", { key: "Enter" })
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).not.toContain("tabindex")
  })
})

describe("DataTable pagination visibility parity", () => {
  const basic = once(basicColumns)

  test("controls stay while the rows overflow the picked page size, under the configured one", async () => {
    const rowCount = (snapshot: string) => snapshot.match(/<tr/g)!.length - 1
    const result = await tablePair<{ globalFilter: string }>(
      (fw, state) => ({ columns: basic(fw), data: [...users, ...users], pageSize: 20, globalFilter: state.globalFilter }),
      {
        initial: { globalFilter: "" },
        steps: async ({ choose, set, snapshot }) => {
          await choose("select", "10")
          await set({ globalFilter: "engineering" })
          snapshot() // 14 rows, 10 per page
          await set({ globalFilter: "design" })
          snapshot() // 6 rows fit at both sizes: controls hidden
        },
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"1–10 of 14"')
    expect(rowCount(result.react[0]!)).toBe(10)
    expect(result.react[1]).not.toContain("Pagination")
  })
})

// ---------------------------------------------------------------------------
// Column helper interactions

describe("DataTable column helper interaction parity", () => {
  const variants = once(cellVariantColumns)
  const mouse = { pointerType: "mouse" }

  test("idCell copies on press and shows the copy tooltip", async () => {
    const ID = byText("td span", "USR-002")
    const result = await tablePair((fw) => ({ columns: variants(fw), data: users.slice(0, 3) }), {
      steps: async ({ fire, advance, snapshot }) => {
        await fire(ID, "pointerMove", mouse)
        await advance(150)
        snapshot() // "Copy"
        await fire(ID, "pointerDown", mouse)
        await fire(ID, "pointerUp", mouse)
        await fire(ID, "click")
        snapshot() // "Copied!"
        await advance(1000)
        snapshot() // closed
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('" Copy"')
    expect(result.react[1]).toContain('" Copied!"')
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(writeText).toHaveBeenLastCalledWith("USR-002")
  })

  test("tooltipHeader opens its description below the header", async () => {
    const LABEL = byText("th span", "Salary")
    const result = await tablePair((fw) => ({ columns: variants(fw), data: users.slice(0, 2) }), {
      steps: async ({ fire, advance, snapshot }) => {
        await fire(LABEL, "pointerMove", mouse)
        await advance(150)
        snapshot()
      },
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('"Annual base salary in USD."')
    expect(result.react[0]).toContain('data-side="bottom"')
  })
})

// ---------------------------------------------------------------------------
// Standalone parts

describe("DataTablePagination and DataTableColumnHeader exports", () => {
  test("exports mirror React's index", () => {
    expect(Object.keys(V).sort()).toEqual(Object.keys(R).sort())
  })
})
