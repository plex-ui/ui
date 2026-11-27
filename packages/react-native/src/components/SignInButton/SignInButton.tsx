import { useState, type ComponentRef, type Ref } from "react"
import { Platform, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { useRipple } from "../../internal/ripple"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import AppleLogo from "../../icons/plex/AppleLogo"
import GoogleLogo from "../../icons/plex/GoogleLogo"
import { buttonMetrics, useMaterialPress, type ControlSize } from "../Button/Button"

export type SignInProvider = "apple" | "google"
export type SignInAction = "sign-in" | "sign-up" | "continue"

export type SignInButtonProps = Omit<PressableProps, "children" | "style"> & {
  /** Whose sign-in: Apple's (an iOS app's) or Google's (iOS and Android alike). */
  provider: SignInProvider
  /** The label, one of the brands' own: Sign in with…, Sign up with… or Continue with…. @default "continue" */
  action?: SignInAction
  /**
   * The brand look against the screen. Apple: black in a light scheme, white in a dark one (never black on dark).
   * Google: light (white with a #747775 outline) or dark (#131314 with a #8E918F outline). Defaults to the theme's.
   */
  scheme?: "light" | "dark"
  /** Over a photo or a video: Apple's white button. */
  overMedia?: boolean
  /** Google's neutral button: #F2F2F2 with no outline. */
  neutral?: boolean
  /**
   * Height step of the Button scale, so the button matches the screen's other buttons: iOS's large 50 and Android's
   * 48 from `xl`. @default "xl"
   */
  size?: ControlSize
  /** Takes the whole width. @default true */
  block?: boolean
  /** Keeps the brand's colors, dimmed to 40%, and takes no presses. */
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  ref?: Ref<ComponentRef<typeof View>>
}

const LABEL: Record<SignInAction, string> = { "sign-in": "Sign in with", "sign-up": "Sign up with", continue: "Continue with" }

type Look = { background: string; text: string; border?: string }

/** Apple HIG, Sign in with Apple: black with white content, or white with black content on dark or over media. */
function appleLook(white: boolean): Look {
  return white ? { background: "#FFFFFF", text: "#000000" } : { background: "#000000", text: "#FFFFFF" }
}

/** Google Sign-In branding guidelines: the light, dark and neutral buttons. */
function googleLook(dark: boolean, neutral: boolean): Look {
  if (neutral) return { background: "#F2F2F2", text: "#1F1F1F" }
  return dark ? { background: "#131314", text: "#E3E3E3", border: "#8E918F" } : { background: "#FFFFFF", text: "#1F1F1F", border: "#747775" }
}

// The logos' drawn ink inside their 24-unit boxes: the G spans 2.95–21.05, so at 24px it stands 2.95px in from each
// side; Apple's mark spans 3.36–20.64 of its width
const GOOGLE_ICON = 24
const GOOGLE_INSET = 2.95
const APPLE_ICON = 20

/**
 * The sign-in button of a provider, drawn to its brand rules rather than to the theme: Apple's black or white button
 * with the real Apple logo, Google's light, dark or neutral one with the four-color G. It takes the height and the
 * shape of the screen's other buttons (a capsule on iOS, a pill on Android). Disabled keeps the brand's colors at 40%.
 */
export function SignInButton({
  provider,
  action = "continue",
  scheme,
  overMedia = false,
  neutral = false,
  size = "xl",
  block = true,
  disabled = false,
  style,
  onPressIn,
  onPressOut,
  accessibilityLabel,
  accessibilityState,
  ...rest
}: SignInButtonProps) {
  const theme = useTheme()
  const dark = (scheme ?? theme.scheme) === "dark"
  const apple = provider === "apple"
  const look = apple ? appleLook(dark || overMedia) : googleLook(dark, neutral)
  const metrics = buttonMetrics(theme, size)
  const label = `${LABEL[action]} ${apple ? "Apple" : "Google"}`
  const [pressed, setPressed] = useState(false)
  const android = theme.isAndroid
  const nativeRipple = useMaterialPress(theme)
  const ripple = useRipple(withAlpha(look.text, 0.1), android && !nativeRipple, theme.reducedMotion)
  // Google's spacing: 16 before the G, 12 to the text and 16 after on iOS; 12, 10 and 12 on Android
  const google = android ? { start: 12, gap: 10, end: 12 } : { start: 16, gap: 12, end: 16 }
  const radius = metrics.height / 2
  // A compact size keeps the platform's 44pt or 48dp target, as Button does
  const reach = Math.max(0, ((android ? 48 : 44) - metrics.height) / 2)
  const padding = apple
    ? // Apple asks for a margin of at least a tenth of the height around the logo and the title
      { paddingHorizontal: Math.max(metrics.height / 10, 16) }
    : { paddingLeft: google.start - GOOGLE_INSET, paddingRight: google.end }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      hitSlop={reach ? { top: reach, bottom: reach } : undefined}
      android_ripple={nativeRipple ? { color: withAlpha(look.text, 0.1), foreground: true } : undefined}
      onPressIn={(event) => {
        setPressed(true)
        ripple.start(event)
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        setPressed(false)
        ripple.end()
        onPressOut?.(event)
      }}
      style={[
        styles.button,
        {
          // At least the size's height: a larger text size grows the button instead of clipping its title
          minHeight: metrics.height,
          paddingVertical: 4,
          minWidth: 140,
          borderRadius: radius,
          backgroundColor: look.background,
          alignSelf: block ? "stretch" : "center",
          opacity: disabled ? 0.4 : 1,
        },
        padding,
        style,
      ]}
      {...rest}
    >
      {ripple.layer}
      {/* iOS's press: a layer of the content's color, as a filled button darkens or lightens */}
      {pressed && !android && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: withAlpha(look.text, 0.12) }]} />}
      {/* Google's outline is 1px inside the button */}
      {look.border && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor: look.border }]} />}
      <View style={[styles.content, { gap: apple ? 6 : google.gap - GOOGLE_INSET }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {apple ? <AppleLogo size={APPLE_ICON} color={look.text} /> : <GoogleLogo size={GOOGLE_ICON} />}
        <Text
          numberOfLines={1}
          allowFontScaling
          style={
            apple
              ? // The system font, as Apple's button sets its title
                { color: look.text, fontSize: metrics.fontSize, lineHeight: metrics.lineHeight, fontWeight: "500" }
              : // Google Sans Medium 14/20 where the app has it, else the system font
                { color: look.text, fontSize: 14, lineHeight: 20, fontWeight: "500", fontFamily: GOOGLE_FONT }
          }
        >
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

/** The font the Google button asks for: an app that bundles Google Sans gets it; elsewhere the system font stands in. */
const GOOGLE_FONT = Platform.select({ web: "'Google Sans', system-ui, sans-serif", default: undefined })

const styles = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexShrink: 1 },
})
