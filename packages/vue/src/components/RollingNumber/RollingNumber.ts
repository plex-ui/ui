import { defineComponent, h, type HTMLAttributes, type PropType } from "vue"
import s from "@plexui/styles/components/RollingNumber/RollingNumber.module.css"

// Vue port of packages/ui/src/components/RollingNumber/RollingNumber.tsx: the same DOM, attributes fall through to
// the root <span>.

/** A written number's characters, each keyed by its place around the decimal separator, so a digit keeps its reel
 * when the number grows or its fraction gets longer; digits are the locale's own (Arabic-Indic, Bengali…). */
export const rollingNumberParts = (value: number, locales: Intl.LocalesArgument = "en-US", format?: Intl.NumberFormatOptions) => {
  const formatter = new Intl.NumberFormat(locales, format)
  const { locale, numberingSystem } = formatter.resolvedOptions()
  const digitFormatter = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: false })
  const glyphs = Array.from({ length: 10 }, (_, digit) => digitFormatter.format(digit))
  const parts = formatter.formatToParts(value)
  let integers = parts.reduce((count, part) => count + (part.type === "integer" ? Array.from(part.value).length : 0), 0)
  let fractions = 0
  const seen: Record<string, number> = {}
  const characters = parts.flatMap((part) =>
    Array.from(part.value).map((character) => {
      const glyph = glyphs.indexOf(character)
      const digit = (part.type === "integer" || part.type === "fraction") && glyph >= 0 ? glyph : null
      let key: string
      if (part.type === "integer") key = `i${integers--}`
      else if (part.type === "fraction") key = `f${++fractions}`
      else if (part.type === "group") key = `g${integers}`
      else {
        seen[part.type] = (seen[part.type] ?? 0) + 1
        key = `${part.type}${seen[part.type]}-${character}`
      }
      return { character, digit, key }
    }),
  )
  return { text: parts.map((part) => part.value).join(""), glyphs, characters }
}

const RollingNumberComponent = defineComponent({
  name: "RollingNumber",
  props: {
    /** The number shown. A new value rolls each changed digit to it. */
    value: { type: Number, required: true },
    /** The locale the number is written in, as `Intl.NumberFormat` takes it; fixed, so the server writes it as the browser does. @default "en-US" */
    locales: { type: [String, Array] as PropType<Intl.LocalesArgument>, default: undefined },
    /** How the number is written: currency, percent, fraction digits, grouping, as `Intl.NumberFormat` takes it. */
    format: { type: Object as PropType<Intl.NumberFormatOptions>, default: undefined },
  },
  setup(props) {
    return () => {
      const { text, glyphs, characters } = rollingNumberParts(props.value, props.locales, props.format)
      return h("span", { class: s.RollingNumber }, [
        h("span", { class: s.Text }, text),
        h("span", { "class": s.Visual, "aria-hidden": "true" }, characters.map(({ character, digit, key }) =>
          digit === null
            ? h("span", { key }, character)
            : h("span", { "key": key, "class": s.Digit, "data-digit": digit }, [
              h("span", { class: s.Ghost }, character),
              h("span", { class: s.Reel, style: { "--rolling-number-digit": digit } }, glyphs.map((reelDigit) => h("span", { key: reelDigit }, reelDigit))),
            ]),
        )),
      ])
    }
  },
})

type RollingNumberOwnProps = InstanceType<typeof RollingNumberComponent>["$props"]

/** RollingNumber props plus the native attributes that fall through to the root <span>. */
export type RollingNumberProps = RollingNumberOwnProps & Omit<HTMLAttributes, keyof RollingNumberOwnProps>

/**
 * A number whose digits roll to a new value, as an odometer: for a total, a balance, a count or a KPI that changes
 * while it is watched. It reads as the written number; its reels are hidden from a screen reader.
 */
export const RollingNumber = RollingNumberComponent as typeof RollingNumberComponent & { new (): { $props: RollingNumberProps } }
