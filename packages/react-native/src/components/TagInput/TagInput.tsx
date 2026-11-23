import { useContext, useRef, useState, type ComponentRef } from "react"
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputKeyPressEvent, type ViewStyle } from "react-native"
import X from "../../icons/plex/X"
import { RowEndContext } from "../../internal/row"
import { dangerText, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { Text } from "../Text/Text"

export type Tag = {
  value: string
  /** What the `validator` said when the tag was made. */
  valid: boolean
}

export type TagInputProps = {
  /** The tags it starts with, when it holds its own. */
  defaultValue?: Tag[]
  /** The tags, when the caller holds them (with `onChange`). */
  value?: Tag[]
  /** @default "xl" */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"
  /** `ghost` has no frame (the value of a List row). @default "outline" */
  variant?: "outline" | "ghost"
  onChange?: (tags: Tag[]) => void
  placeholder?: string
  /** Judges each new tag: an invalid one stands in the danger color. Read only when a tag is made. */
  validator?: (value: string) => boolean
  /** The most tags it takes; the field goes at that count. */
  maxTags?: number
  /** @default false */
  autoFocus?: boolean
  /** The least height, in lines of tags. @default 1 */
  rows?: number
  /** The characters that end a tag as they are typed (and split a paste). @default [",", " "] */
  delimiters?: string[]
  disabled?: boolean
  /** A capsule frame. @default false */
  pill?: boolean
  /** The field's name. */
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

/** The tag sizes of the web's control table: the field's height, which a tag's line keeps. */
const HEIGHT: Record<NonNullable<TagInputProps["size"]>, number> = { sm: 28, md: 32, lg: 36, xl: 40, "2xl": 44, "3xl": 48 }

/**
 * A field that turns what is typed into tags: Plex UI's TagInput. A delimiter (a comma, a space) or Return makes the
 * text a tag; Backspace in an empty field takes the last one; each tag's × removes it. iOS: the web's phone tags, a
 * 44pt line for each with a 32pt gray pill (`--color-background-secondary-soft-alpha`), its 17pt words 8 in and the ×
 * in a 44pt target after them, 8 apart; an invalid tag in the danger color. Android: 32dp chips, 16 round, filled with
 * the text color at 5%, their words 14sp, the × in a 32dp target, 8 apart. In a List row (`Field row`, vertical) it is
 * the row's bare value; elsewhere it has the frame of an outlined field.
 */
export function TagInput({
  defaultValue,
  value,
  size = "xl",
  variant = "outline",
  onChange,
  placeholder,
  validator,
  maxTags,
  autoFocus = false,
  rows = 1,
  delimiters = [",", " "],
  disabled = false,
  pill = false,
  accessibilityLabel,
  style,
  testID,
}: TagInputProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const rowEnd = useContext(RowEndContext)
  const bare = rowEnd != null || variant === "ghost"
  const [own, setOwn] = useState<Tag[]>(defaultValue ?? [])
  const tags = value ?? own
  const [text, setText] = useState("")
  const input = useRef<ComponentRef<typeof TextInput> | null>(null)
  const set = (next: Tag[]) => {
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }
  // New tags from words: trimmed, no repeats, up to `maxTags`, judged as they are made
  const add = (words: string[]) => {
    const next = [...tags]
    for (const word of words) {
      const trimmed = word.trim()
      if (!trimmed || next.some((tag) => tag.value === trimmed)) continue
      if (maxTags && next.length >= maxTags) break
      next.push({ value: trimmed, valid: validator?.(trimmed) ?? true })
    }
    if (next.length !== tags.length) set(next)
  }
  const remove = (index: number) => set(tags.filter((_, at) => at !== index))
  const onChangeText = (next: string) => {
    if (disabled) return
    // A delimiter typed or pasted ends the words before it
    const pattern = new RegExp(`[${delimiters.map((d) => d.replace(/[-\\\]^]/g, "\\$&")).join("")}\n]`)
    if (delimiters.length > 0 && pattern.test(next)) {
      const parts = next.split(pattern)
      add(parts.slice(0, -1))
      setText(parts[parts.length - 1] ?? "")
      return
    }
    setText(next)
  }
  const onKeyPress = (event: TextInputKeyPressEvent) => {
    if (event.nativeEvent.key === "Backspace" && text === "" && tags.length > 0) remove(tags.length - 1)
  }
  const full = maxTags != null && tags.length >= maxTags
  // iOS's tag: a 44pt line, the pill 6 inside it; Android's chip 32dp
  const line = android ? 32 : bare ? theme.length("--control-size-lg", 44) : HEIGHT[size]
  const inset = android ? 0 : bare ? 6 : 4
  const type = android
    ? { fontSize: 14, lineHeight: 18 }
    : { fontSize: theme.length("--field-row-label-font-size", 17), lineHeight: theme.length("--field-row-label-line-height", 22) }
  const fieldType = android ? { fontSize: 17, lineHeight: 20 } : type
  const ink = theme.colors.text
  const fill = android ? withAlpha(theme.colors.text, 0.05) : theme.color("--color-background-secondary-soft-alpha")
  const badFill = android ? withAlpha(dangerText(theme), 0.1) : theme.color("--color-background-danger-soft-alpha", fill)
  const badInk = android ? dangerText(theme) : theme.color("--color-text-danger")
  const gap = 8
  // Lines of tags 8 apart in a row, as the web's phone rows (2 in a frame)
  const rowGap = android || bare ? gap : 2
  // The field is as tall as its text: after the last tag it stands in the middle of the tag's line, under the tags a
  // line of its own (28, the web's phone row)
  const fieldLine = android ? 20 : bare ? 28 : line
  // As wide as its text (or its hint) and a cursor gutter of 10, as the web's: it takes the rest of the last tag's
  // line when that fits, else a line of its own under the tags
  const [textWidth, setTextWidth] = useState(0)
  const minHeight = rows > 1 ? rows * line + (rows - 1) * rowGap : undefined
  const frame: ViewStyle | null = bare
    ? null
    : {
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: theme.colors.border,
        borderRadius: pill ? 9999 : android ? 8 : theme.length("--control-radius-lg", 10),
        paddingHorizontal: android ? 12 : 8,
        paddingVertical: 4,
      }
  return (
    <Pressable
      testID={testID}
      accessible={false}
      disabled={disabled}
      onPress={() => input.current?.focus()}
      style={[
        styles.box,
        { columnGap: gap, rowGap, minHeight, opacity: disabled ? 0.5 : 1 },
        // Tags are solid, so they stand 2 further from a label than a line of text (the web's ghost TagInput)
        bare && !android && tags.length > 0 ? { marginVertical: 2 } : null,
        frame,
        style,
      ]}
    >
      {full ? null : (
        // A hidden copy of the text or the hint across the whole box, which sizes the field
        <Text
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          numberOfLines={1}
          onLayout={(event) => setTextWidth(Math.ceil(event.nativeEvent.layout.width))}
          style={[fieldType, theme.font("regular"), styles.measure]}
        >
          {text || placeholder || ""}
        </Text>
      )}
      {tags.map((tag, index) => {
        const color = tag.valid ? ink : badInk
        return (
          <View key={tag.value} style={[styles.tag, { height: line, paddingStart: android ? 12 : 8 }]}>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: inset, bottom: inset, borderRadius: 9999, backgroundColor: tag.valid ? fill : badFill }]} />
            <Text numberOfLines={1} color={color} style={[type, styles.shrink]}>
              {tag.value}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${tag.value}`}
              disabled={disabled}
              hitSlop={android ? 8 : 0}
              onPress={() => remove(index)}
              style={({ pressed }) => [styles.remove, { width: android ? 32 : line, height: line, opacity: pressed ? 0.3 : 0.5, marginStart: android ? 0 : -4 }]}
            >
              <X size={android ? 18 : theme.length("--control-icon-size-sm", 16)} color={color} />
            </Pressable>
          </View>
        )
      })}
      {full ? null : (
        <View style={[styles.field, { height: fieldLine, minWidth: Math.max(20, textWidth) + 10 }]}>
          <TextInput
            ref={input}
            value={text}
            onChangeText={onChangeText}
            onKeyPress={onKeyPress}
            onSubmitEditing={() => {
              add([text])
              setText("")
            }}
            submitBehavior="submit"
            autoFocus={autoFocus}
            editable={!disabled}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textTertiary}
            accessibilityLabel={accessibilityLabel ?? placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, fieldType, theme.font("regular"), { color: ink, height: fieldLine }]}
          />
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  box: { alignSelf: "stretch", flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  tag: { flexDirection: "row", alignItems: "center", maxWidth: "100%", gap: 4 },
  shrink: { flexShrink: 1 },
  remove: { alignItems: "center", justifyContent: "center" },
  field: { flexGrow: 1, flexBasis: 0, maxWidth: "100%", justifyContent: "center" },
  measure: { position: "absolute", start: 0, top: 0, opacity: 0, alignSelf: "flex-start", pointerEvents: "none" },
  input: { padding: 0, margin: 0, borderWidth: 0, outlineStyle: "none" } as never,
})
