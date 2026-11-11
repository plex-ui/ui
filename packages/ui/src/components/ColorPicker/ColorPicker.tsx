"use client"

import clsx from "clsx"
import { Slider as RadixSlider } from "radix-ui"
import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import s from "@plexui/styles/components/ColorPicker/ColorPicker.module.css"
import { useLatestValue } from "../../hooks/useLatestValue"
import { prefersReducedMotion } from "../../lib/helpers"
import { ContextMenu } from "../ContextMenu"
import { Plus, RemoveTrash } from "../Icon"
import { PageControl } from "../PageControl"
import { SegmentedControl } from "../SegmentedControl"
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
} from "./shared"

const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 }
const GRID_CELLS = COLOR_PICKER_GRID_COLUMNS * 10
const NAVIGATION_KEYS = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"]

export type ColorPickerProps = {
  /** The `id` of the picker. */
  id?: string
  /** The controlled color, `#rrggbb` or `#rrggbbaa`. Use with `onChange`. */
  value?: string
  /** The color when it is initially rendered. Use when you do not need to control the color. @default "#000000" */
  defaultValue?: string
  /** Called with the next color: `#rrggbb`, or `#rrggbbaa` when it is not opaque. */
  onChange?: (value: string) => void
  /** Shows the Opacity slider, as `supportsAlpha` of the system picker. @default true */
  supportsAlpha?: boolean
  /** The controlled way to choose a color. Use with `onModeChange`. */
  mode?: ColorPickerMode
  /** The way to choose a color when the picker is initially rendered. @default "grid" */
  defaultMode?: ColorPickerMode
  /** Called when another of Grid, Spectrum and Sliders is chosen. */
  onModeChange?: (mode: ColorPickerMode) => void
  /** The controlled saved colors. Use with `onSwatchesChange`. */
  swatches?: string[]
  /** The saved colors when the picker is initially rendered. @default [] */
  defaultSwatches?: string[]
  /** Called with the saved colors after Add saves the current color or Delete removes one. */
  onSwatchesChange?: (swatches: string[]) => void
  /** Accessible name of the picker. @default "Colors" */
  "aria-label"?: string
  /** CSS classes applied to the picker */
  className?: string
}

type ColorSliderProps = {
  labelId: string
  value: number
  max: number
  track: string
  /** The knob's fill: the current color, as iOS 27.2 fills it (opaque on a channel, at its opacity on Opacity). */
  fill: string
  valueText: string
  onChange: (value: number) => void
}

/** A slider on a colored track, after the kit's Opacity slider (515:47434): a ring filled with the color on a capsule. */
function ColorSlider({ labelId, value, max, track, fill, valueText, onChange }: ColorSliderProps) {
  return (
    <div className={s.Track} style={{ "--color-picker-track": track } as CSSProperties}>
      <RadixSlider.Root className={s.SliderRoot} min={0} max={max} step={1} value={[value]} onValueChange={([next]) => onChange(next)}>
        <RadixSlider.Track className={s.SliderTrack} />
        <RadixSlider.Thumb className={s.Knob} style={{ backgroundColor: fill }} aria-labelledby={labelId} aria-valuetext={valueText} />
      </RadixSlider.Root>
    </div>
  )
}

type ColorFieldProps = {
  value: string
  label?: string
  labelledBy?: string
  inputMode: "numeric" | "text"
  wide?: boolean
  onCommit: (text: string) => void
}

/** The value beside a slider, after the kit's Percentage field (515:47438); typing a value and Enter or leaving it applies it. */
function ColorField({ value, label, labelledBy, inputMode, wide = false, onCommit }: ColorFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null) onCommit(draft)
    setDraft(null)
  }
  return (
    <input
      className={s.Field}
      data-wide={wide ? "" : undefined}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      aria-labelledby={labelledBy}
      value={draft ?? value}
      onFocus={(event) => {
        setDraft(value)
        event.currentTarget.select()
      }}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return
        event.preventDefault()
        commit()
      }}
    />
  )
}

/**
 * The system color picker of iOS 27.2 (UIColorPickerViewController, after the iOS 26 kit's Color Picker - iPhone
 * 0:5275): Grid, Spectrum and Sliders, the Opacity slider, and the saved colors with Add. Show it inside a Popover or
 * a Sheet, or use `ColorWell`, which does.
 */
