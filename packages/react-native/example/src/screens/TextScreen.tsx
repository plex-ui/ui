import { Heading, Text, type HeadingSize, type TextColor, type TextSize, type TextVariant } from "@plexui/react-native"
import { Row, Section } from "../demo"

const VARIANTS: TextVariant[] = ["largeTitle", "title1", "title2", "title3", "headline", "body", "callout", "subheadline", "footnote", "caption1", "caption2"]
const SIZES: TextSize[] = ["3xs", "2xs", "xs", "sm", "md", "lg"]
const HEADINGS: HeadingSize[] = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"]
const COLORS: TextColor[] = ["primary", "secondary", "tertiary", "disabled", "accent", "danger", "success", "warning", "caution", "info", "discovery"]

export function TextScreen() {
  return (
    <>
      <Section title="Platform text styles" note="iOS: Human Interface Guidelines; Android: the nearest Material 3 role">
        {VARIANTS.map((variant) => (
          <Text key={variant} variant={variant} numberOfLines={1}>
            {variant}
          </Text>
        ))}
      </Section>
      <Section title="Plex UI sizes" note="size: --font-text-*">
        {SIZES.map((size) => (
          <Text key={size} size={size}>
            Text {size}
          </Text>
        ))}
      </Section>
      <Section title="Headings" note="Heading size: --font-heading-*">
        {HEADINGS.map((size) => (
          <Heading key={size} size={size} numberOfLines={1}>
            Heading {size}
          </Heading>
        ))}
      </Section>
      <Section title="Weights">
        <Text weight="regular">Regular</Text>
        <Text weight="medium">Medium</Text>
        <Text weight="semibold">Semibold</Text>
        <Text weight="bold">Bold</Text>
      </Section>
      <Section title="Colors">
        <Row gap={12}>
          {COLORS.map((color) => (
            <Text key={color} color={color}>
              {color}
            </Text>
          ))}
        </Row>
      </Section>
      <Section title="Mono and figures">
        <Text mono>const answer = 42</Text>
        <Text tabularNums>1,111.11 / 8,888.88</Text>
        <Text>1,111.11 / 8,888.88</Text>
      </Section>
    </>
  )
}
