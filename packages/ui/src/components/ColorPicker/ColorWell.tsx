"use client"

import clsx from "clsx"
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react"
import s from "@plexui/styles/components/ColorPicker/ColorPicker.module.css"
import { useBreakpoint } from "../../hooks/useBreakpoints"
import { useLatestValue } from "../../hooks/useLatestValue"
import { Button, NavigationButton } from "../Button"
import { Dialog } from "../Dialog"
import { Eyedropper, X } from "../Icon"
import { Popover } from "../Popover"
import { Toolbar } from "../Toolbar"
import { ColorPicker, type ColorPickerProps } from "./ColorPicker"
import { alphaPercent, cssColor, eyeDropper, formatColor, hexDigits, parseColor } from "./shared"

export type ColorWellProps = Omit<ColorPickerProps, "value" | "defaultValue" | "onChange" | "aria-label" | "className" | "id"> & {
  /** The `id` of the well. */
  id?: string
  /** The controlled color, `#rrggbb` or `#rrggbbaa`; `null` shows the rainbow well with no color. Use with `onChange`. */
  value?: string | null
  /** The color when it is initially rendered. Use when you do not need to control the color. @default null */
  defaultValue?: string | null
  /** Called with the color the picker chose. */
  onChange?: (value: string) => void
  /** The title of the picker. @default "Colors" */
  title?: string
  /** Shows the eyedropper in the picker where the browser can pick a color from the screen (EyeDropper API). @default true */
  supportsEyedropper?: boolean
  /** The kit's Picker Button sizes: `sm` 28px, `lg` 36px. @default "sm" */
  size?: "sm" | "lg"
  /** When `true`, prevents the user from opening the picker. */
  disabled?: boolean
  /** The name of the well. Submits its color with the owning form. */
  name?: string
  /** Accessible name of the well. @default "Color" */
  "aria-label"?: string
  /** The `id` of the visible label of the well. */
  "aria-labelledby"?: string
  /** CSS classes applied to the well */
  className?: string
}

/**
 * A color well, as `UIColorWell`: the kit's Picker Button (5739:34128), a rainbow ring around the chosen color. It
 * opens the color picker, in a Popover from the well, and on a phone in a sheet, as the system picker.
 */
export function ColorWell({
  id,
  value: valueProp,
  defaultValue = null,
  onChange,
  title = "Colors",
  supportsEyedropper = true,
  size = "sm",
  disabled = false,
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
  ...pickerProps
}: ColorWellProps) {
  const wide = useBreakpoint("md")
  const valueId = `${useId()}-value`
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue)
  const value = valueProp === undefined ? internalValue : valueProp
  const color = parseColor(value)
  const options = useLatestValue({ controlled: valueProp !== undefined, onChange })
  // The EyeDropper API exists only in a browser, so the button appears after hydration.
  const [canPick, setCanPick] = useState(false)
  useEffect(() => setCanPick(eyeDropper() !== null), [])
  const picking = useRef(false)

  const choose = (next: string) => {
    if (!options.current.controlled) setInternalValue(next)
    options.current.onChange?.(next)
  }

  const pick = async () => {
    const EyeDropper = eyeDropper()
    if (!EyeDropper || picking.current) return
    picking.current = true
    try {
      const picked = parseColor((await new EyeDropper().open()).sRGBHex)
      if (picked) choose(formatColor({ ...picked, a: color?.a ?? 1 }))
    } catch {
      // Escape, or a click the browser did not hand to the page, cancels the pick.
    } finally {
      picking.current = false
    }
  }

  const well = (
    <button
      id={id}
      type="button"
      className={clsx(s.Well, className)}
      data-size={size}
      data-selected={color ? "" : undefined}
      disabled={disabled}
      aria-label={ariaLabelledBy ? undefined : ariaLabel ?? "Color"}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={color ? valueId : undefined}
      style={color ? { "--color-well-color": cssColor(color) } as CSSProperties : undefined}
    >
      {color && <span className={s.WellColor} />}
      {/* The color, read as the well's description. */}
      {color && <span id={valueId} hidden>{`#${hexDigits(color)}${color.a < 1 ? `, ${alphaPercent(color.a)}% opacity` : ""}`}</span>}
    </button>
  )

  const picker = (
    <ColorPicker {...pickerProps} value={formatColor(color ?? { r: 0, g: 0, b: 0, a: 1 })} onChange={choose} aria-label={title} />
  )
  const eyedropperButton = (glass: boolean): ReactNode => supportsEyedropper && canPick && (
    <Button
      color="secondary"
      variant={glass ? "soft" : "ghost"}
      mobileMaterial={glass ? "glass" : undefined}
      size={glass ? "lg" : "sm"}
      uniform
      pill
      aria-label="Eyedropper"
      onClick={() => void pick()}
    >
      <Eyedropper />
    </Button>
  )

  return (
    <>
      {name !== undefined && <input type="hidden" name={name} value={value ?? ""} disabled={disabled} />}
      {wide ? (
        <Popover open={open} onOpenChange={setOpen}>
          <Popover.Trigger>{well}</Popover.Trigger>
          <Popover.Content className={s.Popover} width="auto" side="bottom" align="center">
            <div className={s.PopoverHeader}>
              <div className={s.PopoverLeading}>{eyedropperButton(false)}</div>
              <span className={s.PopoverTitle}>{title}</span>
              <div className={s.PopoverTrailing}>
                <Button color="secondary" variant="ghost" size="sm" uniform pill aria-label="Close" onClick={() => setOpen(false)}>
                  <X />
                </Button>
              </div>
            </div>
            {picker}
          </Popover.Content>
        </Popover>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <Dialog.Trigger>{well}</Dialog.Trigger>
          <Dialog.Content mobileVariant="sheet" showClose={false} className={s.Sheet}>
            <Toolbar background="solid">
              <Toolbar.Leading>{eyedropperButton(true)}</Toolbar.Leading>
              <Toolbar.Title>{title}</Toolbar.Title>
              <Toolbar.Trailing>
                <Dialog.Close>
                  <NavigationButton action="close" />
                </Dialog.Close>
              </Toolbar.Trailing>
            </Toolbar>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body className={s.SheetBody}>{picker}</Dialog.Body>
          </Dialog.Content>
        </Dialog>
      )}
    </>
  )
}
