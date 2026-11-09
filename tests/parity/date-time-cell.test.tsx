import { act } from "@testing-library/react"
import { createElement, type FunctionComponent } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString as renderReact } from "react-dom/server"
import { afterAll, afterEach, describe, expect, test, vi } from "vitest"
import { createSSRApp, h, nextTick, type FunctionalComponent } from "vue"
import { renderToString as renderVue } from "vue/server-renderer"
import { dateTimeCell as rDateTimeCell } from "../../packages/ui/src/components/DataTable/columnHelpers"
import { dateTimeCell as vDateTimeCell } from "../../packages/vue/src/components/DataTable/columnHelpers"

// Plan 175.4: the WebKit pass over the live site found React error #418 on the Table page. The server (UTC)
// wrote the "Joined" times in its own zone, a reader elsewhere hydrated them in theirs, and the text differed.
// Now the server and the hydrating render write an instant in UTC unless the options name a zone, and the
// reader's zone follows; a date or a time written without a zone is shown as written in every zone.

type Row = { joined: string | null }
const context = (joined: string | null) => ({ row: { original: { joined } } }) as never
const text = (html: string) => {
  const template = document.createElement("template")
  template.innerHTML = html
  return template.content.textContent
}

const zone = process.env.TZ
const inZone = (timeZone: string) => {
  process.env.TZ = timeZone
}
afterAll(() => {
  if (zone === undefined) delete process.env.TZ
  else process.env.TZ = zone
})
const NodeDateTimeFormat = Intl.DateTimeFormat
// The reader's engine words a date its own way: WebKit joins a date and a time with " at " where Node writes ", "
// (plan 175.4), so the server's text and the hydrating render's differ even in one zone.
function readInWebKitWords() {
  Intl.DateTimeFormat = function (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) {
    const node = new NodeDateTimeFormat(...args)
    return { format: (date?: Date | number) => node.format(date).replace(/, (\d{1,2}:)/, " at $1"), resolvedOptions: () => node.resolvedOptions() }
  } as unknown as typeof Intl.DateTimeFormat
}
afterEach(() => {
  vi.restoreAllMocks()
  Intl.DateTimeFormat = NodeDateTimeFormat
})

async function reactRoundTrip(value: string | null, options?: Intl.DateTimeFormatOptions, webkit = false) {
  // The server and the reader are two runtimes, each making its cells in its own zone.
  inZone("UTC")
  const server = renderReact(createElement(rDateTimeCell<Row>((row) => row.joined, options) as FunctionComponent<never>, context(value)))
  inZone("America/New_York")
  if (webkit) readInWebKitWords()
  const Cell = rDateTimeCell<Row>((row) => row.joined, options) as FunctionComponent<never>
  const container = document.createElement("div")
  container.innerHTML = server
  document.body.append(container)
  const errors: string[] = []
  vi.spyOn(console, "error").mockImplementation((...args) => { errors.push(String(args[0]).slice(0, 200)) })
  let root: ReturnType<typeof hydrateRoot> | undefined
  await act(async () => {
    root = hydrateRoot(container, createElement(Cell, context(value)), { onRecoverableError: (error) => errors.push(String(error).slice(0, 200)) })
  })
  const reader = container.textContent
  await act(async () => root?.unmount())
  container.remove()
  return { server: text(server), reader, errors }
}

async function vueRoundTrip(value: string | null, options?: Intl.DateTimeFormatOptions, webkit = false) {
  inZone("UTC")
  const ServerCell = vDateTimeCell<Row>((row) => row.joined, options) as FunctionalComponent
  const server = await renderVue(createSSRApp({ render: () => h(ServerCell, context(value)) }))
  inZone("America/New_York")
  if (webkit) readInWebKitWords()
  const Cell = vDateTimeCell<Row>((row) => row.joined, options) as FunctionalComponent
  const container = document.createElement("div")
  container.innerHTML = server
  document.body.append(container)
  const errors: string[] = []
  vi.spyOn(console, "warn").mockImplementation((...args) => { errors.push(String(args[0]).slice(0, 200)) })
  vi.spyOn(console, "error").mockImplementation((...args) => { errors.push(String(args[0]).slice(0, 200)) })
  const app = createSSRApp({ render: () => h(Cell, context(value)) })
  app.mount(container)
  await nextTick()
  const reader = container.textContent
  app.unmount()
  container.remove()
  return { server: text(server), reader, errors }
}

const roundTrips = [
  ["React", reactRoundTrip],
  ["Vue", vueRoundTrip],
] as const

