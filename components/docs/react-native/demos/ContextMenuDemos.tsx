import { useState } from "react";
import {
  ContextMenu,
  List,
  ListItem,
  Text,
  Toolbar,
  useTheme,
} from "@plexui/react-native";
import { Copy, Reply, RemoveTrash, Share } from "@plexui/react-native/icons";
import { Pressable, ScrollView, View } from "react-native";
import { RNScreen, docsDemo } from "../RNScreen";

const NOTES = [
  { id: "groceries", title: "Groceries", detail: "Milk, eggs, bread" },
  { id: "trip", title: "Trip to Lisbon", detail: "Flights on Friday" },
  { id: "ideas", title: "Gift ideas", detail: "A book, a plant" },
  { id: "books", title: "Books to read", detail: "Three on the list" },
];

/**
 * The notes of an app: a touch and hold on a note opens its menu (Copy, Share, Delete), the note lifted over the
 * dimmed screen on iOS; a tap still opens the note. Delete takes the note off the list.
 */
export const Overview = docsDemo(function Overview() {
  const [notes, setNotes] = useState(NOTES);
  return (
    <RNScreen screen grouped minHeight={520}>
      <View style={{ flex: 1 }}>
        <Toolbar>
          <Toolbar.Title>Notes</Toolbar.Title>
        </Toolbar>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <List>
            {notes.map((note) => (
              <ContextMenu key={note.id}>
                <ContextMenu.Trigger>
                  <ListItem
                    label={note.title}
                    description={note.detail}
                    onPress={() => {}}
                  />
                </ContextMenu.Trigger>
                <ContextMenu.Content aria-label={note.title}>
                  <ContextMenu.Item icon={<Copy />} onSelect={() => {}}>
                    Copy
                  </ContextMenu.Item>
                  <ContextMenu.Item icon={<Share />} onSelect={() => {}}>
                    Share
                  </ContextMenu.Item>
                  <ContextMenu.Separator />
                  <ContextMenu.Item
                    icon={<RemoveTrash />}
                    danger
                    onSelect={() =>
                      setNotes((rest) =>
                        rest.filter((item) => item.id !== note.id),
                      )
                    }
                  >
                    Delete
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu>
            ))}
          </List>
        </ScrollView>
      </View>
    </RNScreen>
  );
});

const MESSAGES = [
  { id: "m1", mine: false, text: "Are we still on for Friday?" },
  { id: "m2", mine: true, text: "Yes, 7 at the usual place" },
  { id: "m3", mine: false, text: "Great, see you there" },
];

/**
 * A chat: a touch and hold on a bubble opens its menu. The bubble draws its own shape, so it lifts as it is
 * (`shape="element"`, `radius={18}`): no card behind it on iOS, the dimming cut at its corners on Android.
 */
export const OwnShape = docsDemo(function OwnShape() {
  return (
    <RNScreen screen minHeight={420}>
      <Chat />
    </RNScreen>
  );
});

/** Under RNScreen's ThemeProvider, so the bubbles take the preview's theme. */
function Chat() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, padding: 16, gap: 8, justifyContent: "center" }}>
      {MESSAGES.map((message) => (
        <View
          key={message.id}
          style={{ alignItems: message.mine ? "flex-end" : "flex-start" }}
        >
          <ContextMenu>
            <ContextMenu.Trigger radius={18} shape="element">
              <Pressable
                onLongPress={() => {}}
                style={{
                  maxWidth: 260,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 18,
                  backgroundColor: message.mine
                    ? theme.color(
                        "--color-background-accent-solid",
                        theme.colors.accent,
                      )
                    : theme.color('--input-soft-background-color', theme.colors.surfaceSecondary),
                }}
              >
                <Text
                  style={{
                    color: message.mine
                      ? theme.color("--color-text-accent-solid", "#fff")
                      : theme.colors.text,
                  }}
                >
                  {message.text}
                </Text>
              </Pressable>
            </ContextMenu.Trigger>
            <ContextMenu.Content aria-label="Message">
              <ContextMenu.Item icon={<Reply />} onSelect={() => {}}>
                Reply
              </ContextMenu.Item>
              <ContextMenu.Item icon={<Copy />} onSelect={() => {}}>
                Copy
              </ContextMenu.Item>
              <ContextMenu.Separator />
              <ContextMenu.Item
                icon={<RemoveTrash />}
                danger
                onSelect={() => {}}
              >
                Delete
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu>
        </View>
      ))}
    </View>
  );
}
