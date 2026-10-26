import type { ObjectDirective } from "vue"

// React's `defaultValue` on an uncontrolled <input> / <textarea>, as a
// directive: `withDirectives(h("input", props), [[vDefaultValue, defaultValue]])`.
// A plain `defaultValue` DOM prop is not enough in Vue: the server renders it
// as a `defaultvalue` attribute (hydration then shows an empty field), and a
// later change replaces the displayed text. React instead:
// - server-renders the `value` attribute (<textarea> text content)
// - on mount assigns the `value` property as well, so a later `defaultValue`
//   change only moves the attribute and the displayed text stays
// - on hydration leaves an <input>'s `value` alone, keeping what the user
//   typed before the app took over
type Field = HTMLInputElement | HTMLTextAreaElement

export const vDefaultValue: ObjectDirective<Field, string | number | undefined> = {
  getSSRProps: ({ value }) => (value == null ? {} : { value: String(value) }),
  beforeMount(el, { value }) {
    if (value == null) return
    const initial = String(value)
    if (el.tagName === "TEXTAREA") {
      el.defaultValue = initial
      if (initial !== "") el.value = initial
      return
    }
    // A hydrated field is already in the document; a new one is not inserted yet
    if (!el.isConnected && el.value !== initial) el.value = initial
    el.defaultValue = initial
  },
  updated(el, { value, oldValue }) {
    if (value === oldValue) return
    if (value != null) el.defaultValue = String(value)
    else if (el.tagName === "TEXTAREA") el.defaultValue = ""
    else el.removeAttribute("value")
  },
}
