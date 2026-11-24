import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react"
import {
  Animated,
  Platform,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type StyleProp,
  type TextInputKeyPressEvent,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import { useDescription } from "../../internal/a11y"
import { curves, stiffSpring } from "../../internal/motion"
import { dangerText } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { fieldLook, useSpringColor } from "../Input/Input"
import { Text } from "../Text/Text"

export type OTPInputProps = {
  /** The number of digit cells. @default 6 */
  length?: number
  /** The controlled value: the filled cells' digits in order. */
  value?: string
  /** Called with the new value on each change. */
  onChange?: (value: string) => void
  /** Called with the value once every cell holds a digit. */
  onComplete?: (value: string) => void
  /** The sizes of the groups of cells, an extra gap between them: `[3, 3]`. */
  grouping?: number[]
  /** Draws the cells in the error color. @default false */
  invalid?: boolean
  /** Shown under the cells, centered. */
  errorMessage?: string
  /** @default false */
  disabled?: boolean
  /** Focuses the first cell on mount. @default false */
  autoFocus?: boolean
  /**
   * Names the code ("Verification code"): the cells' group on the web, and the start of each cell's name on iOS and
   * Android ("Verification code, digit 1 of 6"), where a group is not announced.
   */
  "aria-label"?: string
  /** The same name as `aria-label`. */
  label?: string
  /** The name of a cell, for another language. @default (index, length) => `Digit ${index + 1}`, with `of ${length}` once the code is named */
  digitLabel?: (index: number, length: number) => string
  /** Applied to the root; each cell's field gets `${testID}-digit-${n}`. */
  testID?: string
  style?: StyleProp<ViewStyle>
}

type Field = ComponentRef<typeof TextInput>

function sanitizeDigits(value: string, length: number): string {
  return value.replace(/\D/g, "").slice(0, length)
}

/** One entry per cell, "" when empty. */
function toCells(value: string, length: number): string[] {
  return Array.from({ length }, (_, index) => value[index] ?? "")
}

function shouldShowGap(index: number, grouping: number[]): boolean {
  let pos = 0
  for (const groupSize of grouping) {
    pos += groupSize
    if (index === pos) return true
  }
  return false
}

const sameCells = (a: string[], b: string[]) => a.length === b.length && a.every((digit, index) => digit === b[index])

/**
 * The digits typed into a cell that held `old`: a cell keeps its digit until the new one replaces it, so the field
 * holds the old digit and the typed ones, before or after it as the caret stood.
 */
function typedInto(text: string, old: string): string {
  const digits = text.replace(/\D/g, "")
  if (!old || digits.length < 2) return digits
  if (digits.startsWith(old)) return digits.slice(old.length)
  if (digits.endsWith(old)) return digits.slice(0, -old.length)
  return digits
}

/**
 * The phone layer's cell (OTPInput.module.css under touch.css): 44 by 52pt, narrower down to 32 when the row does
 * not fit (six cells on a 320pt phone), 8 apart, the digit Semibold 24, a 6pt dot of the tertiary text at 50% in
 * an empty cell that has no focus.
 */
const IOS = { width: 44, minWidth: 32, height: 52, gap: 8, fontSize: 24, dot: 6, dotOpacity: 0.5 }

/**
 * Android's code boxes: 32.7 by 40.8dp outlined boxes with 4dp corners, 8.8dp apart, a 1.5dp line in the field's
 * idle line color and in the accent on the box with focus, the digit about 20sp, centered. No dot in an empty box.
 */
const ANDROID = { width: 32.7, height: 40.8, gap: 8.8, line: 1.5, radius: 4, fontSize: 20 }

type CellState = { focused: boolean; filled: boolean; disabled: boolean; invalid: boolean }

/** The look of a cell on this platform: its box, its digit and its caret. */
function cellLook(theme: Theme, state: CellState) {
  if (theme.isAndroid) {
    // The outlined field's own colors (Input): the idle line, the accent with focus, the error color when invalid
    const look = fieldLook(theme, { variant: "outline", size: "md", pill: false }, state)
    return {
      line: look.frame?.color ?? "transparent",
      box: {
        width: ANDROID.width,
        minWidth: 0,
        height: ANDROID.height,
        borderRadius: ANDROID.radius,
        borderWidth: ANDROID.line,
        borderColor: look.frame?.color ?? "transparent",
        backgroundColor: "transparent",
      } as ViewStyle,
      text: { fontSize: ANDROID.fontSize, color: look.text.color, ...theme.font("medium") },
      caret: look.caret,
      dot: null,
    }
  }
  const border = state.invalid
    ? theme.color("--floating-input-border-color-invalid", theme.colors.textDanger)
    : state.focused
      ? theme.color("--floating-input-border-color-focus", theme.colors.text)
      : theme.color("--floating-input-border-color", theme.colors.border)
  return {
    line: border,
    box: {
      width: IOS.width,
      minWidth: IOS.minWidth,
      height: IOS.height,
      borderRadius: theme.length("--floating-input-border-radius", 9999),
      borderWidth: 1,
      borderColor: border,
      // A phone screen fills its fields with its own plain surface (`--floating-input-background` is
      // `--mobile-surface-plain-primary` on the phone layer's screen): white, and the screen's black at night
      backgroundColor: theme.colors.background,
    } as ViewStyle,
    text: { fontSize: IOS.fontSize, color: theme.colors.text, letterSpacing: theme.tracking(IOS.fontSize), ...theme.font("semibold") },
    // The caret in the text color (`caret-color: var(--color-text)`)
    caret: theme.colors.text,
    dot: theme.colors.textTertiary,
  }
}

/** Android's code box motion: the line's color springs at stiffness 400 with no bounce. */
const BOX_SPRING = 400
/** A digit typed into an empty box slides up from the box's bottom over 350ms, overshooting at 1.5. */
const SLIDE = { duration: 350, easing: curves.overshoot(1.5) }
/**
 * A digit that replaces another fades in growing from half its size while the old one fades out shrinking to half; a
 * cleared digit leaves the same way. 220ms each on Android's default animator curve (accelerate-decelerate).
 */
const SWAP = { duration: 220, easing: curves.accelerateDecelerate }

/**
 * An Android code box. Its line springs to its color (the accent with focus, the error color); its digit is drawn over
 * the field (whose own text is clear) so it can move: in from the box's bottom, clipped to the box, when the box was
 * empty; growing in over the old one, which shrinks away, when it replaces one. At once with reduced motion.
 */
function CodeBox({ digit, look, disabled, reducedMotion, children }: { digit: string; look: ReturnType<typeof cellLook>; disabled: boolean; reducedMotion: boolean; children: ReactNode }) {
  const borderColor = useSpringColor(look.line, BOX_SPRING, reducedMotion)
  const [enter] = useState(() => new Animated.Value(1))
  const [exit] = useState(() => new Animated.Value(1))
  // The last change of digit (`from` the one before), and the digit on its way out
  const [step, setStep] = useState({ digit, from: digit })
  const [leaving, setLeaving] = useState("")
  if (step.digit !== digit) {
    setStep({ digit, from: step.digit })
    // A digit typed into a box still clearing lets the old one finish leaving
    if (step.digit && !reducedMotion) setLeaving(step.digit)
  }
  // The one coming in slides into an empty box and grows over another
  const slides = !step.from
  const moved = useRef(step)
  // Before the paint, so a new digit never shows a frame at its place before it moves in
  useLayoutEffect(() => {
    if (moved.current === step) return
    moved.current = step
    if (reducedMotion) {
      enter.setValue(1)
      exit.setValue(1)
      return
    }
    if (step.digit) {
      enter.setValue(0)
      Animated.timing(enter, { toValue: 1, ...(step.from ? SWAP : SLIDE), useNativeDriver: false }).start()
    }
    if (step.from) {
      exit.setValue(0)
      Animated.timing(exit, { toValue: 1, ...SWAP, useNativeDriver: false }).start(({ finished }) => {
        if (finished) setLeaving("")
      })
    }
  }, [step, reducedMotion, enter, exit])
  const coming = slides
    ? { transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [ANDROID.height, 0] }) }] }
    : { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }
  const going = {
    opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }],
  }
  return (
    <Animated.View style={[styles.cell, look.box, styles.clip, { borderColor }, disabled ? styles.disabled : null]}>
      <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
        {digit ? (
          <Animated.View style={[styles.digit, coming]}>
            <NativeText style={[styles.digitText, look.text]}>{digit}</NativeText>
          </Animated.View>
        ) : null}
        {leaving ? (
          <Animated.View style={[styles.digit, going]}>
            <NativeText style={[styles.digitText, look.text]}>{leaving}</NativeText>
          </Animated.View>
        ) : null}
      </View>
      {children}
    </Animated.View>
  )
}

