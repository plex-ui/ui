// The logic of a phone number field, the same in @plexui/ui and @plexui/react-native (keep the two copies identical:
// packages/ui/src/components/PhoneInput/phone.ts). libphonenumber-js's `min` metadata (Google's libphonenumber, the
// lengths and leading digits of every region; ~37 kB gzipped) formats as you type, reads a pasted or autofilled
// international number, drops the national trunk prefix (the UK's 0) and checks the length of each region's numbers.
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js/min"
import metadata from "libphonenumber-js/min/metadata"
import { COUNTRY_NAMES } from "./countryNames"

export type { CountryCode }

/** What the field knows about its number, beside its value. */
export type PhoneDetails = {
  /** The number in E.164 (`+447700900123`); while it is typed, the digits so far after the code (`+44770`); "" when empty. */
  value: string
  /** The region the number is read in: the picked one, or the one a pasted international number names. */
  country: CountryCode
  /** The number as the field shows it, without the code. */
  text: string
  /** The number's length fits its region (it could be dialled). */
  possible: boolean
  /** The number fits its region's lengths and leading digits. */
  valid: boolean
}

/** Every region with a calling code, as ISO 3166-1 alpha-2. */
export const ALL_COUNTRIES: readonly CountryCode[] = getCountries()

/** The calling code of a region, with its plus: `+44`. */
export function dialCode(country: CountryCode): string {
  return `+${getCountryCallingCode(country)}`
}

/** The regions that share a calling code, its main region first (+1: the US, then Canada and the Caribbean). */
export function countriesForCode(code: string): CountryCode[] {
  const list = (metadata as { country_calling_codes: Record<string, string[]> }).country_calling_codes[code]
  return (list ?? []) as CountryCode[]
}

/** Whether a string is a region the metadata knows. */
export function isCountry(value: unknown): value is CountryCode {
  return typeof value === "string" && (ALL_COUNTRIES as readonly string[]).includes(value)
}

let displayNames: { locale: string; names: { of: (code: string) => string | undefined } | null } | null = null

/** A region's name in the locale (Intl.DisplayNames), in English where the engine has no Intl.DisplayNames. */
export function countryName(country: CountryCode, locale?: string): string {
  const key = locale ?? ""
  if (!displayNames || displayNames.locale !== key) {
    let names: { of: (code: string) => string | undefined } | null = null
    try {
      const DisplayNames = (Intl as unknown as { DisplayNames?: new (locales: string | undefined, options: { type: "region" }) => { of: (code: string) => string | undefined } }).DisplayNames
      names = DisplayNames ? new DisplayNames(locale, { type: "region" }) : null
    } catch {
      names = null
    }
    displayNames = { locale: key, names }
  }
  const name = displayNames.names?.of(country)
  return name && name !== country ? name : (COUNTRY_NAMES[country] ?? country)
}

/** The flag of a region, as its two regional indicator symbols. */
export function countryFlag(country: CountryCode): string {
  return String.fromCodePoint(...[...country.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65))
}

/** The device's region, from the locale the engine runs in (`en-GB` → GB); undefined when the locale names none. */
export function deviceCountry(): CountryCode | undefined {
  try {
    const locale = new Intl.DateTimeFormat().resolvedOptions().locale
    const region = (Intl as unknown as { Locale?: new (tag: string) => { region?: string } }).Locale
      ? new (Intl as unknown as { Locale: new (tag: string) => { region?: string } }).Locale(locale).region
      : locale.split(/[-_]/).find((part, index) => index > 0 && /^[A-Z]{2}$/.test(part))
    return isCountry(region) ? region : undefined
  } catch {
    return undefined
  }
}

/** Folds a name for search: lower case, no accents (`Côte d’Ivoire` → `cote d’ivoire`). */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/** Whether a region answers a search: by its name (any word's start), its ISO code or its calling code (`44`, `+44`). */
export function matchesCountry(country: CountryCode, name: string, query: string): boolean {
  const q = fold(query.trim())
  if (!q) return true
  const digits = q.replace(/^\+/, "")
  if (/^\d+$/.test(digits)) return String(getCountryCallingCode(country)).startsWith(digits)
  if (q.length === 2 && country.toLowerCase() === q) return true
  const folded = fold(name)
  return folded.startsWith(q) || folded.includes(` ${q}`) || folded.includes(`(${q}`) || folded.includes(`-${q}`)
}

/** The characters a phone number may be typed with. */
const ALLOWED = /[^\d+\s().-]/g

/** Whether the text is an international number: a plus, or 00 (the international prefix most regions dial). */
function international(text: string): boolean {
  const trimmed = text.replace(/[\s().-]/g, "")
  return trimmed.startsWith("+") || trimmed.startsWith("00")
}

