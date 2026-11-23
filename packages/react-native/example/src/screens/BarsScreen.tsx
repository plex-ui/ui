import { Button, IconButton, NavigationButton, SegmentedControl, Text, Toolbar, useTheme, type ToolbarBackground } from "@plexui/react-native"
import { ChatCompose, EditPencil, Filter, PlusLg, Search, Share } from "@plexui/react-native/icons"
import { useState } from "react"
import { Frame, MoreIcon, Section } from "../demo"

/** The backgrounds of a scrolled bar, each over a page of its own. */
const BACKGROUNDS: { background: ToolbarBackground; title: string }[] = [
  { background: "glass", title: "Photos" },
  { background: "hard", title: "Downloads" },
  { background: "soft", title: "Reading list" },
]

export function BarsScreen() {
  const theme = useTheme()
  const [filter, setFilter] = useState("all")
  const [period, setPeriod] = useState("week")
  return (
    <>
      <Section
        title="Inline title"
        note={theme.isAndroid ? "Android: circles and capsules of the card at 80% with a light rim, the title centered" : "iOS 26: 44pt items in glass, the title centered"}
      >
        <Frame>
          <Toolbar safeArea={false}>
            <Toolbar.Leading>
              <NavigationButton action="back" />
            </Toolbar.Leading>
            <Toolbar.Title>Inbox</Toolbar.Title>
            <Toolbar.Trailing>
              <IconButton icon={<Search />} accessibilityLabel="Search" />
            </Toolbar.Trailing>
          </Toolbar>
        </Frame>
        <Frame>
          <Toolbar safeArea={false}>
            <Toolbar.Leading>
              <NavigationButton action="close" />
            </Toolbar.Leading>
            <Toolbar.Title subtitle="128 results">Filters</Toolbar.Title>
            <Toolbar.Trailing>
              <NavigationButton action="confirm" />
            </Toolbar.Trailing>
          </Toolbar>
        </Frame>
        <Frame>
          <Toolbar safeArea={false} titleAlign="start">
            <Toolbar.Leading>
              <NavigationButton action="back" />
            </Toolbar.Leading>
            <Toolbar.Title>Summer in Lisbon</Toolbar.Title>
            <Toolbar.Trailing>
              <Toolbar.Group>
                <IconButton icon={<Share />} accessibilityLabel="Share" />
                <IconButton icon={<MoreIcon />} accessibilityLabel="More" />
              </Toolbar.Group>
            </Toolbar.Trailing>
          </Toolbar>
        </Frame>
      </Section>
      <Section title="Large title" note={theme.isAndroid ? "Android has no large title: the row keeps it" : "34pt bold under the items"}>
        <Frame>
          <Toolbar safeArea={false} titleStyle="large">
            <Toolbar.Leading>
              <Button variant="ghost">Edit</Button>
            </Toolbar.Leading>
            <Toolbar.Title subtitle="Updated just now">Notes</Toolbar.Title>
            <Toolbar.Trailing>
              <Toolbar.Group>
                <IconButton icon={<Filter />} accessibilityLabel="Filter" />
                <IconButton icon={<ChatCompose />} accessibilityLabel="New note" />
              </Toolbar.Group>
            </Toolbar.Trailing>
          </Toolbar>
        </Frame>
      </Section>
      <Section
        title="Scrolled"
        note="Content under the bar: glass, hard and soft backgrounds"
      >
        {BACKGROUNDS.map(({ background, title }) => (
          <Frame key={background} striped>
            <Toolbar safeArea={false} scrolled background={background}>
              <Toolbar.Leading>
                <NavigationButton action="back" />
              </Toolbar.Leading>
              <Toolbar.Title>{title}</Toolbar.Title>
              <Toolbar.Trailing>
                <IconButton icon={<EditPencil />} accessibilityLabel="Edit" />
              </Toolbar.Trailing>
            </Toolbar>
            <Text variant="footnote" style={{ padding: 16 }}>
              Content under the bar
            </Text>
          </Frame>
        ))}
      </Section>
      <Section title="Content and rows" note="A segmented control in the bar, and in a row of the bar">
        <Frame>
          <Toolbar safeArea={false}>
            <Toolbar.Leading>
              <Button variant="ghost">Today</Button>
            </Toolbar.Leading>
            <Toolbar.Content>
              <SegmentedControl aria-label="Period" value={period} onChange={setPeriod}>
                <SegmentedControl.Tab value="day">Day</SegmentedControl.Tab>
                <SegmentedControl.Tab value="week">Week</SegmentedControl.Tab>
                <SegmentedControl.Tab value="month">Month</SegmentedControl.Tab>
              </SegmentedControl>
            </Toolbar.Content>
            <Toolbar.Trailing>
              <IconButton icon={<PlusLg />} accessibilityLabel="New event" />
            </Toolbar.Trailing>
          </Toolbar>
        </Frame>
        <Frame>
          <Toolbar safeArea={false}>
            <Toolbar.Title>Chats</Toolbar.Title>
            <Toolbar.Trailing>
              <IconButton icon={<ChatCompose />} accessibilityLabel="New chat" />
            </Toolbar.Trailing>
            <Toolbar.Row>
              <SegmentedControl aria-label="Filter" value={filter} onChange={setFilter} block>
                <SegmentedControl.Tab value="all">All</SegmentedControl.Tab>
                <SegmentedControl.Tab value="unread">Unread</SegmentedControl.Tab>
                <SegmentedControl.Tab value="groups">Groups</SegmentedControl.Tab>
              </SegmentedControl>
            </Toolbar.Row>
          </Toolbar>
        </Frame>
      </Section>
      <Section title="Bottom toolbar" note={theme.isAndroid ? "Android's circles and capsules on the tab bar's line" : "48pt items in glass, the prominent one in the accent"}>
        <Frame striped align="bottom" height={120}>
          <Toolbar placement="bottom" safeArea={false} scrolled>
            <Toolbar.Leading>
              <IconButton icon={<Filter />} accessibilityLabel="Filter" />
            </Toolbar.Leading>
            <Toolbar.Content>
              <Toolbar.Group>
                <IconButton icon={<Share />} accessibilityLabel="Share" />
                <IconButton icon={<Search />} accessibilityLabel="Search" />
              </Toolbar.Group>
            </Toolbar.Content>
            <Toolbar.Trailing>
              <IconButton variant="solid" icon={<PlusLg />} accessibilityLabel="New note" />
            </Toolbar.Trailing>
          </Toolbar>
        </Frame>
      </Section>
    </>
  )
}