/** The first cell takes a code the keyboard suggests: from the messages on iOS and the web, from the SMS on Android. */
const ONE_TIME_CODE = Platform.OS === "android" ? "sms-otp" : "one-time-code"

/**
 * A field for a one-time code, one digit per cell: Plex UI's OTPInput. Typing fills a cell and moves to the next,
 * Backspace clears the cell or the one before it, a paste or an autofilled code fills the cells from the one it lands
 * in, and `onComplete` is called once every cell holds a digit. Each digit keeps its cell: typing into a later empty
 * cell keeps the digit there, and clearing a cell in the middle does not move the others. iOS draws the web's phone
 * cells (44 by 52pt capsules); Android outlined code boxes with the accent on the box with focus, whose digits slide
 * or grow in and shrink away, and whose row shakes when an error appears.
 */
export function OTPInput({
  length: lengthProp = 6,
  value,
  onChange,
  onComplete,
  grouping,
  invalid = false,
  errorMessage,
  disabled = false,
  autoFocus = false,
  "aria-label": ariaLabel,
  label,
  digitLabel,
  testID,
  style,
}: OTPInputProps) {
  const theme = useTheme()
  const length = Math.max(1, Math.floor(lengthProp))
  const controlledValue = useMemo(() => sanitizeDigits(value ?? "", length), [value, length])
  const isControlled = value !== undefined

  // The digit of every cell, so clearing or filling one cell never moves the others; the value is the filled cells'
  // digits in order
  const [cells, setCells] = useState(() => toCells(controlledValue, length))
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputs = useRef<Array<Field | null>>([])

  const ownCells = useMemo(() => Array.from({ length }, (_, index) => cells[index] ?? ""), [cells, length])
  const currentValue = isControlled ? controlledValue : ownCells.join("")
  // The cells keep their gaps while they spell the value; any other value (set by the parent) fills the cells from
  // the start
  const digits = useMemo(
    () => (ownCells.join("") === currentValue ? ownCells : toCells(currentValue, length)),
    [ownCells, currentValue, length],
  )

  // The cells as shown, for the events between two renders: a Backspace and the text change it makes arrive one
  // after the other, before the first has rendered
  const shown = useRef(digits)
  useLayoutEffect(() => {
    shown.current = digits
  }, [digits])

  // The value the field's own last edit produced, until the value changes: a field the user empties keeps the
  // caret where it is
  const ownValueRef = useRef<string | null>(null)

  const commitDigits = useCallback(
    (nextDigits: string[]) => {
      const previous = shown.current
      if (sameCells(previous, nextDigits)) return
      shown.current = nextDigits
      // Kept when controlled too: the parent's value then keeps these gaps
      setCells(nextDigits)
      const nextValue = nextDigits.join("")
      ownValueRef.current = nextValue
      if (nextValue !== previous.join("")) onChange?.(nextValue)
      if (nextValue.length === length) onComplete?.(nextValue)
    },
    [length, onChange, onComplete],
  )

  const focusCell = useCallback(
    (index: number) => {
      inputs.current[Math.max(0, Math.min(index, length - 1))]?.focus()
    },
    [length],
  )

  useEffect(() => {
    if (!autoFocus || disabled) return
    inputs.current[0]?.focus()
  }, [autoFocus, disabled])

  // A field cleared from outside (a wrong code wiped by the form) puts the caret back in the first cell, when the
  // focus was in the field already
  const hadValueRef = useRef(currentValue.length > 0)
  useEffect(() => {
    const filled = currentValue.length > 0
    const fromOutside = ownValueRef.current !== currentValue
    ownValueRef.current = null
    const focused = inputs.current.some((input) => input?.isFocused())
    if (!filled && hadValueRef.current && fromOutside && !disabled && focused) focusCell(0)
    hadValueRef.current = filled
  }, [currentValue, disabled, focusCell])

  const handleChangeText = (index: number, text: string) => {
    if (disabled) return
    const current = shown.current
    const typed = typedInto(text, current[index])
    const nextDigits = [...current]
    if (!typed) {
      nextDigits[index] = ""
      commitDigits(nextDigits)
      return
    }
    // One digit, or a paste or an autofilled code: written from this cell on
    let writeIndex = index
    for (const digit of typed) {
      if (writeIndex >= length) break
      nextDigits[writeIndex] = digit
      writeIndex += 1
    }
    commitDigits(nextDigits)
    // The cell after the typed digits
    if (typed.length === 1) {
      if (index < length - 1) focusCell(index + 1)
    } else {
      focusCell(Math.min(writeIndex, length - 1))
    }
  }

  const handleKeyPress = (index: number, event: TextInputKeyPressEvent) => {
    if (disabled) return
    const key = event.nativeEvent.key
    // The web's own keys run here first; a phone's changes the text after (a cleared cell is then the same)
    const settle = () => (event as { preventDefault?: () => void }).preventDefault?.()
    const current = shown.current
    if (key === "Backspace") {
      settle()
      const nextDigits = [...current]
      if (nextDigits[index]) {
        nextDigits[index] = ""
        commitDigits(nextDigits)
      } else if (index > 0) {
        nextDigits[index - 1] = ""
        commitDigits(nextDigits)
        focusCell(index - 1)
      }
    } else if (key === "Delete") {
      settle()
      const nextDigits = [...current]
      nextDigits[index] = ""
      commitDigits(nextDigits)
    } else if (key === "ArrowLeft") {
      settle()
      focusCell(index - 1)
    } else if (key === "ArrowRight") {
      settle()
      focusCell(index + 1)
    }
  }

  const handleBlur = () => {
    requestAnimationFrame(() => {
      if (!inputs.current.some((input) => input?.isFocused())) setFocusedIndex(-1)
    })
  }

  const hasError = !!errorMessage
  const described = useDescription(hasError ? errorMessage : null)
  const gap = theme.isAndroid ? ANDROID.gap : IOS.gap

  // Android shakes the row when an error appears: flung left at 1000dp/s on a spring of stiffness 600 at half its
  // critical damping, it swings back and settles where it stood
  const failing = invalid || hasError
  const [shake] = useState(() => new Animated.Value(0))
  const wasFailing = useRef(failing)
  useEffect(() => {
    const appeared = failing && !wasFailing.current
    wasFailing.current = failing
    if (!appeared || !theme.isAndroid || theme.reducedMotion) return
    shake.setValue(0)
    Animated.spring(shake, { toValue: 0, velocity: -1000, ...stiffSpring(600, 0.5), useNativeDriver: false }).start()
  }, [failing, shake, theme.isAndroid, theme.reducedMotion])

  const name = ariaLabel ?? label
  const cellName = (index: number) => {
    const own = digitLabel ? digitLabel(index, length) : name ? `${Platform.OS === "web" ? "Digit" : "digit"} ${index + 1} of ${length}` : `Digit ${index + 1}`
    // The web names the group; a native screen reader hears the code's name on each cell instead
    return name && Platform.OS !== "web" ? `${name}, ${own}` : own
  }

  return (
    <View style={style} testID={testID} role={name ? "group" : undefined} aria-label={Platform.OS === "web" ? name : undefined}>
      <Animated.View style={[styles.cells, { gap }, theme.isAndroid ? { transform: [{ translateX: shake }] } : null]}>
        {Array.from({ length }, (_, index) => {
          const isGroupGap = grouping ? shouldShowGap(index, grouping) : false
          const focused = focusedIndex === index
          const look = cellLook(theme, { focused, filled: !!digits[index], disabled, invalid })
          const field = (
            <TextInput
              ref={(node) => {
                inputs.current[index] = node
              }}
              {...described.props}
              // The web's own field is disabled: out of the tab order, as the web's
              {...(Platform.OS === "web" ? { disabled } : null)}
              value={digits[index]}
              onChangeText={(text) => handleChangeText(index, text)}
              onKeyPress={(event) => handleKeyPress(index, event)}
              onFocus={() => {
                if (!disabled) setFocusedIndex(index)
              }}
              onBlur={handleBlur}
              editable={!disabled}
              readOnly={disabled}
              inputMode="numeric"
              autoComplete={index === 0 ? ONE_TIME_CODE : "off"}
              autoCorrect={false}
              spellCheck={false}
              accessibilityLabel={cellName(index)}
              aria-invalid={invalid || undefined}
              aria-disabled={disabled || undefined}
              selectionColor={look.caret}
              cursorColor={look.caret}
              underlineColorAndroid="transparent"
              testID={testID ? `${testID}-digit-${index + 1}` : undefined}
              // Android's box draws the digit itself: the field's text is clear, its caret keeps its color (the
              // web's caret is otherwise the text's)
              style={[styles.input, look.text, theme.isAndroid ? ({ color: "transparent", ...(Platform.OS === "web" ? { caretColor: look.caret } : null) } as TextStyle) : null]}
            />
          )
          return (
            <Fragment key={index}>
              {isGroupGap ? <View aria-hidden style={{ width: gap }} /> : null}
              {theme.isAndroid ? (
                <CodeBox digit={digits[index]} look={look} disabled={disabled} reducedMotion={theme.reducedMotion}>
                  {field}
                </CodeBox>
              ) : (
                <View style={[styles.cell, look.box, disabled ? styles.disabled : null]}>
                  {look.dot && !digits[index] && !focused ? (
                    <View pointerEvents="none" style={[styles.dot, { backgroundColor: look.dot }]} />
                  ) : null}
                  {field}
                </View>
              )}
            </Fragment>
          )
        })}
      </Animated.View>
      {hasError ? (
        theme.isAndroid ? (
          // Android's help under a field (TextField): 14 in the error color, 6 below the boxes
          <Text nativeID={described.id} color={dangerText(theme)} align="center" accessibilityLiveRegion="polite" style={styles.androidError}>
            {errorMessage}
          </Text>
        ) : (
          // The phone's field error (`--mobile-field-error-*`): 15/20, 4 below the cells, centered
          <Text
            nativeID={described.id}
            color={theme.color("--color-text-danger")}
            align="center"
            accessibilityLiveRegion="polite"
            style={{
              fontSize: theme.length("--mobile-field-error-font-size", 15),
              lineHeight: theme.length("--mobile-field-error-line-height", 20),
              marginTop: theme.length("--mobile-field-error-offset", 4),
            }}
          >
            {errorMessage}
          </Text>
        )
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  cells: { flexDirection: "row", alignItems: "center", justifyContent: "center", maxWidth: "100%" },
  cell: { flexGrow: 0, flexShrink: 1, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.5 },
  // Android's box clips its digit as it slides in
  clip: { overflow: "hidden" },
  digit: { position: "absolute", top: 0, start: 0, end: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  digitText: { includeFontPadding: false },
  dot: { width: IOS.dot, height: IOS.dot, borderRadius: IOS.dot / 2, opacity: IOS.dotOpacity },
  // The field covers its cell, so a tap anywhere in it sets the caret there; no ring of the web's own (the cell
  // shows its focus)
  input: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    outlineWidth: 0,
    outlineStyle: "none" as "solid",
  },
  androidError: { fontSize: 14, lineHeight: 18, marginTop: 6 },
})
