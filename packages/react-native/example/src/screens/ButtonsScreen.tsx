import { Button, Text, useTheme, type ButtonColor, type ButtonVariant, type ControlSize } from "@plexui/react-native"
import { ArrowRightSm, Plus, Search } from "@plexui/react-native/icons"
import { useState } from "react"
import { Backdrop, Labeled, Row, Section } from "../demo"

const COLORS: ButtonColor[] = ["primary", "secondary", "danger", "success", "info", "discovery", "caution", "warning"]
/** An action that suits each color. */
const ACTIONS: Record<ButtonColor, string> = {
  primary: "Continue",
  secondary: "Cancel",
  danger: "Delete",
  success: "Approve",
  info: "Learn more",
  discovery: "Upgrade",
  caution: "Retry",
  warning: "Review",
}
const VARIANTS: ButtonVariant[] = ["solid", "soft", "outline", "ghost"]
const SIZES: ControlSize[] = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]

export function ButtonsScreen() {
  const theme = useTheme()
  const [count, setCount] = useState(0)
  const [selected, setSelected] = useState(true)
  return (
    <>
      <Section title="Pressable" note="Press to count: the pressed state, the native ripple on Android">
        <Row>
          <Button onPress={() => setCount((n) => n + 1)} testID="button-count">
            {count > 0 ? `In cart: ${count}` : "Add to cart"}
          </Button>
          <Button variant="soft" selected={selected} onPress={() => setSelected((value) => !value)} testID="button-toggle">
            {selected ? "Following" : "Follow"}
          </Button>
        </Row>
      </Section>
      {VARIANTS.map((variant) => (
        <Section key={variant} title={variant} note={variant === VARIANTS[0] ? `Colors in order: ${COLORS.join(", ")}` : undefined} testID={`variant-${variant}`}>
          <Row>
            {COLORS.map((color) => (
              <Button key={color} color={color} variant={variant}>
                {ACTIONS[color]}
              </Button>
            ))}
          </Row>
        </Section>
      ))}
      <Section title="Sizes" note={theme.isIOS ? "The phone layer: 28 up to sm, 34 at md and lg, 50 from xl" : "Android's 48dp from xl; 32 up to sm and 40 at md and lg in its proportions"}>
        {SIZES.map((size) => (
          <Row key={size}>
            <Button size={size}>Download</Button>
            <Button size={size} variant="soft" uniform accessibilityLabel="Add">
              <Plus />
            </Button>
            <Text variant="footnote" color="tertiary">
              {size}
            </Text>
          </Row>
        ))}
      </Section>
      <Section title="Icons">
        <Row>
          <Button>
            <Search />
            Search
          </Button>
          <Button variant="soft">
            Continue
            <ArrowRightSm />
          </Button>
          <Button variant="outline" color="info">
            <Plus />
            New folder
          </Button>
        </Row>
      </Section>
      <Section title="States" note="Disabled, loading and selected">
        {VARIANTS.map((variant) => (
          <Row key={variant}>
            <Button variant={variant} disabled>
              Send
            </Button>
            <Button variant={variant} loading>
              Save
            </Button>
            <Button variant={variant} selected>
              Unread
            </Button>
          </Row>
        ))}
      </Section>
      <Section title="Block">
        <Button block>Continue</Button>
        <Button block variant="soft">
          Not now
        </Button>
      </Section>
      {theme.isAndroid ? (
        <Section title="Shape" note="Android: a pill, or 8dp corners">
          <Row>
            <Labeled label="round">
              <Button>Join</Button>
            </Labeled>
            <Labeled label="square">
              <Button shape="square">Join</Button>
            </Labeled>
            <Labeled label="square xl">
              <Button shape="square" size="xl">
                Join
              </Button>
            </Labeled>
          </Row>
        </Section>
      ) : null}
      <Section title="Glass" note={theme.isIOS ? "mobileMaterial: the glass of iOS 26 for soft and ghost buttons" : "Android has no glass: the tonal fill stays"}>
        <Backdrop>
          <Row>
            <Button variant="soft" mobileMaterial="glass">
              Select
            </Button>
            <Button variant="ghost" mobileMaterial="glass">
              Cancel
            </Button>
            <Button variant="soft" mobileMaterial="glass" uniform accessibilityLabel="Add">
              <Plus />
            </Button>
          </Row>
        </Backdrop>
        <Text variant="footnote" color="tertiary">
          {theme.isIOS ? "Native Liquid Glass on iOS 26 (expo-glass-effect), a blur elsewhere." : "Material 3 surfaces are tonal, not translucent."}
        </Text>
      </Section>
    </>
  )
}