export function ColorPicker({
  id,
  value: valueProp,
  defaultValue,
  onChange,
  supportsAlpha = true,
  mode: modeProp,
  defaultMode = "grid",
  onModeChange,
  swatches: swatchesProp,
  defaultSwatches,
  onSwatchesChange,
  "aria-label": ariaLabel = "Colors",
  className,
}: ColorPickerProps) {
  const uid = useId()
  const [internalValue, setInternalValue] = useState(() => defaultValue ?? "#000000")
  const value = valueProp ?? internalValue
  const color = parseColor(value) ?? BLACK
  const colorRef = useLatestValue(color)
  const options = useLatestValue({ controlled: valueProp !== undefined, supportsAlpha, onChange })

  const [internalMode, setInternalMode] = useState<ColorPickerMode>(defaultMode)
  const mode = modeProp ?? internalMode

  const [internalSwatches, setInternalSwatches] = useState(() => defaultSwatches ?? [])
  const swatches = swatchesProp ?? internalSwatches

  const commit = (next: Rgba) => {
    const formatted = formatColor(options.current.supportsAlpha ? next : { ...next, a: 1 })
    // Only a color other than the one shown is reported; an owner that keeps its color hears every new choice.
    if (formatted === formatColor(colorRef.current)) return
    // A controlled color changes only when the owner passes it back, as in Vue.
    if (!options.current.controlled) setInternalValue(formatted)
    options.current.onChange?.(formatted)
  }

  const changeMode = (next: ColorPickerMode) => {
    if (modeProp === undefined) setInternalMode(next)
    onModeChange?.(next)
  }

  const changeSwatches = (next: string[]) => {
    if (swatchesProp === undefined) setInternalSwatches(next)
    onSwatchesChange?.(next)
  }

  return (
    <div id={id} role="group" aria-label={ariaLabel} className={clsx(s.ColorPicker, className)} data-mode={mode}>
      <SegmentedControl<ColorPickerMode> aria-label="Mode" value={mode} onChange={changeMode} block className={s.Modes} data-mobile-size="small">
        {COLOR_PICKER_MODES.map((option) => (
          <SegmentedControl.Option key={option.value} value={option.value}>{option.label}</SegmentedControl.Option>
        ))}
      </SegmentedControl>
      <div className={s.Body}>
        {mode === "grid" && <ColorGrid color={color} onSelect={commit} />}
        {mode === "spectrum" && <ColorSpectrum color={color} onSelect={commit} />}
        {mode === "sliders" && <ColorSliders uid={uid} color={color} onSelect={commit} />}
      </div>
      {supportsAlpha && (
        <div className={s.Opacity}>
          <span id={`${uid}-opacity`} className={s.Label}>Opacity</span>
          <div className={s.Row}>
            <ColorSlider
              labelId={`${uid}-opacity`}
              value={alphaPercent(color.a)}
              max={100}
              track={opacityTrack(color)}
              fill={cssColor(color)}
              valueText={`${alphaPercent(color.a)}%`}
              onChange={(percent) => commit({ ...colorRef.current, a: percent / 100 })}
            />
            <ColorField
              value={`${alphaPercent(color.a)}%`}
              labelledBy={`${uid}-opacity`}
              inputMode="numeric"
              onCommit={(text) => {
                const percent = parseNumber(text, 0, 100)
                if (percent !== null) commit({ ...colorRef.current, a: percent / 100 })
              }}
            />
          </div>
        </div>
      )}
      <ColorSwatches color={color} swatches={swatches} onSelect={commit} onChange={changeSwatches} />
    </div>
  )
}

type PartProps = { color: Rgba; onSelect: (color: Rgba) => void }

/** The kit's Color Grid: twelve hues across, grays then nine shades down; the selected cell has a 3px white ring. */
function ColorGrid({ color, onSelect }: PartProps) {
  const selected = gridIndex(color)
  const focusable = selected === -1 ? 0 : selected

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = Number((event.target as HTMLElement).dataset.index)
    if (!Number.isInteger(from) || !NAVIGATION_KEYS.includes(event.key)) return
    event.preventDefault()
    const next = gridMove(from, event.key)
    if (next === from) return
    const cell = event.currentTarget.querySelector<HTMLElement>(`[data-index="${next}"]`)
    cell?.focus()
    onSelect({ ...(parseColor(gridColor(next)) ?? BLACK), a: color.a })
  }

  return (
    <div role="radiogroup" aria-label="Grid" className={s.Grid} onKeyDown={onKeyDown}>
      {Array.from({ length: GRID_CELLS }, (_, index) => {
        const hex = gridColor(index)
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={index === selected}
            aria-label={hex.toUpperCase()}
            tabIndex={index === focusable ? 0 : -1}
            data-index={index}
            className={s.Cell}
            style={{ backgroundColor: hex }}
            onClick={() => onSelect({ ...(parseColor(hex) ?? BLACK), a: color.a })}
          />
        )
      })}
    </div>
  )
}