describe.each(roundTrips)("%s dateTimeCell rendered on a server in UTC and read in New York", (_, roundTrip) => {
  test("an instant: the server writes UTC, hydration takes it as it is, then the reader's zone shows", async () => {
    expect(await roundTrip("2023-01-15T09:00:00Z")).toEqual({
      server: "Jan 15, 2023, 09:00 AM",
      reader: "Jan 15, 2023, 04:00 AM",
      errors: [],
    })
    expect(await roundTrip("2023-01-15T09:00:00+02:00")).toMatchObject({ reader: "Jan 15, 2023, 02:00 AM", errors: [] })
    expect(await roundTrip("2023-01-15T09:00+02")).toMatchObject({ server: "Jan 15, 2023, 07:00 AM", reader: "Jan 15, 2023, 02:00 AM", errors: [] })
    expect(await roundTrip("2023-01-15 09:00-0530")).toMatchObject({ server: "Jan 15, 2023, 02:30 PM", reader: "Jan 15, 2023, 09:30 AM", errors: [] })
  })

  test("read in another engine's words, hydration takes the server's text without an error and the reader's follows", async () => {
    expect(await roundTrip("2023-01-15T09:00:00Z", undefined, true)).toEqual({
      server: "Jan 15, 2023, 09:00 AM",
      reader: "Jan 15, 2023 at 04:00 AM",
      errors: [],
    })
    expect(await roundTrip("2023-01-15T09:00", undefined, true)).toMatchObject({ reader: "Jan 15, 2023 at 09:00 AM", errors: [] })
    const tokyo: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }
    expect(await roundTrip("2023-01-15T09:00:00Z", tokyo, true)).toMatchObject({ reader: "Jan 15, 2023 at 06:00 PM", errors: [] })
  })

  test("a date or a time written without a zone reads as written everywhere", async () => {
    for (const [value, written] of [
      ["2023-01-15T09:00:00", "Jan 15, 2023, 09:00 AM"],
      ["2023-01-15T09:00", "Jan 15, 2023, 09:00 AM"],
      ["2023-01-15 23:30:15.250", "Jan 15, 2023, 11:30 PM"],
      ["2023-01-15", "Jan 15, 2023, 12:00 AM"],
      ["2023-01-15T24:00", "Jan 16, 2023, 12:00 AM"],
      ["+002023-01-15T09:00:00", "Jan 15, 2023, 09:00 AM"],
    ]) {
      expect(await roundTrip(value)).toEqual({ server: written, reader: written, errors: [] })
    }
  })

  test("an ISO date out of range is no date and shows as written; another way of writing one is read by the reader", async () => {
    for (const value of ["2023-02-30", "2023-00-15", "2023-01-32", "2023-01-15T25:00", "2023-02-30T09:00:00Z", "2023-01-15T09:00+24:00", "soon"]) {
      expect(await roundTrip(value)).toEqual({ server: value, reader: value, errors: [] })
    }
    expect(await roundTrip("Jan 15, 2023 09:00")).toEqual({ server: "Jan 15, 2023 09:00", reader: "Jan 15, 2023, 09:00 AM", errors: [] })
  })

  test("a long or full time names no zone for a date written without one", async () => {
    expect(await roundTrip("2023-01-15T09:00", { timeStyle: "long" })).toEqual({ server: "9:00:00 AM", reader: "9:00:00 AM", errors: [] })
    expect(await roundTrip("2023-01-15T09:00:00Z", { timeStyle: "long" })).toEqual({ server: "9:00:00 AM UTC", reader: "4:00:00 AM EST", errors: [] })
  })

  test("a zone in the options is written on the server and the reader alike; a written time keeps its face", async () => {
    const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo", timeZoneName: "short" }
    expect(await roundTrip("2023-01-15T09:00:00Z", options)).toEqual({ server: "06:00 PM GMT+9", reader: "06:00 PM GMT+9", errors: [] })
    expect(await roundTrip("2023-01-15T09:00", options)).toEqual({ server: "09:00 AM", reader: "09:00 AM", errors: [] })
  })

  test("the edges of the range a Date holds are read like any other date", async () => {
    expect(await roundTrip("-271821-04-19T23:00:00-01:00", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })).toEqual({
      // Intl writes the year before 1 without a sign, as the year of an era it does not name.
      server: "Apr 20, 271822",
      reader: "Apr 20, 271822",
      errors: [],
    })
    expect(await roundTrip("+275760-09-13T00:00:00Z", { year: "numeric", timeZone: "UTC" })).toMatchObject({ server: "275760", errors: [] })
    expect(await roundTrip("+275760-09-13T00:00:01Z")).toMatchObject({ server: "+275760-09-13T00:00:01Z", errors: [] })
  })

  test("no value is a dash", async () => {
    expect(await roundTrip(null)).toEqual({ server: "—", reader: "—", errors: [] })
  })
})

test("React keeps a selection made before hydration when the reader's text reads the same", async () => {
  inZone("UTC")
  const Cell = rDateTimeCell<Row>((row) => row.joined) as FunctionComponent<never>
  const container = document.createElement("div")
  container.innerHTML = renderReact(createElement(Cell, context("2023-01-15T09:00:00Z")))
  document.body.append(container)
  const textNode = container.querySelector("span")!.firstChild!
  document.getSelection()!.setBaseAndExtent(textNode, 0, textNode, 12)
  let root: ReturnType<typeof hydrateRoot> | undefined
  await act(async () => {
    root = hydrateRoot(container, createElement(Cell, context("2023-01-15T09:00:00Z")))
  })
  expect(container.querySelector("span")!.firstChild).toBe(textNode)
  expect(String(document.getSelection())).toBe("Jan 15, 2023")
  await act(async () => root?.unmount())
  container.remove()
})
