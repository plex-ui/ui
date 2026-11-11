import { computed, defineComponent, h, onMounted, ref, useId, type PropType } from "vue"
import s from "@plexui/styles/components/ColorPicker/ColorPicker.module.css"
import { useBreakpoint } from "../../composables/useBreakpoints.js"
import { Button, NavigationButton } from "../Button/index.js"
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../Dialog/index.js"
import { Eyedropper, X } from "../Icon/index.js"
import { Popover, PopoverContent, PopoverTrigger } from "../Popover/index.js"
import { Toolbar, ToolbarLeading, ToolbarTitle, ToolbarTrailing } from "../Toolbar/index.js"
import { ColorPicker } from "./ColorPicker.js"
import { alphaPercent, cssColor, eyeDropper, formatColor, hexDigits, parseColor, type ColorPickerMode } from "./shared.js"

// Vue port of packages/ui/src/components/ColorPicker/ColorWell.tsx: the same well, and the same picker in a Popover
// from the well or, on a phone, a sheet with the eyedropper, the title and Close. React's `value` + `onChange`
// become `value` + `update:value` (`v-model:value`) and `change`; the picker's `mode` and `swatches` events pass
// through as `update:mode` / `modeChange` and `update:swatches` / `swatchesChange`.

const ColorWellComponent = defineComponent({
  name: "ColorWell",
  inheritAttrs: false,
  props: {
    /** The `id` of the well. */
    id: String,
    /** The controlled color, `#rrggbb` or `#rrggbbaa`; `null` shows the rainbow well with no color. Bind with `v-model:value`. */
    value: { type: String as PropType<string | null>, default: undefined },
    /** The color when it is initially rendered. Use when you do not need to control the color. @default null */
    defaultValue: { type: String as PropType<string | null>, default: null },
    /** The title of the picker. @default "Colors" */
    title: { type: String, default: "Colors" },
    /** Shows the eyedropper in the picker where the browser can pick a color from the screen (EyeDropper API). @default true */
    supportsEyedropper: { type: Boolean, default: true },
    /** The kit's Picker Button sizes: `sm` 28px, `lg` 36px. @default "sm" */
    size: { type: String as PropType<"sm" | "lg">, default: "sm" },
    /** When `true`, prevents the user from opening the picker. */
    disabled: { type: Boolean, default: false },
    /** The name of the well. Submits its color with the owning form. */
    name: String,
    /** Accessible name of the well. @default "Color" */
    ariaLabel: String,
    /** The `id` of the visible label of the well. */
    ariaLabelledby: String,
    /** Shows the Opacity slider in the picker. @default true */
    supportsAlpha: { type: Boolean, default: true },
    /** The controlled way to choose a color. Bind with `v-model:mode`. */
    mode: { type: String as PropType<ColorPickerMode>, default: undefined },
    /** The way to choose a color when the picker opens. @default "grid" */
    defaultMode: { type: String as PropType<ColorPickerMode>, default: undefined },
    /** The controlled saved colors. Bind with `v-model:swatches`. */
    swatches: { type: Array as PropType<string[]>, default: undefined },
    /** The saved colors when the picker opens. @default [] */
    defaultSwatches: { type: Array as PropType<string[]>, default: undefined },
  },
  emits: {
    /** The picker chose a color */
    "update:value": (value: string) => typeof value === "string",
    /** The picker chose a color (React `onChange`) */
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
    const wide = useBreakpoint("md")
    const valueId = `${useId()}-value`
    const open = ref(false)
    const internalValue = ref<string | null>(props.defaultValue)
    const value = computed(() => (props.value === undefined ? internalValue.value : props.value))
    const color = computed(() => parseColor(value.value))
    // The EyeDropper API exists only in a browser, so the button appears after mounting.
    const canPick = ref(false)
    onMounted(() => {
      canPick.value = eyeDropper() !== null
    })
    let picking = false

    const choose = (next: string) => {
      if (props.value === undefined) internalValue.value = next
      emit("update:value", next)
      emit("change", next)
    }

    const pick = async () => {
      const EyeDropper = eyeDropper()
      if (!EyeDropper || picking) return
      picking = true
      try {
        const picked = parseColor((await new EyeDropper().open()).sRGBHex)
        if (picked) choose(formatColor({ ...picked, a: color.value?.a ?? 1 }))
      } catch {
        // Escape, or a click the browser did not hand to the page, cancels the pick.
      } finally {
        picking = false
      }
    }

    const setOpen = (next: boolean) => {
      open.value = next
    }

    return () => {
      const current = color.value
      const well = h(
        "button",
        {
          ...attrs,
          "id": props.id,
          "type": "button",
          "class": [s.Well, attrs.class],
          "data-size": props.size,
          "data-selected": current ? "" : undefined,
          "disabled": props.disabled,
          "aria-label": props.ariaLabelledby ? undefined : (props.ariaLabel ?? "Color"),
          "aria-labelledby": props.ariaLabelledby,
          "aria-describedby": current ? valueId : undefined,
          "style": current ? { "--color-well-color": cssColor(current) } : undefined,
        },
        current
          ? [
              h("span", { class: s.WellColor }),
              // The color, read as the well's description.
              h("span", { id: valueId, hidden: true }, `#${hexDigits(current)}${current.a < 1 ? `, ${alphaPercent(current.a)}% opacity` : ""}`),
            ]
          : [],
      )

      const picker = () =>
        h(ColorPicker, {
          "supportsAlpha": props.supportsAlpha,
          "mode": props.mode,
          ...(props.defaultMode !== undefined ? { defaultMode: props.defaultMode } : {}),
          "swatches": props.swatches,
          "defaultSwatches": props.defaultSwatches,
          "value": formatColor(current ?? { r: 0, g: 0, b: 0, a: 1 }),
          "ariaLabel": props.title,
          "onChange": choose,
          "onUpdate:mode": (mode: ColorPickerMode) => emit("update:mode", mode),
          "onModeChange": (mode: ColorPickerMode) => emit("modeChange", mode),
          "onUpdate:swatches": (swatches: string[]) => emit("update:swatches", swatches),
          "onSwatchesChange": (swatches: string[]) => emit("swatchesChange", swatches),
        })

      const eyedropperButton = (glass: boolean) =>
        props.supportsEyedropper && canPick.value
          ? h(
              Button,
              {
                "color": "secondary",
                "variant": glass ? "soft" : "ghost",
                "mobileMaterial": glass ? "glass" : undefined,
                "size": glass ? "lg" : "sm",
                "uniform": true,
                "pill": true,
                "aria-label": "Eyedropper",
                "onClick": () => void pick(),
              },
              () => h(Eyedropper),
            )
          : null

      const hidden = props.name !== undefined ? h("input", { type: "hidden", name: props.name, value: value.value ?? "", disabled: props.disabled }) : null

      const presentation = wide.value
        ? h(Popover, { "open": open.value, "onUpdate:open": setOpen }, () => [
            h(PopoverTrigger, null, () => well),
            h(PopoverContent, { class: s.Popover, width: "auto", side: "bottom", align: "center" }, () => [
              h("div", { class: s.PopoverHeader }, [
                h("div", { class: s.PopoverLeading }, [eyedropperButton(false)]),
                h("span", { class: s.PopoverTitle }, props.title),
                h("div", { class: s.PopoverTrailing }, [
                  h(
                    Button,
                    { "color": "secondary", "variant": "ghost", "size": "sm", "uniform": true, "pill": true, "aria-label": "Close", "onClick": () => setOpen(false) },
                    () => h(X),
                  ),
                ]),
              ]),
              picker(),
            ]),
          ])
        : h(Dialog, { "open": open.value, "onUpdate:open": setOpen }, () => [
            h(DialogTrigger, null, () => well),
            h(DialogContent, { mobileVariant: "sheet", surface: "grouped", showClose: false, class: s.Sheet }, () => [
              // iOS 27.2 sets Close first and the eyedropper last (UIColorPickerViewController on an iPhone 17); the
              // iOS 26 kit had them the other way round.
              h(Toolbar, { background: "solid" }, () => [
                h(ToolbarLeading, null, () => h(DialogClose, null, () => h(NavigationButton, { action: "close" }))),
                h(ToolbarTitle, null, () => props.title),
                h(ToolbarTrailing, null, () => eyedropperButton(true)),
              ]),
              h(DialogHeader, null, () => h(DialogTitle, null, () => props.title)),
              h(DialogBody, { class: s.SheetBody }, () => picker()),
            ]),
          ])

      return [hidden, presentation]
    }
  },
})

export type ColorWellProps = InstanceType<typeof ColorWellComponent>["$props"]

/**
 * A color well, as `UIColorWell`: the kit's Picker Button (5739:34128), a rainbow ring around the chosen color. It
 * opens the color picker, in a Popover from the well, and on a phone in a sheet, as the system picker.
 */
export const ColorWell = ColorWellComponent
