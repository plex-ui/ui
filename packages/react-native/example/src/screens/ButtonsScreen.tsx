import { Button, Text, useTheme, type ButtonColor, type ButtonVariant, type ControlSize } from "@plexui/react-native"
import { ArrowRightSm, Plus, Search } from "@plexui/react-native/icons"
import { useState } from "react"
import { Backdrop, Labeled, Row, Section } from "../demo"

const COLORS: ButtonColor[] = ["primary", "secondary", "danger", "success", "info", "discovery", "caution", "warning"]
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
            Pressed {count}
          </Button>
          <Button variant="soft" selected={selected} onPress={() => setSelected((value) => !value)} testID="button-toggle">
            {selected ? "Selected" : "Not selected"}
          </Button>
        </Row>
      </Section>
      {VARIANTS.map((variant) => (
        <Section key={variant} title={variant} testID={`variant-${variant}`}>
          <Row>
            {COLORS.map((color) => (
              <Button key={color} color={color} variant={variant}>
                {color}
              </Button>
            ))}
          </Row>
        </Section>
      ))}
      <Section title="Sizes" note={theme.isIOS ? "The phone layer: 28 up to sm, 34 at md and lg, 50 from xl" : "Material 3: XS 32 up to sm, S 40 at md and lg, M 56 from xl"}>
        {SIZES.map((size) => (
          <Row key={size}>
            <Button size={size}>Size {size}</Button>
            <Button size={size} variant="soft" uniform accessibilityLabel="Add">
              <Plus />
            </Button>
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
            New
          </Button>
        </Row>
      </Section>
      <Section title="States">
        {VARIANTS.map((variant) => (
          <Row key={variant}>
            <Button variant={variant} disabled>
              Disabled
            </Button>
            <Button variant={variant} loading>
              Loading
            </Button>
            <Button variant={variant} selected>
              Selected
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
        <Section title="Shape" note="Material 3 Expressive: round or square; corners tighten while pressed">
          <Row>
            <Labeled label="round">
              <Button>Round</Button>
            </Labeled>
            <Labeled label="square">
              <Button shape="square">Square</Button>
            </Labeled>
            <Labeled label="square xl">
              <Button shape="square" size="xl">
                Square
              </Button>
            </Labeled>
          </Row>
        </Section>
      ) : null}
      <Section title="Glass" note={theme.isIOS ? "mobileMaterial: the glass of iOS 26 for soft and ghost buttons" : "Android has no glass: the tonal fill stays"}>
        <Backdrop>
          <Row>
            <Button variant="soft" mobileMaterial="glass">
              Glass
            </Button>
            <Button variant="ghost" mobileMaterial="glass">
              Ghost glass
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