const SPECTRUM_STEP = 0.01

/**
 * The spectrum: hue from top to bottom, white to the full hue to black across. Up and Down change the hue, Left
 * and Right the lightness, by 1% (10% with Shift or Page Up and Page Down).
 */
function ColorSpectrum({ color, onSelect }: PartProps) {
  const [held, setHeld] = useState<{ point: SpectrumPoint; digits: string }>(() => ({ point: spectrumPoint(color), digits: hexDigits(color) }))
  // The point the picker last chose stays while the color is the one it chose: a hex color loses the exact point,
  // and a gray or white has no hue of its own.
  const point = held.digits === hexDigits(color) ? held.point : spectrumPoint(color, held.point)

  const choose = (next: SpectrumPoint) => {
    const clamped = { x: Math.min(1, Math.max(0, next.x)), y: Math.min(1, Math.max(0, next.y)) }
    const chosen = spectrumColor(clamped, color.a)
    setHeld({ point: clamped, digits: hexDigits(chosen) })
    onSelect(chosen)
  }

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return
    choose({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? SPECTRUM_STEP * 10 : SPECTRUM_STEP
    const moves: Record<string, SpectrumPoint> = {
      ArrowLeft: { x: point.x - step, y: point.y },
      ArrowRight: { x: point.x + step, y: point.y },
      ArrowUp: { x: point.x, y: point.y - step },
      ArrowDown: { x: point.x, y: point.y + step },
      PageUp: { x: point.x, y: point.y - SPECTRUM_STEP * 10 },
      PageDown: { x: point.x, y: point.y + SPECTRUM_STEP * 10 },
    }
    const next = moves[event.key]
    if (!next) return
    event.preventDefault()
    choose(next)
  }

  const hue = Math.round(point.y * 360)
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Spectrum"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={hue}
      aria-valuetext={`#${hexDigits(color)}, hue ${hue}°, lightness ${Math.round((1 - point.x) * 100)}%`}
      className={s.Spectrum}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture?.(event.pointerId)
        event.currentTarget.focus({ preventScroll: true })
        fromPointer(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) fromPointer(event)
      }}
      onKeyDown={onKeyDown}
    >
      <span
        className={s.Loupe}
        style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, backgroundColor: cssColor(color, 1) }}
      />
    </div>
  )
}

/** Red, Green and Blue, each a slider and a field from 0 to 255, then the Hex field. */
function ColorSliders({ uid, color, onSelect }: PartProps & { uid: string }) {
  return (
    <div className={s.Sliders}>
      {COLOR_PICKER_CHANNELS.map(({ channel, label }) => {
        const labelId = `${uid}-${channel}`
        return (
          <div key={channel} className={s.Channel}>
            <span id={labelId} className={s.Label}>{label}</span>
            <div className={s.Row}>
              <ColorSlider
                labelId={labelId}
                value={color[channel]}
                max={255}
                track={channelTrack(color, channel)}
                fill={cssColor(color, 1)}
                valueText={String(color[channel])}
                onChange={(next) => onSelect({ ...color, [channel]: next })}
              />
              <ColorField
                value={String(color[channel])}
                labelledBy={labelId}
                inputMode="numeric"
                onCommit={(text) => {
                  const next = parseNumber(text, 0, 255)
                  if (next !== null) onSelect({ ...color, [channel]: next })
                }}
              />
            </div>
          </div>
        )
      })}
      <div className={s.Hex}>
        <span id={`${uid}-hex`} className={s.HexLabel}>Hex Color #</span>
        <ColorField
          value={hexDigits(color)}
          labelledBy={`${uid}-hex`}
          inputMode="text"
          wide
          onCommit={(text) => {
            const next = parseColor(text)
            if (next) onSelect({ ...next, a: color.a })
          }}
        />
      </div>
    </div>
  )
}

type ColorSwatchesProps = PartProps & { swatches: string[]; onChange: (swatches: string[]) => void }

/**
 * The current color, and the saved colors in pages of two rows of six with Add after the last (iOS 27.2; kit
 * Swatches 515:46585 had rows of five). A saved color is a radio; Delete or Backspace, or Delete in its context
 * menu, removes it.
 */
