import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h } from "vue"
import { Field as RField } from "../../packages/ui/src/components/Field"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { Field } from "../../packages/vue/src/components/Field"
import { Select } from "../../packages/vue/src/components/Select"
import { flushVue, mountVue } from "./harness"

// Console 15.11: a product row component wraps its control, so Field gives the id to the wrapper div. A press on the
// label or the row's empty part still reaches the one control inside, as an iOS cell does.
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView = function () {}
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})
afterEach(() => { cleanup() })

const options = [{ value: "a", label: "Square" }, { value: "b", label: "Wide" }]
type Kind = "select" | "input" | "two"

const RWrap = ({ id, kind }: { id?: string; kind: Kind }) => (
  <div id={id}>
    {kind === "input" ? <input type="text" /> : <RSelect options={options} value="a" onChange={() => {}} />}
    {kind === "two" && <button type="button">More</button>}
  </div>
)
const VWrap = defineComponent({
  props: { id: String, kind: { type: String, required: true } },
  setup: (props) => () => h("div", { id: props.id }, [
    props.kind === "input" ? h("input", { type: "text" }) : h(Select, { options, value: "a" }),
    props.kind === "two" ? h("button", { type: "button" }, "More") : null,
  ]),
})

const mount = async (framework: string, kind: Kind) => {
  if (framework === "React") render(<RField row label="Aspect ratio"><RWrap kind={kind} /></RField>)
  else { mountVue(() => h(Field, { row: true, label: "Aspect ratio" }, () => h(VWrap, { kind }))); await flushVue() }
}
const press = async (element: HTMLElement) => { await act(async () => { element.click(); await flushVue() }) }
const opened = () => !!document.querySelector('[aria-expanded="true"]')

describe.each(["React", "Vue"])("%s Field row around a wrapper", (framework) => {
  test.each(["label", "row"] as const)("a press on the %s opens the Select inside", async (where) => {
    await mount(framework, "select")
    await press(where === "label" ? document.querySelector("label")! : document.querySelector<HTMLElement>("[data-row]")!)
    expect(opened()).toBe(true)
  })

  test("a press on the label focuses the input inside", async () => {
    await mount(framework, "input")
    await press(document.querySelector("label")!)
    expect(document.activeElement).toBe(document.querySelector('input[type="text"]'))
  })

  test("with two controls inside, a press on the label reaches neither", async () => {
    await mount(framework, "two")
    await press(document.querySelector("label")!)
    expect(opened()).toBe(false)
    expect(document.activeElement).toBe(document.body)
  })
})
