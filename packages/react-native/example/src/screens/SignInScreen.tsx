import { Button, SignInButton, Text, useTheme } from "@plexui/react-native"
import { AppleLogo, GoogleLogo } from "@plexui/react-native/icons"
import { StyleSheet, View } from "react-native"
import { Row, Section } from "../demo"

/**
 * The providers' sign-in buttons: Apple's (iOS) black on light and white on dark, Google's light, dark and neutral,
 * each as tall and wide as the screen's main button; disabled keeps the brand's colors at 40%.
 */
export function SignInScreen() {
  const theme = useTheme()
  return (
    <>
      <Section title="On light" note="Apple black (iOS), Google light and neutral, beside the main button">
        <View style={[styles.stack, styles.light]} testID="sign-in-light">
          <Button size="xl" block testID="sign-in-main">
            Continue with email
          </Button>
          {theme.isIOS ? <SignInButton provider="apple" scheme="light" testID="apple-light" /> : null}
          <SignInButton provider="google" scheme="light" testID="google-light" />
          <SignInButton provider="google" neutral testID="google-neutral" />
        </View>
      </Section>
      <Section title="On dark" note="Apple white (iOS), Google dark">
        <View style={[styles.stack, styles.dark]} testID="sign-in-dark">
          {theme.isIOS ? <SignInButton provider="apple" scheme="dark" action="sign-in" testID="apple-dark" /> : null}
          <SignInButton provider="google" scheme="dark" action="sign-up" testID="google-dark" />
        </View>
      </Section>
      <Section title="Disabled" note="The brand's colors at 40%, no presses">
        <View style={styles.stack}>
          {theme.isIOS ? <SignInButton provider="apple" disabled testID="apple-disabled" /> : null}
          <SignInButton provider="google" disabled testID="google-disabled" />
        </View>
      </Section>
      <Section title="Logos" note="AppleLogo in the icon's color, GoogleLogo in its four colors">
        <Row>
          <AppleLogo size={32} accessibilityLabel="Apple" testID="logo-apple" />
          <GoogleLogo size={32} color="#FF0000" accessibilityLabel="Google" testID="logo-google" />
        </Row>
        <Text variant="footnote" color="tertiary">
          The G keeps its colors whatever color it is given.
        </Text>
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 12, alignSelf: "stretch" },
  light: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16 },
  dark: { backgroundColor: "#000000", padding: 16, borderRadius: 16 },
})
