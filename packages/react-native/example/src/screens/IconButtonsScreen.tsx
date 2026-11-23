import { IconButton, useTheme, type ButtonColor, type ButtonVariant, type ControlSize, type IconComponent } from "@plexui/react-native"
import { Bell, EditPencil, Heart, HeartFilled, InfoCircle, Plus, RemoveTrash, Search, Share } from "@plexui/react-native/icons"
import { useState } from "react"
import { Backdrop, Labeled, MoreIcon, Row, Section } from "../demo"

const VARIANTS: ButtonVariant[] = ["ghost", "solid", "soft", "outline"]
const SIZES: ControlSize[] = ["sm", "md", "xl"]
/** An action that suits each color: its symbol and its name. */
const COLORS: { color: ButtonColor; Icon: IconComponent; label: string }[] = [
  { color: "primary", Icon: Plus, label: "Add" },
  { color: "secondary", Icon: EditPencil, label: "Edit" },
  { color: "danger", Icon: RemoveTrash, label: "Delete" },
  { color: "info", Icon: InfoCircle, label: "Details" },
]

export function IconButtonsScreen() {
  const theme = useTheme()
  const [liked, setLiked] = useState(false)
  return (
    <>
      <Section title="Toggle" note="Press to like">
        <Row>
          <IconButton
            icon={liked ? <HeartFilled /> : <Heart />}
            color={liked ? "danger" : "primary"}
            selected={liked}
            onPress={() => setLiked((value) => !value)}
            accessibilityLabel={liked ? "Unlike" : "Like"}
            testID="icon-button-like"
          />
        </Row>
      </Section>
      <Section title="Variants" note={theme.isAndroid ? "Circles in the Android button colors" : "Circles of the phone layer"}>
        {VARIANTS.map((variant) => (
          <Row key={variant} gap={16}>
            <Labeled label={variant}>
              <IconButton variant={variant} icon={<Search />} accessibilityLabel="Search" />
            </Labeled>
            <Labeled label="selected">
              <IconButton variant={variant} selected icon={<Bell />} accessibilityLabel="Notifications" />
            </Labeled>
            <Labeled label="disabled">
              <IconButton variant={variant} disabled icon={<Share />} accessibilityLabel="Share" />
            </Labeled>
            <Labeled label="loading">
              <IconButton variant={variant} loading icon={<Plus />} accessibilityLabel="Add" />
            </Labeled>
          </Row>
        ))}
      </Section>
      <Section title="Colors">
        <Row gap={16}>
          {COLORS.map(({ color, Icon, label }) => (
            <Labeled key={color} label={color}>
              <IconButton color={color} variant="soft" icon={<Icon />} accessibilityLabel={label} />
            </Labeled>
          ))}
        </Row>
      </Section>
      <Section title="Sizes">
        <Row gap={16}>
          {SIZES.map((size) => (
            <Labeled key={size} label={size}>
              <IconButton size={size} variant="soft" icon={<MoreIcon />} accessibilityLabel="More" />
            </Labeled>
          ))}
        </Row>
      </Section>
      <Section title="Glass" note={theme.isIOS ? "Bar buttons of iOS 26" : "Android has no glass: tonal buttons"}>
        <Backdrop>
          <Row gap={16}>
            <IconButton variant="soft" mobileMaterial="glass" icon={<Search />} accessibilityLabel="Search" />
            <IconButton variant="soft" mobileMaterial="glass" size="xl" icon={<Plus />} accessibilityLabel="Add" />
            <IconButton variant="ghost" mobileMaterial="glass" icon={<MoreIcon />} accessibilityLabel="More" />
          </Row>
        </Backdrop>
      </Section>
    </>
  )
}