/** The digits of a text, in order. */
export function digitsOf(text: string): string {
  return text.replace(/\D/g, "")
}

/** The number's details for its national digits in a region; `format` groups the digits as the region writes them. */
export function readNational(digits: string, country: CountryCode, format: boolean): PhoneDetails {
  if (!digits) return { value: "", country, text: "", possible: false, valid: false }
  const typer = new AsYouType(country)
  const formatted = typer.input(digits)
  const number = typer.getNumber()
  const value = typer.getNumberValue() ?? `${dialCode(country)}${digits}`
  return {
    value,
    country,
    text: format ? formatted : digits,
    possible: number?.isPossible() ?? false,
    valid: number?.isValid() ?? false,
  }
}

/** Whether national digits are longer than any number of the region (the field takes no more). */
export function tooLong(digits: string, country: CountryCode): boolean {
  if (!digits) return false
  const value = new AsYouType(country)
  value.input(digits)
  return tooLongValue(value.getNumberValue() ?? "")
}

/** Whether a value in E.164 is longer than any number of its region. */
export function tooLongValue(value: string): boolean {
  return value.length > 2 && validatePhoneNumberLength(value) === "TOO_LONG"
}

/** The calling code a `+digits` text starts with (calling codes are prefix-free), and the digits after it. */
function splitCode(digits: string): { code: string; rest: string } | null {
  for (let length = 1; length <= 3 && length <= digits.length; length++) {
    const code = digits.slice(0, length)
    if (countriesForCode(code).length) return { code, rest: digits.slice(length) }
  }
  return null
}

/** The region of a calling code: the picked one when it shares the code, else the code's main region. */
function regionFor(code: string, country: CountryCode, named?: CountryCode): CountryCode {
  const shared = countriesForCode(code)
  return shared.includes(country) ? country : (named ?? shared[0] ?? country)
}

/**
 * What the number field holds after a change: a typed national number in the picked region, or a pasted or autofilled
 * international one (`+44 7700 900123`, `0044…`), whose code picks the region (the picked region stays when it shares
 * the code and the number fits it: +1 in Canada) and is dropped from the field.
 */
export function readInput(text: string, country: CountryCode, format: boolean): PhoneDetails {
  const clean = text.replace(ALLOWED, "")
  if (international(clean)) {
    const plus = clean.replace(/[\s().-]/g, "").replace(/^00/, "+")
    const parsed = parsePhoneNumberFromString(plus)
    if (parsed) {
      const code = String(parsed.countryCallingCode)
      const national = String(parsed.nationalNumber)
      const fits = countriesForCode(code).includes(country) && parsePhoneNumberFromString(national, country)?.isPossible()
      // The picked region stays where it shares the code and the number fits it (+1 in Canada); else the number's own
      const region = fits ? country : (parsed.country ?? countriesForCode(code)[0] ?? country)
      // The field holds the number as the region dials it, with its trunk prefix (07400 123456, 8 812 123-45-67): read
      // again it gives the same number (Russia's 812 alone would lose its 8 as a trunk prefix)
      const dialled = parsed.formatNational()
      return { value: parsed.number, country: region, text: format ? dialled : digitsOf(dialled), possible: parsed.isPossible(), valid: parsed.isValid() }
    }
    // Too short to parse: a known code with digits after it (+447) is that code's region and those digits; a code
    // still being typed (+4) stays as it is
    const split = splitCode(digitsOf(plus))
    if (split && split.rest) {
      const region = regionFor(split.code, country)
      return { value: `+${split.code}${split.rest}`, country: region, text: split.rest, possible: false, valid: false }
    }
    return { value: "", country, text: clean, possible: false, valid: false }
  }
  return readNational(digitsOf(clean), country, format)
}

/** The field's details for a value in E.164 (or the digits so far after a code), read in a region. */
export function readValue(value: string | undefined, country: CountryCode, format: boolean): PhoneDetails {
  if (!value) return { value: "", country, text: "", possible: false, valid: false }
  return readInput(value.startsWith("+") ? value : `+${value}`, country, format)
}

/** The caret's place after `count` digits in a formatted text (just after the count-th digit). */
export function caretAfterDigits(text: string, count: number): number {
  if (count <= 0) {
    const first = text.search(/\d/)
    return first < 0 ? text.length : first
  }
  let seen = 0
  for (let index = 0; index < text.length; index++) {
    if (/\d/.test(text[index]!)) {
      seen++
      if (seen === count) return index + 1
    }
  }
  return text.length
}
