import { computed, defineComponent, h, ref, shallowRef, useId, type PropType, type VNode } from "vue"
import s from "@plexui/styles/components/ColorPicker/ColorPicker.module.css"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../ContextMenu/index.js"
import { Plus, RemoveTrash } from "../Icon/index.js"
import { MenuItem } from "../Menu/index.js"
import { PageControl } from "../PageControl/index.js"
import { prefersReducedMotion } from "../../lib/helpers.js"
import { SegmentedControl, SegmentedControlOption } from "../SegmentedControl/index.js"
import { SliderRoot, SliderThumb, SliderTrack } from "../Slider/sliderPrimitive.js"
import {
  alphaPercent,
  channelTrack,
  COLOR_PICKER_CHANNELS,
  COLOR_PICKER_GRID_COLUMNS,
  COLOR_PICKER_MODES,
  COLOR_PICKER_SWATCHES_PER_PAGE,
  cssColor,
  formatColor,
  gridColor,
  gridIndex,
  gridMove,
  hexDigits,
  listMove,
  opacityTrack,
  parseColor,
  parseNumber,
  sameRgb,
  spectrumColor,
  spectrumPoint,
  swatchPageCount,
  type ColorPickerMode,
  type Rgba,
  type SpectrumPoint,
} from "./shared.js"

// Vue port of packages/ui/src/components/ColorPicker/ColorPicker.tsx: the same DOM (the Mode segmented control,
// Grid, Spectrum or Sliders, the Opacity slider and the saved colors with Add), keys and pointer. React's
// `value` + `onChange` become `value` + `update:value` (`v-model:value`) and `change`; `onModeChange` becomes
// `update:mode` (`v-model:mode`) and `modeChange`; `onSwatchesChange` becomes `update:swatches`
// (`v-model:swatches`) and `swatchesChange`.

const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 }
const GRID_CELLS = COLOR_PICKER_GRID_COLUMNS * 10
const NAVIGATION_KEYS = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"]

type Select = (color: Rgba) => void

type ColorSliderOptions = {
  labelId: string
  value: number
  max: number
  track: string
  valueText: string
  onChange: (value: number) => void
}

/** A slider on a colored track, after the kit's Opacity slider (515:47434): a 36px ring on a 40px capsule. */
const colorSlider = ({ labelId, value, max, track, valueText, onChange }: ColorSliderOptions) =>
  h("div", { class: s.Track, style: { "--color-picker-track": track } }, [
    h(
      SliderRoot,
      {
        class: s.SliderRoot,
        min: 0,
        max,
        step: 1,
        values: [value],
        onValueChange: ([next]: number[]) => onChange(next ?? value),
      },
      {
        default: () => [
          h(SliderTrack, { class: s.SliderTrack }),
          h(SliderThumb, { "class": s.Knob, "aria-labelledby": labelId, "aria-valuetext": valueText }),
        ],
      },
    ),
  ])

/** The value beside a slider, after the kit's Percentage field (515:47438); typing a value and Enter or leaving it applies it. */
const ColorField = defineComponent({
  name: "ColorPickerField",
  props: {
    value: { type: String, required: true },
    label: String,
    labelledBy: String,
    inputMode: { type: String as PropType<"numeric" | "text">, required: true },
    wide: { type: Boolean, default: false },
    onCommit: { type: Function as PropType<(text: string) => void>, required: true },
  },
  setup(props) {
    const draft = ref<string | null>(null)
    const commit = () => {
      if (draft.value !== null) props.onCommit(draft.value)
      draft.value = null
    }
    return () =>
      h("input", {
        "class": s.Field,
        "data-wide": props.wide ? "" : undefined,
        "type": "text",
        "inputmode": props.inputMode,
        "autocomplete": "off",
        "spellcheck": "false",
        "aria-label": props.label,
        "aria-labelledby": props.labelledBy,
        "value": draft.value ?? props.value,
        "onFocus": (event: FocusEvent) => {
          draft.value = props.value
          ;(event.currentTarget as HTMLInputElement).select()
        },
        "onInput": (event: Event) => {
          draft.value = (event.currentTarget as HTMLInputElement).value
        },
        "onBlur": commit,
        "onKeydown": (event: KeyboardEvent) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          commit()
        },
      })
  },
})