function ColorSwatches({ color, swatches, onSelect, onChange }: ColorSwatchesProps) {
  const pagesRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const saved = swatches.map((hex) => parseColor(hex) ?? BLACK)
  const current = formatColor(color)
  const checked = saved.findIndex((swatch) => sameRgb(swatch, color) && alphaPercent(swatch.a) === alphaPercent(color.a))
  const focusable = checked === -1 ? 0 : checked
  const pageCount = swatchPageCount(swatches.length)

  const reveal = (element: HTMLElement | null | undefined) => element?.scrollIntoView?.({ block: "nearest", inline: "nearest" })

  const remove = (index: number, pages: HTMLElement | null) => {
    onChange(swatches.filter((_, i) => i !== index))
    // Focus stays in the list: on the color that takes the place, the one before at the end, or Add.
    const target = Math.min(index, swatches.length - 2)
    requestAnimationFrame(() => {
      const next = target >= 0 ? pages?.querySelector<HTMLElement>(`[data-swatch="${target}"]`) : pages?.querySelector<HTMLElement>("[data-add]")
      next?.focus()
      reveal(next)
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = Number((event.target as HTMLElement).dataset.swatch)
    if (!Number.isInteger(from)) return
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      remove(from, event.currentTarget)
      return
    }
    if (!NAVIGATION_KEYS.includes(event.key)) return
    event.preventDefault()
    const next = listMove(from, swatches.length, event.key)
    if (next === from) return
    const element = event.currentTarget.querySelector<HTMLElement>(`[data-swatch="${next}"]`)
    element?.focus()
    reveal(element)
    onSelect(saved[next])
  }

  const items = [...swatches.map((hex, index) => ({ hex, index })), null]
  const pages = Array.from({ length: pageCount }, (_, p) => items.slice(p * COLOR_PICKER_SWATCHES_PER_PAGE, (p + 1) * COLOR_PICKER_SWATCHES_PER_PAGE))

  return (
    <div className={s.Swatches}>
      <div role="img" aria-label={`Selected color #${hexDigits(color)}${color.a < 1 ? `, ${alphaPercent(color.a)}% opacity` : ""}`} className={s.Current}>
        <span className={s.CurrentFill} style={{ backgroundColor: cssColor(color) }} />
      </div>
      <div className={s.Saved}>
        <div
          ref={pagesRef}
          role="radiogroup"
          aria-label="Saved colors"
          className={s.Pages}
          onKeyDown={onKeyDown}
          onScroll={(event) => {
            const { scrollLeft, clientWidth } = event.currentTarget
            if (clientWidth > 0) setPage(Math.round(scrollLeft / clientWidth))
          }}
        >
          {pages.map((pageItems, p) => (
            <div key={p} className={s.Page}>
              {pageItems.map((item) => item === null ? (
                <button
                  key="add"
                  type="button"
                  data-add=""
                  className={s.Add}
                  aria-label="Add color"
                  onClick={(event) => {
                    onChange([...swatches, current])
                    const add = event.currentTarget
                    requestAnimationFrame(() => reveal(add))
                  }}
                >
                  <Plus />
                </button>
              ) : (
                <ContextMenu key={`${item.index}-${item.hex}`}>
                  <ContextMenu.Trigger>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={item.index === checked}
                      aria-label={`#${hexDigits(saved[item.index])}${saved[item.index].a < 1 ? `, ${alphaPercent(saved[item.index].a)}% opacity` : ""}`}
                      tabIndex={item.index === focusable ? 0 : -1}
                      data-swatch={item.index}
                      className={s.Swatch}
                      onClick={() => onSelect(saved[item.index])}
                    >
                      <span className={s.SwatchFill} style={{ backgroundColor: cssColor(saved[item.index]) }} />
                    </button>
                  </ContextMenu.Trigger>
                  <ContextMenu.Content>
                    <ContextMenu.Item danger onSelect={() => remove(item.index, pagesRef.current)}>
                      <RemoveTrash width={20} height={20} /> Delete
                    </ContextMenu.Item>
                  </ContextMenu.Content>
                </ContextMenu>
              ))}
            </div>
          ))}
        </div>
        {/* The row of the page control keeps its height with one page, so the picker does not change size. */}
        <div className={s.PageControlRow}>
          {pageCount > 1 && (
            <PageControl
              count={pageCount}
              value={Math.min(page, pageCount - 1)}
              aria-label="Saved color pages"
              onChange={(index) => {
                const pagesElement = pagesRef.current
                if (!pagesElement) return
                setPage(index)
                pagesElement.scrollTo?.({ left: index * pagesElement.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" })
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
