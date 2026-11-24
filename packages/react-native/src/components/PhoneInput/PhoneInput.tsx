import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react"
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type TextInputSelectionChangeEvent,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import CheckMd from "../../icons/plex/CheckMd"
import Search from "../../icons/plex/Search"
import { Pressable } from "../../internal/Pressable"
import { ANDROID_DIM, iosDim, Overlay } from "../../internal/Overlay"
import { useKeyboardHeight } from "../../internal/keyboard"
import { useTheme } from "../../theme/ThemeProvider"
import { Field } from "../Field/Field"
import { FloatingLabelInput } from "../FloatingLabelInput/FloatingLabelInput"
import { MaterialArrowDropDown } from "../Icon/material"
import { Input } from "../Input/Input"
import { List, ListItem } from "../List/List"
import { NavigationButton } from "../NavigationButton/NavigationButton"
import { Text } from "../Text/Text"
import {
  ALL_COUNTRIES,
  countryFlag,
  countryName,
  deviceCountry,
  dialCode,
  digitsOf,
  fold,
  isCountry,
  matchesCountry,
  readInput,
  readNational,
  readValue,
  tooLongValue,
  type CountryCode,
  type PhoneDetails,
} from "./phone"

export type { CountryCode, PhoneDetails }

export type PhoneInputProps = {
  /** The number in E.164 (`+447700900123`), or the digits typed so far after the code; "" when empty. */
  value?: string
  defaultValue?: string
  /** Called on each change with the value in E.164 and what the field knows about it (its region, validity). */
  onChange?: (value: string, details: PhoneDetails) => void
  /** The region the number is typed in. */
  country?: CountryCode
  /** @default the device's region (its locale's), else "US" */
  defaultCountry?: CountryCode
  /** Called when the region changes: picked from the list, or named by a pasted international number. */
  onCountryChange?: (country: CountryCode) => void
  /** The regions the list offers. @default every region with a calling code */
  countries?: readonly CountryCode[]
  /** The locale of the regions' names (Intl.DisplayNames; English where the engine has none). @default the device's */
  locale?: string
  /** Groups the digits as the region writes them, while they are typed at the end. @default false on iOS (Settings' Add Phone Number shows the digits as typed), true on Android */
  formatting?: boolean
  /** Flags before the regions' names in the list. @default false */
  flags?: boolean
  /** The number field's placeholder and name. @default "Phone number" */
  label?: string
  /** The region row's name and the list's title. @default "Country or Region" */
  countryLabel?: string
  /** The list's search placeholder. @default "Search" */
  searchPlaceholder?: string
  /** iOS: the group's header over the two rows. */
  header?: ReactNode
  /** Words under the field (iOS: the group's footer). */
  description?: ReactNode
  /** An error under the field; it marks the field invalid. */
  errorMessage?: string
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  onBlur?: () => void
  onSubmitEditing?: () => void
  returnKeyType?: "done" | "next" | "go" | "send"
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** A region's calling code, kept left to right in a right-to-left line. */
const ltr = (text: string) => `⁦${text}⁩`

/**
 * A phone number field: the region and the number, as iOS's Add Phone Number (Settings): one group of two rows, the
 * region's code and name with a chevron, which opens the list of regions, then the number alone; on Android Material's
 * region dropdown field over the number's outlined field. The value is E.164; a pasted or autofilled international
 * number picks its region, a national trunk prefix (the UK's 0) is dropped from the value, and the field takes no more
 * digits than the region's longest number (libphonenumber's metadata).
 */
export function PhoneInput({
  value: valueProp,
  defaultValue,
  onChange,
  country: countryProp,
  defaultCountry,
  onCountryChange,
  countries = ALL_COUNTRIES,
  locale,
  formatting,
  flags = false,
  label = "Phone number",
  countryLabel = "Country or Region",
  searchPlaceholder = "Search",
  header,
  description,
  errorMessage,
  invalid,
  disabled = false,
  autoFocus,
  onBlur,
  onSubmitEditing,
  returnKeyType,
  testID,
  style,
}: PhoneInputProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const format = formatting ?? android
  // The first value is read in the first region; an international one names its own (+44… under a US default)
  const [initial] = useState(() => {
    const start = countryProp ?? defaultCountry ?? deviceCountry()
    return readValue(valueProp ?? defaultValue, start && isCountry(start) ? start : "US", format)
  })
  const [ownCountry, setOwnCountry] = useState<CountryCode>(initial.country)
  const country = countryProp ?? ownCountry
  const [text, setText] = useState(initial.text)
  // The value last sent (or read in): a new value from outside that differs from it is read into the field. Only a
  // new one: a parent's value may come a render after the edit, so an unchanged value is not read as a rejected edit
  const sent = useRef(valueProp ?? defaultValue ?? "")
  useEffect(() => {
    if (valueProp === undefined || valueProp === sent.current) return
    sent.current = valueProp
    const details = readValue(valueProp, country, format)
    setText(details.text)
    if (details.country !== country) pickCountry(details.country)
    // Only a new value from outside is read in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueProp])
  // A controlled region that the first value names otherwise is told once
  useEffect(() => {
    if (countryProp !== undefined && initial.country !== countryProp) onCountryChange?.(initial.country)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Where the caret is: grouping applies to what is typed at the end only
  const selection = useRef<{ start: number; end: number } | null>(null)
  const [open, setOpen] = useState(false)

  const pickCountry = (next: CountryCode) => {
    if (countryProp === undefined) setOwnCountry(next)
    if (next !== country) onCountryChange?.(next)
  }
  const emit = (details: PhoneDetails) => {
    sent.current = details.value
    onChange?.(details.value, details)
  }

  const change = (next: string) => {
    const before = text
    let input = next
    // A separator deleted (a space, a dash): the digit before it goes, as the caret would be stuck behind it
    if (input.length < before.length && digitsOf(input) === digitsOf(before)) {
      let at = 0
      while (at < input.length && input[at] === before[at]) at++
      const digit = before.slice(0, at).search(/\d(?=\D*$)/)
      input = digit < 0 ? input : before.slice(0, digit) + before.slice(digit + 1)
    }
    const typing = !/^\s*(\+|00)/.test(input)
    // Typed at the end the digits take their groups; an edit inside keeps the text as it is, grouped again on blur.
    // At the end: the caret was there (where the platform tells it) and one text starts the other
    const caret = selection.current
    const atEnd = (caret == null || caret.end >= before.length) && (input.startsWith(before) || before.startsWith(input))
    const details = readInput(input, country, format && atEnd)
    // No more digits than the region's longest number, typed or pasted
    if (digitsOf(input).length > digitsOf(before).length && tooLongValue(details.value)) return
    setText(format && !atEnd && typing ? input : details.text)
    if (details.country !== country) pickCountry(details.country)
    emit(details)
  }

  const blur = () => {
    if (format && text && !/^\s*\+/.test(text)) setText(readNational(digitsOf(text), country, true).text)
    onBlur?.()
  }

  const choose = (next: CountryCode) => {
    setOpen(false)
    if (next === country) return
    pickCountry(next)
    // The digits stay; the value follows the new region's code
    const details = readNational(digitsOf(text), next, format)
    setText(details.text)
    emit(details)
  }

  const name = countryName(country, locale)
  const code = dialCode(country)
  const regionName = `${countryLabel}, ${name}, ${code.replace("+", "plus ")}`
  const fieldProps = {
    value: text,
    onChangeText: change,
    onSelectionChange: (event: TextInputSelectionChangeEvent) => {
      selection.current = event.nativeEvent.selection
    },
    onBlur: blur,
    onSubmitEditing,
    returnKeyType,
    autoFocus,
    keyboardType: "phone-pad" as const,
    inputMode: "tel" as const,
    textContentType: "telephoneNumber" as const,
    autoComplete: "tel" as const,
    importantForAutofill: "yes" as const,
    accessibilityLabel: label,
  }
  const picker = (
    <CountryPicker
      open={open}
      onClose={() => setOpen(false)}
      value={country}
      onSelect={choose}
      countries={countries}
      locale={locale}
      flags={flags}
      title={countryLabel}
      searchPlaceholder={searchPlaceholder}
    />
  )
  const error = errorMessage || undefined
  const marked = invalid ?? error != null

  if (android) {
    // Material: the region's dropdown field (its arrow turned while the list is open), the number's field under it
    return (
      <View style={[styles.androidStack, style]} testID={testID}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={regionName}
          accessibilityState={{ disabled, expanded: open }}
          disabled={disabled}
          onPress={() => setOpen(true)}
        >
          <View pointerEvents="none">
            <FloatingLabelInput
              label={countryLabel}
              value={`${ltr(code)} ${name}`}
              readOnly
              disabled={disabled}
              endAdornment={
                <View style={open ? styles.turned : null}>
                  <MaterialArrowDropDown size={24} color={theme.material.onSurfaceVariant} />
                </View>
              }
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        </Pressable>
        <FloatingLabelInput label={label} type="tel" errorMessage={error} invalid={marked} description={description} disabled={disabled} {...fieldProps} />
        {picker}
      </View>
    )
  }

  // iOS: one group, the region's row (its code and name in the label color, a chevron) over the number's row
  return (
    <View style={style} testID={testID}>
      <List header={header} footer={description} error={error}>
        <ListItem label={`${ltr(code)} (${name})`} onPress={disabled ? undefined : () => setOpen(true)} disabled={disabled} accessibilityLabel={regionName} />
        <Field row label={label} hideLabel>
          <Input placeholder={label} invalid={marked} disabled={disabled} {...fieldProps} />
        </Field>
      </List>
      {picker}
    </View>
  )
}

type CountryPickerProps = {
  open: boolean
  onClose: () => void
  value: CountryCode
  onSelect: (country: CountryCode) => void
  countries: readonly CountryCode[]
  locale?: string
  flags: boolean
  title: string
  searchPlaceholder: string
}

type Section = { key: string; title?: string; items: { country: CountryCode; name: string }[] }

/** The section index's step and its letters' size (UIKit's section index, measured on iOS 27.2: 13.787 a letter, 11pt). */
const INDEX_STEP = 13.787

/**
 * The list of regions: on iOS a sheet as large as the screen allows (the sheet bar's Close and title, a search field
 * under it, the picked and the device's regions first, then A to Z with the section index at the trailing edge, a
 * checkmark on the picked one); on Android Material's full-screen dialog (Close, the title, a search field, the list).
 */
function CountryPicker({ open, onClose, value, onSelect, countries, locale, flags, title, searchPlaceholder }: CountryPickerProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const insets = useSafeAreaInsets()
  const { height: screen } = useWindowDimensions()
  const keyboard = useKeyboardHeight(open)
  const [query, setQuery] = useState("")
  // A list that opens again starts from its top, with no search
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) setQuery("")
  }
  const named = useMemo(() => {
    const collator = new Intl.Collator(locale, { sensitivity: "base" })
    return countries.map((country) => ({ country, name: countryName(country, locale) })).sort((a, b) => collator.compare(a.name, b.name))
  }, [countries, locale])
  const sections = useMemo<Section[]>(() => {
    const found = named.filter((item) => matchesCountry(item.country, item.name, query))
    if (query.trim()) return [{ key: "results", items: found }]
    const here = deviceCountry()
    const top = [value, ...(here && here !== value && countries.includes(here) ? [here] : [])]
    const first = { key: "top", items: top.map((country) => ({ country, name: countryName(country, locale) })) }
    const letters = new Map<string, Section>()
    for (const item of found) {
      const letter = fold(item.name).charAt(0).toUpperCase()
      const key = /[A-Z]/.test(letter) ? letter : "#"
      if (!letters.has(key)) letters.set(key, { key, title: key, items: [] })
      letters.get(key)!.items.push(item)
    }
    return [first, ...letters.values()]
  }, [named, query, value, countries, locale])
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null)
  const offsets = useRef<Record<string, number>>({})
  const index = sections.filter((section) => section.title)
  const [indexHeight, setIndexHeight] = useState(0)
  const jump = (event: GestureResponderEvent) => {
    // The letters' step as laid out (they grow with the text size)
    const step = indexHeight > 0 && index.length ? indexHeight / index.length : INDEX_STEP
    const at = Math.floor(event.nativeEvent.locationY / step)
    const section = index[Math.max(0, Math.min(index.length - 1, at))]
    const y = section ? offsets.current[section.key] : undefined
    if (y != null) scroller.current?.scrollTo({ y, animated: false })
  }
  const m = theme.material
  // iOS: the grouped canvas of a picker sheet, the regions in inset groups on it (the section index stands in the
  // margin beside them); Android: the full-screen dialog's surface, the regions in a plain list across it
  const background = android ? m.surface : theme.colors.groupedBackground
  const radius = theme.length("--dialog-sheet-radius", 38)
  const margin = theme.length("--mobile-layout-margin", 16)
  const closeSize = theme.length("--dialog-sheet-close-size", 44)
  const height = android ? screen : screen - insets.top - 16
  const row = (item: { country: CountryCode; name: string }) => {
    const code = dialCode(item.country)
    const picked = item.country === value
    return (
      <ListItem
        key={item.country}
        label={flags ? `${countryFlag(item.country)}  ${item.name}` : item.name}
        // The code in the secondary label (an Android row's value would take the accent)
        value={android ? undefined : ltr(code)}
        trailing={
          android ? (
            <View style={styles.androidEnd}>
              <Text color={m.onSurfaceVariant} style={styles.androidCode}>
                {ltr(code)}
              </Text>
              {picked ? <CheckMd color={m.primary} /> : null}
            </View>
          ) : picked ? (
            <CheckMd color={theme.colors.accent} />
          ) : undefined
        }
        disclosure={false}
        onPress={() => onSelect(item.country)}
        accessibilityLabel={`${item.name}, ${code.replace("+", "plus ")}${picked ? ", selected" : ""}`}
      />
    )
  }
  return (
    <Overlay open={open} onDismiss={onClose} scrim={android ? ANDROID_DIM.dialog : iosDim(theme)} motion={android ? "dialog" : "sheet"}>
      {(progress) => (
        <View pointerEvents="box-none" style={styles.bottom}>
          <Animated.View
            accessibilityViewIsModal
            aria-label={title}
            style={[
              styles.sheet,
              {
                height,
                backgroundColor: background,
                paddingTop: android ? insets.top : 0,
                paddingBottom: keyboard,
                borderTopLeftRadius: android ? 0 : radius,
                borderTopRightRadius: android ? 0 : radius,
                opacity: android || theme.reducedMotion ? progress : undefined,
                transform: android || theme.reducedMotion ? undefined : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
              },
            ]}
          >
            {android ? (
              // Material's full-screen dialog: Close at the start of a 64dp bar, the title 22sp after it
              <View style={styles.androidBar}>
                <NavigationButton action="close" onPress={onClose} />
                <Text accessibilityRole="header" numberOfLines={1} color={m.onSurface} style={styles.androidTitle}>
                  {title}
                </Text>
              </View>
            ) : (
              // The sheet bar: Close at the leading edge, the title centered, 16 under the sheet's top
              <View style={[styles.iosBar, { paddingTop: theme.length("--dialog-sheet-action-inset-block", 16), paddingBottom: theme.length("--toolbar-padding-bottom", 10), paddingHorizontal: margin }]}>
                <View style={{ width: closeSize, height: closeSize }}>
                  <NavigationButton action="close" onPress={onClose} />
                </View>
                <View style={[styles.iosHeading, { minHeight: closeSize }]}>
                  <Text accessibilityRole="header" weight="semibold" align="center" numberOfLines={1} style={{ fontSize: theme.length("--toolbar-title-font-size", 17), lineHeight: theme.length("--toolbar-title-line-height", 22) }}>
                    {title}
                  </Text>
                </View>
                <View style={{ width: closeSize }} />
              </View>
            )}
            <View style={{ paddingHorizontal: android ? 16 : margin, paddingBottom: 8 }}>
              <Input
                variant="soft"
                pill={!android}
                value={query}
                onChangeText={setQuery}
                onClear={() => setQuery("")}
                placeholder={searchPlaceholder}
                inputMode="search"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                accessibilityLabel={searchPlaceholder}
                startAdornment={<Search />}
              />
            </View>
            <View style={styles.grow}>
              <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: android ? 0 : margin, gap: android ? 0 : 8, paddingBottom: keyboard ? 16 : insets.bottom + 16 }}>
                {sections.map((section) =>
                  section.items.length ? (
                    <View key={section.key} onLayout={(event: LayoutChangeEvent) => (offsets.current[section.key] = event.nativeEvent.layout.y)}>
                      <List surface={android ? "plain" : "grouped"} header={section.title}>
                        {section.items.map(row)}
                      </List>
                    </View>
                  ) : null,
                )}
                {sections.every((section) => !section.items.length) ? (
                  <Text color="secondary" align="center" style={styles.none}>
                    No results
                  </Text>
                ) : null}
              </ScrollView>
              {/* UIKit's section index: the letters 11pt semibold in the accent, 13.787 apart, centered 7.5 from the edge; a
                  touch or a drag on it jumps to the letter's section. Android has none */}
              {!android && !query.trim() ? (
                <View
                  style={[styles.index, { marginTop: -indexHeight / 2 }]}
                  onLayout={(event: LayoutChangeEvent) => setIndexHeight(event.nativeEvent.layout.height)}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={jump}
                  onResponderMove={jump}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
                  {index.map((section) => (
                    <Text key={section.key} pointerEvents="none" weight="semibold" color={theme.colors.accent} align="center" style={styles.indexLetter}>
                      {section.title}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </Animated.View>
        </View>
      )}
    </Overlay>
  )
}

const styles = StyleSheet.create({
  androidStack: { gap: 16 },
  turned: { transform: [{ rotate: "180deg" }] },
  bottom: { flex: 1, justifyContent: "flex-end" },
  sheet: { overflow: "hidden" },
  iosBar: { flexDirection: "row", alignItems: "center" },
  iosHeading: { flex: 1, justifyContent: "center", paddingHorizontal: 8 },
  androidBar: { height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 4 },
  androidTitle: { flex: 1, fontSize: 22, lineHeight: 28 },
  grow: { flex: 1 },
  androidEnd: { flexDirection: "row", alignItems: "center", gap: 12 },
  androidCode: { fontSize: 16, lineHeight: 24 },
  none: { marginTop: 32 },
  index: { position: "absolute", end: 0, top: "50%", width: 15, alignItems: "center" },
  indexLetter: { fontSize: 11, lineHeight: INDEX_STEP, width: 15 },
})