/** The kit's Color Grid: twelve hues across, grays then nine shades down; the selected cell has a 3px white ring. */
const colorGrid = (color: Rgba, onSelect: Select) => {
  const selected = gridIndex(color)
  const focusable = selected === -1 ? 0 : selected

  const onKeydown = (event: KeyboardEvent) => {
    const from = Number((event.target as HTMLElement).dataset.index)
    if (!Number.isInteger(from) || !NAVIGATION_KEYS.includes(event.key)) return
    event.preventDefault()
    const next = gridMove(from, event.key)
    if (next === from) return
    const cell = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-index="${next}"]`)
    cell?.focus()
    onSelect({ ...(parseColor(gridColor(next)) ?? BLACK), a: color.a })
  }

  return h(
    "div",
    { "role": "radiogroup", "aria-label": "Grid", "class": s.Grid, onKeydown },
    Array.from({ length: GRID_CELLS }, (_, index) => {
      const hex = gridColor(index)
      return h("button", {
        "key": hex,
        "type": "button",
        "role": "radio",
        "aria-checked": index === selected,
        "aria-label": hex.toUpperCase(),
        "tabindex": index === focusable ? 0 : -1,
        "data-index": index,
        "class": s.Cell,
        "style": { backgroundColor: hex },
        "onClick": () => onSelect({ ...(parseColor(hex) ?? BLACK), a: color.a }),
      })
    }),
  )
}

const SPECTRUM_STEP = 0.01

/**
 * The spectrum: hue from top to bottom, white to the full hue to black across. Up and Down change the hue, Left
 * and Right the lightness, by 1% (10% with Shift or Page Up and Page Down).
 */
const ColorSpectrum = defineComponent({
  name: "ColorPickerSpectrum",
  props: {
    color: { type: Object as PropType<Rgba>, required: true },
    onSelect: { type: Function as PropType<Select>, required: true },
  },
  setup(props) {
    const held = shallowRef<{ point: SpectrumPoint; digits: string }>({ point: spectrumPoint(props.color), digits: hexDigits(props.color) })
    // The point the picker last chose stays while the color is the one it chose: a hex color loses the exact point,
    // and a gray or white has no hue of its own.
    const point = computed(() => (held.value.digits === hexDigits(props.color) ? held.value.point : spectrumPoint(props.color, held.value.point)))

    const choose = (next: SpectrumPoint) => {
      const clamped = { x: Math.min(1, Math.max(0, next.x)), y: Math.min(1, Math.max(0, next.y)) }
      const chosen = spectrumColor(clamped, props.color.a)
      held.value = { point: clamped, digits: hexDigits(chosen) }
      props.onSelect(chosen)
    }

    const fromPointer = (event: PointerEvent) => {
      const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
      if (box.width === 0 || box.height === 0) return
      choose({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height })
    }

    const onKeydown = (event: KeyboardEvent) => {
      const { x, y } = point.value
      const step = event.shiftKey ? SPECTRUM_STEP * 10 : SPECTRUM_STEP
      const moves: Record<string, SpectrumPoint> = {
        ArrowLeft: { x: x - step, y },
        ArrowRight: { x: x + step, y },
        ArrowUp: { x, y: y - step },
        ArrowDown: { x, y: y + step },
        PageUp: { x, y: y - SPECTRUM_STEP * 10 },
        PageDown: { x, y: y + SPECTRUM_STEP * 10 },
      }
      const next = moves[event.key]
      if (!next) return
      event.preventDefault()
      choose(next)
    }

    return () => {
      const { x, y } = point.value
      const hue = Math.round(y * 360)
      return h(
        "div",
        {
          "role": "slider",
          "tabindex": 0,
          "aria-label": "Spectrum",
          "aria-valuemin": 0,
          "aria-valuemax": 360,
          "aria-valuenow": hue,
          "aria-valuetext": `#${hexDigits(props.color)}, hue ${hue}°, lightness ${Math.round((1 - x) * 100)}%`,
          "class": s.Spectrum,
          "onPointerdown": (event: PointerEvent) => {
            if (event.button !== 0) return
            const target = event.currentTarget as HTMLElement
            target.setPointerCapture?.(event.pointerId)
            target.focus({ preventScroll: true })
            fromPointer(event)
          },
          "onPointermove": (event: PointerEvent) => {
            if ((event.currentTarget as HTMLElement).hasPointerCapture?.(event.pointerId)) fromPointer(event)
          },
          onKeydown,
        },
        [h("span", { class: s.Loupe, style: { left: `${x * 100}%`, top: `${y * 100}%`, backgroundColor: cssColor(props.color, 1) } })],
      )
    }
  },
})

/** Red, Green and Blue, each a slider and a field from 0 to 255, then the Hex field. */
const colorSliders = (uid: string, color: Rgba, onSelect: Select) =>
  h("div", { class: s.Sliders }, [
    ...COLOR_PICKER_CHANNELS.map(({ channel, label }) => {
      const labelId = `${uid}-${channel}`
      return h("div", { key: channel, class: s.Channel }, [
        h("span", { id: labelId, class: s.Label }, label),
        h("div", { class: s.Row }, [
          colorSlider({
            labelId,
            value: color[channel],
            max: 255,
            track: channelTrack(color, channel),
            valueText: String(color[channel]),
            onChange: (next) => onSelect({ ...color, [channel]: next }),
          }),
          h(ColorField, {
            value: String(color[channel]),
            labelledBy: labelId,
            inputMode: "numeric",
            onCommit: (text: string) => {
              const next = parseNumber(text, 0, 255)
              if (next !== null) onSelect({ ...color, [channel]: next })
            },
          }),
        ]),
      ])
    }),
    h("div", { class: s.Hex }, [
      h("span", { id: `${uid}-hex`, class: s.Label }, "Hex Color #"),
      h(ColorField, {
        value: hexDigits(color),
        labelledBy: `${uid}-hex`,
        inputMode: "text",
        wide: true,
        onCommit: (text: string) => {
          const next = parseColor(text)
          if (next) onSelect({ ...next, a: color.a })
        },
      }),
    ]),
  ])

const colorName = (color: Rgba) => `#${hexDigits(color)}${color.a < 1 ? `, ${alphaPercent(color.a)}% opacity` : ""}`

/**
 * The current color, and the saved colors in pages of two rows of five with Add after the last (kit Swatches
 * 515:46585). A saved color is a radio; Delete or Backspace, or Delete in its context menu, removes it.
 */
const ColorSwatches = defineComponent({
  name: "ColorPickerSwatches",
  props: {
    color: { type: Object as PropType<Rgba>, required: true },
    swatches: { type: Array as PropType<string[]>, required: true },
    onSelect: { type: Function as PropType<Select>, required: true },
    onChange: { type: Function as PropType<(swatches: string[]) => void>, required: true },
  },
  setup(props) {
    const pagesRef = ref<HTMLElement | null>(null)
    const page = ref(0)

    const reveal = (element: HTMLElement | null | undefined) => element?.scrollIntoView?.({ block: "nearest", inline: "nearest" })

    const remove = (index: number, pages: HTMLElement | null) => {
      const { swatches } = props
      props.onChange(swatches.filter((_, i) => i !== index))
      // Focus stays in the list: on the color that takes the place, the one before at the end, or Add.
      const target = Math.min(index, swatches.length - 2)
      requestAnimationFrame(() => {
        const next = target >= 0 ? pages?.querySelector<HTMLElement>(`[data-swatch="${target}"]`) : pages?.querySelector<HTMLElement>("[data-add]")
        next?.focus()
        reveal(next)
      })
    }

    return () => {
      const { color, swatches } = props
      const saved = swatches.map((hex) => parseColor(hex) ?? BLACK)
      const current = formatColor(color)
      const checked = saved.findIndex((swatch) => sameRgb(swatch, color) && alphaPercent(swatch.a) === alphaPercent(color.a))
      const focusable = checked === -1 ? 0 : checked
      const pageCount = swatchPageCount(swatches.length)

      const onKeydown = (event: KeyboardEvent) => {
        const from = Number((event.target as HTMLElement).dataset.swatch)
        if (!Number.isInteger(from)) return
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault()
          remove(from, event.currentTarget as HTMLElement)
          return
        }
        if (!NAVIGATION_KEYS.includes(event.key)) return
        event.preventDefault()
        const next = listMove(from, swatches.length, event.key)
        if (next === from) return
        const element = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-swatch="${next}"]`)
        element?.focus()
        reveal(element)
        const swatch = saved[next]
        if (swatch) props.onSelect(swatch)
      }

      const items = [...swatches.map((hex, index) => ({ hex, index })), null]
      const pages = Array.from({ length: pageCount }, (_, p) => items.slice(p * COLOR_PICKER_SWATCHES_PER_PAGE, (p + 1) * COLOR_PICKER_SWATCHES_PER_PAGE))

      const swatchButton = (index: number): VNode => {
        const swatch = saved[index] ?? BLACK
        return h(ContextMenu, { key: `${index}-${swatches[index]}` }, () => [
          h(ContextMenuTrigger, null, () =>
            h(
              "button",
              {
                "type": "button",
                "role": "radio",
                "aria-checked": index === checked,
                "aria-label": colorName(swatch),
                "tabindex": index === focusable ? 0 : -1,
                "data-swatch": index,
                "class": s.Swatch,
                "onClick": () => props.onSelect(swatch),
              },
              [h("span", { class: s.SwatchFill, style: { backgroundColor: cssColor(swatch) } })],
            ),
          ),
          h(ContextMenuContent, null, () =>
            h(MenuItem, { danger: true, onSelect: () => remove(index, pagesRef.value) }, () => [h(RemoveTrash, { width: 20, height: 20 }), " Delete"]),
          ),
        ])
      }

      const addButton = () =>
        h(
          "button",
          {
            "key": "add",
            "type": "button",
            "data-add": "",
            "class": s.Add,
            "aria-label": "Add color",
            "onClick": (event: MouseEvent) => {
              props.onChange([...swatches, current])
              const add = event.currentTarget as HTMLElement
              requestAnimationFrame(() => reveal(add))
            },
          },
          [h(Plus)],
        )

      return h("div", { class: s.Swatches }, [
        h("div", { "role": "img", "aria-label": `Selected color ${colorName(color)}`, "class": s.Current }, [
          h("span", { class: s.CurrentFill, style: { backgroundColor: cssColor(color) } }),
        ]),
        h("div", { class: s.Saved }, [
          h(
            "div",
            {
              "ref": pagesRef,
              "role": "radiogroup",
              "aria-label": "Saved colors",
              "class": s.Pages,
              onKeydown,
              "onScroll": (event: Event) => {
                const { scrollLeft, clientWidth } = event.currentTarget as HTMLElement
                if (clientWidth > 0) page.value = Math.round(scrollLeft / clientWidth)
              },
            },
            pages.map((pageItems, p) =>
              h("div", { key: p, class: s.Page }, pageItems.map((item) => (item === null ? addButton() : swatchButton(item.index)))),
            ),
          ),
          // The row of the page control keeps its height with one page, so the picker does not change size.
          h(
            "div",
            { class: s.PageControlRow },
            pageCount > 1
              ? [
                  h(PageControl, {
                    "count": pageCount,
                    "value": Math.min(page.value, pageCount - 1),
                    "ariaLabel": "Saved color pages",
                    "onUpdate:value": (index: number) => {
                      const pagesElement = pagesRef.value
                      if (!pagesElement) return
                      page.value = index
                      pagesElement.scrollTo?.({ left: index * pagesElement.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" })
                    },
                  }),
                ]
              : [],
          ),
        ]),
      ])
    }
  },
})

const ColorPickerComponent = defineComponent({
  name: "ColorPicker",
  inheritAttrs: false,
  props: {
    /** The `id` of the picker. */
    id: String,
    /** The controlled color, `#rrggbb` or `#rrggbbaa`. Bind with `v-model:value`. */
    value: { type: String, default: undefined },
    /** The color when it is initially rendered. Use when you do not need to control the color. @default "#000000" */
    defaultValue: { type: String, default: undefined },
    /** Shows the Opacity slider, as `supportsAlpha` of the system picker. @default true */
    supportsAlpha: { type: Boolean, default: true },
    /** The controlled way to choose a color. Bind with `v-model:mode`. */
    mode: { type: String as PropType<ColorPickerMode>, default: undefined },
    /** The way to choose a color when the picker is initially rendered. @default "grid" */
    defaultMode: { type: String as PropType<ColorPickerMode>, default: "grid" },
    /** The controlled saved colors. Bind with `v-model:swatches`. */
    swatches: { type: Array as PropType<string[]>, default: undefined },
    /** The saved colors when the picker is initially rendered. @default [] */
    defaultSwatches: { type: Array as PropType<string[]>, default: undefined },
    /** Accessible name of the picker. @default "Colors" */
    ariaLabel: { type: String, default: "Colors" },
  },
  emits: {
    /** The color changed: `#rrggbb`, or `#rrggbbaa` when it is not opaque */
    "update:value": (value: string) => typeof value === "string",
    /** The color changed (React `onChange`) */
    "change": (value: string) => typeof value === "string",
    /** Another of Grid, Spectrum and Sliders was chosen */
    "update:mode": (mode: ColorPickerMode) => typeof mode === "string",
    /** Another way was chosen (React `onModeChange`) */
    "modeChange": (mode: ColorPickerMode) => typeof mode === "string",
    /** Add saved the current color or Delete removed one */
    "update:swatches": (swatches: string[]) => Array.isArray(swatches),
    /** The saved colors changed (React `onSwatchesChange`) */
    "swatchesChange": (swatches: string[]) => Array.isArray(swatches),
  },
  setup(props, { attrs, emit }) {
    const uid = useId()
    const internalValue = ref(props.defaultValue ?? "#000000")
    const color = computed(() => parseColor(props.value ?? internalValue.value) ?? BLACK)

    const internalMode = ref<ColorPickerMode>(props.defaultMode)
    const mode = computed(() => props.mode ?? internalMode.value)

    const internalSwatches = ref<string[]>(props.defaultSwatches ?? [])
    const swatches = computed(() => props.swatches ?? internalSwatches.value)

    const commit = (next: Rgba) => {
      const formatted = formatColor(props.supportsAlpha ? next : { ...next, a: 1 })
      // Only a color other than the one shown is reported; an owner that keeps its color hears every new choice.
      if (formatted === formatColor(color.value)) return
      // A controlled color changes only when the owner passes it back.
      if (props.value === undefined) internalValue.value = formatted
      emit("update:value", formatted)
      emit("change", formatted)
    }

    const changeMode = (next: string) => {
      const chosen = next as ColorPickerMode
      if (props.mode === undefined) internalMode.value = chosen
      emit("update:mode", chosen)
      emit("modeChange", chosen)
    }

    const changeSwatches = (next: string[]) => {
      if (props.swatches === undefined) internalSwatches.value = next
      emit("update:swatches", next)
      emit("swatchesChange", next)
    }

    return () => {
      const current = color.value
      const opacityId = `${uid}-opacity`
      return h(
        "div",
        {
          ...attrs,
          "id": props.id,
          "role": "group",
          "aria-label": props.ariaLabel,
          "class": [s.ColorPicker, attrs.class],
          "data-mode": mode.value,
        },
        [
          h(
            SegmentedControl,
            { "aria-label": "Mode", "value": mode.value, "block": true, "class": s.Modes, "data-mobile-size": "small", "onChange": changeMode },
            { default: () => COLOR_PICKER_MODES.map((option) => h(SegmentedControlOption, { key: option.value, value: option.value }, () => option.label)) },
          ),
          h("div", { class: s.Body }, [
            mode.value === "grid" ? colorGrid(current, commit) : null,
            mode.value === "spectrum" ? h(ColorSpectrum, { color: current, onSelect: commit }) : null,
            mode.value === "sliders" ? colorSliders(uid, current, commit) : null,
          ]),
          props.supportsAlpha
            ? h("div", { class: s.Opacity }, [
                h("span", { id: opacityId, class: s.Label }, "Opacity"),
                h("div", { class: s.Row }, [
                  colorSlider({
                    labelId: opacityId,
                    value: alphaPercent(current.a),
                    max: 100,
                    track: opacityTrack(current),
                    valueText: `${alphaPercent(current.a)}%`,
                    onChange: (percent) => commit({ ...color.value, a: percent / 100 }),
                  }),
                  h(ColorField, {
                    value: `${alphaPercent(current.a)}%`,
                    labelledBy: opacityId,
                    inputMode: "numeric",
                    onCommit: (text: string) => {
                      const percent = parseNumber(text, 0, 100)
                      if (percent !== null) commit({ ...color.value, a: percent / 100 })
                    },
                  }),
                ]),
              ])
            : null,
          h(ColorSwatches, { color: current, swatches: swatches.value, onSelect: commit, onChange: changeSwatches }),
        ],
      )
    }
  },
})

export type ColorPickerProps = InstanceType<typeof ColorPickerComponent>["$props"]

/**
 * The system color picker of iOS 26 (kit Color Picker - iPhone 0:5275): Grid, Spectrum and Sliders, the Opacity
 * slider, and the saved colors with Add. Show it inside a Popover or a Sheet, or use `ColorWell`, which does.
 */
export const ColorPicker = ColorPickerComponent
